# HAVALDAR - Unit Inventory Management System

## Overview

HAVALDAR is a military-style unit inventory and daily consumption tracking system. It functions as a "digital register" for managing items (rations, ammunition, fuel, etc.), tracking daily consumption against manpower, monitoring stock levels, and generating reports. The app features a prediction model for consumption based on day type and historical averages.

Key features:
- **Items Master**: CRUD for supply items with categories, units, and cost tracking
- **Inventory Management**: Real-time stock levels with low-stock alerts and inward/outward transaction history
- **Daily Register**: Day-by-day consumption logging with system-predicted quantities, draft/confirmed workflow
- **Dashboard**: Stats overview with cost trends (recharts), alerts for low stock items
- **Reports**: Historical log viewing with CSV export

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State Management**: TanStack React Query for server state; local React state for forms
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives, styled with Tailwind CSS
- **Charts**: Recharts for dashboard analytics
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`
- **Build Tool**: Vite with HMR in development
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

The frontend lives in `client/src/` with pages in `client/src/pages/` and reusable components in `client/src/components/`. Custom hooks for all API interactions are centralized in `client/src/hooks/use-havaldar.ts`.

### Backend
- **Framework**: Express 5 on Node.js with TypeScript (run via `tsx`)
- **API Pattern**: RESTful JSON API under `/api/` prefix. Routes defined in `server/routes.ts` using a shared API contract from `shared/routes.ts`
- **Storage Layer**: `server/storage.ts` contains a `DatabaseStorage` class implementing `IStorage` interface - all database operations go through this abstraction
- **Dev Server**: Vite middleware served through Express in development; static files served in production from `dist/public`

### Shared Layer
- `shared/schema.ts`: Drizzle ORM table definitions and Zod insert schemas (single source of truth for types)
- `shared/routes.ts`: API contract defining paths, methods, and input/output schemas - used by both frontend and backend

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (required via `DATABASE_URL` environment variable)
- **Session Store**: connect-pg-simple for PostgreSQL-backed sessions
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema changes
- **Migrations**: Output to `./migrations` directory

### Database Tables
1. **items** - Master data for supply items (name, unit, cost, category, thresholds)
2. **inventory** - Current stock levels per item (one-to-one with items)
3. **daily_logs** - One entry per day with day type, manpower, status (Draft/Confirmed), total cost
4. **consumption** - Line items per daily log (item, quantity used, calculated cost, system-generated flag)
5. **stock_transactions** - Audit trail for all stock movements

### Build Process
- `npm run dev`: Runs the full stack with Vite HMR via tsx
- `npm run build`: Vite builds the client to `dist/public`, esbuild bundles the server to `dist/index.cjs`
- `npm run start`: Serves the production build
- Build script bundles select server dependencies to reduce cold start times

## External Dependencies

### Required Services
- **PostgreSQL Database**: Required. Connection via `DATABASE_URL` environment variable. Used for all data persistence and session storage.

### Key npm Packages
- **drizzle-orm** + **drizzle-kit**: ORM and migration tooling for PostgreSQL
- **express** (v5): HTTP server framework
- **@tanstack/react-query**: Async server state management
- **recharts**: Chart rendering for dashboard
- **date-fns**: Date formatting and manipulation
- **zod** + **drizzle-zod**: Schema validation (shared between client and server)
- **wouter**: Client-side routing
- **react-hook-form**: Form state management
- **connect-pg-simple**: PostgreSQL session store
- **shadcn/ui components**: Full suite of Radix-based UI primitives

### Replit-Specific
- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner`: Dev tooling (conditionally loaded)