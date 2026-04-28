import { pgTable, serial, text, integer, boolean, numeric, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  maxStock: integer("max_stock").notNull().default(10),
  visible: boolean("visible").notNull().default(true),
  cost: numeric("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  itemType: text("item_type").notNull().default("consumable"),
  lowStockThreshold: integer("low_stock_threshold"),
  barcode: text("barcode").unique(),
});

export const insertItemSchema = createInsertSchema(inventoryItems).omit({ id: true });
export type InsertItem = z.infer<typeof insertItemSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;

export const cartItemSchema = z.object({
  itemId: z.number(),
  quantity: z.number().min(1),
});

export const checkoutSchema = z.object({
  items: z.array(cartItemSchema).min(1),
});

export const restockSchema = z.object({
  id: z.number(),
  quantity: z.number().min(1).optional(),
});

export const createItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  maxStock: z.number().min(1),
  stock: z.number().min(0).optional(),
  cost: z.string().optional(),
  itemType: z.enum(["consumable", "cleaning"]).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  barcode: z.string().nullable().optional(),
});

export const updateItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  maxStock: z.number().min(1).optional(),
  stock: z.number().min(0).optional(),
  visible: z.boolean().optional(),
  cost: z.string().optional(),
  itemType: z.enum(["consumable", "cleaning"]).optional(),
  lowStockThreshold: z.number().min(0).nullable().optional(),
  barcode: z.string().nullable().optional(),
});

export type CartItem = z.infer<typeof cartItemSchema>;
export type CheckoutPayload = z.infer<typeof checkoutSchema>;
export type RestockPayload = z.infer<typeof restockSchema>;
export type CreateItemPayload = z.infer<typeof createItemSchema>;
export type UpdateItemPayload = z.infer<typeof updateItemSchema>;

// ─── Checkout Logs ─────────────────────────────────────────────────────────────

export const checkoutLogs = pgTable("checkout_logs", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull(),
  itemName: text("item_name").notNull(),
  category: text("category").notNull().default(""),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  checkedOutAt: timestamp("checked_out_at").notNull().defaultNow(),
});

export const insertCheckoutLogSchema = createInsertSchema(checkoutLogs).omit({ id: true, checkedOutAt: true });
export type InsertCheckoutLog = z.infer<typeof insertCheckoutLogSchema>;
export type CheckoutLog = typeof checkoutLogs.$inferSelect;

// ─── Properties ───────────────────────────────────────────────────────────────

export const properties = pgTable("properties", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull().default(""),
  airbnbUrl: text("airbnb_url").notNull(),
  color: text("color").notNull().default("#E8F4FD"),
  sortOrder: integer("sort_order").notNull().default(0),
  imageUrl: text("image_url").default(""),
  icalUrl: text("ical_url"),
  lastSynced: timestamp("last_synced"),
  lat: numeric("lat", { precision: 12, scale: 8 }),
  lng: numeric("lng", { precision: 12, scale: 8 }),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

export const createPropertySchema = z.object({
  name: z.string().min(1),
  address: z.string().default(""),
  airbnbUrl: z.string().default(""),
  color: z.string().default("#E8F4FD"),
  sortOrder: z.number().default(0),
  imageUrl: z.string().default(""),
  icalUrl: z.string().default(""),
});

export const updatePropertySchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  address: z.string().optional(),
  airbnbUrl: z.string().optional(),
  color: z.string().optional(),
  sortOrder: z.number().optional(),
  imageUrl: z.string().optional(),
  icalUrl: z.string().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export type CreatePropertyPayload = z.infer<typeof createPropertySchema>;
export type UpdatePropertyPayload = z.infer<typeof updatePropertySchema>;

// ─── Bookings (from iCal sync) ────────────────────────────────────────────────

export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  propertyId: integer("property_id").notNull().references(() => properties.id, { onDelete: "cascade" }),
  uid: text("uid").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  summary: text("summary").notNull().default(""),
  syncedAt: timestamp("synced_at").notNull().defaultNow(),
}, (table) => ({
  propertyUidUnique: unique("bookings_property_uid_uniq").on(table.propertyId, table.uid),
}));

export type Booking = typeof bookings.$inferSelect;

export type BookingInfo = {
  startDate: string;
  endDate: string;
  summary: string;
};

export type UpcomingBookings = Record<number, BookingInfo[]>;

// ─── SaaS Affiliates ──────────────────────────────────────────────────────────

export const saasAffiliates = pgTable("saas_affiliates", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }).notNull().default("20"),
  status: text("status").notNull().default("active"),
  accessCode: text("access_code").notNull().default(""),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SaasAffiliate = typeof saasAffiliates.$inferSelect;

