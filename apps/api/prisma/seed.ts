/**
 * Dev/demo seed script.
 * Safe to run multiple times — uses upserts keyed on unique fields.
 *
 * Run:
 *   pnpm db:seed           # from repo root
 *   pnpm --filter @laundry/api db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

async function main(): Promise<void> {
  console.log('Seeding database...');

  // ---- Locations ----
  const locationA = await prisma.location.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      name: 'Location A',
      address: '123 Main Street',
    },
  });

  const locationB = await prisma.location.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      name: 'Location B',
      address: '456 Market Avenue',
    },
  });

  console.log(`  locations: ${locationA.name}, ${locationB.name}`);

  // ---- Admin user ----
  // Re-hash on every seed so that moving from the Phase 1 placeholder hash
  // to real bcrypt happens automatically when devs re-run the seed.
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme';
  const adminHash = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@laundry.local' },
    update: { passwordHash: adminHash },
    create: {
      email: 'admin@laundry.local',
      name: 'Admin',
      role: 'admin',
      passwordHash: adminHash,
      locationId: locationA.id,
    },
  });
  console.log(`  admin user: ${admin.email} (password: "${adminPassword}")`);

  // ---- Sample machines ----
  const sampleMachines = [
    { mieleDeviceId: 'seed-washer-a1', name: 'Washer A1', type: 'washer', locationId: locationA.id },
    { mieleDeviceId: 'seed-washer-a2', name: 'Washer A2', type: 'washer', locationId: locationA.id },
    { mieleDeviceId: 'seed-dryer-a1', name: 'Dryer A1', type: 'dryer', locationId: locationA.id },
    { mieleDeviceId: 'seed-washer-b1', name: 'Washer B1', type: 'washer', locationId: locationB.id },
    { mieleDeviceId: 'seed-dryer-b1', name: 'Dryer B1', type: 'dryer', locationId: locationB.id },
  ] as const;

  for (const m of sampleMachines) {
    await prisma.machine.upsert({
      where: { mieleDeviceId: m.mieleDeviceId },
      update: {},
      create: m,
    });
  }
  console.log(`  machines: ${sampleMachines.length}`);

  // ---- Default alert rules ----
  const defaultRules = [
    { name: 'New order notification', triggerType: 'new_order', thresholdMinutes: null },
    { name: 'Pending order timeout', triggerType: 'pending_timeout', thresholdMinutes: 60 },
    { name: 'Machine error alert', triggerType: 'machine_error', thresholdMinutes: null },
    { name: 'Delivery delay escalation', triggerType: 'delivery_delay', thresholdMinutes: 45 },
  ] as const;

  // Alert rules have no natural unique key besides id; use name as a pragmatic check.
  for (const rule of defaultRules) {
    const existing = await prisma.alertRule.findFirst({ where: { name: rule.name } });
    if (!existing) {
      await prisma.alertRule.create({ data: rule });
    }
  }
  console.log(`  alert rules: ${defaultRules.length}`);

  // ---- Default pricing ----
  const cleaningTypes = ['wash_fold', 'dry_cleaning', 'ironing', 'special'] as const;
  const expressSurcharges: Record<(typeof cleaningTypes)[number], number> = {
    wash_fold: 5.0,
    dry_cleaning: 8.0,
    ironing: 4.0,
    special: 10.0,
  };

  for (const ct of cleaningTypes) {
    await prisma.pricing.upsert({
      where: { cleaningType_processingSpeed: { cleaningType: ct, processingSpeed: 'standard' } },
      update: {},
      create: { cleaningType: ct, processingSpeed: 'standard', surcharge: 0 },
    });
    await prisma.pricing.upsert({
      where: { cleaningType_processingSpeed: { cleaningType: ct, processingSpeed: 'express' } },
      update: {},
      create: { cleaningType: ct, processingSpeed: 'express', surcharge: expressSurcharges[ct] },
    });
  }
  console.log(`  pricing rows: ${cleaningTypes.length * 2}`);

  console.log('Seed complete.');
}

main()
  .catch((err: unknown) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
