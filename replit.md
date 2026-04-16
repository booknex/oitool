# Supply Kiosk - Inventory Management System

## Overview
The Supply Kiosk is a self-service inventory management system designed for cleaning service operations. Its primary purpose is to allow maids to select cleaning supplies, add them to a cart, and check out, which updates inventory levels in real-time. The application aims to streamline supply management, reduce manual tracking, and provide an intuitive user experience with a dark, gaming-inspired aesthetic. Key capabilities include real-time stock tracking, a robust cart system, and administrative tools for inventory management and reporting.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built with React 18 and TypeScript, utilizing Vite for fast development and bundling. Routing is handled by Wouter. The UI is constructed using Shadcn UI (New York style) based on Radix UI primitives, styled with Tailwind CSS, and features a default dark mode with a gaming aesthetic. State management for server data uses TanStack Query, while local React state manages the shopping cart.

### Backend Architecture
The backend is an Express.js application written in TypeScript, running in ESM mode. Data persistence is managed by a PostgreSQL database, with Drizzle ORM handling database interactions. The API is RESTful, providing endpoints for inventory management, checkout processes, and dashboard application configuration. Zod schemas ensure robust server-side validation, with shared schemas for client-server consistency.

### System Design Choices
- **Dashboard:** Features a two-panel layout with customizable app tiles, an icon picker, and color swatches. Includes a live clock and mobile responsiveness.
- **Affiliate Portal:** Secure, session-based access for affiliates to view KPIs, commission structures, and referred accounts.
- **Admin Portal:** Protected access for managing companies, affiliates, and viewing comprehensive business analytics. Includes full CRUD operations for entities.
- **Invoicing:** Manages clients and invoices, supports auto-numbering, status tracking, and integrates with Stripe for payment links.
- **Calendar:** Displays upcoming bookings, property statuses, and supports iCal sync for properties with manual and automated sync options.
- **Inventory Kiosk:** Features an item grid with stock levels (current/max) and color-coded indicators, a slide-out cart system, and checkout functionality that deducts stock. Includes admin-only restock capabilities and cost tracking.
- **Team / Staff Management:** Provides tools for managing staff details, roles, and statuses, with search and CRUD functionalities.
- **Real-Time Employee Location Tracking:** Utilizes Leaflet + OpenStreetMap to display employee locations, with employees able to share their GPS data. Locations are updated periodically and expire after a set time. Property markers are baby blue (#5BAFD6) with full address displayed above each marker. Geocoding uses US Census Bureau API (primary) with Nominatim as fallback.
- **Scheduling:** Offers calendar and list views for managing cleaning jobs, with filtering, weekly navigation, and CRUD operations for job entries.

## External Dependencies

### UI & Styling
- Radix UI primitives (`@radix-ui/* packages`)
- Tailwind CSS
- Google Fonts (Inter, Orbitron)
- Lucide React for iconography

### Development Tools
- TypeScript
- tsx
- esbuild

### Build & Runtime
- Vite with React plugin
- Replit-specific plugins for development
- PostgreSQL (external instance for production)
- Stripe API for payment processing
- `express-session` for session management
- `node-ical` for iCal parsing
- Leaflet and OpenStreetMap for mapping

## VPS Deployment (app.cleanexinc.com)

**Server:** 187.77.21.175, pm2 process `office-inventory` (id 84), port 5004
**Nginx:** Proxies `app.cleanexinc.com` → `localhost:5004`
**Deploy script:** `./deploy-vps.sh` — builds frontend + server bundle, deploys via SCP, restarts pm2

**Bundle strategy (critical):**
- `server/vite.ts` uses `await import("vite")` (dynamic import inside `setupVite()`) so vite is only loaded in dev mode
- esbuild flags: `--format=esm --bundle --external:vite --external:"../vite.config"`
- Banner: `import { createRequire } from 'module'; const require = createRequire(import.meta.url);` — this fixes `Dynamic require of "path" is not supported` for CJS deps bundled into ESM
- Output: `dist/index.vps.js` (SCP'd to VPS as `dist/index.js`), ~2.5MB

**pm2 config:** `/var/www/office-inventory/ecosystem.config.cjs`, runs `dist/index.js` in cluster mode
**Postgres on VPS:** `PGPASSWORD=postgres psql -U postgres -h localhost -d office_inventory`