export const createSaasAffiliateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().default(""),
  phone: z.string().default(""),
  commissionRate: z.number().min(0).max(100).default(20),
  status: z.enum(["active", "inactive"]).default("active"),
  accessCode: z.string().default(""),
  notes: z.string().default(""),
});

export const updateSaasAffiliateSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  accessCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateSaasAffiliatePayload = z.infer<typeof createSaasAffiliateSchema>;
export type UpdateSaasAffiliatePayload = z.infer<typeof updateSaasAffiliateSchema>;

// ─── SaaS Companies (tenants) ─────────────────────────────────────────────────

export const saasCompanies = pgTable("saas_companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  status: text("status").notNull().default("trial"),
  plan: text("plan").notNull().default("starter"),
  mrr: numeric("mrr", { precision: 10, scale: 2 }).notNull().default("0"),
  affiliateId: integer("affiliate_id").references(() => saasAffiliates.id),
  trialEndsAt: timestamp("trial_ends_at"),
  notes: text("notes").notNull().default(""),
  address: text("address").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  country: text("country").notNull().default(""),
  zip: text("zip").notNull().default(""),
  website: text("website").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type SaasCompany = typeof saasCompanies.$inferSelect;

export type SaasCompanyWithAffiliate = SaasCompany & {
  affiliate: SaasAffiliate | null;
};

export const createSaasCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  ownerName: z.string().default(""),
  email: z.string().default(""),
  phone: z.string().default(""),
  status: z.enum(["trial", "active", "paused", "cancelled"]).default("trial"),
  plan: z.enum(["starter", "pro", "enterprise"]).default("starter"),
  mrr: z.number().min(0).default(0),
  affiliateId: z.number().nullable().default(null),
  trialEndsAt: z.string().nullable().optional(),
  notes: z.string().default(""),
  address: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  country: z.string().default(""),
  zip: z.string().default(""),
  website: z.string().default(""),
});

export const updateSaasCompanySchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  ownerName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  status: z.enum(["trial", "active", "paused", "cancelled"]).optional(),
  plan: z.enum(["starter", "pro", "enterprise"]).optional(),
  mrr: z.number().min(0).optional(),
  affiliateId: z.number().nullable().optional(),
  trialEndsAt: z.string().nullable().optional(),
  notes: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zip: z.string().optional(),
  website: z.string().optional(),
});

export type CreateSaasCompanyPayload = z.infer<typeof createSaasCompanySchema>;
export type UpdateSaasCompanyPayload = z.infer<typeof updateSaasCompanySchema>;

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  // Core
  name: text("name").notNull(),           // display name (used on invoices)
  customerType: text("customer_type").notNull().default("business"),
  // Contact
  salutation: text("salutation").notNull().default(""),
  firstName: text("first_name").notNull().default(""),
  lastName: text("last_name").notNull().default(""),
  companyName: text("company_name").notNull().default(""),
  // Property address (the property to be serviced)
  propertyStreet: text("property_street").notNull().default(""),
  propertyCity: text("property_city").notNull().default(""),
  propertyState: text("property_state").notNull().default(""),
  propertyZip: text("property_zip").notNull().default(""),
  propertyFax: text("property_fax").notNull().default(""),
  currency: text("currency").notNull().default("USD"),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  customerLanguage: text("customer_language").notNull().default("English"),
  // Legacy combined address (kept for compat)
  address: text("address").notNull().default(""),
  // Structured billing address
  attention: text("attention").notNull().default(""),
  country: text("country").notNull().default(""),
  street1: text("street1").notNull().default(""),
  street2: text("street2").notNull().default(""),
  city: text("city").notNull().default(""),
  state: text("state").notNull().default(""),
  zipCode: text("zip_code").notNull().default(""),
  fax: text("fax").notNull().default(""),
  notes: text("notes").notNull().default(""),
  stripeCustomerId: text("stripe_customer_id"),
  lat: numeric("lat", { precision: 12, scale: 8 }),
  lng: numeric("lng", { precision: 12, scale: 8 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true, createdAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export const createClientSchema = z.object({
  name: z.string().min(1, "Display name is required"),
  customerType: z.string().default("business"),
  salutation: z.string().default(""),
  firstName: z.string().default(""),
  lastName: z.string().default(""),
  companyName: z.string().default(""),
  propertyStreet: z.string().default(""),
  propertyCity: z.string().default(""),
  propertyState: z.string().default(""),
  propertyZip: z.string().default(""),
  propertyFax: z.string().default(""),
  currency: z.string().default("USD"),
  email: z.string().default(""),
  phone: z.string().default(""),
  customerLanguage: z.string().default("English"),
  address: z.string().default(""),
  attention: z.string().default(""),
  country: z.string().default(""),
  street1: z.string().default(""),
  street2: z.string().default(""),
  city: z.string().default(""),
  state: z.string().default(""),
  zipCode: z.string().default(""),
  fax: z.string().default(""),
  notes: z.string().default(""),
});

export const updateClientSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  customerType: z.string().optional(),
  salutation: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  propertyStreet: z.string().optional(),
  propertyCity: z.string().optional(),
  propertyState: z.string().optional(),
  propertyZip: z.string().optional(),
  propertyFax: z.string().optional(),
  currency: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  customerLanguage: z.string().optional(),
  address: z.string().optional(),
  attention: z.string().optional(),
  country: z.string().optional(),
  street1: z.string().optional(),
  street2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  fax: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateClientPayload = z.infer<typeof createClientSchema>;
export type UpdateClientPayload = z.infer<typeof updateClientSchema>;

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  invoiceNumber: text("invoice_number").notNull().unique(),
  status: text("status").notNull().default("draft"),
  issueDate: timestamp("issue_date").notNull().defaultNow(),
  dueDate: timestamp("due_date"),
  notes: text("notes").notNull().default(""),
  stripePaymentIntentId: text("stripe_payment_intent_id"),
  stripeCheckoutUrl: text("stripe_checkout_url"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({ id: true, createdAt: true });
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;

export const invoiceItems = pgTable("invoice_items", {
  id: serial("id").primaryKey(),
  invoiceId: integer("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;

export type InvoiceWithDetails = Invoice & {
  client: Client;
  items: InvoiceItem[];
  total: number;
};

export const createInvoiceSchema = z.object({
  clientId: z.number(),
  dueDate: z.string().optional(),
  notes: z.string().default(""),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
  })).min(1, "At least one line item required"),
});

export const updateInvoiceSchema = z.object({
  id: z.number(),
  clientId: z.number().optional(),
  dueDate: z.string().nullable().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "sent", "paid", "overdue"]).optional(),
  stripePaymentIntentId: z.string().nullable().optional(),
  stripeCheckoutUrl: z.string().nullable().optional(),
  paidAt: z.string().nullable().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().min(0.01),
    unitPrice: z.number().min(0),
  })).optional(),
});

