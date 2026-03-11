import express from 'express';
import * as analyticsService from '../services/analytics/analytics.service';
import * as changeTrackingService from '../services/analytics/change-tracking.service';
import * as aiAnalysisService from '../services/analytics/ai-analysis.service';
import * as demoData from '../services/analytics/demo-data.service';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const prisma = new PrismaClient();

// ─── helpers ──────────────────────────────────────────────────────────────────
function decrypt(text: string): string {
  try {
    const crypto = require('crypto');
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum-xx';
    const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const [ivHex, encryptedHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return '{}'; }
}

async function fetchAccountCosts(account: any): Promise<{ provider: string; name: string; monthlyData: any[]; services: any[]; currentMonth: number; lastMonth: number }> {
  try {
    const creds = JSON.parse(decrypt(account.credentials || '{}'));
    const provider = account.provider?.toUpperCase();

    // Call the existing cost endpoint internally via the same logic
    // We use a lightweight fetch to the running server itself
    const SELF = process.env.SELF_URL || 'http://localhost:3000';
    const res = await fetch(`${SELF}/api/cloud/accounts/${account.id}/costs`);
    if (!res.ok) throw new Error(`Cost fetch failed: ${res.status}`);
    const data = await res.json();
    return {
      provider: provider || 'UNKNOWN',
      name: account.accountName,
      monthlyData: data.monthlyData || [],
      services: data.services || [],
      currentMonth: data.currentMonth || data.currentMonthTotal || 0,
      lastMonth: data.lastMonth || data.lastMonthTotal || 0,
    };
  } catch (e: any) {
    return { provider: account.provider?.toUpperCase() || 'UNKNOWN', name: account.accountName, monthlyData: [], services: [], currentMonth: 0, lastMonth: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW: /api/analytics/multi-cloud?period=6m   ← called by AdvancedAnalytics
// Returns month-by-month spend split by provider
// ─────────────────────────────────────────────────────────────────────────────
router.get('/multi-cloud', authenticateToken, async (req: any, res) => {
  try {
    const userId  = req.user?.id || req.user?.userId;
    const period  = (req.query.period as string) || '6m';
    const months  = period === '3m' ? 3 : period === '12m' ? 12 : 6;

    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

    // Build a unified month map
    const monthMap: Record<string, { month: string; AWS: number; Azure: number; GCP: number }> = {};

    allCosts.forEach(({ provider, monthlyData }) => {
      monthlyData.slice(-months).forEach(m => {
        const key = m.month;
        if (!monthMap[key]) monthMap[key] = { month: key, AWS: 0, Azure: 0, GCP: 0 };
        if (provider === 'AWS')   monthMap[key].AWS   += m.total;
        if (provider === 'AZURE') monthMap[key].Azure += m.total;
        if (provider === 'GCP')   monthMap[key].GCP   += m.total;
      });
    });

    const data = Object.values(monthMap).slice(-months);
    res.json({ data });
  } catch (e: any) {
    console.error('multi-cloud analytics error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: /api/analytics/services?period=6m   ← called by AdvancedAnalytics
// Returns top services aggregated across all accounts
// ─────────────────────────────────────────────────────────────────────────────
router.get('/services', authenticateToken, async (req: any, res) => {
  try {
    const userId  = req.user?.id || req.user?.userId;
    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

    // Aggregate services across all accounts
    const serviceMap: Record<string, { name: string; cost: number; provider: string }> = {};
    const COLORS = ['#6366f1','#06b6d4','#f59e0b','#10b981','#2563eb','#0891b2','#7c3aed','#ec4899','#f97316','#94a3b8'];

    allCosts.forEach(({ provider, services }) => {
      services.forEach((s: any) => {
        const key = s.name;
        if (!serviceMap[key]) serviceMap[key] = { name: s.name, cost: 0, provider };
        serviceMap[key].cost += s.cost;
      });
    });

    const sorted = Object.values(serviceMap).sort((a, b) => b.cost - a.cost);
    const total  = sorted.reduce((s, x) => s + x.cost, 0);

    const data = sorted.slice(0, 10).map((s, i) => ({
      ...s,
      pct:   total > 0 ? Math.round((s.cost / total) * 100) : 0,
      color: COLORS[i % COLORS.length],
    }));

    res.json({ data });
  } catch (e: any) {
    console.error('services analytics error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// NEW: /api/analytics/forecast   ← called by AdvancedAnalytics
// Returns actual + 3-month forecast based on real monthly trend
// ─────────────────────────────────────────────────────────────────────────────
router.get('/forecast', authenticateToken, async (req: any, res) => {
  try {
    const userId   = req.user?.id || req.user?.userId;
    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

    // Merge all accounts into a single monthly total
    const monthMap: Record<string, number> = {};
    allCosts.forEach(({ monthlyData }) => {
      monthlyData.forEach(m => {
        monthMap[m.month] = (monthMap[m.month] || 0) + m.total;
      });
    });

    const actuals = Object.entries(monthMap)
      .map(([month, total]) => ({ month, total }))
      .slice(-6);

    // Simple linear forecast: avg growth over last 3 months
    const recent = actuals.slice(-3).map(m => m.total);
    const avgGrowth = recent.length >= 2
      ? (recent[recent.length - 1] - recent[0]) / (recent.length - 1)
      : 0;

    const lastTotal = actuals[actuals.length - 1]?.total || 0;
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();

    const forecastMonths = [1, 2, 3].map(i => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      return {
        month:    MONTH_NAMES[d.getMonth()],
        actual:   null,
        forecast: Math.round(lastTotal + avgGrowth * i),
        budget:   Math.round((lastTotal + avgGrowth * i) * 1.1), // 10% buffer as budget
      };
    });

    const data = [
      ...actuals.map(m => ({
        month:    m.month.split(' ')[0], // "Mar 2026" → "Mar"
        actual:   Math.round(m.total),
        forecast: null,
        budget:   Math.round(m.total * 1.1),
      })),
      ...forecastMonths,
    ];

    res.json({ data });
  } catch (e: any) {
    console.error('forecast analytics error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// ============================================
// EXISTING ROUTES (unchanged)
// ============================================

router.get('/dashboard/:cloudAccountId/:userId', async (req, res) => {
  try {
    const { cloudAccountId, userId } = req.params;
    if (process.env.DEMO_MODE === 'true') {
      const demoDashboard = {
        cost: demoData.generateDemoCostData(cloudAccountId),
        utilization: demoData.generateDemoUtilizationData(),
        security: demoData.generateDemoSecurityData(),
        performance: demoData.generateDemoPerformanceData(),
        business: demoData.generateDemoBusinessData(),
        insights: demoData.generateDemoInsights(),
        generatedAt: new Date(),
      };
      return res.json(demoDashboard);
    }
    const dashboard = await analyticsService.getComprehensiveDashboard(cloudAccountId, userId);
    res.json(dashboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/cost/:cloudAccountId', async (req, res) => {
  try {
    const data = await analyticsService.getCostIntelligence(req.params.cloudAccountId, parseInt(req.query.days as string) || 30);
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/utilization/:cloudAccountId', async (req, res) => {
  try {
    const data = await analyticsService.getResourceUtilization(req.params.cloudAccountId, parseInt(req.query.hours as string) || 24);
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/security/:cloudAccountId', async (req, res) => {
  try {
    const data = await analyticsService.getSecurityCompliance(req.params.cloudAccountId);
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/performance/:cloudAccountId', async (req, res) => {
  try {
    const data = await analyticsService.getPerformanceAnalytics(req.params.cloudAccountId, parseInt(req.query.hours as string) || 24);
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/business/:userId', async (req, res) => {
  try {
    const data = await analyticsService.getBusinessIntelligence(req.params.userId, parseInt(req.query.months as string) || 3);
    res.json(data);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/changes/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    if (process.env.DEMO_MODE === 'true') return res.json(demoData.generateDemoChanges(cloudAccountId));
    const filters = {
      startTime:    req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime:      req.query.endTime   ? new Date(req.query.endTime   as string) : undefined,
      resourceType: req.query.resourceType as string,
      changedBy:    req.query.changedBy    as string,
      changeType:   req.query.changeType   as string,
    };
    const changes = await changeTrackingService.getUnifiedChangeTimeline(cloudAccountId, filters);
    res.json(changes);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/changes/sync/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    if (process.env.DEMO_MODE === 'true') return res.json({ message: 'Changes synced (demo)', changeCount: 50, success: true });
    const result = await changeTrackingService.syncChangesToTimeline(cloudAccountId);
    res.json(result);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/incidents/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    if (process.env.DEMO_MODE === 'true') return res.json(demoData.generateDemoIncidents());
    const incidents = await aiAnalysisService.getIncidents(cloudAccountId);
    res.json(incidents);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.post('/incidents', async (req, res) => {
  try {
    if (process.env.DEMO_MODE === 'true') return res.json({ id: 'demo-' + Date.now(), ...req.body, status: 'investigating', createdAt: new Date() });
    const incident = await aiAnalysisService.createIncident(req.body);
    res.json(incident);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

router.get('/incidents/:incidentId/analysis', async (req, res) => {
  try {
    if (process.env.DEMO_MODE === 'true') return res.json({ incidentId: req.params.incidentId, rootCauses: [], resolutionSteps: [], generatedAt: new Date() });
    const analysis = await aiAnalysisService.analyzeIncident(req.params.incidentId);
    res.json(analysis);
  } catch (error: any) { res.status(500).json({ error: error.message }); }
});

export default router;