# Supply Kiosk - Inventory Management System

## Overview

A self-service inventory kiosk application for cleaning service operations. Maids use the kiosk to select cleaning supplies they need for a property, add items to their cart, and check out to update inventory levels. The application features a dark gaming aesthetic with real-time stock tracking displayed as current/max (e.g., 3/10). Built with React, TypeScript, and Express.

## Features

### Dashboard Home Screen
- **Two-panel layout** — Dark teal hero panel on the left (branding/tagline) + clean white app list on the right
- **App tiles** — Stored in `dashboard_apps` DB table; fetched from `GET /api/dashboard-apps`
- **Edit mode** — Tap the gear icon (top-right) to enter edit mode:
  - **Edit** each app tile (name, description, icon, background color, icon color, route, available toggle)
  - **Delete** a tile (two-tap confirmation)
  - **Add** a new app tile
- **Icon picker** — Curated set of Lucide icons selectable via a grid
- **Color swatches** — Preset background and icon colors to choose from
- **Live clock** — Shown in the right panel header
- **Mobile fallback** — Compact teal brand bar shown on small screens when the left panel is hidden
- Auto-seeds the default 5 apps on first load if the table is empty

### Affiliate Portal
- **Route** `/portal` — login page (served to affiliates); `/portal/dashboard` — authenticated dashboard
- **Login** — affiliate enters their email + access code (set by admin in SaaS Admin); session-based auth via express-session
- **Dashboard (post-login)**:
  - 4 KPI cards: Est. Monthly Payout, MRR Generated, Active Accounts, Total Referred
  - Account info card with commission structure breakdown
  - Companies table showing all their referred accounts, status, plan, MRR, and their per-account commission cut
  - Running totals row showing total MRR and total payout
- **Session** — 7-day cookie, httpOnly, SESSION_SECRET from env
- **Auth API** — `POST /api/affiliate/login`, `POST /api/affiliate/logout`, `GET /api/affiliate/me` (returns affiliate + stats + companies)
- Admin sets `access_code` per affiliate in SaaS Admin; affiliates table shows the code for easy sharing

### SaaS Admin Dashboard
- **Route** `/saas` — accessible from the "SaaS Admin" tile on the dashboard
- **Companies tab** — manage cleaning company accounts: name, owner, email, phone, status (trial/active/paused/cancelled), plan (Starter $99 / Pro $199 / Enterprise $399), MRR, trial end date, and referring affiliate
- **Affiliates tab** — manage sales affiliates: name, contact info, commission rate (%), and auto-calculated MRR attribution + estimated monthly payout
- **KPI cards** — Total MRR, Active Accounts, Total Accounts, Active Affiliates
- **Two-tap delete** — confirmation pattern on both companies and affiliates
- **API** — `GET/POST /api/saas/companies`, `PATCH/DELETE /api/saas/companies/:id`, `GET/POST /api/saas/affiliates`, `PATCH/DELETE /api/saas/affiliates/:id`
- **Tables** — `saas_affiliates` (id, name, email, phone, commission_rate, status, notes, created_at), `saas_companies` (id, name, owner_name, email, phone, status, plan, mrr, affiliate_id FK, trial_ends_at, notes, created_at)

### Invoicing
- **Route** `/invoicing` — accessible from the "Invoicing" tile on the dashboard
- **Clients** — manage customers: name, email, phone, address, notes; stored in `clients` DB table
- **Invoices** — create invoices with line items (description, qty, unit price); stored in `invoices` + `invoice_items` tables
- **Auto-numbering** — invoice numbers auto-generated: INV-0001, INV-0002, …
- **Status tracking** — draft / sent / paid / overdue; status can be changed inline via dropdown per invoice
- **Payment tracking** — `paid_at` timestamp set automatically when status → paid
- **Stripe-ready** — `stripe_payment_intent_id` column reserved for future Stripe integration
- **Summary stats** — header cards show Outstanding balance, Collected (paid) total, Overdue count
- **API** — `GET/POST /api/clients`, `PATCH/DELETE /api/clients/:id`, `GET/POST /api/invoices`, `GET/PATCH/DELETE /api/invoices/:id`

### Calendar
- **Route** `/calendar` — accessible from the "Calendar" tile on the dashboard
- **Summary cards** — Checkouts Today, Check-ins Today, Occupied Now
- **Property status list** — all iCal-linked properties with status badge, next checkout/checkin dates, last sync time
- **Upcoming bookings timeline** — all bookings sorted by date; today's events highlighted
- **API** — uses `GET /api/bookings/upcoming` and `GET /api/properties`

