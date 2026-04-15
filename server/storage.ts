import { eq, sql, and, gte, not, inArray } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import {
  inventoryItems,
  checkoutLogs,
  dashboardApps,
  properties,
  bookings,
  clients,
  invoices,
  invoiceItems,
  saasAffiliates,
  saasCompanies,
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
  type BookingInfo,
  type UpcomingBookings,
  type AnalyticsRange,
  type AnalyticsResponse,
  type Client,
  type CreateClientPayload,
  type UpdateClientPayload,
  type InvoiceWithDetails,
  type CreateInvoicePayload,
  type UpdateInvoicePayload,
  type SaasAffiliate,
  type SaasCompanyWithAffiliate,
  type CreateSaasAffiliatePayload,
  type UpdateSaasAffiliatePayload,
  type CreateSaasCompanyPayload,
  type UpdateSaasCompanyPayload,
  catalogItems,
  type CatalogItem,
  type CreateCatalogItemPayload,
  type UpdateCatalogItemPayload,
  companySettings,
  type CompanySettings,
  type UpdateCompanySettingsPayload,
} from "@shared/schema";

// ─── SSRF protection ─────────────────────────────────────────────────────────

function validateIcalUrl(urlStr: string): void {
  let parsed: URL;
  try {
    parsed = new URL(urlStr);
  } catch {
    throw new Error("Invalid iCal URL");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("iCal URL must use HTTPS");
  }
  const h = parsed.hostname.toLowerCase();
  if (
    h === "localhost" ||
    h === "127.0.0.1" ||
    h === "0.0.0.0" ||
    h === "[::1]" ||
    h.endsWith(".local") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h.startsWith("169.254.")
  ) {
    throw new Error("iCal URL must point to a public host");
  }
}

// ─── iCal parser (no external dependency) ────────────────────────────────────

function parseIcalDate(value: string, keyWithParams: string): Date {
  const isDateOnly = keyWithParams.includes("VALUE=DATE") || /^\d{8}$/.test(value);
  const y = parseInt(value.substring(0, 4), 10);
  const m = parseInt(value.substring(4, 6), 10) - 1;
  const d = parseInt(value.substring(6, 8), 10);
  if (isDateOnly || value.length === 8) {
    return new Date(Date.UTC(y, m, d));
  }
  const h = parseInt(value.substring(9, 11), 10);
  const min = parseInt(value.substring(11, 13), 10);
  const s = parseInt(value.substring(13, 15), 10);
  if (value.endsWith("Z")) return new Date(Date.UTC(y, m, d, h, min, s));
  return new Date(y, m, d, h, min, s);
}

function parseIcal(text: string): Array<{ uid: string; start: Date; end: Date; summary: string }> {
  const unfolded = text.replace(/\r?\n[ \t]/g, "");
  const lines = unfolded.split(/\r?\n/);
  const events: Array<{ uid: string; start: Date; end: Date; summary: string }> = [];
  let inEvent = false;
  let current: { uid?: string; start?: Date; end?: Date; summary?: string } = {};

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {};
    } else if (line === "END:VEVENT") {
      if (inEvent && current.uid && current.start && current.end) {
        events.push({ uid: current.uid, start: current.start, end: current.end, summary: current.summary ?? "" });
      }
      inEvent = false;
    } else if (inEvent) {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) continue;
      const keyPart = line.substring(0, colonIdx);
      const baseKey = keyPart.split(";")[0];
      const value = line.substring(colonIdx + 1);
      switch (baseKey) {
        case "UID": current.uid = value.trim(); break;
        case "SUMMARY": current.summary = value.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").trim(); break;
        case "DTSTART": current.start = parseIcalDate(value.trim(), keyPart); break;
        case "DTEND": current.end = parseIcalDate(value.trim(), keyPart); break;
      }
    }
  }
  return events;
}

// ─── Interface ───────────────────────────────────────────────────────────────

