import { z } from "zod";

export const inventoryItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string(),
  category: z.string(),
  stock: z.number().min(0),
  maxStock: z.number().min(1),
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

export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type RestockPayload = z.infer<typeof restockSchema>;
