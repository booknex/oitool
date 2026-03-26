import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkoutSchema, restockSchema, createItemSchema, updateItemSchema, createDashboardAppSchema, updateDashboardAppSchema } from "@shared/schema";

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

  app.post("/api/items", async (req, res) => {
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

  app.patch("/api/items/:id", async (req, res) => {
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

  app.delete("/api/items/:id", async (req, res) => {
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

  // ─── Dashboard Apps ───────────────────────────────────────────────────────

  app.get("/api/dashboard-apps", async (_req, res) => {
    try {
      const apps = await storage.getDashboardApps();
      res.json(apps);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch dashboard apps" });
    }
  });

  app.post("/api/dashboard-apps", async (req, res) => {
    try {
      const result = createDashboardAppSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid app data", details: result.error.issues });
      }
      const app = await storage.createDashboardApp(result.data);
      res.json(app);
    } catch (error) {
      res.status(500).json({ error: "Failed to create dashboard app" });
    }
  });

  app.patch("/api/dashboard-apps/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid app id" });
      }
      const result = updateDashboardAppSchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ error: "Invalid update data", details: result.error.issues });
      }
      const updated = await storage.updateDashboardApp(result.data);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "App not found" });
      }
      res.status(500).json({ error: "Failed to update dashboard app" });
    }
  });

  app.delete("/api/dashboard-apps/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid app id" });
      }
      await storage.deleteDashboardApp(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "App not found" });
      }
      res.status(500).json({ error: "Failed to delete dashboard app" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
