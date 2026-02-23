import { eq, sql, and, gte } from "drizzle-orm";
import { db } from "./db";
import { pool } from "./db";
import { drizzle } from "drizzle-orm/node-postgres";
import { inventoryItems, type InventoryItem, type CartItem, type CreateItemPayload, type UpdateItemPayload } from "@shared/schema";

export interface IStorage {
  getItems(): Promise<InventoryItem[]>;
  getItem(id: number): Promise<InventoryItem | undefined>;
  checkout(items: CartItem[]): Promise<InventoryItem[]>;
  restockItem(id: number, quantity?: number): Promise<InventoryItem>;
  restockAll(): Promise<InventoryItem[]>;
  createItem(data: CreateItemPayload): Promise<InventoryItem>;
  updateItem(data: UpdateItemPayload): Promise<InventoryItem>;
  deleteItem(id: number): Promise<void>;
}

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
}

export const storage = new DatabaseStorage();
