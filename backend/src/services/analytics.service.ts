// backend/src/services/analytics.service.ts
import { prisma } from '../lib/prisma';

// ── Helpers ────────────────────────────────────────────────────────────────

function monthsBack(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
  }
  return months;
}

function periodToMonths(period: string): number {
  if (period === '3m')  return 3;
  if (period === '12m') return 12;
  return 6; // default 6m
}

const SERVICE_COLORS: string[] = [
  '#6366f1','#ea580c','#2563eb','#059669','#d97706',
  '#9333ea','#0891b2','#dc2626','#65a30d','#db2777',
];

// ── Multi-cloud trend (AWS / Azure / GCP by month) ──────────────────────────

export async function getMultiCloudTrend(userId: string, period: string) {
  const months = periodToMonths(period);
  const labels = monthsBack(months);

  try {
    // Try to pull real cost records from DB
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId },
      include: {
        costRecords: {
          orderBy: { date: 'asc' },
          take: months * 3,
        },
      },
    });

    // If we have real cost data, aggregate by provider + month
    const hasCostData = accounts.some(a => a.costRecords.length > 0);

    if (hasCostData) {
      const map: Record<string, { AWS: number; Azure: number; GCP: number }> = {};
      for (const label of labels) map[label] = { AWS: 0, Azure: 0, GCP: 0 };

      for (const account of accounts) {
        const provider = account.provider.toUpperCase();
        for (const record of account.costRecords) {
          const label = new Date(record.date).toLocaleString('default', { month: 'short', year: '2-digit' });
          if (!map[label]) continue;
          if (provider === 'AWS')   map[label].AWS   += Number(record.amount);
          if (provider === 'AZURE') map[label].Azure += Number(record.amount);
          if (provider === 'GCP')   map[label].GCP   += Number(record.amount);
        }
      }
      return labels.map(m => ({ month: m, ...map[m] }));
    }

    // No real data — return demo based on connected provider count
    const providerCounts = { AWS: 0, Azure: 0, GCP: 0 };
    for (const a of accounts) {
      const p = a.provider.toUpperCase();
      if (p === 'AWS')   providerCounts.AWS++;
      if (p === 'AZURE') providerCounts.Azure++;
      if (p === 'GCP')   providerCounts.GCP++;
    }

    const hasAWS   = providerCounts.AWS   > 0;
    const hasAzure = providerCounts.Azure > 0;
    const hasGCP   = providerCounts.GCP   > 0;

    // Only show demo data if at least one provider connected
    if (!hasAWS && !hasAzure && !hasGCP) return [];

    return labels.map((m, i) => ({
      month: m,
      AWS:   hasAWS   ? Math.round(1200 + i * 80  + Math.sin(i) * 120) : 0,
      Azure: hasAzure ? Math.round(800  + i * 50  + Math.cos(i) * 90)  : 0,
      GCP:   hasGCP   ? Math.round(400  + i * 30  + Math.sin(i * 1.5) * 60) : 0,
    }));
  } catch {
    return [];
  }
}

// ── Forecast (actual + 3-month projection) ──────────────────────────────────

