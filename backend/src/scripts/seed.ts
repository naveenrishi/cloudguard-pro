import prisma from '../config/database';

async function seed() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Get the first user (or create one if none exists)
    let user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('⚠️  No users found. Please register a user first!');
      return;
    }

    console.log(`✅ Seeding data for user: ${user.email}\n`);

    // Get cloud accounts
    const cloudAccounts = await prisma.cloudAccount.findMany({
      where: { userId: user.id },
    });

    if (cloudAccounts.length === 0) {
      console.log('⚠️  No cloud accounts found. Creating demo accounts...\n');
      
      // Create demo AWS account
      const awsAccount = await prisma.cloudAccount.create({
        data: {
          userId: user.id,
          provider: 'aws',
          accountName: 'AWS Production',
          accountId: '123456789012',
          isConnected: true,
          isDemo: true,
        },
      });
      cloudAccounts.push(awsAccount);

      // Create demo Azure account
      const azureAccount = await prisma.cloudAccount.create({
        data: {
          userId: user.id,
          provider: 'azure',
          accountName: 'Azure Development',
          accountId: 'sub-azure-demo-001',
          isConnected: true,
          isDemo: true,
        },
      });
      cloudAccounts.push(azureAccount);

      console.log('✅ Created 2 demo cloud accounts\n');
    }

    // 1. CREATE BUDGETS
    console.log('💰 Creating budgets...');
    const budgets = await Promise.all([
      prisma.budget.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          name: 'AWS Monthly Budget',
          amount: 5000,
          period: 'monthly',
          provider: 'aws',
          alertThreshold: 80,
          isActive: true,
        },
      }),
      prisma.budget.create({
        data: {
          userId: user.id,
          name: 'Total Cloud Spend',
          amount: 10000,
          period: 'monthly',
          alertThreshold: 85,
          isActive: true,
        },
      }),
      prisma.budget.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          name: 'Development Environment',
          amount: 2000,
          period: 'monthly',
          provider: 'aws',
          alertThreshold: 75,
          isActive: true,
        },
      }),
    ]);
    console.log(`✅ Created ${budgets.length} budgets\n`);

    // 2. CREATE BUDGET ALERTS
    console.log('🔔 Creating budget alerts...');
    const alerts = await Promise.all([
      prisma.budgetAlert.create({
        data: {
          budgetId: budgets[0].id,
          alertType: 'threshold_reached',
          percentage: 82.5,
          amount: 4125,
          message: 'AWS Monthly Budget is at 82.5% ($4,125/$5,000)',
          sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          isRead: false,
        },
      }),
      prisma.budgetAlert.create({
        data: {
          budgetId: budgets[2].id,
          alertType: 'threshold_exceeded',
          percentage: 95.2,
          amount: 1904,
          message: 'Development Environment budget exceeded 95.2% ($1,904/$2,000)',
          sentAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          isRead: false,
        },
      }),
    ]);
    console.log(`✅ Created ${alerts.length} budget alerts\n`);

    // 3. CREATE COST ANOMALIES
    console.log('⚠️  Creating cost anomalies...');
    const anomalies = await Promise.all([
      prisma.costAnomaly.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'EC2',
          date: new Date(),
          expectedCost: 450,
          actualCost: 825,
          deviation: 83.3,
          severity: 'high',
          isReviewed: false,
        },
      }),
      prisma.costAnomaly.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'S3',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000),
          expectedCost: 120,
          actualCost: 195,
          deviation: 62.5,
          severity: 'medium',
          isReviewed: false,
        },
      }),
      prisma.costAnomaly.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'RDS',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expectedCost: 300,
          actualCost: 680,
          deviation: 126.7,
          severity: 'critical',
          isReviewed: false,
        },
      }),
    ]);
    console.log(`✅ Created ${anomalies.length} cost anomalies\n`);

    // 4. CREATE ACTIVITY LOGS
    console.log('📊 Creating activity feed entries...');
    const activities = await Promise.all([
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'budget_alert',
          description: 'Budget "AWS Monthly Budget" reached 82.5% threshold',
          severity: 'warning',
          isRead: false,
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          metadata: { budgetId: budgets[0].id, percentage: 82.5 },
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'cost_spike',
          resourceType: 'ec2',
          description: 'Cost spike detected in EC2: 83% above expected',
          severity: 'error',
          isRead: false,
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'resource_created',
          resourceType: 'ec2',
          resourceId: 'i-1234567890abcdef0',
          resourceName: 'web-server-prod-01',
          description: 'New EC2 instance created: web-server-prod-01',
          severity: 'info',
          isRead: true,
          timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'resource_deleted',
          resourceType: 's3',
          resourceId: 'old-backup-bucket',
          resourceName: 'old-backup-bucket',
          description: 'S3 bucket deleted: old-backup-bucket',
          severity: 'info',
          isRead: true,
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'security_alert',
          description: 'Security group sg-12345 has overly permissive rules',
          severity: 'warning',
          isRead: false,
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
        },
      }),
      prisma.activityLog.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          eventType: 'cost_spike',
          resourceType: 'rds',
          description: 'RDS costs exceeded expected by 127%',
          severity: 'critical',
          isRead: false,
          timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
        },
      }),
    ]);
    console.log(`✅ Created ${activities.length} activity log entries\n`);

    // 5. CREATE COST RECOMMENDATIONS
    console.log('💡 Creating cost recommendations...');
    const recommendations = await Promise.all([
      prisma.costRecommendation.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'EC2',
          resourceType: 'instance',
          resourceName: 'web-server-prod-03',
          recommendationType: 'right_sizing',
          currentCost: 450,
          estimatedSavings: 180,
          savingsPercent: 40,
          priority: 'high',
          status: 'pending',
          description: 'EC2 instance web-server-prod-03 is oversized with <15% CPU utilization',
          actionSteps: [
            'Review current instance metrics over the past 7 days',
            'Downsize from t3.xlarge to t3.large',
            'Monitor performance for 48 hours after change',
            'Rollback if performance issues occur',
          ],
        },
      }),
      prisma.costRecommendation.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'RDS',
          resourceType: 'database',
          resourceName: 'analytics-db',
          recommendationType: 'reserved_instances',
          currentCost: 520,
          estimatedSavings: 260,
          savingsPercent: 50,
          priority: 'high',
          status: 'pending',
          description: 'Purchase reserved instances for analytics-db to save 50%',
          actionSteps: [
            'Verify the database will run for at least 1 year',
            'Purchase 1-year reserved instance',
            'Enable auto-renewal for continuous savings',
          ],
        },
      }),
      prisma.costRecommendation.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'S3',
          resourceType: 'bucket',
          resourceName: 'logs-archive',
          recommendationType: 'storage_optimization',
          currentCost: 85,
          estimatedSavings: 55,
          savingsPercent: 65,
          priority: 'medium',
          status: 'pending',
          description: 'Move infrequently accessed S3 objects to Glacier',
          actionSteps: [
            'Analyze access patterns for logs-archive bucket',
            'Create lifecycle policy for objects older than 90 days',
            'Move to S3 Glacier for long-term storage',
          ],
        },
      }),
      prisma.costRecommendation.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'EC2',
          resourceType: 'instance',
          resourceName: 'batch-processor-01',
          recommendationType: 'spot_instances',
          currentCost: 320,
          estimatedSavings: 240,
          savingsPercent: 75,
          priority: 'high',
          status: 'pending',
          description: 'Use Spot Instances for batch processing workloads',
          actionSteps: [
            'Verify workload is interruptible',
            'Set up Spot Instance request with appropriate max price',
            'Implement checkpointing for job recovery',
            'Monitor Spot Instance interruption rates',
          ],
        },
      }),
      prisma.costRecommendation.create({
        data: {
          userId: user.id,
          cloudAccountId: cloudAccounts[0].id,
          provider: 'aws',
          service: 'EC2',
          resourceType: 'volume',
          resourceName: 'vol-unattached-001',
          recommendationType: 'idle_resources',
          currentCost: 45,
          estimatedSavings: 45,
          savingsPercent: 100,
          priority: 'medium',
          status: 'pending',
          description: 'Delete unattached EBS volume vol-unattached-001',
          actionSteps: [
            'Verify volume is not needed',
            'Create final snapshot if needed',
            'Delete the volume',
          ],
        },
      }),
    ]);
    console.log(`✅ Created ${recommendations.length} cost recommendations\n`);

    // 6. CREATE COST DATA (for trend charts)
    console.log('📈 Creating cost trend data...');
    const costData = [];
    const services = ['EC2', 'S3', 'RDS', 'Lambda', 'CloudWatch'];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      
      for (const service of services) {
        const baseCost = Math.random() * 500 + 100;
        costData.push(
          prisma.costData.create({
            data: {
              cloudAccountId: cloudAccounts[0].id,
              date,
              service,
              region: 'us-east-1',
              costAmount: baseCost,
              currency: 'USD',
            },
          })
        );
      }
    }
    await Promise.all(costData);
    console.log(`✅ Created ${costData.length} cost data entries\n`);

    console.log('✅ SEED COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   - ${budgets.length} budgets`);
    console.log(`   - ${alerts.length} budget alerts`);
    console.log(`   - ${anomalies.length} cost anomalies`);
    console.log(`   - ${activities.length} activity logs`);
    console.log(`   - ${recommendations.length} recommendations`);
    console.log(`   - ${costData.length} cost data points`);
    console.log('\n🎉 You can now see all the widgets populated with data!\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
