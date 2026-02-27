import { ClientSecretCredential } from '@azure/identity';
import { CostManagementClient } from '@azure/arm-costmanagement';
import { SubscriptionClient } from '@azure/arm-subscriptions';
import prisma from '../config/database';
import { decrypt } from '../utils/encryption';

export const connectAzure = async (userId: string, data: {
  subscriptionId: string;
  tenantId: string;
  clientId: string;
  clientSecret: string;
  accountName: string;
}) => {
  try {
    const { subscriptionId, tenantId, clientId, clientSecret, accountName } = data;

    // Test credentials
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const subscriptionClient = new SubscriptionClient(credential);
    
    // Verify subscription access
    const subscription = await subscriptionClient.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      throw new Error('Invalid subscription or insufficient permissions');
    }

    // Save to database
    const account = await prisma.cloudAccount.create({
      data: {
        userId,
        provider: 'azure',
        accountName: accountName || subscription.displayName || 'Azure Account',
        accountId: subscriptionId,
        azureTenantId: tenantId,
        azureClientId: clientId,
        azureClientSecret: clientSecret, // Should encrypt this
        isConnected: true,
        region: 'global',
      },
    });

    return {
      id: account.id,
      accountName: account.accountName,
      accountId: account.accountId,
      provider: 'azure',
    };
  } catch (error: any) {
    console.error('Azure connection error:', error);
    throw new Error(`Failed to connect Azure: ${error.message}`);
  }
};

export const getAzureCosts = async (cloudAccountId: string) => {
  try {
    const account = await prisma.cloudAccount.findUnique({
      where: { id: cloudAccountId },
    });

    if (!account || !account.azureTenantId || !account.azureClientId || !account.azureClientSecret) {
      throw new Error('Azure account not found or not properly configured');
    }

    const credential = new ClientSecretCredential(
      account.azureTenantId,
      account.azureClientId,
      account.azureClientSecret
    );

    const costClient = new CostManagementClient(credential);

    // Get current month dates
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Get last complete month
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    const scope = `/subscriptions/${account.accountId}`;

    // Query for last month actual costs
    const lastMonthQuery: any = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: lastMonthStart.toISOString().split('T')[0],
        to: lastMonthEnd.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'Monthly',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
      },
    };

    const lastMonthResult = await costClient.query.usage(scope, lastMonthQuery);
    const lastMonthCost = lastMonthResult.rows?.[0]?.[0] || 0;

    // Query for current month costs
    const currentMonthQuery: any = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: firstDayOfMonth.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'Monthly',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
      },
    };

    const currentMonthResult = await costClient.query.usage(scope, currentMonthQuery);
    const currentMonthCost = currentMonthResult.rows?.[0]?.[0] || 0;

    // Get 6-month trend
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const trendQuery: any = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: sixMonthsAgo.toISOString().split('T')[0],
        to: today.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'Monthly',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
      },
    };

    const trendResult = await costClient.query.usage(scope, trendQuery);
    const costTrend = trendResult.rows?.map((row: any, index: number) => {
      const date = new Date(sixMonthsAgo);
      date.setMonth(date.getMonth() + index);
      return {
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        cost: parseFloat(row[0]) || 0,
      };
    }) || [];

    // Get service breakdown
    const serviceQuery: any = {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: lastMonthStart.toISOString().split('T')[0],
        to: lastMonthEnd.toISOString().split('T')[0],
      },
      dataset: {
        granularity: 'Monthly',
        aggregation: {
          totalCost: {
            name: 'Cost',
            function: 'Sum',
          },
        },
        grouping: [
          {
            type: 'Dimension',
            name: 'ServiceName',
          },
        ],
      },
    };

    const serviceResult = await costClient.query.usage(scope, serviceQuery);
    const serviceBreakdown = serviceResult.rows?.map((row: any) => ({
      name: row[1] || 'Other',
      value: parseFloat(row[0]) || 0,
    }))
    .filter((item: any) => item.value > 0)
    .sort((a: any, b: any) => b.value - a.value)
    .slice(0, 10) || [];

    // Simple forecast (current month MTD * days ratio)
    const daysInMonth = lastDayOfMonth.getDate();
    const daysElapsed = today.getDate();
    const forecastCost = (currentMonthCost / daysElapsed) * daysInMonth - currentMonthCost;

    console.log('💰 Azure Last Month:', lastMonthCost);
    console.log('📊 Azure Current Month MTD:', currentMonthCost);
    console.log('🔮 Azure Forecast:', forecastCost);

    return {
      lastMonthCost: Math.round(lastMonthCost * 100) / 100,
      currentMonthCost: Math.round(currentMonthCost * 100) / 100,
      currentMonthEstimate: Math.round((currentMonthCost + forecastCost) * 100) / 100,
      forecastCost: Math.round(forecastCost * 100) / 100,
      costTrend,
      serviceBreakdown,
    };
  } catch (error: any) {
    console.error('Azure cost fetch error:', error);
    throw new Error(`Failed to fetch Azure costs: ${error.message}`);
  }
};