export type CreateInvoicePayload = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoicePayload = z.infer<typeof updateInvoiceSchema>;

// ─── Invoice Catalog Items ────────────────────────────────────────────────────

export const catalogItems = pgTable("catalog_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertCatalogItemSchema = createInsertSchema(catalogItems).omit({ id: true });
export type InsertCatalogItem = z.infer<typeof insertCatalogItemSchema>;
export type CatalogItem = typeof catalogItems.$inferSelect;

export const createCatalogItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  unitPrice: z.string().default("0"),
});

export const updateCatalogItemSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  unitPrice: z.string().optional(),
});

export type CreateCatalogItemPayload = z.infer<typeof createCatalogItemSchema>;
export type UpdateCatalogItemPayload = z.infer<typeof updateCatalogItemSchema>;

// ─── Dashboard Apps ───────────────────────────────────────────────────────────

export const dashboardApps = pgTable("dashboard_apps", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("Package"),
  color: text("color").notNull().default("#E8F4FD"),
  iconColor: text("icon_color").notNull().default("#2196F3"),
  route: text("route").notNull(),
  available: boolean("available").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const insertDashboardAppSchema = createInsertSchema(dashboardApps).omit({ id: true });
export type InsertDashboardApp = z.infer<typeof insertDashboardAppSchema>;
export type DashboardApp = typeof dashboardApps.$inferSelect;

export const createDashboardAppSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  icon: z.string().default("Package"),
  color: z.string().default("#E8F4FD"),
  iconColor: z.string().default("#2196F3"),
  route: z.string().min(1),
  available: z.boolean().default(false),
  sortOrder: z.number().default(0),
});

export const updateDashboardAppSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  iconColor: z.string().optional(),
  route: z.string().min(1).optional(),
  available: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

export type CreateDashboardAppPayload = z.infer<typeof createDashboardAppSchema>;
export type UpdateDashboardAppPayload = z.infer<typeof updateDashboardAppSchema>;

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsRange = "week" | "month" | "alltime";

export type AnalyticsItemRow = {
  itemName: string;
  category: string;
  unitsSold: number;
  unitCost: string;
  totalCost: number;
};

export type AnalyticsCategoryRow = {
  category: string;
  unitsSold: number;
  totalCost: number;
};

export type AnalyticsMonthRow = {
  month: string;
  spend: number;
};

