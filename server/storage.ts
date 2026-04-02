import { eq, sql, and, gte } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  inventoryItems,
  checkoutLogs,
  dashboardApps,
  properties,
  type InventoryItem,
  type CartItem,
  type CreateItemPayload,
  type UpdateItemPayload,
  type DashboardApp,
  type CreateDashboardAppPayload,
  type UpdateDashboardAppPayload,
  type Property,
  type CreatePropertyPayload,
  type UpdatePropertyPayload,
  type AnalyticsRange,
  type AnalyticsResponse,
} from "@shared/schema";

export interface IStorage {
  getItems(): Promise<InventoryItem[]>;
  getItem(id: number): Promise<InventoryItem | undefined>;
  checkout(items: CartItem[]): Promise<InventoryItem[]>;
  restockItem(id: number, quantity?: number): Promise<InventoryItem>;
  restockAll(): Promise<InventoryItem[]>;
  createItem(data: CreateItemPayload): Promise<InventoryItem>;
  updateItem(data: UpdateItemPayload): Promise<InventoryItem>;
  deleteItem(id: number): Promise<void>;
  // Analytics
  getAnalytics(range: AnalyticsRange): Promise<AnalyticsResponse>;
  // Dashboard apps
  getDashboardApps(): Promise<DashboardApp[]>;
  createDashboardApp(data: CreateDashboardAppPayload): Promise<DashboardApp>;
  updateDashboardApp(data: UpdateDashboardAppPayload): Promise<DashboardApp>;
  deleteDashboardApp(id: number): Promise<void>;
  // Properties
  getProperties(): Promise<Property[]>;
  createProperty(data: CreatePropertyPayload): Promise<Property>;
  updateProperty(data: UpdatePropertyPayload): Promise<Property>;
  deleteProperty(id: number): Promise<void>;
}

const DEFAULT_DASHBOARD_APPS: Omit<CreateDashboardAppPayload, "sortOrder">[] = [
  {
    name: "Supply Kiosk",
    description: "Manage inventory & cleaning supplies",
    icon: "Package",
    color: "#E8F4FD",
    iconColor: "#2196F3",
    route: "/kiosk",
    available: true,
  },
  {
    name: "Reviews",
    description: "View Airbnb guest feedback",
    icon: "Star",
    color: "#FFF8E1",
    iconColor: "#F59E0B",
    route: "/reviews",
    available: true,
  },
  {
    name: "Analytics",
    description: "Usage trends & cost tracking",
    icon: "BarChart3",
    color: "#F3E5F5",
    iconColor: "#9C27B0",
    route: "/analytics",
    available: true,
  },
  {
    name: "Task Board",
    description: "Cleaning checklists & assignments",
    icon: "ClipboardList",
    color: "#E8F5E9",
    iconColor: "#4CAF50",
    route: "/tasks",
    available: false,
  },
  {
    name: "Team",
    description: "Staff management & schedules",
    icon: "Users",
    color: "#FBE9E7",
    iconColor: "#FF5722",
    route: "/team",
    available: false,
  },
];

// Required apps that must always exist regardless of DB state
const REQUIRED_APPS = [
  { route: "/kiosk",     name: "Supply Kiosk", description: "Manage inventory & cleaning supplies", icon: "Package",    color: "#E8F4FD", iconColor: "#2196F3", available: true },
  { route: "/reviews",   name: "Reviews",      description: "View Airbnb guest feedback",           icon: "Star",       color: "#FFF8E1", iconColor: "#F59E0B", available: true },
  { route: "/analytics", name: "Analytics",    description: "Usage trends & cost tracking",         icon: "BarChart3",  color: "#F3E5F5", iconColor: "#9C27B0", available: true },
];

export class DatabaseStorage implements IStorage {
  async getItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async checkout(cartItems: CartItem[]): Promise<InventoryItem[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client);

      const logEntries: {
        itemId: number;
        itemName: string;
        category: string;
        quantity: number;
        unitCost: string;
        totalCost: string;
      }[] = [];

      for (const cartItem of cartItems) {
        const [item] = await txDb.select().from(inventoryItems).where(eq(inventoryItems.id, cartItem.itemId));
        if (!item) {
          throw new Error(`Item with id ${cartItem.itemId} not found`);
        }
        if (item.stock < cartItem.quantity) {
          throw new Error(`Not enough stock for "${item.name}". Requested: ${cartItem.quantity}, Available: ${item.stock}`);
        }

        await txDb
          .update(inventoryItems)
          .set({ stock: sql`${inventoryItems.stock} - ${cartItem.quantity}` })
          .where(and(eq(inventoryItems.id, cartItem.itemId), gte(inventoryItems.stock, cartItem.quantity)));

        const unitCostNum = parseFloat(item.cost ?? "0");
        const totalCostNum = unitCostNum * cartItem.quantity;
        logEntries.push({
          itemId: item.id,
          itemName: item.name,
          category: item.category,
          quantity: cartItem.quantity,
          unitCost: unitCostNum.toFixed(2),
          totalCost: totalCostNum.toFixed(2),
        });
      }

