# Laundry Store Management App — Implementation Tasks

## Phase 1: Project Scaffolding & Infrastructure
> Goal: Bootable monorepo with DB, Redis, and a health-check endpoint.

- [ ] 1. Initialize Turborepo monorepo with `apps/api`, `apps/web`, `apps/widget`, `packages/shared`
- [ ] 2. Set up `apps/api` — Fastify + TypeScript, dev/build scripts, basic folder structure (modules, shared)
- [ ] 3. Set up `apps/web` — React + Vite + TypeScript + Tailwind + shadcn/ui skeleton
- [ ] 4. Set up `packages/shared` — shared TypeScript types/enums (OrderStatus, UserRole, CleaningType)
- [ ] 5. Create `docker-compose.yml` with PostgreSQL 16 + Redis 7 services
- [ ] 6. Set up Prisma in `apps/api` — initial schema with all tables (users, locations, machines, orders, order_events, notifications, alert_rules)
- [ ] 7. Create seed script — default admin user, 2 locations, sample machines
- [ ] 8. Add health-check endpoint (`GET /api/health`) that confirms DB + Redis connectivity
- [ ] 9. Configure environment variables (.env.example) for all services (DB, Redis, JWT secret, Miele, WhatsApp, Email)

---

## Phase 2: Authentication & Authorization
> Goal: Staff/admin/delivery can log in; all API routes are protected by role.

- [ ] 10. Implement auth module — login endpoint (email + password → JWT access + refresh tokens)
- [ ] 11. Implement token refresh endpoint
- [ ] 12. Create RBAC middleware — `requireRole('admin', 'staff')` decorator for routes
- [ ] 13. Create `POST /api/admin/users` — admin creates staff/delivery accounts (hashed passwords)
- [ ] 14. Create `GET /api/admin/users` — list and manage users
- [ ] 15. Add password hashing utility (bcrypt/argon2)

---

## Phase 3: Orders & State Machine (Core)
> Goal: Orders can be created and advanced through all states with full audit trail.

- [ ] 16. Create `POST /api/orders` — public endpoint for order creation (widget + staff), generates tracking_code
- [ ] 17. Create `GET /api/orders` — list orders with filters (status, location, search by name/phone/code)
- [ ] 18. Create `GET /api/orders/:id` — full order detail with events timeline
- [ ] 19. Implement state machine logic — validate transitions, enforce role-transition matrix
- [ ] 20. Create `PATCH /api/orders/:id/status` — advance order state (validates caller role + allowed transition)
- [ ] 21. Auto-insert `order_events` row on every state change (from_status, to_status, changed_by, timestamp)
- [ ] 22. Create `GET /api/track/:code` — public endpoint returning order status + event timestamps (no auth)
- [ ] 23. Add pagination + sorting to orders list endpoint

---

## Phase 4: Real-time Dashboard Infrastructure
> Goal: State changes broadcast to all connected dashboard clients instantly.

- [ ] 24. Set up Socket.IO server integrated with Fastify (authenticated connections via JWT)
- [ ] 25. Set up Redis pub/sub adapter for Socket.IO (multi-instance ready)
- [ ] 26. On order state change → publish event to Redis → Socket.IO broadcasts to connected clients
- [ ] 27. Define Socket.IO event schema: `order:created`, `order:status_changed`, `machine:state_updated`, `alert:new`
- [ ] 28. Add connection/room management — staff joins "dashboard" room, delivery joins "delivery" room

---

## Phase 5: Frontend — Dashboard & Core Pages
> Goal: Staff can see, manage, and advance orders on a working dashboard.

- [ ] 29. Set up React Router with route guards (redirect to login if no token, redirect by role)
- [ ] 30. Build Login page (email + password form, stores JWT in memory/httpOnly cookie)
- [ ] 31. Build Dashboard page — Kanban board with columns per status (received, not_started, working, finished, out_for_delivery)
- [ ] 32. Build Order Card component — shows customer name, cleaning type, time in state, assigned machine
- [ ] 33. Build Order Detail panel/modal — full timeline, action buttons to advance state, assign machine/driver
- [ ] 34. Integrate Socket.IO client — Kanban auto-updates when events arrive
- [ ] 35. Build Delivery View page — filtered list of "finished" + "out_for_delivery" orders, "confirm delivery" action
- [ ] 36. Add search + filter bar (status, location, text search)
- [ ] 37. Build Customer Tracking page (`/track/:code`) — public, no auth, progress stepper + timestamps

---

## Phase 6: Miele API Integration
> Goal: Machines are connected, monitored in real-time, and displayed on the dashboard.

- [ ] 38. Create Miele OAuth flow — admin-only endpoint to initiate authorization, handle callback, store tokens
- [ ] 39. Implement token refresh logic for Miele (tokens expire, need auto-refresh)
- [ ] 40. Create `GET /api/machines` — list registered machines with current Miele state
- [ ] 41. Implement SSE listener — connect to Miele events endpoint, parse device state updates
- [ ] 42. On machine state change → update local cache → broadcast via Socket.IO (`machine:state_updated`)
- [ ] 43. Build Machine Status widget component (shows program, remaining time, status indicator)
- [ ] 44. Link machine to order — when staff moves order to "working", assign a machine
- [ ] 45. Auto-advance logic — when Miele reports cycle end for a linked machine → transition order to "finished" (with configurable toggle)
- [ ] 46. Fallback polling job (BullMQ) — if SSE disconnects, poll `/v1/devices/{id}/state` every 30s
- [ ] 47. Handle 2 locations — filter machines by location, show in dashboard sidebar