export type AnalyticsResponse = {
  range: AnalyticsRange;
  totalSpend: number;
  totalUnits: number;
  itemBreakdown: AnalyticsItemRow[];
  categoryTotals: AnalyticsCategoryRow[];
  monthlyTrend?: AnalyticsMonthRow[];
};

// ─── Staff / Team Members ─────────────────────────────────────────────────────

export const staff = pgTable("staff", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("cleaner"),
  status: text("status").notNull().default("active"),
  color: text("color").notNull().default("#3B82F6"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true, createdAt: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type StaffMember = typeof staff.$inferSelect;

export const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().default(""),
  phone: z.string().default(""),
  role: z.enum(["cleaner", "supervisor"]).default("cleaner"),
  status: z.enum(["active", "inactive"]).default("active"),
  color: z.string().default("#3B82F6"),
  notes: z.string().default(""),
});

export const updateStaffSchema = z.object({
  id: z.number(),
  name: z.string().min(1).optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(["cleaner", "supervisor"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateStaffPayload = z.infer<typeof createStaffSchema>;
export type UpdateStaffPayload = z.infer<typeof updateStaffSchema>;

// ─── Staff Locations (Real-time GPS tracking) ─────────────────────────────────

export const staffLocations = pgTable("staff_locations", {
  id: serial("id").primaryKey(),
  staffId: integer("staff_id").notNull().unique().references(() => staff.id, { onDelete: "cascade" }),
  lat: numeric("lat", { precision: 12, scale: 8 }).notNull(),
  lng: numeric("lng", { precision: 12, scale: 8 }).notNull(),
  accuracy: numeric("accuracy", { precision: 10, scale: 2 }).notNull().default("0"),
  lastSeen: timestamp("last_seen").notNull().defaultNow(),
});

export type StaffLocation = typeof staffLocations.$inferSelect;

export type ActiveLocation = {
  staffId: number;
  name: string;
  color: string;
  lat: number;
  lng: number;
  accuracy: number;
  lastSeen: string;
};

export const pingLocationSchema = z.object({
  staffId: z.number({ required_error: "staffId required" }),
  lat: z.number(),
  lng: z.number(),
  accuracy: z.number().default(0),
});

export type PingLocationPayload = z.infer<typeof pingLocationSchema>;

// ─── Cleaning Jobs (Scheduling) ───────────────────────────────────────────────

export const cleaningJobs = pgTable("cleaning_jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  staffId: integer("staff_id").notNull().references(() => staff.id, { onDelete: "cascade" }),
  propertyId: integer("property_id").references(() => properties.id, { onDelete: "set null" }),
  address: text("address").notNull().default(""),
  date: text("date").notNull(),
  startTime: text("start_time").notNull().default(""),
  endTime: text("end_time").notNull().default(""),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type CleaningJob = typeof cleaningJobs.$inferSelect;

export type CleaningJobWithDetails = CleaningJob & {
  staffMember: { id: number; name: string; color: string; role: string } | null;
  property: { id: number; name: string; address: string } | null;
};

export const createJobSchema = z.object({
  title: z.string().min(1, "Title is required"),
  staffId: z.number({ required_error: "Employee is required" }),
  propertyId: z.number().nullable().default(null),
  address: z.string().default(""),
  date: z.string().min(1, "Date is required"),
  startTime: z.string().default(""),
  endTime: z.string().default(""),
  status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]).default("scheduled"),
  notes: z.string().default(""),
});

export const updateJobSchema = z.object({
  id: z.number(),
  title: z.string().min(1).optional(),
  staffId: z.number().optional(),
  propertyId: z.number().nullable().optional(),
  address: z.string().optional(),
  date: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.enum(["scheduled", "in-progress", "completed", "cancelled"]).optional(),
  notes: z.string().optional(),
});

export type CreateJobPayload = z.infer<typeof createJobSchema>;
export type UpdateJobPayload = z.infer<typeof updateJobSchema>;

// ── Company Settings ──────────────────────────────────────────────────────────
export const companySettings = pgTable("company_settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("CLEANEX EXPRESS INC."),
  address1: text("address1").notNull().default("6322 RIDGE RD"),
  address2: text("address2").notNull().default("PORT RICHEY, Florida 34668"),
  country: text("country").notNull().default("U.S.A"),
  phone: text("phone"),
  email: text("email"),
  website: text("website"),
  logoData: text("logo_data"),
  invoiceNotes: text("invoice_notes"),
});

export type CompanySettings = typeof companySettings.$inferSelect;
export const updateCompanySettingsSchema = createInsertSchema(companySettings).omit({ id: true }).partial();
export type UpdateCompanySettingsPayload = z.infer<typeof updateCompanySettingsSchema>;
