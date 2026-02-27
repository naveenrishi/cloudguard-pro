import express from 'express';
import { body, validationResult } from 'express-validator';
import * as awsService from '../services/aws.service';
import prisma from '../config/database';
import * as nukeService from '../services/nuke.service';
import { encrypt } from '../utils/encryption';

const router = express.Router();

// Simple in-memory cache to prevent duplicate requests
const dashboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// ... rest of the file

// Connect AWS Account
router.post(
  '/aws/connect',
  [
    body('userId').notEmpty().withMessage('User ID required'),
    body('accountName').notEmpty().withMessage('Account name required'),
    body('accountId').isLength({ min: 12, max: 12 }).withMessage('Valid AWS Account ID required'),
    body('roleArn').matches(/^arn:aws:iam::\d{12}:role\//).withMessage('Valid IAM Role ARN required'),
    body('externalId').notEmpty().withMessage('External ID required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const account = await awsService.connectAWSAccount(req.body);

      res.status(201).json({
        message: 'AWS account connected successfully',
        account,
      });
    } catch (error: any) {
      console.error('AWS connect error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// Get Dashboard Data (combines all cloud accounts)
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Check cache first
    const cached = dashboardCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Returning cached dashboard data');
      return res.json(cached.data);
    }

    // Get all connected cloud accounts
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, isConnected: true },
    });

    if (accounts.length === 0) {
      const emptyData = {
        totalCost: 0,
        lastMonthCost: 0,
        currentMonthEstimate: 0,
        connectedAccounts: 0,
        accountsByProvider: { aws: 0, azure: 0, gcp: 0 },
        costSavings: 0,
        activeAlerts: 0,
        costTrend: [],
        serviceBreakdown: [],
        regionalCost: [],
        recommendations: [],
      };
      return res.json(emptyData);
    }

    let totalLastMonthCost = 0;
    let totalCurrentMonthCost = 0;
    let totalCurrentMonthEstimate = 0;
    let totalForecastCost = 0;
    let combinedCostTrend: any[] = [];
    let combinedServiceBreakdown: any[] = [];

    // Fetch costs from each provider
    for (const account of accounts) {
      try {
        if (account.provider === 'aws') {
          const { getAWSCosts } = await import('../services/aws.service');
          const awsCosts = await getAWSCosts(account.id);
          
          totalLastMonthCost += awsCosts.lastMonthCost;
          totalCurrentMonthCost += awsCosts.currentMonthCost;
          totalCurrentMonthEstimate += awsCosts.currentMonthEstimate;
          totalForecastCost += awsCosts.forecastCost;
          
          // Combine trends (simplified - just use first account's trend)
          if (combinedCostTrend.length === 0) {
            combinedCostTrend = awsCosts.costTrend;
          }
          
          // Combine service breakdown
          awsCosts.serviceBreakdown.forEach((service: any) => {
            const existing = combinedServiceBreakdown.find(s => s.name === service.name);
            if (existing) {
              existing.value += service.value;
            } else {
              combinedServiceBreakdown.push({ ...service, provider: 'aws' });
            }
          });
        } else if (account.provider === 'azure') {
          const { getAzureCosts } = await import('../services/azure.service');
          const azureCosts = await getAzureCosts(account.id);
          
          totalLastMonthCost += azureCosts.lastMonthCost;
          totalCurrentMonthCost += azureCosts.currentMonthCost;
          totalCurrentMonthEstimate += azureCosts.currentMonthEstimate;
          totalForecastCost += azureCosts.forecastCost;
          
          // Combine service breakdown
          azureCosts.serviceBreakdown.forEach((service: any) => {
            const existing = combinedServiceBreakdown.find(s => s.name === service.name);
            if (existing) {
              existing.value += service.value;
            } else {
              combinedServiceBreakdown.push({ ...service, provider: 'azure' });
            }
          });
        }
      } catch (providerError) {
        console.error(`Error fetching costs for ${account.provider}:`, providerError);
        // Continue with other accounts
      }
    }

    // Sort service breakdown by cost
    combinedServiceBreakdown.sort((a, b) => b.value - a.value);

    // Count accounts by provider
    const accountsByProvider = {
      aws: accounts.filter(a => a.provider === 'aws').length,
      azure: accounts.filter(a => a.provider === 'azure').length,
      gcp: accounts.filter(a => a.provider === 'gcp').length,
    };

    const dashboardData = {
      totalCost: Math.round(totalLastMonthCost),
      lastMonthCost: Math.round(totalLastMonthCost),
      currentMonthEstimate: Math.round(totalCurrentMonthEstimate),
      currentMonthCost: Math.round(totalCurrentMonthCost),
      forecastCost: Math.round(totalForecastCost),
      connectedAccounts: accounts.length,
      accountsByProvider,
      costSavings: 0,
      activeAlerts: 0,
      costTrend: combinedCostTrend,
      serviceBreakdown: combinedServiceBreakdown.slice(0, 10),
      regionalCost: [],
      recommendations: [],
    };

    // Cache the result
    dashboardCache.set(userId, {
      data: dashboardData,
      timestamp: Date.now(),
    });

    res.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AWS Costs
router.get('/aws/costs/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;

    const costs = await awsService.getAWSCosts(cloudAccountId);

    res.json({ costs });
  } catch (error: any) {
    console.error('AWS costs error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Get detailed recommendations
router.get('/recommendations/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
  
      // Get user's cloud accounts
      const accounts = await prisma.cloudAccount.findMany({
        where: { userId, isConnected: true },
      });
  
      if (accounts.length === 0) {
        return res.json({ recommendations: [] });
      }
  
      const awsAccount = accounts.find(acc => acc.provider === 'aws');
  
      if (!awsAccount) {
        return res.json({ recommendations: [] });
      }
  
      // Try to get real recommendations
      try {
        const recommendationsModule = await import('../services/recommendations.service');
        const recommendations = await recommendationsModule.getAWSRecommendations(awsAccount.id);
        
        res.json({ recommendations });
      } catch (recError) {
        console.error('Recommendations error:', recError);
        // Return empty for now
        res.json({ recommendations: [] });
      }
    } catch (error: any) {
      console.error('Recommendations fetch error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/connect-aws', async (req, res) => {
    try {
      const { userId, accountName, roleArn, externalId } = req.body;
  
      if (!userId || !roleArn || !externalId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
  
      const accountId = roleArn.split(':')[4];
      const encryptedExternalId = encrypt(externalId);
  
      const newAccount = await prisma.cloudAccount.create({
        data: {
          userId,
          provider: 'aws',
          accountName: accountName || `AWS Account ${accountId}`,
          accountId,
          awsRoleArn: roleArn,
          awsExternalId: encryptedExternalId,
          isConnected: true,
          lastSyncAt: new Date(),
        },
      });
  
      // Initialize nuke account if it's a sandbox/training account
      await nukeService.initializeNukeAccounts(newAccount.id, accountName || `AWS Account ${accountId}`);
  
      res.json({
        message: 'AWS account connected successfully',
        account: {
          id: newAccount.id,
          accountName: newAccount.accountName,
          accountId: newAccount.accountId,
        },
      });
    } catch (error: any) {
      console.error('AWS connection error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Connect Azure Account
router.post('/connect-azure', async (req, res) => {
  try {
    const { userId, subscriptionId, tenantId, clientId, clientSecret, accountName } = req.body;

    if (!userId || !subscriptionId || !tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const azureService = await import('../services/azure.service');
    const account = await azureService.connectAzure(userId, {
      subscriptionId,
      tenantId,
      clientId,
      clientSecret,
      accountName,
    });

    res.json({
      message: 'Azure account connected successfully',
      account,
    });
  } catch (error: any) {
    console.error('Azure connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get All Connected Accounts
router.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, isConnected: true },
      select: {
        id: true,
        provider: true,
        accountName: true,
        accountId: true,
        region: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by provider
    const accountsByProvider = accounts.reduce((acc: any, account) => {
      if (!acc[account.provider]) {
        acc[account.provider] = [];
      }
      acc[account.provider].push(account);
      return acc;
    }, {});

    const summary = {
      total: accounts.length,
      aws: accountsByProvider.aws?.length || 0,
      azure: accountsByProvider.azure?.length || 0,
      gcp: accountsByProvider.gcp?.length || 0,
    };

    res.json({
      accounts,
      accountsByProvider,
      summary,
    });
  } catch (error: any) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;