import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { unlockBadgeSchema } from "@shared/schema";
import { readFile } from "fs/promises";
import { join } from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/badges", async (_req, res) => {
    try {
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch badges" });
    }
  });

  app.post("/api/badges/unlock", async (req, res) => {
    try {
      const result = unlockBadgeSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const badge = await storage.unlockBadge(result.data.id);
      res.json(badge);
    } catch (error) {
      res.status(500).json({ error: "Failed to unlock badge" });
    }
  });

  app.post("/api/badges/reset", async (_req, res) => {
    try {
      await storage.resetBadges();
      const badges = await storage.getBadges();
      res.json(badges);
    } catch (error) {
      res.status(500).json({ error: "Failed to reset badges" });
    }
  });

  app.get("/api/badge-image", async (_req, res) => {
    try {
      const imagePath = join(process.cwd(), "attached_assets", "3d-game-rank-badges-set-isolated-background-vector-emblems-different-level-with-star_581695-235_1759974920746.avif");
      const imageBuffer = await readFile(imagePath);
      res.setHeader("Content-Type", "image/avif");
      res.send(imageBuffer);
    } catch (error) {
      res.status(404).json({ error: "Image not found" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
