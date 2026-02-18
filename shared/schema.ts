import { pgTable, serial, text, integer, boolean, numeric } from "drizzle-orm/pg-core";
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
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type RestockPayload = z.infer<typeof restockSchema>;
export type CreateItemPayload = z.infer<typeof createItemSchema>;
export type UpdateItemPayload = z.infer<typeof updateItemSchema>;
