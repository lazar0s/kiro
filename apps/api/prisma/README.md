# Prisma — Database Schema & Migrations

## Files

- `schema.prisma` — data model, enums, relations. Source of truth for the DB.
- `seed.ts` — dev/demo seed (admin user, 2 locations, machines, alert rules, pricing).
- `migrations/` — generated migration files (created on first `pnpm db:migrate`).

## Common commands

From the repo root:

```bash
pnpm db:generate         # regenerate the Prisma Client after schema changes
pnpm db:migrate          # create + apply a dev migration (prompts for a name)
pnpm db:seed             # run the seed script (idempotent)
pnpm db:studio           # open Prisma Studio at http://localhost:5555
```

## Conventions

- Table and column names are `snake_case` in Postgres; TS field names are `camelCase`. The mapping is done via Prisma's `@map` and `@@map` attributes.
- All timestamps are `Timestamptz(6)`.
- Soft delete is not used in v1 — deactivations are done via `isActive` booleans.
- Enum values match `packages/shared/src/enums.ts`. If you change one, change the other.

## Keeping enums in sync

Prisma enums and the TS enums in `@laundry/shared` must use the **same string values**. A mismatch will produce confusing runtime errors when the client serializes or deserializes.
