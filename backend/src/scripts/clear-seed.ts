import prisma from '../config/database';

async function clearSeed() {
  console.log('🗑️  Clearing seed data...\n');

  await prisma.costData.deleteMany({});
  await prisma.costRecommendation.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.costAnomaly.deleteMany({});
  await prisma.budgetAlert.deleteMany({});
  await prisma.budget.deleteMany({});

  console.log('✅ Seed data cleared!\n');
}

clearSeed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


