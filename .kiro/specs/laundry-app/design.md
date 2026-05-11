# Laundry Store Management App — Design Document

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend** | Node.js + TypeScript + Fastify | Fast, typed, excellent ecosystem for REST + WebSockets |
| **Database** | PostgreSQL | Relational integrity for orders/state, JSONB for flexible metadata |
| **Cache / PubSub** | Redis | Real-time dashboard events, session store, job queue backing |
| **Job Queue** | BullMQ (on Redis) | Scheduled alerts, notification retries, Miele polling fallback |
| **Frontend** | React + TypeScript + Vite | Fast builds, strong component ecosystem |
| **UI Library** | Tailwind CSS + shadcn/ui | Rapid styling, accessible components, easy theming |
| **Real-time** | Socket.IO | Dashboard live updates (task state changes, Miele data) |
| **Auth** | JWT (access + refresh tokens) | Stateless API auth with RBAC middleware |
| **ORM** | Prisma | Type-safe DB access, clean migrations |
| **Email** | Nodemailer (SMTP) or AWS SES | Simple, reliable, swappable |
| **WhatsApp** | Meta Cloud API (direct HTTP) | Already active, template-based messaging |
| **Widget** | Preact + Web Component | Tiny bundle (~5KB), embeddable anywhere |
| **Deployment** | Docker Compose → VPS or Railway | Simple single-store deployment, easy to upgrade later |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React SPA)                      │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Customer │  │    Staff     │  │   Delivery   │              │
│  │ Tracking │  │  Dashboard   │  │     View     │              │
│  │   Page   │  │              │  │              │              │
│  └──────────┘  └──────────────┘  └──────────────┘              │
│                       + Admin Panel                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP + WebSocket
┌─────────────────────────┼───────────────────────────────────────┐
│                     API GATEWAY (Fastify)                         │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │  Auth   │  │  Orders  │  │ Machines │  │ Notifications  │  │
│  │ Module  │  │  Module  │  │  Module  │  │    Module      │  │
│  └─────────┘  └──────────┘  └──────────┘  └────────────────┘  │
└────────┬────────────┬────────────┬────────────────┬─────────────┘
         │            │            │                │
    ┌────┴───┐   ┌────┴───┐  ┌────┴────┐   ┌──────┴──────┐
    │PostgreSQL│  │ Redis  │  │Miele API│   │External APIs│
    │         │  │        │  │  (SSE)  │   │WA / Email   │
    └─────────┘  └────────┘  └─────────┘   └─────────────┘
```

### Embeddable Widget (separate build)
```
┌─────────────────────┐
│  Store's Website    │
│  ┌───────────────┐  │
│  │ <laundry-     │  │     POST /api/orders
│  │  widget />    │──┼──────────────────────► API Gateway
│  └───────────────┘  │
└─────────────────────┘
```

---

## Data Model

### Entity Relationship

```
┌──────────┐       ┌───────────────┐       ┌──────────┐
│   User   │──────<│     Order     │>──────│  Machine │
└──────────┘       └───────────────┘       └──────────┘
                          │
                          │ 1:N
                   ┌──────┴──────┐
                   │ OrderEvent  │
                   └─────────────┘
                          │
                   ┌──────┴──────┐
                   │Notification │
                   └─────────────┘
