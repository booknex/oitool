import { type InventoryItem, type CartItem } from "@shared/schema";

export interface IStorage {
  getItems(): Promise<InventoryItem[]>;
  getItem(id: number): Promise<InventoryItem | undefined>;
  checkout(items: CartItem[]): Promise<InventoryItem[]>;
  restockItem(id: number, quantity?: number): Promise<InventoryItem>;
  restockAll(): Promise<InventoryItem[]>;
}

const initialItems: InventoryItem[] = [
  { id: 1, name: "All-Purpose Cleaner", description: "Multi-surface cleaning spray for counters, sinks, and appliances", category: "Sprays", stock: 8, maxStock: 10 },
  { id: 2, name: "Glass Cleaner", description: "Streak-free window and mirror cleaning solution", category: "Sprays", stock: 6, maxStock: 10 },
  { id: 3, name: "Disinfectant Spray", description: "Hospital-grade disinfectant for bathrooms and high-touch areas", category: "Sprays", stock: 5, maxStock: 10 },
  { id: 4, name: "Microfiber Cloths", description: "Reusable lint-free cloths for dusting and polishing", category: "Cloths & Wipes", stock: 12, maxStock: 20 },
  { id: 5, name: "Sponges", description: "Heavy-duty scrub sponges for kitchen and bathroom cleaning", category: "Cloths & Wipes", stock: 10, maxStock: 15 },
  { id: 6, name: "Trash Bags", description: "Large 13-gallon drawstring trash bags", category: "Supplies", stock: 20, maxStock: 30 },
  { id: 7, name: "Toilet Bowl Cleaner", description: "Deep cleaning gel for toilet bowls and rims", category: "Bathroom", stock: 4, maxStock: 10 },
  { id: 8, name: "Floor Cleaner", description: "Concentrated multi-floor mopping solution", category: "Floors", stock: 3, maxStock: 8 },
  { id: 9, name: "Dusting Spray", description: "Furniture polish and dusting spray", category: "Sprays", stock: 7, maxStock: 10 },
  { id: 10, name: "Rubber Gloves", description: "Disposable nitrile gloves for hygiene protection", category: "Supplies", stock: 15, maxStock: 25 },
  { id: 11, name: "Mop Heads", description: "Replacement mop heads for wet mopping", category: "Floors", stock: 2, maxStock: 6 },
  { id: 12, name: "Vacuum Bags", description: "Replacement bags for commercial vacuum cleaners", category: "Supplies", stock: 5, maxStock: 10 },
];

export class MemStorage implements IStorage {
  private items: Map<number, InventoryItem>;

  constructor() {
    this.items = new Map();
    initialItems.forEach(item => this.items.set(item.id, { ...item }));
  }

  async getItems(): Promise<InventoryItem[]> {
    return Array.from(this.items.values());
  }

  async getItem(id: number): Promise<InventoryItem | undefined> {
    return this.items.get(id);
  }

  async checkout(cartItems: CartItem[]): Promise<InventoryItem[]> {
    for (const cartItem of cartItems) {
      const item = this.items.get(cartItem.itemId);
      if (!item) {
        throw new Error(`Item with id ${cartItem.itemId} not found`);
      }
      if (item.stock < cartItem.quantity) {
        throw new Error(`Not enough stock for "${item.name}". Requested: ${cartItem.quantity}, Available: ${item.stock}`);
      }
    }

    for (const cartItem of cartItems) {
      const item = this.items.get(cartItem.itemId)!;
      this.items.set(cartItem.itemId, {
        ...item,
        stock: item.stock - cartItem.quantity,
      });
    }

    return Array.from(this.items.values());
  }

  async restockItem(id: number, quantity?: number): Promise<InventoryItem> {
    const item = this.items.get(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }

    const restocked: InventoryItem = {
      ...item,
      stock: quantity !== undefined ? Math.min(quantity, item.maxStock) : item.maxStock,
    };

    this.items.set(id, restocked);
    return restocked;
  }

  async restockAll(): Promise<InventoryItem[]> {
    for (const [id, item] of this.items) {
      this.items.set(id, { ...item, stock: item.maxStock });
    }
    return Array.from(this.items.values());
  }
}

export const storage = new MemStorage();
