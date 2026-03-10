// src/routes/cloud.routes.ts — REPLACE ENTIRELY
// ✅ Fixed: provider enum uppercase (AWS/AZURE/GCP)
// ✅ Fixed: removed isConnected (not in schema) → uses status: 'ACTIVE'
// ✅ Fixed: connect-aws saves credentials field + correct provider enum
// ✅ Fixed: connect-azure saves credentials field + correct provider enum  
// ✅ Added: /dashboard/account/:accountId per-account endpoint
// ✅ Fixed: all findMany queries use status: 'ACTIVE' instead of isConnected: true
// ✅ Added: duplicate account check before create
// ✅ Fixed: provider comparison uses uppercase 'AWS'/'AZURE'/'GCP'

import express from 'express';
import { body, validationResult } from 'express-validator';
import * as awsService from '../services/aws.service';
import prisma from '../config/database';
import * as nukeService from '../services/nuke.service';
import { encrypt } from '../utils/encryption';

const router = express.Router();

// ── cache ──────────────────────────────────────────────────────────────────
const dashboardCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 60000; // 1 minute

// ============================================================
// CONNECT AWS ACCOUNT  (original /aws/connect route)
// ============================================================
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
      res.status(201).json({ message: 'AWS account connected successfully', account });
    } catch (error: any) {
      console.error('AWS connect error:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ============================================================
// CONNECT AWS  (frontend uses /connect-aws)
// ============================================================
router.post('/connect-aws', async (req, res) => {
  try {
    const { userId, accountName, roleArn, externalId } = req.body;

    if (!userId || !roleArn || !externalId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const accountId = roleArn.split(':')[4];

    // ✅ Prevent duplicates — check before creating
    const existing = await prisma.cloudAccount.findFirst({
      where: { userId, accountId, provider: 'AWS' },
    });
    if (existing) {
      return res.status(409).json({
        error: 'This AWS account is already connected',
        account: { id: existing.id, accountName: existing.accountName },
      });
    }

    // ✅ Encrypt both secrets
    const encryptedExternalId = encrypt(externalId);
    const encryptedRoleArn    = encrypt(roleArn);

    const newAccount = await prisma.cloudAccount.create({
      data: {
        userId,
        provider: 'AWS',                                       // ✅ uppercase enum
        accountName: accountName || `AWS Account ${accountId}`,
        accountId,
        region: 'us-east-1',
        status: 'ACTIVE',                                      // ✅ use status not isConnected
        lastSyncAt: new Date(),
        credentials: JSON.stringify({                          // ✅ save to credentials field
          roleArn:    encryptedRoleArn,
          externalId: encryptedExternalId,
        }),
      },
    });

    // Initialize nuke config
    try {
      await nukeService.initializeNukeAccounts(
        newAccount.id,
        accountName || `AWS Account ${accountId}`
      );
    } catch (nukeErr) {
      console.warn('Nuke init warning (non-fatal):', nukeErr);
    }

    res.json({
      message: 'AWS account connected successfully',
      account: {
        id:          newAccount.id,
        accountName: newAccount.accountName,
        accountId:   newAccount.accountId,
        provider:    newAccount.provider,
      },
    });
  } catch (error: any) {
    console.error('AWS connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// CONNECT AZURE
// ============================================================
router.post('/connect-azure', async (req, res) => {
  try {
    const { userId, subscriptionId, tenantId, clientId, clientSecret, accountName } = req.body;

    if (!userId || !subscriptionId || !tenantId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // ✅ Prevent duplicates
    const existing = await prisma.cloudAccount.findFirst({
      where: { userId, accountId: subscriptionId, provider: 'AZURE' },
    });
    if (existing) {
      return res.status(409).json({
        error: 'This Azure subscription is already connected',
        account: { id: existing.id, accountName: existing.accountName },
      });
    }

    // ✅ Save directly with correct schema fields
    const newAccount = await prisma.cloudAccount.create({
      data: {
        userId,
        provider: 'AZURE',                                     // ✅ uppercase enum
        accountName: accountName || `Azure ${subscriptionId.substring(0, 8)}`,
        accountId: subscriptionId,
        region: 'eastus',
        status: 'ACTIVE',                                      // ✅ use status
        lastSyncAt: new Date(),
        credentials: JSON.stringify({                          // ✅ save encrypted credentials
          tenantId:       encrypt(tenantId),
          clientId:       encrypt(clientId),
          clientSecret:   encrypt(clientSecret),
          subscriptionId,                                      // not a secret, no need to encrypt
        }),
      },
    });

    res.json({
      message: 'Azure account connected successfully',
      account: {
        id:          newAccount.id,
        accountName: newAccount.accountName,
        accountId:   newAccount.accountId,
        provider:    newAccount.provider,
      },
    });
  } catch (error: any) {
    console.error('Azure connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// GET ALL ACCOUNTS FOR USER  /accounts/:userId
// ============================================================
router.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Demo mode
    if (process.env.DEMO_MODE === 'true') {
      return res.json([
        { id:'demo-aws-prod',   userId, provider:'aws',   accountName:'Production AWS Account',      accountId:'884390772196',                     region:'us-east-1', createdAt: new Date(), lastSyncAt: new Date() },
        { id:'demo-azure-prod', userId, provider:'azure', accountName:'Production Azure Subscription',accountId:'aaaabbbb-cccc-dddd-eeee-ffff00001111', region:'eastus',    createdAt: new Date(), lastSyncAt: new Date() },
        { id:'demo-gcp-prod',   userId, provider:'gcp',   accountName:'Production GCP Project',      accountId:'my-gcp-project-123456',            region:'us-central1',createdAt: new Date(), lastSyncAt: new Date() },
      ]);
    }

    // ✅ Use status: 'ACTIVE' — NOT isConnected (field doesn't exist in schema)
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, status: 'ACTIVE' },
      select: {
        id:          true,
        provider:    true,
        accountName: true,
        accountId:   true,
        region:      true,
        createdAt:   true,
        lastSyncAt:  true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Normalize provider to lowercase for frontend compatibility
    res.json(accounts.map(a => ({
      ...a,
      provider: a.provider.toLowerCase(),
    })));
  } catch (error: any) {
    console.error('Accounts fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// PER-ACCOUNT DASHBOARD  /dashboard/account/:accountId
// ✅ NEW — called by NewDashboard.tsx per-account fetch
// ============================================================
router.get('/dashboard/account/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;

    // ✅ Use status: 'ACTIVE' — NOT isConnected
    const account = await prisma.cloudAccount.findFirst({
      where: { id: accountId, status: 'ACTIVE' },
    });

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Base response — always returned even if cost APIs fail
    let dashboardData: any = {
      id:           account.id,
      accountName:  account.accountName,
      provider:     account.provider.toLowerCase(),
      region:       account.region || 'us-east-1',
      totalCost:    0,
      lastMonthCost:0,
      costSavings:  0,
      resourceCount:0,
      securityScore:75,
      topServices:  [],
      monthlyData:  [],
    };

    // ── fetch real cost data ─────────────────────────────────────────────
    const provUpper = account.provider.toUpperCase();

    if (provUpper === 'AWS') {
      try {
        const { getAWSCosts } = await import('../services/aws.service');
        const costs = await getAWSCosts(account.id);
        dashboardData.totalCost     = costs.currentMonthCost     || 0;
        dashboardData.lastMonthCost = costs.lastMonthCost        || 0;
        dashboardData.costSavings   = costs.potentialSavings     || 0;
        dashboardData.topServices   = (costs.serviceBreakdown || []).slice(0, 6);
        dashboardData.monthlyData   = (costs.costTrend || []).map((t: any) => ({
          month: t.month, total: t.cost ?? t.total ?? 0,
        }));
      } catch (e) {
        console.error(`AWS cost fetch failed for ${account.id}:`, e);
      }
    } else if (provUpper === 'AZURE') {
      try {
        const { getAzureCosts } = await import('../services/azure.service');
        const costs = await getAzureCosts(account.id);
        dashboardData.totalCost     = costs.currentMonthCost     || 0;
        dashboardData.lastMonthCost = costs.lastMonthCost        || 0;
        dashboardData.costSavings   = costs.potentialSavings     || 0;
        dashboardData.topServices   = (costs.serviceBreakdown || []).slice(0, 6);
        dashboardData.monthlyData   = (costs.costTrend || []).map((t: any) => ({
          month: t.month, total: t.cost ?? t.total ?? 0,
        }));
      } catch (e) {
        console.error(`Azure cost fetch failed for ${account.id}:`, e);
      }
    }

    // ── resource count from DB ───────────────────────────────────────────
    try {
      const resourceCount = await prisma.resource.count({
        where: { accountId: account.id },
      });
      dashboardData.resourceCount = resourceCount;
    } catch (_) {}

    // ── security score from findings ─────────────────────────────────────
    try {
      const [critical, high] = await Promise.all([
        prisma.securityFinding.count({ where: { accountId: account.id, status: 'ACTIVE', severity: 'CRITICAL' } }),
        prisma.securityFinding.count({ where: { accountId: account.id, status: 'ACTIVE', severity: 'HIGH' } }),
      ]);
      dashboardData.securityScore = Math.max(0, 100 - critical * 15 - high * 5);
    } catch (_) {}

    res.json(dashboardData);
  } catch (error: any) {
    console.error('Per-account dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AGGREGATED DASHBOARD  /dashboard/:userId  (legacy, kept)
// ============================================================
router.get('/dashboard/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const cached = dashboardCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return res.json(cached.data);
    }

    // ✅ Use status: 'ACTIVE'
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    if (accounts.length === 0) {
      return res.json({
        totalCost: 0, lastMonthCost: 0, currentMonthEstimate: 0,
        connectedAccounts: 0, accountsByProvider: { aws:0, azure:0, gcp:0 },
        costSavings: 0, activeAlerts: 0, costTrend: [], serviceBreakdown: [],
        regionalCost: [], recommendations: [],
      });
    }

    let totalLastMonthCost = 0, totalCurrentMonthCost = 0;
    let totalCurrentMonthEstimate = 0, totalForecastCost = 0;
    let combinedCostTrend: any[] = [];
    let combinedServiceBreakdown: any[] = [];

    for (const account of accounts) {
      try {
        const provUpper = account.provider.toUpperCase();
        if (provUpper === 'AWS') {
          const { getAWSCosts } = await import('../services/aws.service');
          const c = await getAWSCosts(account.id);
          totalLastMonthCost          += c.lastMonthCost          || 0;
          totalCurrentMonthCost       += c.currentMonthCost       || 0;
          totalCurrentMonthEstimate   += c.currentMonthEstimate   || 0;
          totalForecastCost           += c.forecastCost           || 0;
          if (combinedCostTrend.length === 0) combinedCostTrend = c.costTrend || [];
          (c.serviceBreakdown || []).forEach((s: any) => {
            const ex = combinedServiceBreakdown.find(x => x.name === s.name);
            ex ? (ex.value += s.value) : combinedServiceBreakdown.push({ ...s, provider: 'aws' });
          });
        } else if (provUpper === 'AZURE') {
          const { getAzureCosts } = await import('../services/azure.service');
          const c = await getAzureCosts(account.id);
          totalLastMonthCost          += c.lastMonthCost          || 0;
          totalCurrentMonthCost       += c.currentMonthCost       || 0;
          totalCurrentMonthEstimate   += c.currentMonthEstimate   || 0;
          totalForecastCost           += c.forecastCost           || 0;
          (c.serviceBreakdown || []).forEach((s: any) => {
            const ex = combinedServiceBreakdown.find(x => x.name === s.name);
            ex ? (ex.value += s.value) : combinedServiceBreakdown.push({ ...s, provider: 'azure' });
          });
        }
      } catch (e) {
        console.error(`Cost fetch failed for ${account.provider} ${account.id}:`, e);
      }
    }

    combinedServiceBreakdown.sort((a, b) => b.value - a.value);

    const dashboardData = {
      totalCost:              Math.round(totalCurrentMonthCost),
      lastMonthCost:          Math.round(totalLastMonthCost),
      currentMonthEstimate:   Math.round(totalCurrentMonthEstimate),
      currentMonthCost:       Math.round(totalCurrentMonthCost),
      forecastCost:           Math.round(totalForecastCost),
      connectedAccounts:      accounts.length,
      accountsByProvider: {
        aws:   accounts.filter(a => a.provider.toUpperCase() === 'AWS').length,
        azure: accounts.filter(a => a.provider.toUpperCase() === 'AZURE').length,
        gcp:   accounts.filter(a => a.provider.toUpperCase() === 'GCP').length,
      },
      costSavings:   0,
      activeAlerts:  0,
      costTrend:     combinedCostTrend,
      serviceBreakdown: combinedServiceBreakdown.slice(0, 10),
      regionalCost:  [],
      recommendations: [],
    };

    dashboardCache.set(userId, { data: dashboardData, timestamp: Date.now() });
    res.json(dashboardData);
  } catch (error: any) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AWS COSTS
// ============================================================
router.get('/aws/costs/:cloudAccountId', async (req, res) => {
  try {
    const costs = await awsService.getAWSCosts(req.params.cloudAccountId);
    res.json({ costs });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============================================================
// RECOMMENDATIONS
// ============================================================
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    // ✅ Use status: 'ACTIVE'
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, status: 'ACTIVE' },
    });
    if (accounts.length === 0) return res.json({ recommendations: [] });

    const awsAccount = accounts.find(a => a.provider.toUpperCase() === 'AWS');
    if (!awsAccount) return res.json({ recommendations: [] });

    try {
      const mod = await import('../services/recommendations.service');
      const recommendations = await mod.getAWSRecommendations(awsAccount.id);
      res.json({ recommendations });
    } catch (e) {
      res.json({ recommendations: [] });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// SINGLE ACCOUNT  /accounts (auth-based)
// ============================================================
router.get('/accounts', async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (process.env.DEMO_MODE === 'true') {
      return res.json([
        { id:'demo-aws-1',   accountName:'Production AWS',   accountId:'123456789012', provider:'AWS',   status:'Active', isDemo:true },
        { id:'demo-aws-2',   accountName:'Development AWS',  accountId:'987654321098', provider:'AWS',   status:'Active', isDemo:true },
        { id:'demo-azure-1', accountName:'Production Azure', accountId:'sub-prod-001', provider:'Azure', status:'Active', isDemo:true },
        { id:'demo-gcp-1',   accountName:'Production GCP',   accountId:'gcp-prod-001', provider:'GCP',   status:'Active', isDemo:true },
      ]);
    }

    // ✅ Use status: 'ACTIVE'
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId, status: 'ACTIVE' },
      select: { id:true, accountName:true, accountId:true, provider:true, createdAt:true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(accounts.map(a => ({
      id:          a.id,
      accountName: a.accountName,
      accountId:   a.accountId || 'N/A',
      provider:    a.provider,
      status:      'Active',
    })));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// AZURE / AWS / GCP SUB-ROUTES (unchanged, kept)
// ============================================================

router.get('/azure/subscriptions/:accountId', async (req, res) => {
  if (req.params.accountId.startsWith('demo-azure')) {
    return res.json([
      { id:'sub-1', name:'Production Subscription', subscriptionId:'a1b2c3d4-e5f6-7890-abcd-ef1234567890', status:'Active', totalResources:87,  monthlyCost:12450.00 },
      { id:'sub-2', name:'Development Subscription',subscriptionId:'b2c3d4e5-f6a7-8901-bcde-f12345678901', status:'Active', totalResources:34,  monthlyCost:3280.50  },
      { id:'sub-3', name:'Testing Subscription',    subscriptionId:'c3d4e5f6-a7b8-9012-cdef-123456789012', status:'Active', totalResources:21,  monthlyCost:1890.75  },
    ]);
  }
  res.json([]);
});

router.get('/azure/subscriptions/:subscriptionId/resource-groups', async (_req, res) => res.json([]));
router.get('/azure/subscriptions/:subscriptionId/resources',       async (_req, res) => res.json([]));

router.get('/aws/regions/:accountId', async (req, res) => {
  if (req.params.accountId.startsWith('demo-aws')) {
    return res.json([
      { id:'us-east-1',      name:'US East (N. Virginia)',        code:'us-east-1',      totalResources:134, monthlyCost:8450.00 },
      { id:'us-west-2',      name:'US West (Oregon)',             code:'us-west-2',      totalResources:67,  monthlyCost:4230.50 },
      { id:'eu-west-1',      name:'EU (Ireland)',                 code:'eu-west-1',      totalResources:45,  monthlyCost:3180.75 },
      { id:'ap-southeast-1', name:'Asia Pacific (Singapore)',     code:'ap-southeast-1', totalResources:28,  monthlyCost:2100.25 },
    ]);
  }
  res.json([]);
});

router.get('/aws/regions/:regionCode/resources', async (_req, res) => res.json([]));

router.get('/gcp/projects/:accountId', async (req, res) => {
  if (req.params.accountId.startsWith('demo-gcp')) {
    return res.json([
      { id:'proj-1', name:'Production Environment', projectId:'cloudguard-prod-001',    status:'Active', totalResources:156, monthlyCost:9850.00 },
      { id:'proj-2', name:'Development Environment',projectId:'cloudguard-dev-001',     status:'Active', totalResources:78,  monthlyCost:3420.50 },
      { id:'proj-3', name:'Staging Environment',    projectId:'cloudguard-staging-001', status:'Active', totalResources:45,  monthlyCost:2180.75 },
    ]);
  }
  res.json([]);
});

router.get('/gcp/projects/:projectId/resources', async (_req, res) => res.json([]));

export default router;