```

### Tables

#### `users`
```sql
id              UUID PRIMARY KEY
email           VARCHAR(255) UNIQUE
phone           VARCHAR(20)
name            VARCHAR(100) NOT NULL
role            ENUM('admin', 'staff', 'delivery') NOT NULL
password_hash   VARCHAR(255) NOT NULL
location_id     UUID REFERENCES locations(id)
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `locations`
```sql
id              UUID PRIMARY KEY
name            VARCHAR(100) NOT NULL  -- "Location A", "Location B"
address         TEXT
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `machines`
```sql
id              UUID PRIMARY KEY
miele_device_id VARCHAR(100) UNIQUE    -- ID from Miele API
name            VARCHAR(100) NOT NULL  -- friendly name e.g. "Washer 1"
type            ENUM('washer', 'dryer', 'ironer') NOT NULL
location_id     UUID REFERENCES locations(id) NOT NULL
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `orders`
```sql
id              UUID PRIMARY KEY
tracking_code   VARCHAR(12) UNIQUE NOT NULL  -- short, human-friendly
customer_name   VARCHAR(100) NOT NULL
customer_phone  VARCHAR(20) NOT NULL
customer_email  VARCHAR(255)
cleaning_type   ENUM('wash_fold', 'dry_cleaning', 'ironing', 'special') NOT NULL
processing_speed ENUM('standard', 'express') NOT NULL DEFAULT 'standard'
fulfillment     ENUM('pickup', 'delivery') NOT NULL DEFAULT 'pickup'
pickup_location_id UUID REFERENCES locations(id)      -- set when fulfillment = 'pickup'
delivery_address TEXT                                  -- formatted address from Google Maps
delivery_lat    DECIMAL(10, 7)                         -- latitude from Google Maps picker
delivery_lng    DECIMAL(10, 7)                         -- longitude from Google Maps picker
notes           TEXT
status          ENUM('received', 'not_started', 'working', 'finished', 'out_for_delivery', 'delivered') NOT NULL DEFAULT 'received'
location_id     UUID REFERENCES locations(id) NOT NULL -- processing location (which store handles it)
machine_id      UUID REFERENCES machines(id)           -- assigned when "working"
assigned_staff  UUID REFERENCES users(id)
assigned_driver UUID REFERENCES users(id)
express_surcharge DECIMAL(10, 2) DEFAULT 0.00          -- surcharge amount if express
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `order_events` (audit log)
```sql
id              UUID PRIMARY KEY
order_id        UUID REFERENCES orders(id) NOT NULL
from_status     VARCHAR(20)
to_status       VARCHAR(20) NOT NULL
changed_by      UUID REFERENCES users(id)  -- NULL if system/customer
metadata        JSONB                       -- e.g. machine data snapshot
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `notifications`
```sql
id              UUID PRIMARY KEY
order_id        UUID REFERENCES orders(id) NOT NULL
channel         ENUM('whatsapp', 'email', 'viber', 'in_app') NOT NULL
recipient       VARCHAR(255) NOT NULL       -- phone or email
template        VARCHAR(100) NOT NULL       -- e.g. "order_ready"
status          ENUM('pending', 'sent', 'failed', 'delivered') DEFAULT 'pending'
attempts        INTEGER DEFAULT 0
last_error      TEXT
sent_at         TIMESTAMPTZ
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `alert_rules` (configurable staff alerts)
```sql
id              UUID PRIMARY KEY
name            VARCHAR(100) NOT NULL
trigger_type    ENUM('new_order', 'pending_timeout', 'machine_error', 'delivery_delay') NOT NULL
threshold_minutes INTEGER                   -- for timeout-based triggers
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT NOW()
```

#### `pricing` (admin-configurable surcharges)
```sql
id              UUID PRIMARY KEY
cleaning_type   ENUM('wash_fold', 'dry_cleaning', 'ironing', 'special') NOT NULL
processing_speed ENUM('standard', 'express') NOT NULL
base_price      DECIMAL(10, 2)              -- optional, for display purposes
surcharge       DECIMAL(10, 2) DEFAULT 0.00 -- express surcharge amount
is_active       BOOLEAN DEFAULT true
updated_at      TIMESTAMPTZ DEFAULT NOW()
UNIQUE(cleaning_type, processing_speed)
```

---

## Module Design

### 1. Auth Module
- **Login:** POST `/api/auth/login` → returns JWT access (15min) + refresh (7d) tokens
- **Refresh:** POST `/api/auth/refresh`
- **RBAC Middleware:** Decorates routes with `@roles('admin', 'staff')` etc.
- **No customer auth:** Tracking page uses `tracking_code` as bearer — unguessable, short-lived enough

### 2. Orders Module (State Machine)
```typescript
// Allowed transitions map
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  received:         ['not_started'],
  not_started:      ['working'],
  working:          ['finished'],
  finished:         ['out_for_delivery'],
  out_for_delivery: ['delivered'],
  delivered:        [],
};
```

Each transition:
1. Validates the caller's role is allowed to perform it
2. Updates `orders.status` + `orders.updated_at`
3. Inserts into `order_events`
4. Emits a Redis pub/sub event → picked up by Socket.IO for real-time dashboard
5. Enqueues appropriate notifications (BullMQ job)

**Role-transition matrix:**

| Transition | Staff | Delivery | Admin |
|---|---|---|---|
| received → not_started | ✓ | | ✓ |
| not_started → working | ✓ | | ✓ |
| working → finished | ✓ | | ✓ |
| finished → out_for_delivery | ✓ | | ✓ |
| out_for_delivery → delivered | | ✓ | ✓ |

### 3. Miele Bridge Module
- **OAuth Setup:** One-time admin flow to authorize the store's Miele account
- **SSE Listener:** Long-lived connection to `GET /v1/devices/all/events` — streams state changes
- **Machine Registry:** Maps Miele device IDs → internal `machines` table
- **Auto-advance:** When SSE reports a machine cycle end & machine is linked to an active order → auto-transition to "finished" (configurable)
- **Fallback polling:** If SSE disconnects, BullMQ job polls `/v1/devices/{id}/state` every 30s until reconnected
- **Data exposed to dashboard:** program name, remaining time, temperature, spin speed, status

### 4. Notification Module (Pluggable)
```typescript
interface NotificationProvider {
  channel: 'whatsapp' | 'email' | 'viber';
  send(recipient: string, template: string, data: Record<string, string>): Promise<SendResult>;
}
```

**WhatsApp Provider:**
- Uses Meta Cloud API: `POST https://graph.facebook.com/v19.0/{PHONE_ID}/messages`
- Pre-approved templates: `order_confirmed`, `order_working`, `order_ready`, `out_for_delivery`, `order_delivered`
- Variables: `{{customer_name}}`, `{{tracking_code}}`, `{{tracking_url}}`