      // Insert checkout log entries within same transaction
      if (logEntries.length > 0) {
        await txDb.insert(checkoutLogs).values(logEntries);
      }

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }

    return this.getItems();
  }

  async restockItem(id: number, quantity?: number): Promise<InventoryItem> {
    const item = await this.getItem(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }

    const newStock = quantity !== undefined ? Math.min(quantity, item.maxStock) : item.maxStock;
    const [updated] = await db
      .update(inventoryItems)
      .set({ stock: newStock })
      .where(eq(inventoryItems.id, id))
      .returning();
    return updated;
  }

  async restockAll(): Promise<InventoryItem[]> {
    await db
      .update(inventoryItems)
      .set({ stock: sql`${inventoryItems.maxStock}` });
    return this.getItems();
  }

  async createItem(data: CreateItemPayload): Promise<InventoryItem> {
    const stock = data.stock !== undefined ? Math.min(data.stock, data.maxStock) : data.maxStock;
    const [item] = await db
      .insert(inventoryItems)
      .values({
        name: data.name,
        description: data.description,
        category: data.category,
        maxStock: data.maxStock,
        stock,
        visible: true,
        cost: data.cost ?? "0",
        itemType: data.itemType ?? "consumable",
        lowStockThreshold: data.lowStockThreshold ?? null,
      })
      .returning();
    return item;
  }

  async updateItem(data: UpdateItemPayload): Promise<InventoryItem> {
    const item = await this.getItem(data.id);
    if (!item) {
      throw new Error(`Item with id ${data.id} not found`);
    }

    const updates: Partial<typeof inventoryItems.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.category !== undefined) updates.category = data.category;
    if (data.maxStock !== undefined) updates.maxStock = data.maxStock;
    if (data.stock !== undefined) updates.stock = data.stock;
    if (data.visible !== undefined) updates.visible = data.visible;
    if (data.cost !== undefined) updates.cost = data.cost;
    if (data.itemType !== undefined) updates.itemType = data.itemType;
    if (data.lowStockThreshold !== undefined) updates.lowStockThreshold = data.lowStockThreshold;

    const newMaxStock = updates.maxStock ?? item.maxStock;
    const newStock = updates.stock ?? item.stock;
    if (newStock > newMaxStock) {
      updates.stock = newMaxStock;
    }

    if (Object.keys(updates).length === 0) {
      return item;
    }

    const [updated] = await db
      .update(inventoryItems)
      .set(updates)
      .where(eq(inventoryItems.id, data.id))
      .returning();
    return updated;
  }

  async deleteItem(id: number): Promise<void> {
    const item = await this.getItem(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics(range: AnalyticsRange): Promise<AnalyticsResponse> {
    let dateFilter = "";
    if (range === "week") {
      dateFilter = "WHERE checked_out_at >= NOW() - INTERVAL '7 days'";
    } else if (range === "month") {
      dateFilter = "WHERE checked_out_at >= NOW() - INTERVAL '30 days'";
    }

    // Item breakdown
    const itemRows = await db.execute(sql.raw(`
      SELECT
        item_name   AS "itemName",
        category,
        SUM(quantity)::int           AS "unitsSold",
        MAX(unit_cost)::text         AS "unitCost",
        SUM(total_cost)::float       AS "totalCost"
      FROM checkout_logs
      ${dateFilter}
      GROUP BY item_name, category
      ORDER BY "unitsSold" DESC
    `));

    // Category totals
    const catRows = await db.execute(sql.raw(`
      SELECT
        category,
        SUM(quantity)::int     AS "unitsSold",
        SUM(total_cost)::float AS "totalCost"
      FROM checkout_logs
      ${dateFilter}
      GROUP BY category
      ORDER BY "totalCost" DESC
    `));

    // Grand total
    const totalRow = await db.execute(sql.raw(`
      SELECT
        COALESCE(SUM(total_cost), 0)::float AS "totalSpend",
        COALESCE(SUM(quantity), 0)::int     AS "totalUnits"
      FROM checkout_logs
      ${dateFilter}
    `));

    const totals = (totalRow.rows[0] as { totalSpend: number; totalUnits: number }) ?? { totalSpend: 0, totalUnits: 0 };

    const result: AnalyticsResponse = {
      range,
      totalSpend: Number(totals.totalSpend ?? 0),
      totalUnits: Number(totals.totalUnits ?? 0),
      itemBreakdown: (itemRows.rows as any[]).map((r) => ({
        itemName: r.itemName,
        category: r.category,
        unitsSold: Number(r.unitsSold),
        unitCost: String(r.unitCost ?? "0"),
        totalCost: Number(r.totalCost ?? 0),
      })),
      categoryTotals: (catRows.rows as any[]).map((r) => ({
        category: r.category,
        unitsSold: Number(r.unitsSold),
        totalCost: Number(r.totalCost ?? 0),
      })),
    };

    // Monthly trend — only for alltime
    if (range === "alltime") {
      const monthRows = await db.execute(sql.raw(`
        SELECT
          TO_CHAR(DATE_TRUNC('month', checked_out_at), 'YYYY-MM') AS month,
          SUM(total_cost)::float AS spend
        FROM checkout_logs
        WHERE checked_out_at >= NOW() - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', checked_out_at)
        ORDER BY DATE_TRUNC('month', checked_out_at) ASC
      `));
      result.monthlyTrend = (monthRows.rows as any[]).map((r) => ({
        month: r.month,
        spend: Number(r.spend ?? 0),
      }));
    }

    return result;
  }

  // ─── Dashboard Apps ────────────────────────────────────────────────────────

  async getDashboardApps(): Promise<DashboardApp[]> {
    let apps = await db
      .select()
      .from(dashboardApps)
      .orderBy(dashboardApps.sortOrder);

    if (apps.length === 0) {
      const inserted = await db
        .insert(dashboardApps)
        .values(
          DEFAULT_DASHBOARD_APPS.map((app, i) => ({ ...app, sortOrder: i }))
        )
        .returning();
      apps = inserted.sort((a, b) => a.sortOrder - b.sortOrder);
    } else {
      const existingRoutes = new Set(apps.map(a => a.route));
      const missing = REQUIRED_APPS.filter(a => !existingRoutes.has(a.route));
      if (missing.length > 0) {
        const maxSort = apps.reduce((m, a) => Math.max(m, a.sortOrder), -1);
        const inserted = await db
          .insert(dashboardApps)
          .values(missing.map((app, i) => ({ ...app, sortOrder: maxSort + 1 + i })))
          .returning();
        apps = [...apps, ...inserted].sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    return apps;
  }

  async createDashboardApp(data: CreateDashboardAppPayload): Promise<DashboardApp> {
    const [app] = await db
      .insert(dashboardApps)
      .values(data)
      .returning();
    return app;
  }

  async updateDashboardApp(data: UpdateDashboardAppPayload): Promise<DashboardApp> {
    const [existing] = await db
      .select()
      .from(dashboardApps)
      .where(eq(dashboardApps.id, data.id));
    if (!existing) {
      throw new Error(`Dashboard app with id ${data.id} not found`);
    }

    const updates: Partial<typeof dashboardApps.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.color !== undefined) updates.color = data.color;
    if (data.iconColor !== undefined) updates.iconColor = data.iconColor;
    if (data.route !== undefined) updates.route = data.route;
    if (data.available !== undefined) updates.available = data.available;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const [updated] = await db
      .update(dashboardApps)
      .set(updates)
      .where(eq(dashboardApps.id, data.id))
      .returning();
    return updated;
  }

  async deleteDashboardApp(id: number): Promise<void> {
    const [existing] = await db
      .select()
      .from(dashboardApps)
      .where(eq(dashboardApps.id, id));
    if (!existing) {
      throw new Error(`Dashboard app with id ${id} not found`);
    }
    await db.delete(dashboardApps).where(eq(dashboardApps.id, id));
  }

  // ─── Properties ────────────────────────────────────────────────────────────

  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(properties.sortOrder);
  }

  async createProperty(data: CreatePropertyPayload): Promise<Property> {
    const [prop] = await db.insert(properties).values(data).returning();
    return prop;
  }

  async updateProperty(data: UpdatePropertyPayload): Promise<Property> {
    const [existing] = await db.select().from(properties).where(eq(properties.id, data.id));
    if (!existing) throw new Error(`Property with id ${data.id} not found`);

    const updates: Partial<typeof properties.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.address !== undefined) updates.address = data.address;
    if (data.airbnbUrl !== undefined) updates.airbnbUrl = data.airbnbUrl;
    if (data.color !== undefined) updates.color = data.color;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;
    if (data.imageUrl !== undefined) updates.imageUrl = data.imageUrl;

    const [updated] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, data.id))
      .returning();
    return updated;
  }

  async deleteProperty(id: number): Promise<void> {
    const [existing] = await db.select().from(properties).where(eq(properties.id, id));
    if (!existing) throw new Error(`Property with id ${id} not found`);
    await db.delete(properties).where(eq(properties.id, id));
  }
}

export const storage = new DatabaseStorage();