### Airbnb iCal Calendar Sync
- **iCal URL per property** — optional field stored in `properties.ical_url`
- **Auto-sync** — server syncs all iCal URLs every 15 minutes via `setInterval` in `server/index.ts`
- **Manual sync** — "Sync Now" button in property edit modal triggers `POST /api/properties/:id/sync`
- **Upcoming bookings** — `bookings` table stores uid, startDate, endDate, summary per property
- **Status badges** — property cards show colored pill: Available / Occupied / Checkout Today / Check-in Today
- **Next date hint** — calendar icon + next check-in date shown below cards with iCal configured
- **Last synced** — edit modal shows "Last synced X ago" after first sync
- **API** — `POST /api/properties/:id/sync`, `GET /api/bookings/upcoming`
- **Deploy script** — migrations for `ical_url`, `last_synced` columns and `bookings` table

### Property Reviews Gallery
- **Route** `/reviews` — accessible from the "Reviews" tile on the dashboard
- **Property squares** — grid of clickable colored cards (2–3 per row); each opens its Airbnb reviews URL in a new tab
- **Properties stored in DB** — `properties` table: id, name, address, airbnb_url, color, sort_order
- **Edit mode** — pencil toggle reveals per-card edit/delete controls with two-tap delete confirmation
- **Add property modal** — name, address, Airbnb URL, color swatch picker
- **Status display** — "Out of Stock / Low Stock" bilingual badges with English pill + Spanish action label
- **API** — `GET/POST /api/properties`, `PATCH/DELETE /api/properties/:id`

### Inventory Kiosk
- **Item Grid** - 12 cleaning supply items displayed as cards with custom-generated images
- **Stock Display** - Each item shows current stock vs max stock (e.g., 3/10) with color-coded indicators:
  - Green: stock above 50%
  - Yellow: stock between 25-50%
  - Red: stock below 25%
  - Out of Stock overlay when at 0
- **Cart System** - Slide-out cart sidebar for reviewing selected items
  - Add items by clicking on item cards
  - Increase/decrease quantities with +/- buttons
  - Remove individual items from cart
  - Shows total item count
- **Checkout** - Deducts selected quantities from inventory with server-side validation
- **Restock All** - Admin button to reset all items to full stock
- **Cost Tracking** - Each item has a per-unit cost for restock budgeting
  - Cost displayed on item cards (when > $0)
  - Editable in manage modal and add item form
  - Restock dropdown shows per-item and total restock costs

### Cleaning Supply Items (12 items)
1. All-Purpose Cleaner (Sprays)
2. Glass Cleaner (Sprays)
3. Disinfectant Spray (Sprays)
4. Microfiber Cloths (Cloths & Wipes)
5. Sponges (Cloths & Wipes)
6. Trash Bags (Supplies)
7. Toilet Bowl Cleaner (Bathroom)
8. Floor Cleaner (Floors)
9. Dusting Spray (Sprays)
10. Rubber Gloves (Supplies)
11. Mop Heads (Floors)
12. Vacuum Bags (Supplies)

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build Tool**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Wouter for lightweight client-side routing

**UI Component System**
- Shadcn UI component library (New York style) with Radix UI primitives
- Tailwind CSS for utility-first styling with custom design tokens
- Gaming-focused design system with dark mode by default

**State Management**
- TanStack Query (React Query) for server state management (items)
- Local React state for cart management
- Mutations with cache invalidation for checkout and restock

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running in ESM mode
- Vite middleware integration for development hot reload

**Data Storage**
- PostgreSQL database with Drizzle ORM (DatabaseStorage class)
- Table: inventory_items (id serial PK, name, description, category, stock, max_stock, visible, cost numeric(10,2))
- Cart is client-side only; checkout validates and decrements server-side
- Production deployment uses separate PostgreSQL instance on VPS

**API Design**
- RESTful endpoints:
  - `GET /api/items` - Fetch all inventory items with current stock levels
  - `POST /api/cart/checkout` - Checkout cart items, validates stock and decrements
  - `POST /api/items/restock` - Restock a single item (by id, optional quantity)
  - `POST /api/items/restock-all` - Reset all items to max stock
  - `POST /api/items` - Create a new item
  - `PATCH /api/items/:id` - Update an existing item
  - `DELETE /api/items/:id` - Delete an item
  - `GET /api/dashboard-apps` - Fetch all dashboard app tiles (auto-seeds defaults if empty)
  - `POST /api/dashboard-apps` - Create a new dashboard app tile
  - `PATCH /api/dashboard-apps/:id` - Update a dashboard app tile
  - `DELETE /api/dashboard-apps/:id` - Delete a dashboard app tile

**Validation**
- Zod schemas for runtime type validation
- Shared schema definitions between client and server (`shared/schema.ts`)
- Server-side stock validation prevents negative inventory

### External Dependencies

**UI & Styling**
- Radix UI component primitives (@radix-ui/* packages)
- Tailwind CSS with PostCSS for processing
- Google Fonts (Inter, Orbitron) for typography
- Lucide React for iconography

**Development Tools**
- TypeScript for type safety across the stack
- tsx for running TypeScript in Node.js
- esbuild for production server bundling

**Build & Runtime**
- Vite with React plugin
- Replit-specific plugins for development