---

## Phase 7: Notifications — WhatsApp & Email
> Goal: Customers receive status updates via WhatsApp; email as backup.

- [ ] 48. Create notification provider interface (`NotificationProvider`) and factory
- [ ] 49. Implement WhatsApp provider — Meta Cloud API integration, template message sending
- [ ] 50. Define and register WhatsApp message templates with Meta (order_confirmed, order_ready, out_for_delivery, order_delivered)
- [ ] 51. Implement Email provider — Nodemailer with HTML templates (same events as WhatsApp)
- [ ] 52. Create notification queue (BullMQ) — enqueues notification jobs on order state transitions
- [ ] 53. Implement retry logic — 3 attempts, exponential backoff (1min, 5min, 15min)
- [ ] 54. Create `notifications` table entries — track send status, attempts, errors
- [ ] 55. Admin view for notification history — see sent/failed notifications per order
- [ ] 56. Configuration: which transitions trigger which channels (WhatsApp for all customer-facing, email as fallback)

---

## Phase 8: Alert Engine
> Goal: Staff get proactive alerts for pending tasks, delays, and machine errors.

- [ ] 57. Create alert scanner (BullMQ repeatable job, every 5 min) — detects stuck orders beyond threshold
- [ ] 58. Define alert rules table — configurable thresholds per trigger type
- [ ] 59. New order alert — immediate in-app notification via Socket.IO to all active staff
- [ ] 60. Machine error alert — Miele reports fault → in-app alert to assigned staff
- [ ] 61. Delivery delay alert — order in "out_for_delivery" beyond expected time → escalation
- [ ] 62. Build Alert UI — bell icon with badge count, dropdown list of alerts, dismiss action
- [ ] 63. Create `GET /api/alerts` and `PATCH /api/alerts/:id/dismiss` endpoints

---

## Phase 9: Embeddable Widget
> Goal: A lightweight web component that external store sites can embed for order submission.

- [ ] 64. Set up `apps/widget` — Preact + TypeScript + Vite, builds as single JS bundle
- [ ] 65. Build order form component (name, phone, cleaning type, notes, location select)
- [ ] 66. Build success screen (shows tracking code + link)
- [ ] 67. Package as Web Component (`<laundry-widget>`) with configurable attributes (API URL, theme color)
- [ ] 68. Add CORS configuration on API to allow widget origin(s)
- [ ] 69. Test embedding in a sample HTML page

---

## Phase 10: Admin Panel
> Goal: Admin can manage users, locations, machines, alert rules, and system settings.

- [ ] 70. Build Admin layout (sidebar nav: Users, Locations, Machines, Alerts, Settings)
- [ ] 71. User management page — list, create, deactivate staff/delivery users
- [ ] 72. Location management page — view/edit 2 locations
- [ ] 73. Machine management page — register Miele devices, assign to locations, set friendly names
- [ ] 74. Alert rules page — configure thresholds for each trigger type
- [ ] 75. Settings page — notification preferences, Miele connection status, system info

---

## Phase 11: Polish & Production Readiness
> Goal: App is deployable, secure, and handles edge cases.

- [ ] 76. Add request validation (Zod schemas) on all API endpoints
- [ ] 77. Add global error handling + structured logging (pino)
- [ ] 78. Add rate limiting on public endpoints (order creation, tracking)
- [ ] 79. Set up production Docker build (multi-stage, minimal images)
- [ ] 80. Configure Caddy/Nginx reverse proxy with auto-HTTPS
- [ ] 81. Set up PostgreSQL backups (pg_dump cron)
- [ ] 82. Add basic monitoring — health checks, uptime ping
- [ ] 83. Write deployment documentation (README with setup instructions)
- [ ] 84. End-to-end smoke test — create order via widget → advance through all states → verify notifications

---

## Phase Summary

| Phase | Tasks | Focus |
|---|---|---|
| 1 | 1–9 | Scaffolding & infrastructure |
| 2 | 10–15 | Auth & authorization |
| 3 | 16–23 | Orders & state machine |
| 4 | 24–28 | Real-time infrastructure |
| 5 | 29–37 | Frontend dashboard |
| 6 | 38–47 | Miele API integration |
| 7 | 48–56 | Notifications (WhatsApp + Email) |
| 8 | 57–63 | Alert engine |
| 9 | 64–69 | Embeddable widget |
| 10 | 70–75 | Admin panel |
| 11 | 76–84 | Polish & production |

---

## Dependencies Between Phases

```
Phase 1 ──► Phase 2 ──► Phase 3 ──┬──► Phase 4 ──► Phase 5
                                   │
                                   ├──► Phase 6 (can parallel with 5)
                                   │
                                   ├──► Phase 7 (can parallel with 5/6)
                                   │
                                   └──► Phase 8 (after 4 + 6)
                                   
Phase 5 ──► Phase 9 (widget reuses form logic)
Phase 5 ──► Phase 10 (admin extends dashboard shell)

All ──► Phase 11
```

**Critical path:** Phases 1 → 2 → 3 → 4 → 5 (minimum to get a working demo)

**Parallelizable:** Phases 6, 7, 9 can be developed in parallel after Phase 3 is complete.
