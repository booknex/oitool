import { z } from "zod";

export const inventoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  stock: z.number().min(0),
  maxStock: z.number().min(1),
  visible: z.boolean(),
});

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
});

export const updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  maxStock: z.number().min(1).optional(),
  stock: z.number().min(0).optional(),
  visible: z.boolean().optional(),
});

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type RestockPayload = z.infer<typeof restockSchema>;
export type CreateItemPayload = z.infer<typeof createItemSchema>;
export type UpdateItemPayload = z.infer<typeof updateItemSchema>;
