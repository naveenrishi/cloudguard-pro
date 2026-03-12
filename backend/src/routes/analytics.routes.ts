import express from 'express';
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

// GET /api/analytics/multi-cloud?period=6m
router.get('/multi-cloud', authenticateToken, async (req: any, res) => {
  try {
    const userId  = req.user?.id || req.user?.userId;
    const period  = (req.query.period as string) || '6m';
    const months  = period === '3m' ? 3 : period === '12m' ? 12 : 6;

    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

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

// GET /api/analytics/services?period=6m
router.get('/services', authenticateToken, async (req: any, res) => {
  try {
    const userId  = req.user?.id || req.user?.userId;
    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

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

// GET /api/analytics/forecast
router.get('/forecast', authenticateToken, async (req: any, res) => {
  try {
    const userId   = req.user?.id || req.user?.userId;
    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    if (!accounts.length) return res.json({ data: [] });

    const allCosts = await Promise.all(accounts.map(fetchAccountCosts));

    const monthMap: Record<string, number> = {};
    allCosts.forEach(({ monthlyData }) => {
      monthlyData.forEach(m => {
        monthMap[m.month] = (monthMap[m.month] || 0) + m.total;
      });
    });

    const actuals = Object.entries(monthMap)
      .map(([month, total]) => ({ month, total }))
      .slice(-6);

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
        budget:   Math.round((lastTotal + avgGrowth * i) * 1.1),
      };
    });

    const data = [
      ...actuals.map(m => ({
        month:    m.month.split(' ')[0],
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

export default router;