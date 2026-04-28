import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { isStripeConfigured, getUncachableStripeClient } from "./stripeClient";
import { checkoutSchema, restockSchema, createItemSchema, updateItemSchema, createDashboardAppSchema, updateDashboardAppSchema, createPropertySchema, updatePropertySchema, createClientSchema, updateClientSchema, createInvoiceSchema, updateInvoiceSchema, createSaasAffiliateSchema, updateSaasAffiliateSchema, createSaasCompanySchema, updateSaasCompanySchema, createCatalogItemSchema, updateCatalogItemSchema, createStaffSchema, updateStaffSchema, createJobSchema, updateJobSchema, pingLocationSchema, type AnalyticsRange } from "@shared/schema";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// ─── Geocoding: US Census (primary) → Nominatim (fallback) ───────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!address?.trim()) return null;

  // 1. US Census Geocoder — best for US street addresses
  try {
    const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(address)}&benchmark=2020&format=json`;
    const res = await fetch(url, { headers: { "User-Agent": "CleanexApp/1.0 contact@cleanexinc.com" } });
    if (res.ok) {
      const data: { result?: { addressMatches?: { coordinates: { x: number; y: number } }[] } } = await res.json();
      const match = data?.result?.addressMatches?.[0];
      if (match) return { lat: match.coordinates.y, lng: match.coordinates.x };
    }
  } catch { /* fall through to Nominatim */ }

  // 2. Nominatim (OpenStreetMap) — good fallback for non-US or city-level
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, { headers: { "User-Agent": "CleanexApp/1.0 contact@cleanexinc.com" } });
    if (res.ok) {
      const data: { lat: string; lon: string }[] = await res.json();
      if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch { /* silently skip */ }

  return null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded images as static files
  app.use("/uploads", express.static(UPLOADS_DIR));

  // ─── Public signup (landing page) ─────────────────────────────────────────
  app.post("/api/public/signup", async (req, res) => {
    try {
      const schema = z.object({
        firstName: z.string().trim().min(1, "First name required"),
        lastName: z.string().trim().min(1, "Last name required"),
        businessName: z.string().trim().min(1, "Business name required"),
        email: z.string().trim().email("Valid email required"),
        phone: z.string().trim().default(""),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });
      const { firstName, lastName, businessName, email, phone } = parsed.data;
      const company = await storage.createSaasCompany({
        name: businessName,
        ownerName: `${firstName} ${lastName}`.trim(),
        email,
        phone,
        status: "trial",
        plan: "starter",
        mrr: 0,
        affiliateId: null,
        notes: "Signed up via landing page",
        address: "",
        city: "",
        state: "",
        country: "",
        zip: "",
        website: "",
      });
      res.status(201).json({ id: company.id, name: company.name });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Signup failed";
      res.status(500).json({ error: msg });
    }
  });

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

  app.get("/api/items/barcode/:code", async (req, res) => {
    try {
      const item = await storage.getItemByBarcode(req.params.code);
      if (!item) return res.status(404).json({ error: "Item not found" });
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to lookup barcode" });
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
      if (error instanceof Error && error.message.includes("unique") && error.message.toLowerCase().includes("barcode")) {
        return res.status(409).json({ error: "That barcode is already assigned to another item." });
      }
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
      if (error instanceof Error && error.message.includes("unique") && error.message.toLowerCase().includes("barcode")) {
        return res.status(409).json({ error: "That barcode is already assigned to another item." });
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
      // Geocode in background then update lat/lng
      if (prop.address) {
        geocodeAddress(prop.address).then(coords => {
          if (coords) storage.updateProperty({ id: prop.id, lat: coords.lat, lng: coords.lng }).catch(() => null);
        });
      }
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
      // Re-geocode if address changed
      if (result.data.address !== undefined && result.data.address !== "") {
        geocodeAddress(result.data.address).then(coords => {
          if (coords) storage.updateProperty({ id, lat: coords.lat, lng: coords.lng }).catch(() => null);
        });
      }
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

  // ─── Clients ───────────────────────────────────────────────────────────────

  app.get("/api/clients", async (_req, res) => {
    try {
      res.json(await storage.getClients());
    } catch {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(Number(req.params.id));
      if (!client) return res.status(404).json({ error: "Client not found" });
      res.json(client);
    } catch {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const parsed = createClientSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      const client = await storage.createClient(parsed.data);
      // Geocode property address in background then update lat/lng
      const fullAddress = [parsed.data.propertyStreet, parsed.data.propertyCity, parsed.data.propertyState, parsed.data.propertyZip]
        .filter(Boolean).join(", ");
      if (fullAddress) {
        geocodeAddress(fullAddress).then(coords => {
          if (coords) storage.updateClientCoords(client.id, coords.lat, coords.lng).catch(() => null);
        }).catch(() => null);
      }
      res.status(201).json(client);
    } catch {
      res.status(500).json({ error: "Failed to create client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateClientSchema.safeParse({ id, ...req.body });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      const result = await storage.updateClient(parsed.data);
      // Re-geocode if property address fields changed
      if (
        parsed.data.propertyStreet !== undefined ||
        parsed.data.propertyCity !== undefined ||
        parsed.data.propertyState !== undefined ||
        parsed.data.propertyZip !== undefined
      ) {
        const fullAddress = [result.propertyStreet, result.propertyCity, result.propertyState, result.propertyZip]
          .filter(Boolean).join(", ");
        if (fullAddress) {
          geocodeAddress(fullAddress).then(coords => {
            if (coords) storage.updateClientCoords(id, coords.lat, coords.lng).catch(() => null);
          }).catch(() => null);
        }
      }
      res.json(result);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update client";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteClient(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });

  // ─── Invoices ──────────────────────────────────────────────────────────────

  app.get("/api/invoices", async (_req, res) => {
    try {
      res.json(await storage.getInvoices());
    } catch {
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const inv = await storage.getInvoice(id);
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      res.json(inv);
    } catch {
      res.status(500).json({ error: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", async (req, res) => {
    try {
      const parsed = createInvoiceSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.status(201).json(await storage.createInvoice(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create invoice";
      res.status(500).json({ error: msg });
    }
  });

  app.patch("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateInvoiceSchema.safeParse({ id, ...req.body });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.json(await storage.updateInvoice(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update invoice";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteInvoice(id);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Failed to delete invoice" });
    }
  });

  // ─── Stripe: Generate payment link for an invoice ─────────────────────────
  app.post("/api/invoices/:id/payment-link", async (req, res) => {
    if (!isStripeConfigured()) {
      return res.status(503).json({ error: "Stripe is not connected. Please add your Stripe API key to enable payments." });
    }
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ error: "Invoice not found" });

      if (invoice.status === "paid") {
        return res.status(400).json({ error: "Invoice is already paid" });
      }

      const total = Number(invoice.total);
      if (total <= 0) {
        return res.status(400).json({ error: "Invoice total must be greater than zero" });
      }

      const stripe = await getUncachableStripeClient();
      const client = invoice.client;

      // Find or create Stripe customer for this client
      let stripeCustomerId: string | null = null;
      if (client) {
        const rawClient = await storage.getClient(client.id);
        stripeCustomerId = rawClient?.stripeCustomerId ?? null;

        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            name: client.name,
            email: client.email || undefined,
            metadata: { clientId: String(client.id) },
          });
          stripeCustomerId = customer.id;
          await storage.updateClientStripeCustomerId(client.id, stripeCustomerId);
        }
      }

      // Create a Stripe Checkout Session (one-time payment)
      const baseUrl = req.headers.origin || `${req.protocol}://${req.get("host")}`;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer: stripeCustomerId ?? undefined,
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: Math.round(total * 100),
              product_data: {
                name: `Invoice ${invoice.invoiceNumber}`,
                description: invoice.notes || `Payment for ${invoice.client?.name ?? "client"}`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${baseUrl}/invoicing/invoices/${id}?paid=1`,
        cancel_url: `${baseUrl}/invoicing/invoices/${id}`,
        metadata: { invoiceId: String(id), invoiceNumber: invoice.invoiceNumber },
      });

      // Save checkout session info on invoice
      await storage.updateInvoice({
        id,
        stripePaymentIntentId: session.payment_intent as string | null,
        stripeCheckoutUrl: session.url,
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (err: any) {
      const msg = err.message || "Failed to create payment link";
      res.status(500).json({ error: msg });
    }
  });

  // ─── Catalog Items ────────────────────────────────────────────────────────

  app.get("/api/catalog-items", async (_req, res) => {
    try {
      res.json(await storage.getCatalogItems());
    } catch { res.status(500).json({ error: "Failed to fetch catalog items" }); }
  });

  app.post("/api/catalog-items", async (req, res) => {
    try {
      const result = createCatalogItemSchema.safeParse(req.body);
      if (!result.success) return res.status(400).json({ error: "Invalid data", details: result.error.issues });
      res.json(await storage.createCatalogItem(result.data));
    } catch { res.status(500).json({ error: "Failed to create catalog item" }); }
  });

  app.patch("/api/catalog-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const result = updateCatalogItemSchema.safeParse({ ...req.body, id });
      if (!result.success) return res.status(400).json({ error: "Invalid data", details: result.error.issues });
      res.json(await storage.updateCatalogItem(result.data));
    } catch (e) {
      if (e instanceof Error && e.message.includes("not found")) return res.status(404).json({ error: e.message });
      res.status(500).json({ error: "Failed to update catalog item" });
    }
  });

  app.delete("/api/catalog-items/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteCatalogItem(id);
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete catalog item" }); }
  });

  // ─── Affiliate Portal Auth ────────────────────────────────────────────────

  app.post("/api/affiliate/login", async (req, res) => {
    try {
      const { email, accessCode } = req.body;
      if (!email || !accessCode) return res.status(400).json({ error: "Email and access code required" });
      const affiliates = await storage.getSaasAffiliates();
      const aff = affiliates.find(a =>
        a.email.toLowerCase() === email.toLowerCase() &&
        a.accessCode === accessCode &&
        a.status === "active"
      );
      if (!aff) return res.status(401).json({ error: "Invalid email or access code" });
      req.session.affiliateId = aff.id;
      res.json({ id: aff.id, name: aff.name, email: aff.email });
    } catch { res.status(500).json({ error: "Login failed" }); }
  });

  app.post("/api/affiliate/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  // ─── Admin portal auth ────────────────────────────────────────────────────
  app.post("/api/admin/login", (req, res) => {
    const { email, password } = req.body ?? {};
    const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? "admin@cleanex.com";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "cleanex2024";
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    if (email.toLowerCase().trim() !== ADMIN_EMAIL.toLowerCase() || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    req.session.isAdmin = true;
    res.json({ ok: true, email: ADMIN_EMAIL });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.session.destroy(() => res.json({ success: true }));
  });

  app.get("/api/admin/me", (req, res) => {
    if (!req.session.isAdmin) return res.status(401).json({ error: "Not authenticated" });
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@cleanex.com";
    res.json({ email: ADMIN_EMAIL });
  });

  app.get("/api/affiliate/me", async (req, res) => {
    try {
      if (!req.session.affiliateId) return res.status(401).json({ error: "Not authenticated" });
      const affiliates = await storage.getSaasAffiliates();
      const aff = affiliates.find(a => a.id === req.session.affiliateId);
      if (!aff) return res.status(401).json({ error: "Affiliate not found" });
      const companies = await storage.getSaasCompanies();
      const myCompanies = companies.filter(c => c.affiliateId === aff.id);
      const totalMRR = myCompanies.reduce((s, c) => s + Number(c.mrr), 0);
      const commission = totalMRR * (Number(aff.commissionRate) / 100);
      res.json({
        affiliate: aff,
        stats: {
          totalCompanies: myCompanies.length,
          activeCompanies: myCompanies.filter(c => c.status === "active").length,
          trialCompanies: myCompanies.filter(c => c.status === "trial").length,
          totalMRR,
          commission,
        },
        companies: myCompanies,
      });
    } catch { res.status(500).json({ error: "Failed to fetch portal data" }); }
  });

  // ─── Affiliate: Create Sub-Account ────────────────────────────────────────
  app.post("/api/affiliate/companies", async (req, res) => {
    try {
      if (!req.session.affiliateId) return res.status(401).json({ error: "Not authenticated" });
      const affiliateId = req.session.affiliateId;

      const bodySchema = z.object({
        name: z.string().trim().min(1, "Business name is required"),
        ownerName: z.string().default(""),
        email: z.string().default(""),
        phone: z.string().default(""),
        address: z.string().default(""),
        city: z.string().default(""),
        state: z.string().default(""),
        country: z.string().default(""),
        zip: z.string().default(""),
        website: z.string().default(""),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors[0]?.message ?? "Invalid input" });

      const company = await storage.createSaasCompany({
        ...parsed.data,
        status: "trial",
        plan: "starter",
        mrr: 0,
        affiliateId,
        notes: "",
      });
      res.status(201).json(company);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create company";
      res.status(500).json({ error: msg });
    }
  });

  // ─── SaaS Affiliates ───────────────────────────────────────────────────────

  app.get("/api/saas/affiliates", async (_req, res) => {
    try { res.json(await storage.getSaasAffiliates()); }
    catch { res.status(500).json({ error: "Failed to fetch affiliates" }); }
  });

  app.post("/api/saas/affiliates", async (req, res) => {
    try {
      const parsed = createSaasAffiliateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.status(201).json(await storage.createSaasAffiliate(parsed.data));
    } catch { res.status(500).json({ error: "Failed to create affiliate" }); }
  });

  app.patch("/api/saas/affiliates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateSaasAffiliateSchema.safeParse({ id, ...req.body });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.json(await storage.updateSaasAffiliate(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update affiliate";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/saas/affiliates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteSaasAffiliate(id);
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete affiliate" }); }
  });

  // ─── SaaS Companies ────────────────────────────────────────────────────────

  app.get("/api/saas/companies", async (_req, res) => {
    try { res.json(await storage.getSaasCompanies()); }
    catch { res.status(500).json({ error: "Failed to fetch companies" }); }
  });

  app.post("/api/saas/companies", async (req, res) => {
    try {
      const parsed = createSaasCompanySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.status(201).json(await storage.createSaasCompany(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create company";
      res.status(500).json({ error: msg });
    }
  });

  app.patch("/api/saas/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateSaasCompanySchema.safeParse({ id, ...req.body });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.json(await storage.updateSaasCompany(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update company";
      res.status(500).json({ error: msg });
    }
  });

  app.delete("/api/saas/companies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteSaasCompany(id);
      res.json({ success: true });
    } catch { res.status(500).json({ error: "Failed to delete company" }); }
  });

  // ─── Staff ────────────────────────────────────────────────────────────────

  app.get("/api/staff", async (_req, res) => {
    try { res.json(await storage.getStaff()); }
    catch { res.status(500).json({ error: "Failed to fetch staff" }); }
  });

  app.post("/api/staff", async (req, res) => {
    try {
      const parsed = createStaffSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.status(201).json(await storage.createStaffMember(parsed.data));
    } catch { res.status(500).json({ error: "Failed to create staff member" }); }
  });

  app.patch("/api/staff/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateStaffSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.errors });
      res.json(await storage.updateStaffMember(parsed.data));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update staff member";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  app.delete("/api/staff/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteStaffMember(id);
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete staff member";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  // ── Cleaning Jobs (Scheduling) ───────────────────────────────────────────────
  app.get("/api/jobs", async (req, res) => {
    try {
      const filters: { staffId?: number; week?: string } = {};
      if (req.query.staffId) filters.staffId = parseInt(req.query.staffId as string, 10);
      if (req.query.week) filters.week = req.query.week as string;
      const jobs = await storage.getJobs(filters);
      res.json(jobs);
    } catch { res.status(500).json({ error: "Failed to fetch jobs" }); }
  });

  app.post("/api/jobs", async (req, res) => {
    try {
      const parsed = createJobSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
      const job = await storage.createJob(parsed.data);
      res.status(201).json(job);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create job";
      res.status(500).json({ error: msg });
    }
  });

  app.patch("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      const parsed = updateJobSchema.safeParse({ ...req.body, id });
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
      const job = await storage.updateJob(parsed.data);
      res.json(job);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to update job";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  app.delete("/api/jobs/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });
      await storage.deleteJob(id);
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to delete job";
      res.status(msg.includes("not found") ? 404 : 500).json({ error: msg });
    }
  });

  // ── Location Tracking ───────────────────────────────────────────────────────
  app.post("/api/location/ping", async (req, res) => {
    try {
      const parsed = pingLocationSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message });
      // Validate that the staff member exists and is active
      const staffList = await storage.getStaff();
      const member = staffList.find(s => s.id === parsed.data.staffId);
      if (!member) return res.status(404).json({ error: "Staff member not found" });
      if (member.status !== "active") return res.status(400).json({ error: "Staff member is not active" });
      await storage.pingLocation(parsed.data);
      res.json({ success: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to ping location";
      res.status(500).json({ error: msg });
    }
  });

  app.get("/api/location/active", async (_req, res) => {
    try {
      const locations = await storage.getActiveLocations();
      res.json(locations);
    } catch { res.status(500).json({ error: "Failed to fetch locations" }); }
  });

  // ── Company Settings ────────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getCompanySettings();
      res.json(settings);
    } catch { res.status(500).json({ error: "Failed to load settings" }); }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const updated = await storage.updateCompanySettings(req.body);
      res.json(updated);
    } catch { res.status(500).json({ error: "Failed to update settings" }); }
  });

  const httpServer = createServer(app);
  return httpServer;
}
