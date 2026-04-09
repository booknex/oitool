import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkoutSchema, restockSchema, createItemSchema, updateItemSchema, createDashboardAppSchema, updateDashboardAppSchema, createPropertySchema, updatePropertySchema, type AnalyticsRange } from "@shared/schema";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded images as static files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // Upload endpoint — accepts base64 data URL, writes file to disk
  app.post("/api/upload", async (req, res) => {
    try {
      const { dataUrl } = req.body as { dataUrl: string };
      if (!dataUrl) return res.status(400).json({ error: "dataUrl required" });

      const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!match) return res.status(400).json({ error: "Invalid image data URL" });

      const [, ext, b64] = match;
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, filename), Buffer.from(b64, "base64"));

      res.json({ url: `/uploads/${filename}` });
    } catch {
      res.status(500).json({ error: "Upload failed" });
    }
  });
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

  // ─── Analytics ───────────────────────────────────────────────────────────

  app.get("/api/analytics", async (req, res) => {
    try {
      const rawRange = req.query.range as string | undefined;
      const range: AnalyticsRange =
        rawRange === "month" || rawRange === "alltime" ? rawRange : "week";
      const data = await storage.getAnalytics(range);
      res.json(data);
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // ─── Dashboard Apps ───────────────────────────────────────────────────────

  app.get("/api/dashboard-apps", async (_req, res) => {
    try {
      const apps = await storage.getDashboardApps();
      res.json(apps);
    } catch (error) {
      console.error("[dashboard-apps] ERROR:", error);
      res.status(500).json({ error: "Failed to fetch dashboard apps", detail: error instanceof Error ? error.message : String(error) });
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

  // ─── Properties ──────────────────────────────────────────────────────────────

  app.get("/api/properties", async (_req, res) => {
    try {
      const props = await storage.getProperties();
      res.json(props);
    } catch {
      res.status(500).json({ error: "Failed to fetch properties" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const result = createPropertySchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid property data", details: result.error.issues });
      }
      const prop = await storage.createProperty(result.data);
      res.status(201).json(prop);
    } catch {
      res.status(500).json({ error: "Failed to create property" });
    }
  });

  app.patch("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid property id" });
      const result = updatePropertySchema.safeParse({ ...req.body, id });
      if (!result.success) {
        return res.status(400).json({ error: "Invalid update data", details: result.error.issues });
      }
      const updated = await storage.updateProperty(result.data);
      res.json(updated);
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(500).json({ error: "Failed to update property" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid property id" });
      await storage.deleteProperty(id);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof Error && error.message.includes("not found")) {
        return res.status(404).json({ error: "Property not found" });
      }
      res.status(500).json({ error: "Failed to delete property" });
    }
  });

  // ─── Calendar Sync ───────────────────────────────────────────────────────────

  app.get("/api/properties/:id/bookings", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid property id" });
      const data = await storage.getPropertyBookings(id);
      res.json(data);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to fetch bookings";
      if (msg.includes("not found")) return res.status(404).json({ error: "Property not found" });
      res.status(500).json({ error: msg });
    }
  });

  app.post("/api/properties/:id/sync", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid property id" });
      const result = await storage.syncPropertyCalendar(id);
      res.json({ success: true, count: result.count, lastSynced: result.lastSynced });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Sync failed";
      if (msg.includes("not found")) return res.status(404).json({ error: "Property not found" });
      if (msg.includes("No iCal URL")) return res.status(400).json({ error: msg });
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/bookings/upcoming", async (_req, res) => {
    try {
      const data = await storage.getUpcomingBookings();
      res.json(data);
    } catch {
      res.status(500).json({ error: "Failed to fetch bookings" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
