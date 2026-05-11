# Local Development Guide

This guide walks through setting up the laundry app locally with VS Code and running through an end-to-end order flow.

## At a glance

After following this guide you'll have:

- Postgres + Redis running in Docker
- API server at http://localhost:3000
- Dashboard at http://localhost:5173
- Widget demo at http://localhost:5174/demo.html
- VS Code configured with recommended extensions + debug configs
- A working set of REST Client files to exercise the API

**Budget:** ~15 minutes for first-time setup. ~1 minute to boot subsequently.

---

## 1. Prerequisites

| Tool      | Minimum version          | Install                                                                 |
| --------- | ------------------------ | ----------------------------------------------------------------------- |
| Node.js   | 20.x (22 recommended)    | [nodejs.org](https://nodejs.org) or nvm                                 |
| pnpm      | 9.x                      | `corepack enable && corepack prepare pnpm@9.12.0 --activate`            |
| Docker    | Desktop 4+ / Engine 24+  | [docker.com](https://docker.com)                                        |
| VS Code   | Latest                   | [code.visualstudio.com](https://code.visualstudio.com)                  |
| Git       | Any recent               | [git-scm.com](https://git-scm.com)                                      |

Quick version check:

```bash
node --version    # v20+ (v22 recommended)
pnpm --version    # 9+
docker --version  # 24+
```

---

## 2. Clone and check out the current phase

```bash
git clone https://github.com/lazar0s/kiro.git laundry-app
cd laundry-app
git checkout feat/phase-3-orders
```

This branch stacks all three phases (scaffold → auth → orders). Once the PRs merge to `main`, just `git checkout main`.

---

## 3. Open in VS Code

```bash
code .
```

On first open, VS Code will prompt to install the recommended extensions from `.vscode/extensions.json`. Click **Install All** — these aren't required but make everything nicer:

- **Prisma** — `schema.prisma` syntax highlighting + autocomplete
- **Tailwind CSS IntelliSense** — class-name autocomplete
- **REST Client** — runs the `.http` files as API tests
- **Prettier** — format on save
- **Docker** — inspect containers from the sidebar

---

## 4. Install and configure

In the VS Code integrated terminal (`` Ctrl+` ``):

### 4a. Install dependencies

```bash
pnpm install
```

Installs every workspace's dependencies in one pass (~1–2 minutes).

### 4b. Start Postgres + Redis

```bash
docker compose up -d postgres redis
```

Verify:

```bash
docker compose ps
```

Both should show `Up (healthy)`.

### 4c. Configure environment

```bash
cp .env.example .env
```

The defaults work for local dev. The only thing you might want to change:

- `SEED_ADMIN_PASSWORD` — custom admin password (default: `changeme`)

### 4d. Migrate + seed

```bash
pnpm db:migrate
```

Prisma will prompt for a migration name — type `init` and hit enter. All tables are created.

```bash
pnpm db:seed
```

Output confirms the admin user, 2 locations, 5 machines, alert rules, and pricing rows are in.

### 4e. Boot everything

```bash
pnpm dev
```

Turborepo runs all three apps in parallel. Leave this terminal running; open a new one for the rest.

---

## 5. Smoke test

In a second terminal:

```bash
curl http://localhost:3000/api/health
```

Expected:

```json
{
  "ok": true,
  "service": "laundry-api",
  "version": "0.1.0",
  "uptime": 5,
  "checks": { "database": "ok", "redis": "ok" }
}
```

If `"ok": false`, check that Postgres and Redis are both `healthy` in `docker compose ps`.

---

## 6. End-to-end test flow

### Option A — through the browser

1. Open http://localhost:5174/demo.html
2. Fill in the order form (any name/phone works)
3. Click **Place order** → success screen shows a tracking code
4. Click **View status page** → tracking page renders with "Order received" checked

Browse the data:

```bash
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555. Look at the `orders` and `order_events` tables.

### Option B — using REST Client (recommended for API testing)

The `requests/` directory contains four `.http` files. Open any of them in VS Code and you'll see **"Send Request"** links above each HTTP block. Click them to fire the request — the response opens in a side panel.

**Typical flow:**

1. Open `requests/auth.http` → run **"Login as admin"**. Copy `accessToken` from the JSON response.
2. Paste the token into the `@accessToken` variable at the top of `requests/orders.http` and `requests/admin.http`.
3. In `requests/orders.http`: run **"Create pickup order"**, then copy the returned `id` into `@orderId` at the top.
4. Run transitions in order: `→ not_started → working → finished`.
5. Open `requests/admin.http` → create a delivery user, log in as them (separate run of `auth.http`), and use their token to transition the order `→ out_for_delivery → delivered`.

### The full state machine at a glance

```
received ──► not_started ──► working ──► finished ──► out_for_delivery ──► delivered
            (staff)         (staff)     (staff)     (staff)                (delivery)
```

- Transitions to `working` need a `machineId` (grab one from Prisma Studio or the seed).
- Transitions to `out_for_delivery` need a `driverId` (create a `delivery`-role user first).
- Admin can perform any transition.

---

## 7. Debugging the API in VS Code

Press **F5** or open the Run/Debug sidebar. Two launch configs are wired up:

- **Debug API** — starts the API under the debugger; breakpoints in `apps/api/src/` work
- **Debug Seed** — steps through `apps/api/prisma/seed.ts`

When debugging the API, stop `pnpm dev`'s API first (or the port will be busy). The web + widget keep running.

---

## 8. Common issues

| Symptom                                                    | Fix                                                                                    |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `pnpm: command not found`                                  | `corepack enable && corepack prepare pnpm@9.12.0 --activate`                           |
| `P1001: Can't reach database`                              | `docker compose up -d postgres redis`, wait ~5s                                        |
| CORS error in widget                                       | Ensure API is on :3000 and `CORS_ALLOWED_ORIGINS` includes `http://localhost:5174`     |
| Login returns 401                                          | Re-run `pnpm db:seed` — the admin user isn't created until seed runs                   |
| `Prisma client out of sync`                                | `pnpm db:generate`                                                                     |
| Port already in use                                        | Kill the process on that port, or change `API_PORT` in `.env`                          |
| Test ran against stale data                                | `docker compose down -v && pnpm db:migrate && pnpm db:seed` to wipe + start over       |

---

## 9. Useful commands

```bash
# Daily development
pnpm dev                         # all apps via Turborepo
pnpm --filter @laundry/api dev   # just the API
pnpm --filter @laundry/web dev   # just the dashboard
pnpm --filter @laundry/widget dev # just the widget

# Type checking
pnpm typecheck                   # all workspaces

# Database
pnpm db:migrate                  # apply / create migrations
pnpm db:seed                     # reseed
pnpm db:studio                   # browse data at :5555
pnpm db:generate                 # regen Prisma client after schema changes

# Docker
docker compose up -d postgres redis  # start services
docker compose down                  # stop services (keeps data)
docker compose down -v               # stop + wipe data

# Nuclear reset
docker compose down -v && pnpm db:migrate && pnpm db:seed
```

---

## 10. What's implemented so far

Current state is **Phase 3 of 11**. What works today:

- ✅ Submit orders via the widget (pickup or delivery, standard or express)
- ✅ Log in as admin, create staff/delivery users (phase 2)
- ✅ List/filter/paginate orders (phase 3)
- ✅ Advance orders through the state machine with role enforcement (phase 3)
- ✅ Public customer tracking page (phase 3)
- ✅ Configure express surcharges per cleaning type (phase 3)

**Not yet wired up:**

- Realtime dashboard updates (phase 4)
- Kanban order cards + drag-drop (phase 5)
- Miele machine data (phase 6)
- WhatsApp + email notifications (phase 7)
- Staff alerts (phase 8)
- Google Maps picker in widget (phase 9)
- Admin UI (phase 10)

See [`.kiro/specs/laundry-app/tasks.md`](../.kiro/specs/laundry-app/tasks.md) for the full roadmap.
