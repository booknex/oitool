# Supply Kiosk - Inventory Management System

## Overview

A self-service inventory kiosk application for cleaning service operations. Maids use the kiosk to select cleaning supplies they need for a property, add items to their cart, and check out to update inventory levels. The application features a dark gaming aesthetic with real-time stock tracking displayed as current/max (e.g., 3/10). Built with React, TypeScript, and Express.

## Features

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
