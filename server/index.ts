import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { isStripeConfigured, getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { runMigrations } from "stripe-replit-sync";

declare module "express-session" {
  interface SessionData {
    affiliateId?: number;
  }
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !isStripeConfigured()) {
    log("[stripe] Stripe not configured — skipping initialization");
    return;
  }
  try {
    log("[stripe] Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    log("[stripe] Schema ready");

    const stripeSync = await getStripeSync();

    const webhookBaseUrl = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    if (process.env.REPLIT_DOMAINS) {
      await stripeSync.findOrCreateManagedWebhook(`${webhookBaseUrl}/api/stripe/webhook`);
      log("[stripe] Webhook configured");
    }

    stripeSync.syncBackfill()
      .then(() => log("[stripe] Backfill sync complete"))
      .catch((err: any) => log(`[stripe] Backfill error: ${err.message}`));
  } catch (err: any) {
    log(`[stripe] Initialization failed (non-fatal): ${err.message}`);
  }
}

const app = express();
app.set("etag", false);

// ── Stripe webhook — MUST be before express.json() ──────────────────────────
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }
    const sig = Array.isArray(signature) ? signature[0] : signature;
    try {
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      log(`[stripe] Webhook error: ${err.message}`);
      res.status(400).json({ error: "Webhook processing error" });
    }
  }
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(session({
  secret: process.env.SESSION_SECRET || "cleanex-secret-2024",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  },
}));
app.use("/api", (_req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await initStripe();
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Background iCal sync — runs every 15 minutes
    const SYNC_INTERVAL_MS = 15 * 60 * 1000;
    const runSync = async () => {
      try {
        await storage.syncAllCalendars();
        log("[ical] Background sync complete");
      } catch (e) {
        log(`[ical] Background sync error: ${e}`);
      }
    };
    // Initial sync after 10 seconds (give DB a moment)
    setTimeout(runSync, 10_000);
    setInterval(runSync, SYNC_INTERVAL_MS);
  });
})();
