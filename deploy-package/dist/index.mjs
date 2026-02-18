var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/prod.ts
import express from "express";
import fs from "fs";
import path from "path";

// server/routes.ts
import { createServer } from "http";

// server/storage.ts
import { eq, sql, and, gte } from "drizzle-orm";

// server/db.ts
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  cartItemSchema: () => cartItemSchema,
  checkoutSchema: () => checkoutSchema,
  createItemSchema: () => createItemSchema,
  insertItemSchema: () => insertItemSchema,
  inventoryItems: () => inventoryItems,
  restockSchema: () => restockSchema,
  updateItemSchema: () => updateItemSchema
});
import { pgTable, serial, text, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(10),
  visible: boolean("visible").notNull().default(true)
});
var insertItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
var cartItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number().min(1)
});
var checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1)
});
var restockSchema = z.object({
  id: z.number(),
  quantity: z.number().min(1).optional()
});
var createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  maxStock: z.number().min(1),
  stock: z.number().min(0).optional()
});
var updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  maxStock: z.number().min(1).optional(),
  stock: z.number().min(0).optional(),
  visible: z.boolean().optional()
});

// server/db.ts
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}
var pool = new Pool({ connectionString: process.env.DATABASE_URL });
var db = drizzle(pool, { schema: schema_exports });

// server/storage.ts
import { drizzle as drizzle2 } from "drizzle-orm/node-postgres";
var DatabaseStorage = class {
  async getItems() {
    return await db.select().from(inventoryItems);
  }
  async getItem(id) {
    const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id));
    return item;
  }
  async checkout(cartItems) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const txDb = drizzle2(client);
      for (const cartItem of cartItems) {
        const [item] = await txDb.select().from(inventoryItems).where(eq(inventoryItems.id, cartItem.itemId));
        if (!item) {
          throw new Error(`Item with id ${cartItem.itemId} not found`);
        }
        if (item.stock < cartItem.quantity) {
          throw new Error(`Not enough stock for "${item.name}". Requested: ${cartItem.quantity}, Available: ${item.stock}`);
        }
        await txDb.update(inventoryItems).set({ stock: sql`${inventoryItems.stock} - ${cartItem.quantity}` }).where(and(eq(inventoryItems.id, cartItem.itemId), gte(inventoryItems.stock, cartItem.quantity)));
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
  async restockItem(id, quantity) {
    const item = await this.getItem(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    const newStock = quantity !== void 0 ? Math.min(quantity, item.maxStock) : item.maxStock;
    const [updated] = await db.update(inventoryItems).set({ stock: newStock }).where(eq(inventoryItems.id, id)).returning();
    return updated;
  }
  async restockAll() {
    await db.update(inventoryItems).set({ stock: sql`${inventoryItems.maxStock}` });
    return this.getItems();
  }
  async createItem(data) {
    const stock = data.stock !== void 0 ? Math.min(data.stock, data.maxStock) : data.maxStock;
    const [item] = await db.insert(inventoryItems).values({
      name: data.name,
      description: data.description,
      category: data.category,
      maxStock: data.maxStock,
      stock,
      visible: true
    }).returning();
    return item;
  }
  async updateItem(data) {
    const item = await this.getItem(data.id);
    if (!item) {
      throw new Error(`Item with id ${data.id} not found`);
    }
    const updates = {};
    if (data.name !== void 0) updates.name = data.name;
    if (data.description !== void 0) updates.description = data.description;
    if (data.category !== void 0) updates.category = data.category;
    if (data.maxStock !== void 0) updates.maxStock = data.maxStock;
    if (data.stock !== void 0) updates.stock = data.stock;
    if (data.visible !== void 0) updates.visible = data.visible;
    const newMaxStock = updates.maxStock ?? item.maxStock;
    const newStock = updates.stock ?? item.stock;
    if (newStock > newMaxStock) {
      updates.stock = newMaxStock;
    }
    if (Object.keys(updates).length === 0) {
      return item;
    }
    const [updated] = await db.update(inventoryItems).set(updates).where(eq(inventoryItems.id, data.id)).returning();
    return updated;
  }
  async deleteItem(id) {
    const item = await this.getItem(id);
    if (!item) {
      throw new Error(`Item with id ${id} not found`);
    }
    await db.delete(inventoryItems).where(eq(inventoryItems.id, id));
  }
};
var storage = new DatabaseStorage();

// server/routes.ts
async function registerRoutes(app2) {
  app2.get("/api/items", async (_req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });
  app2.post("/api/cart/checkout", async (req, res) => {
    try {
      const result = checkoutSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid checkout data", details: result.error.issues });
      }
      const updatedItems = await storage.checkout(result.data.items);
      res.json({ success: true, items: updatedItems });
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: "Checkout failed" });
    }
  });
  app2.post("/api/items/restock", async (req, res) => {
    try {
      const result = restockSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid restock data" });
      }
      const item = await storage.restockItem(result.data.id, result.data.quantity);
      res.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(500).json({ error: "Failed to restock item" });
    }
  });
  app2.post("/api/items/restock-all", async (_req, res) => {
    try {
      const items = await storage.restockAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to restock all items" });
    }
  });
  app2.post("/api/items", async (req, res) => {
    try {
      const result = createItemSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid item data", details: result.error.issues });
      }
      const item = await storage.createItem(result.data);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to create item" });
    }
  });
  app2.patch("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item id" });
      }
      const result = updateItemSchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ error: "Invalid update data", details: result.error.issues });
      }
      const item = await storage.updateItem(result.data);
      res.json(item);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(500).json({ error: "Failed to update item" });
    }
  });
  app2.delete("/api/items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid item id" });
      }
      await storage.deleteItem(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.status(500).json({ error: "Failed to delete item" });
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/prod.ts
var app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app.use(express.static(distPath));
  app.use((_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({ port, host: "0.0.0.0", reusePort: true }, () => {
    log(`serving on port ${port}`);
  });
})();
