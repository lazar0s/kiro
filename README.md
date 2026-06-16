# Laundry Store Management App

A web application for managing laundry orders in a single-store business with two physical locations. Handles the full order lifecycle from customer submission through cleaning, delivery, and completion — with real-time machine monitoring via the Miele 3rd Party API and multi-channel customer notifications (WhatsApp, email).

See the full spec in [`.kiro/specs/laundry-app/`](./.kiro/specs/laundry-app/).

## Monorepo Layout

```
apps/
  api/       # Fastify + Prisma backend (REST + Socket.IO)
  web/       # React dashboard (staff, delivery, admin)
  widget/    # Preact web component for embedding on the store website
packages/
  shared/    # Shared TS types, enums, constants
```

## Prerequisites

- Node.js 20+ (v22 recommended)
- pnpm 9+
- Docker + Docker Compose (for Postgres + Redis)

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Start Postgres + Redis
docker compose up -d postgres redis

# 3. Copy environment file and fill in values
cp .env.example .env

# 4. Run initial database migration + seed
pnpm db:migrate
pnpm db:seed

# 5. Start all apps in dev mode
pnpm dev
```

Services:
- API:    http://localhost:3000
- Web:    http://localhost:5173
- Widget demo: http://localhost:5174/demo.html

## Workspaces

| Package | Path | Description |
|---|---|---|
| `@laundry/api` | `apps/api` | Backend API + job queues + Socket.IO |
| `@laundry/web` | `apps/web` | Staff / delivery / admin dashboard |
| `@laundry/widget` | `apps/widget` | Embeddable order form |
| `@laundry/shared` | `packages/shared` | Shared types and enums |

## Common Commands

```bash
pnpm dev              # run all apps in dev mode
pnpm build            # build all apps
pnpm typecheck        # typecheck all apps
pnpm lint             # lint all apps
pnpm db:generate      # regenerate Prisma client
pnpm db:migrate       # apply/create migrations
pnpm db:seed          # seed dev database
pnpm db:studio        # open Prisma Studio
```

## Project Status

Phase 1 — scaffolding. See [`.kiro/specs/laundry-app/tasks.md`](./.kiro/specs/laundry-app/tasks.md) for the full 11-phase plan.