**Email Provider:**
- Nodemailer with HTML templates (mjml or react-email)
- Same template names, rendered as email

**Retry logic (BullMQ):**
- 3 attempts, exponential backoff (1min, 5min, 15min)
- On final failure → mark notification as "failed", log for admin review

### 5. Alert Engine
- **Cron-based scanner** (BullMQ repeatable job, every 5 min):
  - Finds orders stuck in `received` or `not_started` beyond threshold → staff in-app alert
  - Finds orders in `out_for_delivery` beyond expected delivery window → escalation
- **Event-driven alerts:**
  - New order → immediate in-app notification to all active staff
  - Miele machine error → immediate in-app notification to assigned staff
- **In-app alerts** delivered via Socket.IO (bell icon + toast in dashboard)

---

## API Routes Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | Public | Staff/delivery/admin login |
| POST | `/api/auth/refresh` | Refresh token | Get new access token |
| GET | `/api/orders` | Staff+ | List orders (filterable) |
| POST | `/api/orders` | Public (widget) | Create new order |
| GET | `/api/orders/:id` | Staff+ | Order detail |
| PATCH | `/api/orders/:id/status` | Staff/Delivery | Advance order state |
| GET | `/api/track/:code` | Public | Customer tracking page data |
| GET | `/api/machines` | Staff+ | List machines + current state |
| GET | `/api/machines/:id/status` | Staff+ | Single machine Miele data |
| GET | `/api/alerts` | Staff+ | List active alerts |
| PATCH | `/api/alerts/:id/dismiss` | Staff+ | Dismiss an alert |
| GET | `/api/admin/users` | Admin | Manage users |
| POST | `/api/admin/users` | Admin | Create user |
| GET | `/api/admin/settings` | Admin | App settings |
| PUT | `/api/admin/settings` | Admin | Update settings |

---

## Frontend Pages

| Page | Route | Role | Key Components |
|---|---|---|---|
| Login | `/login` | Public | Login form |
| Dashboard | `/dashboard` | Staff/Admin | Kanban board, machine sidebar, alert bell |
| Order Detail | `/orders/:id` | Staff/Admin | Full timeline, machine data, actions |
| Delivery View | `/delivery` | Delivery | List of ready orders, confirm delivery button |
| Admin Panel | `/admin` | Admin | User management, settings, alert rules |
| Customer Tracking | `/track/:code` | Public | Progress stepper, timestamps |

### Widget
- Separate Vite build → outputs `laundry-widget.js` + `laundry-widget.css`
- Embed: `<script src="https://app.store.com/widget.js"></script><laundry-widget store-id="..."></laundry-widget>`
- Contains: order form, success screen with tracking code

---

## Real-time Architecture

```
Browser (Staff Dashboard)
    │
    │ Socket.IO connection (authenticated)
    │
    ▼
Fastify Server ←── Redis Pub/Sub ←── Order state change
    │                                     │
    │                                     ├── Miele SSE event
    │                                     │
    │                                     └── Alert engine trigger
    ▼
Client receives event → React state update → UI re-renders
```

Events emitted:
- `order:created` — new order appears on board
- `order:status_changed` — card moves between columns
- `machine:state_updated` — machine widget refreshes
- `alert:new` — toast notification + badge increment

---

## Folder Structure

```
laundry-app/
├── apps/
│   ├── api/                    # Fastify backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── orders/
│   │   │   │   ├── machines/
│   │   │   │   ├── notifications/
│   │   │   │   └── alerts/
│   │   │   ├── shared/
│   │   │   │   ├── database/   # Prisma client + migrations
│   │   │   │   ├── queue/      # BullMQ setup
│   │   │   │   ├── redis/      # Redis client
│   │   │   │   └── socket/     # Socket.IO setup
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── package.json
│   ├── web/                    # React dashboard
│   │   ├── src/
│   │   │   ├── pages/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── stores/         # Zustand state
│   │   │   └── lib/
│   │   └── package.json
│   └── widget/                 # Embeddable Preact widget
│       ├── src/
│       └── package.json
├── packages/
│   └── shared/                 # Shared types, enums, constants
│       └── package.json
├── docker-compose.yml          # Postgres + Redis + API + Web
├── turbo.json                  # Turborepo config
└── package.json                # Root workspace
```

---

## Deployment Strategy

**Development:** `docker-compose up` runs Postgres, Redis, API (hot-reload), Web (Vite dev server)

**Production (single VPS):**
- Docker Compose with:
  - `postgres` container (persistent volume)
  - `redis` container
  - `api` container (Node.js, port 3000)
  - `web` container (Nginx serving static build, proxy to API)
- Reverse proxy: Caddy or Nginx (auto-HTTPS via Let's Encrypt)
- Backups: pg_dump cron → object storage

**Future upgrade path:** Railway / Render / fly.io for zero-ops deployment.
