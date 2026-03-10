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

// ========================================
// 🆕 NEW ROUTES FOR SIDEBAR CLOUD ACCOUNTS
// ========================================

// Get all cloud accounts for sidebar (supports demo mode)
router.get('/accounts', async (req, res) => {
  try {
    // Get userId from auth token (assumes you have auth middleware)
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check for demo mode
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo cloud accounts');
      
      const demoAccounts = [
        {
          id: 'demo-aws-1',
          accountName: 'Production AWS',
          accountId: '123456789012',
          provider: 'AWS',
          status: 'Active',
          isDemo: true,
        },
        {
          id: 'demo-aws-2',
          accountName: 'Development AWS',
          accountId: '987654321098',
          provider: 'AWS',
          status: 'Active',
          isDemo: true,
        },
        {
          id: 'demo-azure-1',
          accountName: 'Production Azure',
          accountId: 'sub-prod-001',
          provider: 'Azure',
          status: 'Active',
          isDemo: true,
        },
        {
          id: 'demo-azure-2',
          accountName: 'Development Azure',
          accountId: 'sub-dev-001',
          provider: 'Azure',
          status: 'Active',
          isDemo: true,
        },
        {
          id: 'demo-gcp-1',
          accountName: 'Production GCP',
          accountId: 'gcp-prod-001',
          provider: 'GCP',
          status: 'Active',
          isDemo: true,
        },
      ];
      
      return res.json(demoAccounts);
    }

    // Real database query
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, isConnected: true },
      select: {
        id: true,
        accountName: true,
        accountId: true,
        provider: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Format for frontend
    const formattedAccounts = accounts.map(acc => ({
      id: acc.id,
      accountName: acc.accountName,
      accountId: acc.accountId || 'N/A',
      provider: acc.provider.toUpperCase() as 'AWS' | 'Azure' | 'GCP',
      status: 'Active',
    }));

    res.json(formattedAccounts);
  } catch (error: any) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single cloud account by ID
router.get('/accounts/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Handle demo accounts
    if (accountId.startsWith('demo-')) {
      const demoAccounts: any = {
        'demo-aws-1': {
          id: 'demo-aws-1',
          accountName: 'Production AWS',
          accountId: '123456789012',
          provider: 'AWS',
          status: 'Active',
        },
        'demo-aws-2': {
          id: 'demo-aws-2',
          accountName: 'Development AWS',
          accountId: '987654321098',
          provider: 'AWS',
          status: 'Active',
        },
        'demo-azure-1': {
          id: 'demo-azure-1',
          accountName: 'Production Azure',
          accountId: 'sub-prod-001',
          azureTenantId: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
          provider: 'Azure',
          status: 'Active',
        },
        'demo-azure-2': {
          id: 'demo-azure-2',
          accountName: 'Development Azure',
          accountId: 'sub-dev-001',
          azureTenantId: 'yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
          provider: 'Azure',
          status: 'Active',
        },
        'demo-gcp-1': {
          id: 'demo-gcp-1',
          accountName: 'Production GCP',
          accountId: 'gcp-prod-001',
          provider: 'GCP',
          status: 'Active',
        },
      };

      return res.json(demoAccounts[accountId] || { error: 'Demo account not found' });
    }

    // Real account lookup
    const account = await prisma.cloudAccount.findFirst({
      where: {
        id: accountId,
        userId,
        isConnected: true,
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error: any) {
    console.error('Account fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// 🆕 AZURE DASHBOARD ROUTES
// ========================================

// Get Azure subscriptions for an account
router.get('/azure/subscriptions/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Handle demo mode
    if (accountId.startsWith('demo-azure')) {
      const demoSubscriptions = [
        {
          id: 'sub-1',
          name: 'Production Subscription',
          subscriptionId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
          status: 'Active',
          totalResources: 87,
          monthlyCost: 12450.00,
        },
        {
          id: 'sub-2',
          name: 'Development Subscription',
          subscriptionId: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
          status: 'Active',
          totalResources: 34,
          monthlyCost: 3280.50,
        },
        {
          id: 'sub-3',
          name: 'Testing Subscription',
          subscriptionId: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
          status: 'Active',
          totalResources: 21,
          monthlyCost: 1890.75,
        },
      ];

      return res.json(demoSubscriptions);
    }

    // TODO: Real Azure API integration
    // For now, return empty array (frontend will use demo data)
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching Azure subscriptions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resource groups for a subscription
router.get('/azure/subscriptions/:subscriptionId/resource-groups', async (req, res) => {
  try {
    // TODO: Real Azure API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching resource groups:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resources for a subscription
router.get('/azure/subscriptions/:subscriptionId/resources', async (req, res) => {
  try {
    // TODO: Real Azure API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// 🆕 AWS DASHBOARD ROUTES
// ========================================

// Get AWS regions for an account
router.get('/aws/regions/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Handle demo mode
    if (accountId.startsWith('demo-aws')) {
      const demoRegions = [
        {
          id: 'us-east-1',
          name: 'US East (N. Virginia)',
          code: 'us-east-1',
          totalResources: 134,
          monthlyCost: 8450.00,
        },
        {
          id: 'us-west-2',
          name: 'US West (Oregon)',
          code: 'us-west-2',
          totalResources: 67,
          monthlyCost: 4230.50,
        },
        {
          id: 'eu-west-1',
          name: 'EU (Ireland)',
          code: 'eu-west-1',
          totalResources: 45,
          monthlyCost: 3180.75,
        },
        {
          id: 'ap-southeast-1',
          name: 'Asia Pacific (Singapore)',
          code: 'ap-southeast-1',
          totalResources: 28,
          monthlyCost: 2100.25,
        },
      ];

      return res.json(demoRegions);
    }

    // TODO: Real AWS API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching AWS regions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resources for a region
router.get('/aws/regions/:regionCode/resources', async (req, res) => {
  try {
    // TODO: Real AWS API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching region resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// 🆕 GCP DASHBOARD ROUTES
// ========================================

// Get GCP projects for an account
router.get('/gcp/projects/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // Handle demo mode
    if (accountId.startsWith('demo-gcp')) {
      const demoProjects = [
        {
          id: 'proj-1',
          name: 'Production Environment',
          projectId: 'cloudguard-prod-001',
          status: 'Active',
          totalResources: 156,
          monthlyCost: 9850.00,
        },
        {
          id: 'proj-2',
          name: 'Development Environment',
          projectId: 'cloudguard-dev-001',
          status: 'Active',
          totalResources: 78,
          monthlyCost: 3420.50,
        },
        {
          id: 'proj-3',
          name: 'Staging Environment',
          projectId: 'cloudguard-staging-001',
          status: 'Active',
          totalResources: 45,
          monthlyCost: 2180.75,
        },
      ];

      return res.json(demoProjects);
    }

    // TODO: Real GCP API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching GCP projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resources for a project
router.get('/gcp/projects/:projectId/resources', async (req, res) => {
  try {
    // TODO: Real GCP API integration
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching project resources:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================================
// LEGACY ROUTE (Keep for backward compatibility)
// ========================================
router.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    // DEMO MODE - Return mock accounts
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo cloud accounts for user:', userId);
      
      const demoAccounts = [
        {
          id: 'demo-aws-prod',
          userId: userId,
          provider: 'aws',
          accountName: 'Production AWS Account',
          accountId: '884390772196',
          region: 'us-east-1',
          isConnected: true,
          awsRoleArn: 'arn:aws:iam::884390772196:role/DemoRole',
          createdAt: new Date(),
          lastSyncAt: new Date(),
        },
        {
          id: 'demo-azure-prod',
          userId: userId,
          provider: 'azure',
          accountName: 'Production Azure Subscription',
          accountId: 'aaaabbbb-cccc-dddd-eeee-ffff00001111',
          region: 'eastus',
          isConnected: true,
          createdAt: new Date(),
          lastSyncAt: new Date(),
        },
        {
          id: 'demo-gcp-prod',
          userId: userId,
          provider: 'gcp',
          accountName: 'Production GCP Project',
          accountId: 'my-gcp-project-123456',
          region: 'us-central1',
          isConnected: true,
          createdAt: new Date(),
          lastSyncAt: new Date(),
        },
      ];
      
      return res.json(demoAccounts);
    }
    
    // Real database query
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

    res.json(accounts);
  } catch (error: any) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;