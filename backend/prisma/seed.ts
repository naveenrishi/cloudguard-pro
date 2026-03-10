import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
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

  // Create demo user
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