# Laundry Store Management App — Requirements

## Overview

A web application for managing laundry orders in a single-store business with two physical locations. The system handles the full lifecycle of laundry tasks — from customer submission through cleaning, delivery, and completion — with real-time machine monitoring via Miele API and multi-channel customer notifications.

---

## User Roles & Access Levels

### 1. Customer (unauthenticated / lightweight)
- Submits orders via an embeddable widget on the store's public website
- Receives status notifications via WhatsApp (primary), email (secondary), Viber (future)
- Can check order status via a unique tracking link (no login required)
- Provides: name, phone number, type of cleaning

### 2. Staff
- Views and manages all tasks on a dashboard
- Advances task state: Not started → Working on it → Finished
- Assigns tasks to specific machines
- Views Miele machine load/cycle data for active orders
- Receives alerts for: new orders, pending tasks, delay reminders

### 3. Delivery Person
- Views tasks in "Finished" state ready for delivery
- Updates status: Out for delivery → Delivered
- Confirms delivery (proof of delivery)

### 4. Admin
- Full access to all features
- Manages staff, delivery personnel, and system settings
- Views analytics and oversight dashboard
- Manages store locations and machine assignments

---

## Functional Requirements

### FR-1: Order Submission
- **FR-1.1:** Customers can submit orders via an embeddable widget (iframe/web component)
- **FR-1.2:** Staff can create orders on behalf of walk-in customers
- **FR-1.3:** Order fields: customer name, phone number, cleaning type, notes (optional), pickup location (Location A or B)
- **FR-1.4:** On submission, system generates a unique tracking code and sends it to the customer
- **FR-1.5:** Cleaning types include at minimum: wash & fold, dry cleaning, ironing, special items

### FR-2: Task State Machine
States flow linearly:
```
Order received → Not started → Working on it → Finished → Out for delivery → Delivered
```

- **FR-2.1:** "Order received" is the initial state upon submission
- **FR-2.2:** Staff transitions "Order received" → "Not started" (acknowledges receipt, triggers staff alert)
- **FR-2.3:** Staff transitions "Not started" → "Working on it" (assigns to machine, begins Miele monitoring)
- **FR-2.4:** System or staff transitions "Working on it" → "Finished" (machine cycle completes or manual override)
- **FR-2.5:** Staff/Admin assigns delivery person, triggering "Finished" → "Out for delivery"
- **FR-2.6:** Delivery person confirms delivery, "Out for delivery" → "Delivered"
- **FR-2.7:** Each state transition is timestamped and logged

### FR-3: Dashboard
- **FR-3.1:** Kanban-style or list view showing tasks grouped by state
- **FR-3.2:** Filter by location (Location A / Location B)
- **FR-3.3:** Search by customer name, phone, or tracking code
- **FR-3.4:** Real-time updates (tasks move between columns without page refresh)
- **FR-3.5:** Miele machine data displayed inline for "Working on it" tasks (program name, remaining time, status)

### FR-4: Miele API Integration
- **FR-4.1:** Connect to Miele 3rd Party API v1.1.0 via OAuth2 (Authorization Code flow)
- **FR-4.2:** List available machines per location
- **FR-4.3:** Subscribe to real-time machine state via Server-Sent Events (SSE)
- **FR-4.4:** Display per-machine: current program, elapsed/remaining time, status (running, idle, finished, error)
- **FR-4.5:** When a machine cycle finishes, optionally auto-advance the linked task to "Finished"
- **FR-4.6:** Support machines across 2 physical locations

### FR-5: Notifications & Alerts

#### Staff Alerts (in-app + optional push)
- **FR-5.1:** New order received → alert all active staff
- **FR-5.2:** Task pending too long (configurable threshold) → reminder alert
- **FR-5.3:** Machine error/fault → immediate alert
- **FR-5.4:** Delay in delivery beyond expected time → escalation alert

#### Customer Notifications (WhatsApp primary, email secondary)
- **FR-5.5:** Order confirmed (tracking link included)
- **FR-5.6:** Order status changed to "Working on it"
- **FR-5.7:** Order "Finished" — ready for pickup or delivery
- **FR-5.8:** "Out for delivery" — driver assigned
- **FR-5.9:** "Delivered" — completion confirmation

### FR-6: Customer Tracking Page
- **FR-6.1:** Accessible via unique URL (no login)
- **FR-6.2:** Shows current order status with visual progress indicator
- **FR-6.3:** Shows timestamps for each completed state
- **FR-6.4:** No location tracking — just status updates

### FR-7: Embeddable Widget
- **FR-7.1:** Lightweight JS snippet or web component that can be added to any website
- **FR-7.2:** Contains the order submission form
- **FR-7.3:** Styled to be configurable (basic theme/color options)
- **FR-7.4:** Communicates with backend API via CORS-enabled endpoints

---

## Non-Functional Requirements

### NFR-1: Performance
- Dashboard loads in < 2 seconds
- Real-time updates delivered within 1 second of state change
- Widget loads in < 1 second on external sites

### NFR-2: Reliability
- 99.5% uptime target
- Graceful degradation if Miele API is unreachable (show "data unavailable", don't block workflow)
- Notification delivery retries (3 attempts with exponential backoff)

### NFR-3: Security
- JWT-based authentication for staff/delivery/admin
- Role-based access control (RBAC) enforced at API level
- Customer tracking links use unguessable tokens (UUID v4 or similar)
- All communication over HTTPS
- WhatsApp API keys and Miele OAuth tokens stored encrypted

### NFR-4: Scalability (single store)
- Designed for tens of concurrent staff users, not thousands
- Hundreds of active orders at a time
- No multi-tenant complexity

### NFR-5: Maintainability
- Modular architecture — notification providers are pluggable
- Clear separation: API / frontend / background jobs
- Environment-based configuration for all external service credentials

---

## Constraints & Dependencies

| Dependency | Status | Notes |
|---|---|---|
| Miele Developer Portal account | Required | Needed for OAuth client_id/secret |
| Miele machines connected to internet | Confirmed | 2 locations |
| WhatsApp Business account | Active | Already set up |
| Meta Business verification | Required | For WhatsApp template messages |
| Domain for hosting | TBD | Needed for OAuth redirect URIs |
| Email service (SMTP or SES) | TBD | Secondary notification channel |

---

## Out of Scope (v1)
- Live delivery GPS tracking
- Customer accounts / login
- Payment processing
- Multi-store / multi-tenant
- Viber integration (planned for v2)
- Mobile native app (responsive web only)
- Inventory management
