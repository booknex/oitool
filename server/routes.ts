import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { checkoutSchema, restockSchema, createItemSchema, updateItemSchema, createDashboardAppSchema, updateDashboardAppSchema, createPropertySchema, updatePropertySchema } from "@shared/schema";

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

  // ─── URL Proxy (strips X-Frame-Options so pages embed in the app) ───────────

  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    if (!targetUrl) return res.status(400).send("URL required");

    try {
      const response = await fetch(targetUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        redirect: "follow",
      });

      const contentType = response.headers.get("content-type") ?? "text/html";
      res.set("Content-Type", contentType);

      // Strip all frame-blocking headers — do NOT forward them
      // (X-Frame-Options, Content-Security-Policy omitted intentionally)

      if (contentType.includes("text/html")) {
        let html = await response.text();
        // Inject <base> so relative URLs resolve against the original origin
        const origin = new URL(targetUrl).origin;
        html = html.replace(/(<head[^>]*>)/i, `$1<base href="${origin}/">`);
        res.send(html);
      } else {
        const buf = await response.arrayBuffer();
        res.send(Buffer.from(buf));
      }
    } catch {
      res.status(502).send("Failed to fetch the requested URL.");
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

  const httpServer = createServer(app);
  return httpServer;
}
