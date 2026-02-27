import AWS from 'aws-sdk';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import prisma from '../config/database';
import { encrypt, decrypt } from '../utils/encryption';

interface ConnectAWSInput {
  userId: string;
  accountName: string;
  accountId: string;
  roleArn: string;
  externalId: string;
}

export const connectAWSAccount = async (data: ConnectAWSInput) => {
    const { userId, accountName, accountId, roleArn, externalId } = data;
  
    try {
      // Test the role assumption
      const stsClient = new STSClient({ region: 'us-east-1' });
      
      const command = new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: 'CloudGuardProTest',
        ExternalId: externalId,
        DurationSeconds: 900,
      });
  
      const assumedRole = await stsClient.send(command);
  
      if (!assumedRole.Credentials) {
        throw new Error('Failed to assume role');
      }
  
      // Encrypt the External ID
      const encryptedExternalId = encrypt(externalId);
  
      // Save to database
      const cloudAccount = await prisma.cloudAccount.create({
        data: {
          userId,
          provider: 'aws',
          accountName,
          accountId,
          awsRoleArn: roleArn,
          awsExternalId: encryptedExternalId,
          isConnected: true,
          lastSyncAt: new Date(),
        },
      });
  
      return {
        id: cloudAccount.id,
        accountName: cloudAccount.accountName,
        accountId: cloudAccount.accountId,
        provider: cloudAccount.provider,
        isConnected: cloudAccount.isConnected,
      };
    } catch (error: any) {
      console.error('AWS connection error:', error);
      throw new Error(`Failed to connect AWS account: ${error.message}`);
    }
  };

  export const getAWSCosts = async (cloudAccountId: string) => {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account || !account.awsRoleArn || !account.awsExternalId) {
        throw new Error('AWS account not found or not properly configured');
      }
  
      const externalId = decrypt(account.awsExternalId);
  
      // Assume role
      const sts = new AWS.STS();
      const assumedRole = await sts.assumeRole({
        RoleArn: account.awsRoleArn,
        RoleSessionName: 'CloudGuardProCostFetch',
        ExternalId: externalId,
        DurationSeconds: 900,
      }).promise();
  
      if (!assumedRole.Credentials) {
        throw new Error('Failed to assume role');
      }
  
      // Create Cost Explorer client
      const costExplorer = new AWS.CostExplorer({
        accessKeyId: assumedRole.Credentials.AccessKeyId,
        secretAccessKey: assumedRole.Credentials.SecretAccessKey,
        sessionToken: assumedRole.Credentials.SessionToken,
        region: 'us-east-1',
      });
  
   // Get last complete month (January 2026)
      const today = new Date();
      const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastMonthStart = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth(), 1);
      const lastMonthEnd = new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() + 1, 0);

      const lastMonthStartStr = lastMonthStart.toISOString().split('T')[0];
      const lastMonthEndStr = lastMonthEnd.toISOString().split('T')[0];

   // Get current month dates (February 2026)
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const startOfMonth = firstDayOfMonth.toISOString().split('T')[0];
      const endOfMonth = lastDayOfMonth.toISOString().split('T')[0];
      const currentDate = today.toISOString().split('T')[0];

      console.log('📅 Last complete month (Jan):', lastMonthStartStr, 'to', lastMonthEndStr);
      console.log('📅 Current month (Feb):', startOfMonth, 'to', currentDate);
  
      // Fetch last complete month costs
      const lastMonthParams = {
        TimePeriod: {
          Start: lastMonthStartStr,
          End: lastMonthEndStr,
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
      };
  
      const lastMonthData = await costExplorer.getCostAndUsage(lastMonthParams).promise();
      
      let lastMonthCost = 0;
      if (lastMonthData.ResultsByTime && lastMonthData.ResultsByTime.length > 0) {
        lastMonthCost = parseFloat(
          lastMonthData.ResultsByTime[0].Total?.UnblendedCost?.Amount || '0'
        );
      }
  
      // Fetch current month-to-date costs
      const currentMonthParams = {
        TimePeriod: {
          Start: startOfMonth,
          End: currentDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
      };
  
      const currentMonthData = await costExplorer.getCostAndUsage(currentMonthParams).promise();
      
      let currentMonthCost = 0;
      if (currentMonthData.ResultsByTime && currentMonthData.ResultsByTime.length > 0) {
        currentMonthCost = parseFloat(
          currentMonthData.ResultsByTime[0].Total?.UnblendedCost?.Amount || '0'
        );
      }
  
      // Get forecast for rest of current month
      let forecastCost = 0;
      try {
        const forecastParams = {
          TimePeriod: {
            Start: currentDate,
            End: endOfMonth,
          },
          Metric: 'UNBLENDED_COST',
          Granularity: 'MONTHLY',
          PredictionIntervalLevel: 80,
        };
  
        const forecastData = await costExplorer.getCostForecast(forecastParams).promise();
        forecastCost = parseFloat(forecastData.Total?.Amount || '0');
      } catch (forecastError) {
        console.error('Forecast error (using MTD only):', forecastError);
        forecastCost = 0;
      }
  
      const currentMonthEstimate = currentMonthCost + forecastCost;
  
      // Fetch 6-month trend
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const startDate = sixMonthsAgo.toISOString().split('T')[0];
  
      const trendParams = {
        TimePeriod: {
          Start: startDate,
          End: currentDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
      };
  
      const trendData = await costExplorer.getCostAndUsage(trendParams).promise();
  
      // Format trend data
      const costTrend = trendData.ResultsByTime?.map((item) => {
        const date = new Date(item.TimePeriod?.Start || '');
        const monthName = date.toLocaleDateString('en-US', { month: 'short' });
        return {
          month: monthName,
          cost: parseFloat(item.Total?.UnblendedCost?.Amount || '0'),
        };
      }) || [];
  
      // Get costs by service (for pie chart) - use last complete month
      const serviceParams = {
        TimePeriod: {
          Start: lastMonthStartStr,
          End: lastMonthEndStr,
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      };
  
      const serviceData = await costExplorer.getCostAndUsage(serviceParams).promise();
  
      const serviceBreakdown = serviceData.ResultsByTime?.[0]?.Groups?.map((group) => ({
        name: group.Keys?.[0] || 'Other',
        value: parseFloat(group.Metrics?.UnblendedCost?.Amount || '0'),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10) || [];
  
      console.log('💰 Last complete month (Jan):', lastMonthCost);
      console.log('📊 Current month MTD:', currentMonthCost);
      console.log('🔮 Forecast (rest of month):', forecastCost);
      console.log('🎯 Current month estimate:', currentMonthEstimate);
      console.log('📈 Cost trend:', costTrend);
      console.log('🔧 Service breakdown:', serviceBreakdown);
  
      return {
        lastMonthCost: Math.round(lastMonthCost * 100) / 100,
        currentMonthCost: Math.round(currentMonthCost * 100) / 100,
        currentMonthEstimate: Math.round(currentMonthEstimate * 100) / 100,
        forecastCost: Math.round(forecastCost * 100) / 100,
        costTrend,
        serviceBreakdown,
      };
    } catch (error: any) {
      console.error('AWS cost fetch error:', error);
      throw new Error(`Failed to fetch AWS costs: ${error.message}`);
    }
  };
  