export interface IStorage {
  getItems(): Promise<InventoryItem[]>;
  getItem(id: number): Promise<InventoryItem | undefined>;
  getItemByBarcode(barcode: string): Promise<InventoryItem | undefined>;
  checkout(items: CartItem[]): Promise<InventoryItem[]>;
  restockItem(id: number, quantity?: number): Promise<InventoryItem>;
  restockAll(): Promise<InventoryItem[]>;
  createItem(data: CreateItemPayload): Promise<InventoryItem>;
  updateItem(data: UpdateItemPayload): Promise<InventoryItem>;
  deleteItem(id: number): Promise<void>;
  // Catalog items
  getCatalogItems(): Promise<CatalogItem[]>;
  createCatalogItem(data: CreateCatalogItemPayload): Promise<CatalogItem>;
  updateCatalogItem(data: UpdateCatalogItemPayload): Promise<CatalogItem>;
  deleteCatalogItem(id: number): Promise<void>;
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
  // Calendar sync
  syncPropertyCalendar(id: number): Promise<{ count: number; lastSynced: Date }>;
  syncAllCalendars(): Promise<void>;
  getPropertyBookings(id: number): Promise<BookingInfo[]>;
  getUpcomingBookings(): Promise<UpcomingBookings>;
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(data: CreateClientPayload): Promise<Client>;
  updateClient(data: UpdateClientPayload): Promise<Client>;
  updateClientStripeCustomerId(id: number, stripeCustomerId: string): Promise<void>;
  deleteClient(id: number): Promise<void>;
  // Invoices
  getInvoices(): Promise<InvoiceWithDetails[]>;
  getInvoice(id: number): Promise<InvoiceWithDetails | undefined>;
  createInvoice(data: CreateInvoicePayload): Promise<InvoiceWithDetails>;
  updateInvoice(data: UpdateInvoicePayload): Promise<InvoiceWithDetails>;
  deleteInvoice(id: number): Promise<void>;
  // SaaS Affiliates
  getSaasAffiliates(): Promise<SaasAffiliate[]>;
  createSaasAffiliate(data: CreateSaasAffiliatePayload): Promise<SaasAffiliate>;
  updateSaasAffiliate(data: UpdateSaasAffiliatePayload): Promise<SaasAffiliate>;
  deleteSaasAffiliate(id: number): Promise<void>;
  // SaaS Companies
  getSaasCompanies(): Promise<SaasCompanyWithAffiliate[]>;
  createSaasCompany(data: CreateSaasCompanyPayload): Promise<SaasCompanyWithAffiliate>;
  updateSaasCompany(data: UpdateSaasCompanyPayload): Promise<SaasCompanyWithAffiliate>;
  deleteSaasCompany(id: number): Promise<void>;
  // Company Settings
  getCompanySettings(): Promise<CompanySettings>;
  updateCompanySettings(data: UpdateCompanySettingsPayload): Promise<CompanySettings>;
}

const DEFAULT_DASHBOARD_APPS: Omit<CreateDashboardAppPayload, "sortOrder">[] = [
  { name: "Supply Kiosk", description: "Manage inventory & cleaning supplies", icon: "Package",      color: "#E8F4FD", iconColor: "#2196F3", route: "/kiosk",      available: true  },
  { name: "Reviews",      description: "View Airbnb guest feedback",           icon: "Star",         color: "#FFF8E1", iconColor: "#F59E0B", route: "/reviews",    available: true  },
  { name: "Calendar",     description: "Property bookings & iCal sync",        icon: "CalendarDays", color: "#E8F5E9", iconColor: "#22C55E", route: "/calendar",   available: true  },
  { name: "Invoicing",    description: "Bill clients & track payments",         icon: "Receipt",      color: "#EDE9FE", iconColor: "#7C3AED", route: "/invoicing",  available: true  },
  { name: "Analytics",    description: "Usage trends & cost tracking",          icon: "BarChart3",    color: "#F3E5F5", iconColor: "#9C27B0", route: "/analytics",  available: true  },
  { name: "Task Board",   description: "Cleaning checklists & assignments",     icon: "ClipboardList",color: "#FFF3E0", iconColor: "#4CAF50", route: "/tasks",      available: false },
  { name: "Team",         description: "Staff management & schedules",          icon: "Users",        color: "#FBE9E7", iconColor: "#FF5722", route: "/team",       available: false },
];

