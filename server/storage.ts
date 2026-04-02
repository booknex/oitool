import { eq, sql, and, gte } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  inventoryItems,
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
    name: "Task Board",
    description: "Cleaning checklists & assignments",
    icon: "ClipboardList",
    color: "#F3E5F5",
    iconColor: "#9C27B0",
    route: "/tasks",
    available: false,
  },
  {
    name: "Reports",
    description: "Performance stats & analytics",
    icon: "BarChart3",
    color: "#E8F5E9",
    iconColor: "#4CAF50",
    route: "/reports",
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