export async function getSpendForecast(userId: string) {
  try {
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId },
      include: {
        costRecords: { orderBy: { date: 'asc' } },
      },
    });

    const hasCostData = accounts.some(a => a.costRecords.length > 0);

    // Aggregate monthly totals from real data
    if (hasCostData) {
      const monthMap: Record<string, number> = {};
      for (const account of accounts) {
        for (const record of account.costRecords) {
          const label = new Date(record.date).toLocaleString('default', { month: 'short', year: '2-digit' });
          monthMap[label] = (monthMap[label] || 0) + Number(record.amount);
        }
      }

      const sorted = Object.entries(monthMap).sort(([a], [b]) => {
        const da = new Date(`01 ${a}`);
        const db = new Date(`01 ${b}`);
        return da.getTime() - db.getTime();
      });

      const actuals = sorted.slice(-6).map(([month, actual]) => ({ month, actual, budget: actual * 1.1 }));

      // Simple linear regression for forecast
      const n = actuals.length;
      const avg = actuals.reduce((s, x) => s + x.actual, 0) / n;
      const trend = n > 1 ? (actuals[n - 1].actual - actuals[0].actual) / (n - 1) : 0;

      const forecast = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
        const projected = Math.max(0, avg + trend * i);
        forecast.push({ month: label, forecast: Math.round(projected), budget: Math.round(projected * 1.1) });
      }

      return [...actuals, ...forecast];
    }

    // No real data — check if any accounts connected
    if (accounts.length === 0) return [];

    // Demo forecast for connected accounts
    const base = accounts.length * 800;
    const months = monthsBack(6);
    const actuals = months.map((m, i) => ({
      month: m,
      actual: Math.round(base + i * 120 + Math.sin(i) * 80),
      budget: Math.round((base + i * 120) * 1.15),
    }));

    const lastActual = actuals[actuals.length - 1].actual;
    const forecastMonths: any[] = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const label = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      forecastMonths.push({
        month: label,
        forecast: Math.round(lastActual * (1 + i * 0.04)),
        budget:   Math.round(lastActual * (1 + i * 0.04) * 1.1),
      });
    }

    return [...actuals, ...forecastMonths];
  } catch {
    return [];
  }
}

// ── Cost by service ──────────────────────────────────────────────────────────

export async function getCostByService(userId: string, period: string) {
  const months = periodToMonths(period);

  try {
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId },
      include: {
        costRecords: {
          orderBy: { date: 'desc' },
          take: months * 20,
        },
      },
    });

    const hasCostData = accounts.some(a => a.costRecords.length > 0);

    if (hasCostData) {
      // Aggregate by service name if service field exists, else by account
      const serviceMap: Record<string, { cost: number; provider: string }> = {};

      for (const account of accounts) {
        for (const record of account.costRecords) {
          const key = (record as any).service || account.accountName || account.provider;
          if (!serviceMap[key]) serviceMap[key] = { cost: 0, provider: account.provider };
          serviceMap[key].cost += Number(record.amount);
        }
      }

      const total = Object.values(serviceMap).reduce((s, x) => s + x.cost, 0);
      const sorted = Object.entries(serviceMap)
        .sort(([, a], [, b]) => b.cost - a.cost)
        .slice(0, 12);

      return sorted.map(([name, { cost, provider }], i) => ({
        name,
        cost: Math.round(cost * 100) / 100,
        pct:  total > 0 ? Math.round((cost / total) * 100) : 0,
        provider: provider.toUpperCase(),
        color: SERVICE_COLORS[i % SERVICE_COLORS.length],
      }));
    }

    // No real data
    if (accounts.length === 0) return [];

    // Demo data per connected provider
    const services: any[] = [];
    let colorIdx = 0;

    for (const account of accounts) {
      const p = account.provider.toUpperCase();
      const demoServices =
        p === 'AWS'   ? ['EC2', 'RDS', 'S3', 'Lambda', 'CloudFront'] :
        p === 'AZURE' ? ['Virtual Machines', 'SQL Database', 'Storage', 'App Service'] :
                        ['Compute Engine', 'Cloud SQL', 'GCS', 'BigQuery'];

      for (const svc of demoServices) {
        const cost = Math.round(200 + Math.random() * 800);
        services.push({ name: `${account.accountName} · ${svc}`, cost, provider: p, color: SERVICE_COLORS[colorIdx++ % SERVICE_COLORS.length] });
      }
    }

    const total = services.reduce((s: number, x: any) => s + x.cost, 0);
    return services
      .sort((a: any, b: any) => b.cost - a.cost)
      .slice(0, 12)
      .map((s: any) => ({ ...s, pct: Math.round((s.cost / total) * 100) }));
  } catch {
    return [];
  }
}