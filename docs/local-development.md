# Local Development Guide

This guide walks through setting up the laundry app locally with VS Code and running through an end-to-end order flow — from widget submission to delivered, with real-time dashboard updates.

## At a glance

After following this guide you'll have:

- Postgres + Redis running in Docker
- API server at http://localhost:3000
- Staff dashboard at http://localhost:5173 (with real-time Socket.IO)
- Customer widget demo at http://localhost:5174/demo.html
- VS Code configured with recommended extensions + debug configs
- A set of REST Client `.http` files to exercise every endpoint

**Budget:** ~15 minutes for first-time setup. ~1 minute to boot subsequently.

---

## 1. Prerequisites

| Tool    | Minimum version           | Install                                                      |
| ------- | ------------------------- | ------------------------------------------------------------ |
| Node.js | **20.x** (22 recommended) | [nodejs.org](https://nodejs.org) or nvm / nvm-windows        |
| pnpm    | 9.x                       | `corepack enable && corepack prepare pnpm@9.12.0 --activate` |
| Docker  | Desktop 4+ / Engine 24+   | [docker.com](https://docker.com)                             |
| VS Code | Latest                    | [code.visualstudio.com](https://code.visualstudio.com)       |
| Git     | Any recent                | [git-scm.com](https://git-scm.com)                           |

> **Node 16 or older will not work.** The monorepo `engines` field enforces Node ≥ 20. Several dependencies (Prisma 5, Fastify 5, Socket.IO 4.8) have hard requirements on newer Node versions.

Quick version check:

```bash
node --version    # v20+ (v22 recommended)
pnpm --version    # 9+
docker --version  # 24+
```

### 1a. Platform-specific notes

**macOS / Linux** — should work out of the box after installing the tools above. `bcrypt` compiles native code on install; if you don't have `python3` and a C++ toolchain (macOS: Xcode Command Line Tools; Linux: `build-essential`), pnpm may fall back to the pre-built binary automatically.

**Windows** — a few extra steps:

1. **Use a modern Node.** If you have nvm-windows with an old Node installed, switch:
   ```powershell
   nvm install 22
   nvm use 22
   node --version   # should say v22.x
   ```
2. **Enable pnpm via corepack.** This may need an elevated (admin) shell once:
   ```powershell
   # Run PowerShell as Administrator, then:
   corepack enable
   corepack prepare pnpm@9.12.0 --activate
   ```
   If corepack errors with `EPERM: operation not permitted, open 'C:\Program Files\nvm\...\pnpm'`, use the standalone pnpm installer instead:
   ```powershell
   iwr https://get.pnpm.io/install.ps1 -useb | iex
   # close + reopen PowerShell so pnpm is on PATH
   ```
3. **Docker Desktop must be running** before `docker compose up`.
4. **Line endings.** The repo uses LF everywhere. If your Git is set to `core.autocrlf=true`, Prisma's bundled binaries may complain. Run `git config --global core.autocrlf false` before cloning to avoid it.

---

## 2. Clone and check out the current phase

```bash
git clone https://github.com/lazar0s/kiro.git laundry-app
cd laundry-app
git checkout feat/phase-4-realtime
```

That branch stacks all four completed phases (scaffold → auth → orders → realtime). Once the PRs merge to `main`, just use `git checkout main`.

---

## 3. Open in VS Code

```bash
code .
```

On first open, VS Code prompts to install the recommended extensions from `.vscode/extensions.json`. Click **Install All** — these aren't required but make everything much nicer:

- **Prisma** — `schema.prisma` syntax highlighting + autocomplete
- **Tailwind CSS IntelliSense** — class-name autocomplete in JSX
- **REST Client** — runs the `.http` files as inline API tests
- **Prettier** — format on save
- **Docker** — inspect containers from the sidebar

---

## 4. Install and configure

In the VS Code integrated terminal (`` Ctrl+` ``):

### 4a. Install dependencies

```bash
pnpm install
```

Installs every workspace's dependencies in one pass (~1–2 minutes on first run).

> **If `bcrypt` fails to build:** you're missing native toolchain prerequisites.
> - **macOS:** `xcode-select --install`
> - **Linux:** `apt install build-essential python3`
> - **Windows:** recent Visual Studio installs include the C++ tools. Alternatively `npm install --global windows-build-tools` (once, as admin).
> - pnpm will often retry with a pre-built binary automatically on the next run.

### 4b. Start Postgres + Redis

```bash
docker compose up -d postgres redis
```

Verify both are healthy:

```bash
docker compose ps
```

Both should show `Up (healthy)` before moving on. If they show `starting`, wait ~5 seconds and recheck.

### 4c. Configure environment

```bash
cp .env.example .env
```

The defaults work for local dev out of the box. Two things worth knowing:

- `SEED_ADMIN_PASSWORD` — admin password set by the seed script (default: `changeme`).
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — dev defaults are fine locally, but generate real random secrets before deploying.

### 4d. Migrate + seed

```bash
pnpm db:migrate
```

Prisma prompts for a migration name the first time — type `init` and hit enter. All tables get created.

```bash
pnpm db:seed
```

Seeds the database with:

- **2 locations** (fixed UUIDs you'll use in REST Client files):
  - Location A → `11111111-1111-1111-1111-111111111111`
  - Location B → `22222222-2222-2222-2222-222222222222`
- **1 admin user:** `admin@laundry.local` / `changeme`
- **5 machines** (3 at Location A, 2 at Location B)
- **4 default alert rules**
- **8 pricing rows** (4 cleaning types × 2 speeds)

### 4e. Boot everything

```bash
pnpm dev
```

Turborepo runs all three apps in parallel. **Leave this terminal running.** Open a second one for curl, psql, or anything else.

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

If `"ok": false`, check that Postgres and Redis both show `healthy` in `docker compose ps`.

---

## 6. End-to-end test flow

Two approaches. The browser path is great for a quick vibe check; the REST Client path exercises every endpoint cleanly.

### Option A — through the browser

1. Open http://localhost:5174/demo.html
2. Fill in the order form (any name/phone works)
3. Click **Place order** → success screen shows a tracking code like `H7K3M9P2BN`
4. Click **View status page** → tracking page renders with "Order received" checked and a timestamp

Browse the raw data:

```bash
pnpm db:studio
```

Opens Prisma Studio at http://localhost:5555. Look at the `orders` and `order_events` tables.

### Option B — using REST Client (recommended for API testing)

The `requests/` directory contains four `.http` files. Open any of them in VS Code — you'll see **"Send Request"** links above each HTTP block. Click to fire; the response opens in a side panel.

**Typical flow:**

1. Open `requests/auth.http` → run **Login as admin**.
2. Copy the `accessToken` value from the JSON response.
3. Paste it into the `@accessToken` variable at the top of `requests/orders.http` and `requests/admin.http`.
4. In `requests/orders.http` → run **Create pickup order** → copy the returned `id` into `@orderId`.
5. Run transitions in order: `→ not_started → working → finished`.
6. Open `requests/admin.http` → **Create a delivery user**, log in as them separately in `auth.http`, then use their token to transition `→ out_for_delivery → delivered`.

> **REST Client tip:** within a single file, if a request has `# @name login` above it, later requests can reference `{{login.response.body.accessToken}}` — no copy-paste needed. Cross-file references aren't supported though, so you'll paste tokens between files.

### 6a. Getting a machine UUID (needed for the `working` transition)

The `not_started → working` transition requires a `machineId`. The seeded machines have predictable `miele_device_id` values (`seed-washer-a1` etc.) but the primary-key UUIDs are randomly generated on first migration. Three ways to grab one:

**Option 1 — Prisma Studio (easiest):**

```bash
pnpm db:studio
```

Open the `machines` table → copy any `id` value.

**Option 2 — psql one-liner:**

```bash
docker compose exec postgres psql -U laundry -d laundry \
  -c "SELECT id, name, type FROM machines ORDER BY name;"
```

**Option 3 — wait for Phase 6:** `GET /api/machines` will list them from the API directly. Until then, use options 1 or 2.

### 6b. The full state machine at a glance

```
received ──► not_started ──► working ──► finished ──► out_for_delivery ──► delivered
            (staff/admin)   (staff/admin)  (staff/admin) (staff/admin)      (delivery/admin)
```

- Transitions to `working` need a `machineId`.
- Transitions to `out_for_delivery` need a `driverId` (create a `delivery`-role user first via `admin.http`).
- **Admin bypasses role checks** — an admin token can perform every transition.

---

## 7. Seeing real-time updates (Phase 4)

Every `OrderCreated` and `OrderStatusChanged` event is broadcast over Socket.IO. The dashboard subscribes and shows them in a live event log panel at the bottom of the page.

**Setup:**

1. Log in via `requests/auth.http` → copy the `accessToken`.
2. Open http://localhost:5173/dashboard in a browser.
3. Open DevTools console (F12) and run:
   ```js
   localStorage.setItem('accessToken', 'PASTE_TOKEN_HERE');
   ```
4. Reload the page. You should see `[socket] connected <socket-id>` in the console.

**Now trigger events:**

- Open a second browser tab at http://localhost:5174/demo.html → submit an order → within ~100ms the dashboard's "Live events" panel shows `New order H7K3M9P2BN`.
- Run any transition in `requests/orders.http` → dashboard logs `Order abc12345… → not_started`.

**If the event panel stays empty:**

- Check the browser console for `[socket] connection error` — usually means the token is missing or expired.
- Check DevTools → Network → WS tab — the `/socket.io/` handshake should show `101 Switching Protocols`.
- Re-run login, update `localStorage`, reload.

> The proper login page with auth context lands in Phase 5. For now, the `localStorage` trick is the shortcut.

---

## 8. Debugging the API in VS Code

Press **F5** or open the Run/Debug sidebar. Two launch configs are wired up:

| Config | What it does |
|---|---|
| **Debug API** | Starts the API under the VS Code debugger; breakpoints in `apps/api/src/` work |
| **Debug Seed** | Steps through `apps/api/prisma/seed.ts` line by line |

> **Important:** stop `pnpm dev`'s API process first (or port 3000 will conflict). The web + widget keep running on their own ports.

---

## 9. Common issues

| Symptom | Fix |
|---|---|
| `EPERM: operation not permitted, open 'C:\Program Files\nvm\...\pnpm'` | You're on Node 16. Run `nvm install 22 && nvm use 22`, then `corepack enable` from an **admin** PowerShell once. Or use standalone pnpm installer. |
| `pnpm: command not found` | `corepack enable && corepack prepare pnpm@9.12.0 --activate` — or standalone installer on Windows. |
| `bcrypt` build fails during `pnpm install` | Install native toolchain (see section 4a). Or retry — pnpm often falls back to a prebuilt binary. |
| `P1001: Can't reach database server` | `docker compose up -d postgres redis`; wait ~5s for healthchecks to pass. |
| `prisma: migration engine not found` on Windows | Git may have mangled line endings on Prisma's WASM binary. `git config --global core.autocrlf false` and re-clone. |
| CORS error in widget | Ensure API is on :3000 and `CORS_ALLOWED_ORIGINS` in `.env` includes `http://localhost:5174`. |
| Login returns 401 with correct email/password | Re-run `pnpm db:seed` — the seed rehashes the admin password on every run. |
| `[socket] connection error: Authentication required` | No token in `localStorage`, or token expired. Log in again, update localStorage, reload. |
| Dashboard "Live events" panel stays empty | Check DevTools Network → WS tab for the `/socket.io/` upgrade. Should show `101`. |
| `@prisma/client did not initialize` | Run `pnpm db:generate`. |
| Port 3000 / 5173 / 5174 / 5432 / 6379 already in use | Kill the owning process, or change the corresponding port in `.env`. |
| Tests running against stale data | `docker compose down -v && docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed` |
| TypeScript errors after pulling a new phase | `pnpm install` (new deps added), then `pnpm db:generate`. |

---

## 10. Useful commands

```bash
# ── Daily development ──
pnpm dev                          # all apps via Turborepo
pnpm --filter @laundry/api dev    # just the API
pnpm --filter @laundry/web dev    # just the dashboard
pnpm --filter @laundry/widget dev # just the widget

# ── Type checking ──
pnpm typecheck                    # all workspaces

# ── Database ──
pnpm db:migrate                   # apply / create migrations
pnpm db:seed                      # reseed (idempotent — safe to run repeatedly)
pnpm db:studio                    # browse data at http://localhost:5555
pnpm db:generate                  # regen Prisma client after schema changes

# ── Docker ──
docker compose up -d postgres redis  # start services
docker compose down                  # stop services (keeps data)
docker compose down -v               # stop + wipe ALL data (nuclear)

# ── Quick DB peek without Prisma Studio ──
docker compose exec postgres psql -U laundry -d laundry

# ── Nuclear reset (fresh DB, fresh seed) ──
docker compose down -v && docker compose up -d postgres redis && pnpm db:migrate && pnpm db:seed
```

---

## 11. What's implemented so far

Current state is **Phase 4 of 11**. What works today:

- ✅ Full monorepo scaffold (Turborepo, TS everywhere, Docker Compose) — Phase 1
- ✅ JWT auth with refresh rotation + token revocation (bcrypt passwords) — Phase 2
- ✅ RBAC middleware + admin user management (create/update/soft-delete) — Phase 2
- ✅ Order creation (widget + staff) with pickup/delivery + standard/express — Phase 3
- ✅ Order state machine with role-gated transitions + full audit trail — Phase 3
- ✅ Public customer tracking page (tracking code = bearer credential) — Phase 3
- ✅ Admin-configurable express surcharges per cleaning type — Phase 3
- ✅ **Real-time event broadcast over Socket.IO** (Redis-backed, horizontally scalable) — Phase 4
- ✅ **Dashboard subscribes to live order events** (JWT-auth'd Socket.IO client) — Phase 4

**Not yet wired up:**

- Proper login page + auth context in the web app (Phase 5)
- Kanban order cards with live movement (Phase 5)
- Miele machine monitoring (Phase 6)
- WhatsApp + email notifications (Phase 7)
- Staff alerts — bell icon, delay reminders (Phase 8)
- Google Maps picker in widget (Phase 9)
- Admin UI (Phase 10)

See [`.kiro/specs/laundry-app/tasks.md`](../.kiro/specs/laundry-app/tasks.md) for the full roadmap.

---

## 12. Where things live (quick directory map)

```
laundry-app/
├── apps/
│   ├── api/                        # Fastify + Prisma + Socket.IO backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # THE data model — start here for DB questions
│   │   │   └── seed.ts             # dev data (admin user, locations, machines, pricing)
│   │   └── src/
│   │       ├── modules/            # auth / users / orders / pricing / health
│   │       ├── shared/             # database, redis, socket, emit, jwt, passwords, logger
│   │       ├── config/env.ts       # zod-validated env vars (fails fast on boot)
│   │       ├── app.ts              # Fastify plugin registration (cors, jwt, routes)
│   │       └── main.ts             # boot + graceful shutdown + socket init
│   ├── web/                        # React + Vite + Tailwind — staff dashboard
│   │   └── src/
│   │       ├── hooks/useSocket.ts  # real-time event subscription hooks
│   │       ├── lib/socket.ts       # Socket.IO client singleton + typed helpers
│   │       ├── pages/              # Login / Dashboard / Tracking
│   │       └── components/         # AppShell (header + outlet)
│   └── widget/                     # Preact web component for the storefront
│       └── src/
│           ├── widget.ts           # <laundry-widget> custom element (shadow DOM)
│           └── OrderForm.tsx       # order form → POST /api/orders
├── packages/
│   └── shared/                     # enums, types, state transitions, socket event names
├── requests/                       # REST Client .http files (auth / orders / admin / health)
├── docs/                           # this guide
├── .vscode/                        # extensions, settings, launch configs
├── .kiro/specs/laundry-app/        # the living spec (requirements / design / tasks)
├── docker-compose.yml              # Postgres + Redis (+ optional full-stack profile)
├── .env.example                    # copy to .env for local dev
└── turbo.json                      # Turborepo task config
```
