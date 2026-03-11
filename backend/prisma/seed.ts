import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Admin user ─────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@cloudguard.com' },
    update: {},
    create: {
      email: 'admin@cloudguard.com',
      password: hashedPassword,
      name: 'Admin User',
      role: 'ADMIN',
      mfaEnabled: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Admin user created:', adminUser.email);

  // ── Demo user ──────────────────────────────────────────────────────────────
  const demoPassword = await bcrypt.hash('Demo@123', 10);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@cloudguard.com' },
    update: {},
    create: {
      email: 'demo@cloudguard.com',
      password: demoPassword,
      name: 'Demo User',
      role: 'USER',
      mfaEnabled: false,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('✅ Demo user created:', demoUser.email);

  // ── Demo cloud account (AWS) for demo user ─────────────────────────────────
  // Only seeded so the demo user can log in and see the dashboard with a
  // connected account. Credentials are left empty — they must be supplied
  // via the Onboarding flow before any real AWS calls are made.
  const demoAccount = await prisma.cloudAccount.upsert({
    where: {
      userId_provider_accountId: {
        userId: demoUser.id,
        provider: 'AWS',
        accountId: 'demo-aws-account',
      },
    },
    update: {},
    create: {
      userId: demoUser.id,
      provider: 'AWS',
      accountName: 'Demo AWS Account',
      accountId: 'demo-aws-account',
      region: 'us-east-1',
      status: 'INACTIVE', // inactive until real credentials are supplied
    },
  });
  console.log('✅ Demo cloud account created:', demoAccount.accountName);

  // ── Sample notification for admin ──────────────────────────────────────────
  await prisma.notification.upsert({
    where: { id: 'seed-notif-1' },
    update: {},
    create: {
      id: 'seed-notif-1',
      userId: adminUser.id,
      type: 'ACCOUNT_CONNECTED',
      title: 'Welcome to CloudGuard Pro',
      message: 'Your account is set up. Connect your first cloud provider to get started.',
      priority: 'NORMAL',
      isRead: false,
    },
  });
  console.log('✅ Welcome notification created');

  // ── Sample budget for demo user ────────────────────────────────────────────
  const existingBudget = await prisma.budget.findFirst({
    where: { accountId: demoAccount.id, name: 'Monthly AWS Budget' },
  });

  if (!existingBudget) {
    await prisma.budget.create({
      data: {
        accountId: demoAccount.id,
        name: 'Monthly AWS Budget',
        amount: 1000,
        period: 'MONTHLY',
        startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        alertThreshold: 80,
        notifyOnExceed: true,
      },
    });
    console.log('✅ Demo budget created');
  }

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
