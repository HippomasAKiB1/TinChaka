import { PrismaClient, UserRole } from '@prisma/client';
// bcryptjs (pure JS) instead of bcrypt (native) — matches password.service.ts
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;
const DEMO_PASSWORD = 'tinchaka123';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);

  // 1. Seed Driver (Jashim)
  const jashim = await prisma.user.upsert({
    where: { email: 'jashim@tinchaka.dev' },
    update: {
      name: 'Jashim',
      role: UserRole.DRIVER,
      password_hash: passwordHash,
    },
    create: {
      name: 'Jashim',
      email: 'jashim@tinchaka.dev',
      password_hash: passwordHash,
      role: UserRole.DRIVER,
    },
  });

  // 2. Seed Vehicle (Bullet) for Driver Jashim (1 vehicle per driver)
  await prisma.vehicle.upsert({
    where: { driver_id: jashim.id },
    update: {
      name: 'Bullet',
      capacity: 3,
      is_online: false,
    },
    create: {
      driver_id: jashim.id,
      name: 'Bullet',
      capacity: 3,
      is_online: false,
    },
  });

  // 3. Seed Passengers (Story cast: Nusrat, Rafiq, Shirin + Karim, Rumi)
  const passengers = [
    { name: 'Nusrat', email: 'nusrat@tinchaka.dev' },
    { name: 'Rafiq', email: 'rafiq@tinchaka.dev' },
    { name: 'Shirin', email: 'shirin@tinchaka.dev' },
    { name: 'Karim', email: 'karim@tinchaka.dev' },
    { name: 'Rumi', email: 'rumi@tinchaka.dev' },
  ];

  for (const passenger of passengers) {
    await prisma.user.upsert({
      where: { email: passenger.email },
      update: {
        name: passenger.name,
        role: UserRole.PASSENGER,
        password_hash: passwordHash,
      },
      create: {
        name: passenger.name,
        email: passenger.email,
        password_hash: passwordHash,
        role: UserRole.PASSENGER,
      },
    });
  }

  console.log('[seed] Story-cast seed completed successfully.');
}

main()
  .catch((e) => {
    console.error('[seed] Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
