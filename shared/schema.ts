import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(10),
  visible: boolean("visible").notNull().default(true),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  itemType: text("item_type").notNull().default("consumable"),
  lowStockThreshold: integer("low_stock_threshold"),
});

export const insertItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const cartItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number().min(1),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
});

export const restockSchema = z.object({
  id: z.number(),
  quantity: z.number().min(1).optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  maxStock: z.number().min(1),
  stock: z.number().min(0).optional(),
  cost: z.string().optional(),
  itemType: z.enum(["consumable", "cleaning"]).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
});

export const updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  maxStock: z.number().min(1).optional(),
  stock: z.number().min(0).optional(),
  visible: z.boolean().optional(),
  cost: z.string().optional(),
  itemType: z.enum(["consumable", "cleaning"]).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type RestockPayload = z.infer<typeof restockSchema>;
export type CreateItemPayload = z.infer<typeof createItemSchema>;
export type UpdateItemPayload = z.infer<typeof updateItemSchema>;

// ─── Checkout Logs ─────────────────────────────────────────────────────────────

export const checkoutLogs = pgTable("checkout_logs", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default(""),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  checkedOutAt: timestamp("checked_out_at").notNull().defaultNow(),
});

export const insertCheckoutLogSchema = createInsertSchema(checkoutLogs).omit({ id: true, checkedOutAt: true });
export type InsertCheckoutLog = z.infer<typeof insertCheckoutLogSchema>;
export type CheckoutLog = typeof checkoutLogs.$inferSelect;

// ─── Properties ───────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  airbnbUrl: text("airbnb_url").notNull(),
  color: text("color").notNull().default("#E8F4FD"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url").default(""),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().default(""),
  airbnbUrl: z.string().url("Must be a valid URL"),
  color: z.string().default("#E8F4FD"),
  sortOrder: z.number().default(0),
  imageUrl: z.string().default(""),
});

export const updatePropertySchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  airbnbUrl: z.string().url().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().optional(),
});

export type CreatePropertyPayload = z.infer<typeof createPropertySchema>;
export type UpdatePropertyPayload = z.infer<typeof updatePropertySchema>;

// ─── Dashboard Apps ───────────────────────────────────────────────────────────

export const dashboardApps = pgTable("dashboard_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Package"),
  color: text("color").notNull().default("#E8F4FD"),
  iconColor: text("icon_color").notNull().default("#2196F3"),
  route: text("route").notNull(),
  available: boolean("available").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDashboardAppSchema = createInsertSchema(dashboardApps).omit({ id: true });
export type InsertDashboardApp = z.infer<typeof insertDashboardAppSchema>;
export type DashboardApp = typeof dashboardApps.$inferSelect;

export const createDashboardAppSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("Package"),
  color: z.string().default("#E8F4FD"),
  iconColor: z.string().default("#2196F3"),
  route: z.string().min(1),
  available: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const updateDashboardAppSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  iconColor: z.string().optional(),
  route: z.string().min(1).optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type CreateDashboardAppPayload = z.infer<typeof createDashboardAppSchema>;
export type UpdateDashboardAppPayload = z.infer<typeof updateDashboardAppSchema>;

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsRange = "week" | "month" | "alltime";

export type AnalyticsItemRow = {
  itemName: string;
  category: string;
  unitsSold: number;
  unitCost: string;
  totalCost: number;
};

export type AnalyticsCategoryRow = {
  category: string;
  unitsSold: number;
  totalCost: number;
};

export type AnalyticsMonthRow = {
  month: string;
  spend: number;
};

export type AnalyticsResponse = {
  range: AnalyticsRange;
  totalSpend: number;
  totalUnits: number;
  itemBreakdown: AnalyticsItemRow[];
  categoryTotals: AnalyticsCategoryRow[];
  monthlyTrend?: AnalyticsMonthRow[];
};
