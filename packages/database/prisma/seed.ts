import process from 'node:process';
import * as argon2 from 'argon2';
import { prisma } from '../src';

async function main() {
  const username = process.env.SUPER_ADMIN_USERNAME || 'rafi_sharkar';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Rafi#144';

  console.log(`\n🔱 Dockhand — Seeding SuperAdmin\n`);

  // Hash the password with argon2id
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 1,
  });

  // Upsert — create if not exists, update password if exists
  const admin = await prisma.superAdmin.upsert({
    where: { username },
    create: {
      username,
      passwordHash,
    },
    update: {
      passwordHash,
    },
  });

  console.log(`  ✅ SuperAdmin created/updated`);
  console.log(`     Username: ${username}`);
  console.log(`     ID:       ${admin.id}`);
  console.log(`\n  ⚠️  Change the default password in production!\n`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