const REQUIRED_APPS = [
  { route: "/kiosk",      name: "Supply Kiosk", description: "Manage inventory & cleaning supplies", icon: "Package",      color: "#E8F4FD", iconColor: "#2196F3", available: true },
  { route: "/reviews",    name: "Reviews",      description: "View Airbnb guest feedback",           icon: "Star",         color: "#FFF8E1", iconColor: "#F59E0B", available: true },
  { route: "/calendar",   name: "Calendar",     description: "Property bookings & iCal sync",        icon: "CalendarDays", color: "#E8F5E9", iconColor: "#22C55E", available: true },
  { route: "/invoicing",  name: "Invoicing",    description: "Bill clients & track payments",        icon: "Receipt",      color: "#EDE9FE", iconColor: "#7C3AED", available: true },
  { route: "/analytics",  name: "Analytics",    description: "Usage trends & cost tracking",         icon: "BarChart3",    color: "#F3E5F5", iconColor: "#9C27B0", available: true },
];

export class DatabaseStorage implements IStorage {
  async getItems(): Promise<InventoryItem[]> {
    return await db.select().from(inventoryItems);
  }

  async getItem(id: number): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }

  async getItemByBarcode(barcode: string): Promise<InventoryItem | undefined> {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.barcode, barcode));
    return item;
  }

  async checkout(cartItems: CartItem[]): Promise<InventoryItem[]> {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle(client);

      const logEntries: {
        itemId: number; itemName: string; category: string;
        quantity: number; unitCost: string; totalCost: string;
      }[] = [];

      for (const cartItem of cartItems) {
        const [item] = await txDb.select().from(inventoryItems).where(eq(inventoryItems.id, cartItem.itemId));
        if (!item) throw new Error(`Item with id ${cartItem.itemId} not found`);
        if (item.stock < cartItem.quantity) {
          throw new Error(`Not enough stock for "${item.name}". Requested: ${cartItem.quantity}, Available: ${item.stock}`);
        }

        await txDb
          .update(inventoryItems)
          .set({ stock: sql`${inventoryItems.stock} - ${cartItem.quantity}` })
          .where(and(eq(inventoryItems.id, cartItem.itemId), gte(inventoryItems.stock, cartItem.quantity)));

        const unitCostNum = parseFloat(item.cost ?? "0");
        logEntries.push({
          itemId: item.id, itemName: item.name, category: item.category,
          quantity: cartItem.quantity,
          unitCost: unitCostNum.toFixed(2),
          totalCost: (unitCostNum * cartItem.quantity).toFixed(2),
        });
      }

      if (logEntries.length > 0) await txDb.insert(checkoutLogs).values(logEntries);
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
    if (!item) throw new Error(`Item with id ${id} not found`);
    const newStock = quantity !== undefined ? Math.min(quantity, item.maxStock) : item.maxStock;
    const [updated] = await db.update(inventoryItems).set({ stock: newStock }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }

  async restockAll(): Promise<InventoryItem[]> {
    await db.update(inventoryItems).set({ stock: sql`${inventoryItems.maxStock}` });
    return this.getItems();
  }

  async createItem(data: CreateItemPayload): Promise<InventoryItem> {
    const stock = data.stock !== undefined ? Math.min(data.stock, data.maxStock) : data.maxStock;
    const [item] = await db.insert(inventoryItems).values({
      name: data.name, description: data.description, category: data.category,
      maxStock: data.maxStock, stock, visible: true,
      cost: data.cost ?? "0", itemType: data.itemType ?? "consumable",
      lowStockThreshold: data.lowStockThreshold ?? null,
      barcode: data.barcode ?? null,
    }).returning();
    return item;
  }

  async updateItem(data: UpdateItemPayload): Promise<InventoryItem> {
    const item = await this.getItem(data.id);
    if (!item) throw new Error(`Item with id ${data.id} not found`);

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
    if (data.barcode !== undefined) updates.barcode = data.barcode;

    const newMaxStock = updates.maxStock ?? item.maxStock;
    const newStock = updates.stock ?? item.stock;
    if (newStock > newMaxStock) updates.stock = newMaxStock;

    if (Object.keys(updates).length === 0) return item;

    const [updated] = await db.update(inventoryItems).set(updates).where(eq(inventoryItems.id, data.id)).returning();
    return updated;
  }

  async deleteItem(id: number): Promise<void> {
    const item = await this.getItem(id);
    if (!item) throw new Error(`Item with id ${id} not found`);
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }

  // ─── Catalog Items ───────────────────────────────────────────────────────────

  async getCatalogItems(): Promise<CatalogItem[]> {
    return await db.select().from(catalogItems).orderBy(catalogItems.name);
  }

  async createCatalogItem(data: CreateCatalogItemPayload): Promise<CatalogItem> {
    const [item] = await db.insert(catalogItems).values({
      name: data.name,
      description: data.description ?? "",
      unitPrice: data.unitPrice ?? "0",
    }).returning();
    return item;
  }

  async updateCatalogItem(data: UpdateCatalogItemPayload): Promise<CatalogItem> {
    const updates: Partial<typeof catalogItems.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.unitPrice !== undefined) updates.unitPrice = data.unitPrice;
    const [updated] = await db.update(catalogItems).set(updates).where(eq(catalogItems.id, data.id)).returning();
    if (!updated) throw new Error(`Catalog item ${data.id} not found`);
    return updated;
  }

  async deleteCatalogItem(id: number): Promise<void> {
    await db.delete(catalogItems).where(eq(catalogItems.id, id));
  }

  // ─── Analytics ──────────────────────────────────────────────────────────────

  async getAnalytics(range: AnalyticsRange): Promise<AnalyticsResponse> {
    let dateFilter = "";
    if (range === "week") dateFilter = "WHERE checked_out_at >= NOW() - INTERVAL '7 days'";
    else if (range === "month") dateFilter = "WHERE checked_out_at >= NOW() - INTERVAL '30 days'";

    type ItemRow = { itemName: string; category: string; unitsSold: string; unitCost: string; totalCost: string };
    type CatRow  = { category: string; unitsSold: string; totalCost: string };
    type TotalRow = { totalSpend: string; totalUnits: string };
    type MonthRow = { month: string; spend: string };

    const [itemResult, catResult, totalResult] = await Promise.all([
      db.execute(sql.raw(`SELECT item_name AS "itemName", category, SUM(quantity)::text AS "unitsSold", MAX(unit_cost)::text AS "unitCost", SUM(total_cost)::text AS "totalCost" FROM checkout_logs ${dateFilter} GROUP BY item_name, category ORDER BY SUM(quantity) DESC`)),
      db.execute(sql.raw(`SELECT category, SUM(quantity)::text AS "unitsSold", SUM(total_cost)::text AS "totalCost" FROM checkout_logs ${dateFilter} GROUP BY category ORDER BY SUM(total_cost) DESC`)),
      db.execute(sql.raw(`SELECT COALESCE(SUM(total_cost), 0)::text AS "totalSpend", COALESCE(SUM(quantity), 0)::text AS "totalUnits" FROM checkout_logs ${dateFilter}`)),
    ]);

    const totals = (totalResult.rows[0] as TotalRow | undefined) ?? { totalSpend: "0", totalUnits: "0" };

    const result: AnalyticsResponse = {
      range,
      totalSpend: Number(totals.totalSpend ?? 0),
      totalUnits: Number(totals.totalUnits ?? 0),
      itemBreakdown: (itemResult.rows as ItemRow[]).map((r) => ({
        itemName: r.itemName, category: r.category,
        unitsSold: Number(r.unitsSold ?? 0), unitCost: r.unitCost ?? "0",
        totalCost: Number(r.totalCost ?? 0),
      })),
      categoryTotals: (catResult.rows as CatRow[]).map((r) => ({
        category: r.category, unitsSold: Number(r.unitsSold ?? 0), totalCost: Number(r.totalCost ?? 0),
      })),
    };

    if (range === "alltime") {
      const monthResult = await db.execute(sql.raw(`SELECT TO_CHAR(DATE_TRUNC('month', checked_out_at), 'YYYY-MM') AS month, SUM(total_cost)::text AS spend FROM checkout_logs WHERE checked_out_at >= DATE_TRUNC('month', NOW()) - INTERVAL '11 months' GROUP BY DATE_TRUNC('month', checked_out_at) ORDER BY DATE_TRUNC('month', checked_out_at) ASC`));
      const spendByMonth = new Map<string, number>();
      for (const r of monthResult.rows as MonthRow[]) spendByMonth.set(r.month, Number(r.spend ?? 0));
      const fullSeries: { month: string; spend: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        fullSeries.push({ month: key, spend: spendByMonth.get(key) ?? 0 });
      }
      result.monthlyTrend = fullSeries;
    }

    return result;
  }

  // ─── Dashboard Apps ────────────────────────────────────────────────────────

  async getDashboardApps(): Promise<DashboardApp[]> {
    let apps = await db.select().from(dashboardApps).orderBy(dashboardApps.sortOrder);

    if (apps.length === 0) {
      const inserted = await db.insert(dashboardApps).values(DEFAULT_DASHBOARD_APPS.map((app, i) => ({ ...app, sortOrder: i }))).returning();
      apps = inserted.sort((a, b) => a.sortOrder - b.sortOrder);
    } else {
      const existingRoutes = new Set(apps.map(a => a.route));
      const missing = REQUIRED_APPS.filter(a => !existingRoutes.has(a.route));
      if (missing.length > 0) {
        const maxSort = apps.reduce((m, a) => Math.max(m, a.sortOrder), -1);
        const inserted = await db.insert(dashboardApps).values(missing.map((app, i) => ({ ...app, sortOrder: maxSort + 1 + i }))).returning();
        apps = [...apps, ...inserted].sort((a, b) => a.sortOrder - b.sortOrder);
      }
    }

    return apps;
  }

  async createDashboardApp(data: CreateDashboardAppPayload): Promise<DashboardApp> {
    const [app] = await db.insert(dashboardApps).values(data).returning();
    return app;
  }

  async updateDashboardApp(data: UpdateDashboardAppPayload): Promise<DashboardApp> {
    const [existing] = await db.select().from(dashboardApps).where(eq(dashboardApps.id, data.id));
    if (!existing) throw new Error(`Dashboard app with id ${data.id} not found`);

    const updates: Partial<typeof dashboardApps.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.icon !== undefined) updates.icon = data.icon;
    if (data.color !== undefined) updates.color = data.color;
    if (data.iconColor !== undefined) updates.iconColor = data.iconColor;
    if (data.route !== undefined) updates.route = data.route;
    if (data.available !== undefined) updates.available = data.available;
    if (data.sortOrder !== undefined) updates.sortOrder = data.sortOrder;

    const [updated] = await db.update(dashboardApps).set(updates).where(eq(dashboardApps.id, data.id)).returning();
    return updated;
  }

  async deleteDashboardApp(id: number): Promise<void> {
    const [existing] = await db.select().from(dashboardApps).where(eq(dashboardApps.id, id));
    if (!existing) throw new Error(`Dashboard app with id ${id} not found`);
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
    if (data.icalUrl !== undefined) updates.icalUrl = data.icalUrl;

    const [updated] = await db.update(properties).set(updates).where(eq(properties.id, data.id)).returning();
    return updated;
  }

  async deleteProperty(id: number): Promise<void> {
    const [existing] = await db.select().from(properties).where(eq(properties.id, id));
    if (!existing) throw new Error(`Property with id ${id} not found`);
    await db.delete(bookings).where(eq(bookings.propertyId, id));
    await db.delete(properties).where(eq(properties.id, id));
  }

  // ─── Calendar Sync ─────────────────────────────────────────────────────────

  async syncPropertyCalendar(id: number): Promise<{ count: number; lastSynced: Date }> {
    const [prop] = await db.select().from(properties).where(eq(properties.id, id));
    if (!prop) throw new Error(`Property with id ${id} not found`);
    if (!prop.icalUrl) throw new Error("No iCal URL configured for this property");

    validateIcalUrl(prop.icalUrl);

    const response = await fetch(prop.icalUrl);
    if (!response.ok) throw new Error(`Failed to fetch iCal: HTTP ${response.status}`);
    const text = await response.text();

    const events = parseIcal(text);
    const now = new Date();
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const relevant = events.filter(e => e.end >= cutoff);

    if (relevant.length > 0) {
      // Upsert by (propertyId, uid)
      await db.insert(bookings).values(
        relevant.map(e => ({
          propertyId: id,
          uid: e.uid,
          startDate: e.start,
          endDate: e.end,
          summary: e.summary,
          syncedAt: now,
        }))
      ).onConflictDoUpdate({
        target: [bookings.propertyId, bookings.uid],
        set: {
          startDate: sql`excluded.start_date`,
          endDate: sql`excluded.end_date`,
          summary: sql`excluded.summary`,
          syncedAt: sql`excluded.synced_at`,
        },
      });

      // Remove stale events that are no longer in the feed
      const currentUids = relevant.map(e => e.uid);
      await db.delete(bookings).where(
        and(eq(bookings.propertyId, id), not(inArray(bookings.uid, currentUids)))
      );
    } else {
      // No future events — clear all
      await db.delete(bookings).where(eq(bookings.propertyId, id));
    }

    const lastSynced = now;
    await db.update(properties).set({ lastSynced }).where(eq(properties.id, id));

    return { count: relevant.length, lastSynced };
  }

  async syncAllCalendars(): Promise<void> {
    const props = await db.select().from(properties);
    for (const prop of props) {
      if (!prop.icalUrl) continue;
      try {
        await this.syncPropertyCalendar(prop.id);
      } catch (e) {
        console.error(`[ical] Failed to sync property ${prop.id} (${prop.name}):`, e);
      }
    }
  }

  async getPropertyBookings(id: number): Promise<BookingInfo[]> {
    const [prop] = await db.select().from(properties).where(eq(properties.id, id));
    if (!prop) throw new Error(`Property with id ${id} not found`);

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db.select().from(bookings)
      .where(and(eq(bookings.propertyId, id), gte(bookings.endDate, cutoff)))
      .orderBy(bookings.startDate);

    return rows.map(r => ({
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      summary: r.summary,
    }));
  }

  async getUpcomingBookings(): Promise<UpcomingBookings> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db.select().from(bookings)
      .where(gte(bookings.endDate, cutoff))
      .orderBy(bookings.startDate);

    const result: UpcomingBookings = {};
    for (const row of rows) {
      if (!result[row.propertyId]) result[row.propertyId] = [];
      result[row.propertyId].push({
        startDate: row.startDate.toISOString(),
        endDate: row.endDate.toISOString(),
        summary: row.summary,
      });
    }
    return result;
  }

  // ─── Clients ──────────────────────────────────────────────────────────────

  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async createClient(data: CreateClientPayload): Promise<Client> {
    const [client] = await db.insert(clients).values(data).returning();
    return client;
  }

  async updateClient(data: UpdateClientPayload): Promise<Client> {
    const { id, ...rest } = data;
    const [client] = await db.update(clients).set(rest).where(eq(clients.id, id)).returning();
    if (!client) throw new Error(`Client with id ${id} not found`);
    return client;
  }

  async updateClientStripeCustomerId(id: number, stripeCustomerId: string): Promise<void> {
    await db.update(clients).set({ stripeCustomerId }).where(eq(clients.id, id));
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // ─── Invoices ─────────────────────────────────────────────────────────────

  private async buildInvoiceWithDetails(invoiceId: number): Promise<InvoiceWithDetails> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, invoiceId));
    if (!inv) throw new Error(`Invoice with id ${invoiceId} not found`);
    const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
    if (!client) throw new Error(`Client with id ${inv.clientId} not found`);
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, invoiceId));
    const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
    return { ...inv, client, items, total };
  }

  async getInvoices(): Promise<InvoiceWithDetails[]> {
    const allInvoices = await db.select().from(invoices).orderBy(invoices.createdAt);
    const allClients = await db.select().from(clients);
    const allItems = await db.select().from(invoiceItems);

    return allInvoices.map(inv => {
      const client = allClients.find(c => c.id === inv.clientId)!;
      const items = allItems.filter(it => it.invoiceId === inv.id);
      const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
      return { ...inv, client, items, total };
    });
  }

  async getInvoice(id: number): Promise<InvoiceWithDetails | undefined> {
    const [inv] = await db.select().from(invoices).where(eq(invoices.id, id));
    if (!inv) return undefined;
    const [client] = await db.select().from(clients).where(eq(clients.id, inv.clientId));
    const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    const total = items.reduce((sum, it) => sum + Number(it.quantity) * Number(it.unitPrice), 0);
    return { ...inv, client: client!, items, total };
  }

  async createInvoice(data: CreateInvoicePayload): Promise<InvoiceWithDetails> {
    const countResult = await db.select({ count: sql<number>`count(*)::int` }).from(invoices);
    const nextNum = (countResult[0]?.count ?? 0) + 1;
    const invoiceNumber = `INV-${String(nextNum).padStart(4, "0")}`;

    const [inv] = await db.insert(invoices).values({
      clientId: data.clientId,
      invoiceNumber,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      notes: data.notes ?? "",
    }).returning();

    if (data.items.length > 0) {
      await db.insert(invoiceItems).values(
        data.items.map(it => ({
          invoiceId: inv.id,
          description: it.description,
          quantity: String(it.quantity),
          unitPrice: String(it.unitPrice),
        }))
      );
    }

    return await this.buildInvoiceWithDetails(inv.id);
  }

  async updateInvoice(data: UpdateInvoicePayload): Promise<InvoiceWithDetails> {
    const { id, items, ...rest } = data;
    const updates: Record<string, unknown> = {};
    if (rest.clientId !== undefined) updates.clientId = rest.clientId;
    if (rest.notes !== undefined) updates.notes = rest.notes;
    if (rest.status !== undefined) updates.status = rest.status;
    if ("dueDate" in rest) updates.dueDate = rest.dueDate ? new Date(rest.dueDate) : null;
    if (rest.status === "paid") updates.paidAt = new Date();
    if ("stripePaymentIntentId" in rest) updates.stripePaymentIntentId = rest.stripePaymentIntentId ?? null;
    if ("stripeCheckoutUrl" in rest) updates.stripeCheckoutUrl = rest.stripeCheckoutUrl ?? null;
    if ("paidAt" in rest && rest.paidAt !== undefined) updates.paidAt = rest.paidAt ? new Date(rest.paidAt) : null;

    if (Object.keys(updates).length > 0) {
      await db.update(invoices).set(updates).where(eq(invoices.id, id));
    }

    if (items !== undefined) {
      await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
      if (items.length > 0) {
        await db.insert(invoiceItems).values(
          items.map(it => ({
            invoiceId: id,
            description: it.description,
            quantity: String(it.quantity),
            unitPrice: String(it.unitPrice),
          }))
        );
      }
    }

    return await this.buildInvoiceWithDetails(id);
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // ─── SaaS Affiliates ──────────────────────────────────────────────────────

  async getSaasAffiliates(): Promise<SaasAffiliate[]> {
    return await db.select().from(saasAffiliates).orderBy(saasAffiliates.name);
  }

  async createSaasAffiliate(data: CreateSaasAffiliatePayload): Promise<SaasAffiliate> {
    const [row] = await db.insert(saasAffiliates).values({
      ...data,
      commissionRate: String(data.commissionRate),
    }).returning();
    return row;
  }

  async updateSaasAffiliate(data: UpdateSaasAffiliatePayload): Promise<SaasAffiliate> {
    const { id, commissionRate, ...rest } = data;
    const updates: Record<string, unknown> = { ...rest };
    if (commissionRate !== undefined) updates.commissionRate = String(commissionRate);
    const [row] = await db.update(saasAffiliates).set(updates).where(eq(saasAffiliates.id, id)).returning();
    if (!row) throw new Error(`Affiliate with id ${id} not found`);
    return row;
  }

  async deleteSaasAffiliate(id: number): Promise<void> {
    await db.delete(saasAffiliates).where(eq(saasAffiliates.id, id));
  }

  // ─── SaaS Companies ───────────────────────────────────────────────────────

  private async buildCompanyWithAffiliate(companyId: number): Promise<SaasCompanyWithAffiliate> {
    const [company] = await db.select().from(saasCompanies).where(eq(saasCompanies.id, companyId));
    if (!company) throw new Error(`Company with id ${companyId} not found`);
    let affiliate: SaasAffiliate | null = null;
    if (company.affiliateId) {
      const [aff] = await db.select().from(saasAffiliates).where(eq(saasAffiliates.id, company.affiliateId));
      affiliate = aff ?? null;
    }
    return { ...company, affiliate };
  }

  async getSaasCompanies(): Promise<SaasCompanyWithAffiliate[]> {
    const companies = await db.select().from(saasCompanies).orderBy(saasCompanies.createdAt);
    const affiliateList = await db.select().from(saasAffiliates);
    return companies.map(c => ({
      ...c,
      affiliate: c.affiliateId ? (affiliateList.find(a => a.id === c.affiliateId) ?? null) : null,
    }));
  }

  async createSaasCompany(data: CreateSaasCompanyPayload): Promise<SaasCompanyWithAffiliate> {
    const [row] = await db.insert(saasCompanies).values({
      name: data.name,
      ownerName: data.ownerName ?? "",
      email: data.email ?? "",
      phone: data.phone ?? "",
      status: data.status ?? "trial",
      plan: data.plan ?? "starter",
      mrr: String(data.mrr ?? 0),
      affiliateId: data.affiliateId ?? null,
      trialEndsAt: data.trialEndsAt ? new Date(data.trialEndsAt) : null,
      notes: data.notes ?? "",
      address: data.address ?? "",
      city: data.city ?? "",
      state: data.state ?? "",
      country: data.country ?? "",
      zip: data.zip ?? "",
      website: data.website ?? "",
    }).returning();
    return await this.buildCompanyWithAffiliate(row.id);
  }

  async updateSaasCompany(data: UpdateSaasCompanyPayload): Promise<SaasCompanyWithAffiliate> {
    const { id, mrr, trialEndsAt, ...rest } = data;
    const updates: Record<string, unknown> = { ...rest };
    if (mrr !== undefined) updates.mrr = String(mrr);
    if ("trialEndsAt" in data) updates.trialEndsAt = trialEndsAt ? new Date(trialEndsAt) : null;
    await db.update(saasCompanies).set(updates).where(eq(saasCompanies.id, id));
    return await this.buildCompanyWithAffiliate(id);
  }

  async deleteSaasCompany(id: number): Promise<void> {
    await db.delete(saasCompanies).where(eq(saasCompanies.id, id));
  }

  async getCompanySettings(): Promise<CompanySettings> {
    const rows = await db.select().from(companySettings).limit(1);
    if (rows.length > 0) return rows[0];
    const [created] = await db.insert(companySettings).values({}).returning();
    return created;
  }

  async updateCompanySettings(data: UpdateCompanySettingsPayload): Promise<CompanySettings> {
    const existing = await this.getCompanySettings();
    const [updated] = await db
      .update(companySettings)
      .set(data)
      .where(eq(companySettings.id, existing.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
