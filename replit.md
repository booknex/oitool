# Achievement Gallery

## Overview

An interactive triple gallery application with a gaming-inspired UI featuring Achievement Gallery, Levels (Job Position Tracker), and Trophy Gallery. The Levels gallery has evolved into a dynamic job position tracking system where users can create custom job position families, each with 4 progression levels. Each gallery maintains independent state and progress tracking. The application features a dark mode gaming aesthetic inspired by Steam Achievements and PlayStation Trophy systems, built with React, TypeScript, and Express.

## Features

### Triple Gallery System
- **Achievement Gallery** (/) - Main achievement tracking with 12 unlockable badges
- **Levels** (/levels) - Dynamic job position tracking system where users can:
  - Create unlimited job position families (e.g., "Software Engineer", "Product Manager")
  - Each family has 4 progression levels (LEVEL 1-4)
  - Edit family labels to update job position names
  - Delete families when no longer needed
  - Unlock individual levels by clicking on them
  - Track total progress across all families
- **Trophy Gallery** (/trophies) - Independent trophy tracking with the same 12 badges
- **Navigation** - Fixed header with three buttons to switch between galleries (Achievement Gallery left, Levels middle, Trophies right)
- **Independent State** - Achievement and Trophy galleries use localStorage; Levels gallery uses in-memory backend storage

### Badge Metadata
- Rich metadata for all 12 badges including name, description, and category
- Interactive tooltips showing badge details on hover
- Unlock timestamps with date/time display
- Categories: Starter, Progress, Commitment, Elite, Master, Legendary

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
- Class Variance Authority (CVA) for component variant management
- Gaming-focused design system with dark mode by default

**State Management**
- TanStack Query (React Query) for server state management
- Local state with React hooks
- LocalStorage for persisting unlocked badge status client-side

**Styling Approach**
- Dark gaming aesthetic with deep navy-gray backgrounds (220 25% 10%)
- Gold accent color (45 95% 55%) for unlocked states
- Custom CSS variables for theming and elevation effects
- Responsive design with mobile-first breakpoints

### Backend Architecture

**Server Framework**
- Express.js with TypeScript running in ESM mode
- Vite middleware integration for development hot reload
- Custom logging middleware for API request tracking

**Data Storage**
- In-memory storage (MemStorage class) for both badge and family state
- Badge data structure: id, name, description, imageUrl, unlocked status, and unlock timestamp
- Family data structure: id, label, levels array (4 levels with unlock status)
- LocalStorage on client maintains persistence for Achievement and Trophy galleries
- Backend in-memory storage for Levels gallery (persists during server runtime)

**API Design**
- RESTful endpoints:
  - **Badges:**
    - `GET /api/badges` - Fetch all badges
    - `POST /api/badges/unlock` - Unlock a specific badge
    - `POST /api/badges/reset` - Reset all badges to locked state
    - `GET /api/badge-image` - Serve badge image assets
  - **Families (Job Positions):**
    - `GET /api/families` - Fetch all job position families
    - `POST /api/families` - Create new job position family
    - `DELETE /api/families/:id` - Delete a family (returns 404 if not found)
    - `PATCH /api/families/:id` - Update family label/name
    - `POST /api/families/unlock` - Unlock a specific level within a family

**Validation**
- Zod schemas for runtime type validation
- Shared schema definitions between client and server (`shared/schema.ts`)

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
- Drizzle ORM and Drizzle Kit (configured but not actively used - PostgreSQL/Neon database ready)

**Build & Runtime**
- Vite with React plugin
- Replit-specific plugins for development (cartographer, dev-banner, runtime-error-modal)
- Date-fns for date formatting

**Database (Configured, Not Active)**
- Drizzle ORM configured for PostgreSQL
- Neon serverless driver ready for integration
- Migration setup in place (`drizzle.config.ts`)
- Session storage with connect-pg-simple available

**Animation & Interaction**
- Embla Carousel for potential carousel features
- React Hook Form with resolvers for form handling
- CMDK for command menu patterns