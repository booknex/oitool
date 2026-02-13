import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkoutSchema, restockSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/items", async (_req, res) => {
    try {
      const items = await storage.getItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch items" });
    }
  });

  app.post("/api/cart/checkout", async (req, res) => {
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

  app.post("/api/items/restock", async (req, res) => {
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

  app.post("/api/items/restock-all", async (_req, res) => {
    try {
      const items = await storage.restockAll();
      res.json(items);
    } catch (error) {
      res.status(500).json({ error: "Failed to restock all items" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
