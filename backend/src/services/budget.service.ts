import prisma from '../config/database';
import { sendEmail } from './email.service';

// Create budget
export const createBudget = async (data: {
  userId: string;
  name: string;
  amount: number;
  period: string;
  cloudAccountId?: string;
  provider?: string;
  alertThreshold?: number;
}) => {
  return await prisma.budget.create({
    data: {
      ...data,
      alertThreshold: data.alertThreshold || 80,
    },
    include: {
      cloudAccount: true,
    },
  });
};

// Get user budgets
export const getUserBudgets = async (userId: string) => {
  return await prisma.budget.findMany({
    where: { userId, isActive: true },
    include: {
      cloudAccount: true,
      alerts: {
        orderBy: { sentAt: 'desc' },
        take: 5,
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

// Check budget and create alerts
export const checkBudgetAlerts = async (budgetId: string, currentSpend: number) => {
  const budget = await prisma.budget.findUnique({
    where: { id: budgetId },
    include: { user: true, cloudAccount: true },
  });

  if (!budget) return;

  const percentage = (currentSpend / budget.amount) * 100;

  // Check if we should send an alert
  if (percentage >= budget.alertThreshold) {
    const alertType = percentage >= 100 ? 'threshold_exceeded' : 'threshold_reached';

    // Check if we already sent this alert recently (last 24 hours)
    const recentAlert = await prisma.budgetAlert.findFirst({
      where: {
        budgetId,
        alertType,
        sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    if (!recentAlert) {
      // Create alert
      await prisma.budgetAlert.create({
        data: {
          budgetId,
          alertType,
          percentage,
          amount: currentSpend,
          message: `Budget "${budget.name}" is at ${percentage.toFixed(1)}% (${currentSpend.toFixed(2)}/${budget.amount})`,
        },
      });

      // Send email
      await sendEmail(budget.user.email, 'Budget Alert', `
        <h2>⚠️ Budget Alert: ${budget.name}</h2>
        <p>Your budget is at <strong>${percentage.toFixed(1)}%</strong></p>
        <p>Current spend: <strong>$${currentSpend.toFixed(2)}</strong> / $${budget.amount}</p>
        <p>Threshold: ${budget.alertThreshold}%</p>
        ${budget.cloudAccount ? `<p>Account: ${budget.cloudAccount.accountName}</p>` : ''}
      `);

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId: budget.userId,
          cloudAccountId: budget.cloudAccountId,
          provider: budget.provider || 'all',
          eventType: 'budget_alert',
          description: `Budget "${budget.name}" reached ${percentage.toFixed(1)}%`,
          severity: percentage >= 100 ? 'critical' : 'warning',
          metadata: { budgetId, percentage, currentSpend, budgetAmount: budget.amount },
        },
      });
    }
  }
};

// Detect cost anomalies using simple deviation
export const detectCostAnomalies = async (userId: string) => {
  // Get last 30 days of costs per service
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // This is a simplified version - in production, you'd query actual cost data
  // For now, we'll create a placeholder that you can enhance
  
  const accounts = await prisma.cloudAccount.findMany({
    where: { userId },
  });

  const anomalies = [];

  for (const account of accounts) {
    // Example: Detect if today's cost is 50% higher than 7-day average
    // You would replace this with actual cost data from AWS/Azure/GCP
    
    // Placeholder anomaly detection logic
    const expectedCost = 100; // Calculate from historical data
    const actualCost = 180;   // Get from today's cost
    const deviation = ((actualCost - expectedCost) / expectedCost) * 100;

    if (Math.abs(deviation) > 50) {
      const anomaly = await prisma.costAnomaly.create({
        data: {
          userId,
          cloudAccountId: account.id,
          provider: account.provider,
          service: 'EC2', // Would come from actual data
          date: new Date(),
          expectedCost,
          actualCost,
          deviation,
          severity: Math.abs(deviation) > 100 ? 'critical' : 'high',
        },
      });

      anomalies.push(anomaly);

      // Create activity log
      await prisma.activityLog.create({
        data: {
          userId,
          cloudAccountId: account.id,
          provider: account.provider,
          eventType: 'cost_spike',
          resourceType: 'cost',
          description: `Cost spike detected: ${deviation.toFixed(1)}% above expected`,
          severity: 'warning',
          metadata: { expectedCost, actualCost, deviation },
        },
      });
    }
  }

  return anomalies;
};

// Generate cost recommendations
export const generateRecommendations = async (userId: string) => {
  const recommendations = [];

  // Example recommendations - enhance with actual resource analysis
  const accounts = await prisma.cloudAccount.findMany({
    where: { userId },
  });

  for (const account of accounts) {
    // Placeholder recommendation
    const rec = await prisma.costRecommendation.create({
      data: {
        userId,
        cloudAccountId: account.id,
        provider: account.provider,
        service: 'EC2',
        resourceType: 'instance',
        recommendationType: 'right_sizing',
        currentCost: 500,
        estimatedSavings: 150,
        savingsPercent: 30,
        priority: 'high',
        description: 'Right-size underutilized EC2 instances',
        actionSteps: [
          'Identify instances with <20% CPU usage',
          'Review instance types and workloads',
          'Downsize to appropriate instance type',
        ],
      },
    });

    recommendations.push(rec);
  }

  return recommendations;
};
