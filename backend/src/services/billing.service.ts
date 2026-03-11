// backend/src/services/billing.service.ts
// Builds invoices from real cost data already stored via aws/azure/gcp services.
// Schedules are persisted in the BillingSchedule Prisma model.

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── Types ─────────────────────────────────────────────────────────────────

interface ScheduledExportRecord {
  id:         string;
  userId:     string;
  name:       string;
  frequency:  'weekly' | 'monthly' | 'quarterly';
  format:     'pdf' | 'csv' | 'xlsx';
  email:      string;
  nextRun:    string;
  active:     boolean;
  createdAt:  string;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function nextRunDate(freq: string): string {
  const now = new Date();
  if (freq === 'weekly') {
    const d = new Date(now);
    const daysUntilMonday = (7 - d.getDay() + 1) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  if (freq === 'monthly') {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  // quarterly
  const q = Math.floor(now.getMonth() / 3);
  const d = new Date(now.getFullYear(), (q + 1) * 3, 1);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function nextRunDateTime(freq: string): Date {
  const now = new Date();
  if (freq === 'weekly') {
    const d = new Date(now);
    const daysUntilMonday = (7 - d.getDay() + 1) % 7 || 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return d;
  }
  if (freq === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  const q = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), (q + 1) * 3, 1);
}

function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function monthKey(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthShort(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return d.toLocaleDateString('en-US', { month: 'short' });
}

// ── Internal data helpers ─────────────────────────────────────────────────

async function getUserAccounts(userId: string) {
  return prisma.cloudAccount.findMany({
    where:  { userId },
    select: { id: true, accountName: true, provider: true, accountId: true, region: true },
  });
}

async function loadCostData(cloudAccountId: string): Promise<any | null> {
  try {
    const record = await (prisma as any).costData.findFirst({
      where:   { cloudAccountId },
      orderBy: { createdAt: 'desc' },
    });
    return record;
  } catch {
    return null;
  }
}

// ── Invoices ──────────────────────────────────────────────────────────────

export async function getInvoices(userId: string) {
  const accounts = await getUserAccounts(userId);
  if (!accounts.length) return [];

  const invoices = [];

  for (let i = 0; i < 6; i++) {
    const period    = monthLabel(i);
    const periodKey = monthKey(i);
    const invoiceAccounts: { name: string; provider: string; amount: number }[] = [];

    for (const acc of accounts) {
      const costRecord = await loadCostData(acc.id);
      if (!costRecord) continue;

      const monthly: any[] = costRecord.monthlyData || [];
      const monthEntry = monthly[monthly.length - 1 - i];
      const amount = monthEntry
        ? Math.round((monthEntry.total || 0) * 100) / 100
        : i === 0
          ? Math.round((costRecord.currentMonthTotal || 0) * 100) / 100
          : 0;

      if (amount > 0) {
        invoiceAccounts.push({
          name:     acc.accountName,
          provider: acc.provider.toUpperCase(),
          amount,
        });
      }
    }

    if (invoiceAccounts.length === 0) continue;

    const totalAmount = invoiceAccounts.reduce((s, a) => s + a.amount, 0);
    const genDate = new Date();
    genDate.setMonth(genDate.getMonth() - i);
    genDate.setDate(1);

    invoices.push({
      id:          `inv-${periodKey}-${userId.slice(-6)}`,
      period,
      periodKey,
      totalAmount: Math.round(totalAmount * 100) / 100,
      accounts:    invoiceAccounts,
      status:      i === 0 ? 'pending' : 'paid',
      generatedAt: genDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
  }

  return invoices;
}

export async function getSpendTrend(userId: string) {
  const accounts = await getUserAccounts(userId);
  const trend: { month: string; amount: number }[] = [];

  for (let i = 5; i >= 0; i--) {
    const label = monthShort(i);
    let total = 0;

    for (const acc of accounts) {
      const costRecord = await loadCostData(acc.id);
      if (!costRecord) continue;
      const monthly: any[] = costRecord.monthlyData || [];
      const entry = monthly[monthly.length - 1 - i];
      if (entry) total += entry.total || 0;
      else if (i === 0) total += costRecord.currentMonthTotal || 0;
    }

    trend.push({ month: label, amount: Math.round(total) });
  }

  return trend;
}

// ── Export helpers ────────────────────────────────────────────────────────

export function exportInvoiceCSV(invoice: any): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const rows = [
    ['CloudGuard Pro — Cost Invoice'],
    ['Period', invoice.period],
    ['Invoice ID', invoice.id],
    ['Generated', invoice.generatedAt],
    ['Status', invoice.status],
    [''],
    ['Account', 'Provider', 'Amount', '% of Total'],
    ...invoice.accounts.map((a: any) => [
      a.name,
      a.provider,
      fmt(a.amount),
      `${((a.amount / invoice.totalAmount) * 100).toFixed(0)}%`,
    ]),
    [''],
    ['TOTAL', '', fmt(invoice.totalAmount), '100%'],
    [''],
    ['Generated by CloudGuard Pro', new Date().toLocaleDateString()],
  ];

  return rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
}

export function exportInvoiceHTML(invoice: any): string {
  const fmt = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const accountRows = invoice.accounts.map((a: any) => `
    <tr>
      <td>${a.name}</td>
      <td>${a.provider}</td>
      <td class="right">${fmt(a.amount)}</td>
      <td class="right muted">${((a.amount / invoice.totalAmount) * 100).toFixed(0)}%</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>CloudGuard Pro Invoice — ${invoice.period}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; padding: 48px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; padding-bottom: 24px; border-bottom: 3px solid #6366f1; margin-bottom: 32px; }
    .logo { font-size: 24px; font-weight: 800; color: #6366f1; }
    .logo span { color: #111827; }
    .tagline { font-size: 12px; color: #9ca3af; margin-top: 4px; }
    .meta { text-align: right; }
    .meta .title { font-size: 28px; font-weight: 800; color: #111827; margin-bottom: 6px; }
    .meta .id { font-size: 11px; font-family: monospace; background: #f3f4f6; padding: 3px 8px; border-radius: 6px; color: #6b7280; }
    .meta .date { font-size: 12px; color: #6b7280; margin-top: 8px; }
    .period { display: inline-block; background: #eef2ff; color: #4338ca; font-weight: 700; font-size: 14px; padding: 6px 16px; border-radius: 99px; margin-bottom: 28px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; background: #f9fafb; text-align: left; }
    td { padding: 12px 16px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .right { text-align: right; }
    .muted { color: #9ca3af; }
    .total td { font-size: 16px; font-weight: 800; border-top: 2px solid #6366f1; border-bottom: none; padding-top: 16px; }
    .total .amount { color: #6366f1; }
    .status { display: inline-block; padding: 3px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; margin-top: 8px; }
    .status.pending { background: #fffbeb; color: #d97706; }
    .status.paid    { background: #ecfdf5; color: #059669; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #f3f4f6; font-size: 11px; color: #9ca3af; text-align: center; }
    @media print { body { padding: 24px; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="logo">Cloud<span>Guard</span> Pro</div>
      <div class="tagline">Multi-Cloud Cost Management Platform</div>
    </div>
    <div class="meta">
      <div class="title">INVOICE</div>
      <div class="id">${invoice.id}</div>
      <div class="date">Generated: ${invoice.generatedAt}</div>
      <div><span class="status ${invoice.status}">${invoice.status.toUpperCase()}</span></div>
    </div>
  </div>

  <div class="period">📅 ${invoice.period}</div>

  <table>
    <thead>
      <tr>
        <th>Account</th>
        <th>Provider</th>
        <th class="right">Amount</th>
        <th class="right">% of Total</th>
      </tr>
    </thead>
    <tbody>
      ${accountRows}
      <tr class="total">
        <td colspan="2"><strong>Total</strong></td>
        <td class="right amount"><strong>${fmt(invoice.totalAmount)}</strong></td>
        <td class="right muted"><strong>100%</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated by CloudGuard Pro &nbsp;·&nbsp; ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </div>
</body>
</html>`;
}

export async function customExport(
  userId:   string,
  period:   string,
  format:   string,
  sections: Record<string, boolean>
): Promise<{ content: string; contentType: string; filename: string }> {
  const accounts = await getUserAccounts(userId);
  const now      = new Date();
  const rows: string[][] = [
    ['CloudGuard Pro — Custom Export'],
    ['Period', period.replace(/_/g, ' ')],
    ['Generated', now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })],
    [''],
  ];

  if (sections.costs) {
    rows.push(['=== COST SUMMARY ===']);
    rows.push(['Account', 'Provider', 'Current Month ($)', 'Last Month ($)', 'YTD ($)']);
    for (const acc of accounts) {
      const cr = await loadCostData(acc.id);
      if (cr) {
        rows.push([
          acc.accountName,
          acc.provider,
          (cr.currentMonthTotal || 0).toFixed(2),
          (cr.lastMonthTotal    || 0).toFixed(2),
          (cr.yearToDate        || 0).toFixed(2),
        ]);
      }
    }
    rows.push(['']);
  }

  if (sections.breakdown) {
    rows.push(['=== TOP SERVICES ===']);
    rows.push(['Account', 'Service', 'Monthly Cost ($)', '% of Account']);
    for (const acc of accounts) {
      const cr = await loadCostData(acc.id);
      if (cr?.services) {
        const total = cr.currentMonthTotal || 1;
        for (const svc of (cr.services as any[]).slice(0, 5)) {
          rows.push([
            acc.accountName,
            svc.name || svc.serviceName || 'Unknown',
            (svc.cost || svc.amount || 0).toFixed(2),
            `${(((svc.cost || svc.amount || 0) / total) * 100).toFixed(0)}%`,
          ]);
        }
      }
    }
    rows.push(['']);
  }

  if (sections.recommendations) {
    rows.push(['=== OPTIMIZATION RECOMMENDATIONS ===']);
    rows.push(['Account', 'Recommendation', 'Est. Monthly Savings ($)']);
    for (const acc of accounts) {
      const cr = await loadCostData(acc.id);
      if (cr?.recommendations) {
        for (const rec of (cr.recommendations as any[]).slice(0, 3)) {
          rows.push([acc.accountName, rec.title || rec.description || 'Optimization', (rec.savings || 0).toFixed(2)]);
        }
      } else {
        rows.push([acc.accountName, 'Review stopped/idle resources', '—']);
      }
    }
    rows.push(['']);
  }

  const content  = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const ext      = format === 'xlsx' ? 'csv' : format;
  const filename = `CloudGuard-Export-${period}-${now.getFullYear()}.${ext}`;

  return { content, contentType: 'text/csv', filename };
}

// ── Schedule CRUD — persisted via Prisma BillingSchedule model ────────────

export async function getSchedules(userId: string): Promise<ScheduledExportRecord[]> {
  try {
    const rows = await prisma.billingSchedule.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(r => ({
      id:        r.id,
      userId:    r.userId,
      name:      r.name,
      frequency: r.frequency.toLowerCase() as any,
      format:    r.format.toLowerCase() as any,
      email:     (JSON.parse(r.recipients as string)?.[0]) || '',
      nextRun:   r.nextSendAt
        ? r.nextSendAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : nextRunDate(r.frequency.toLowerCase()),
      active:    r.active,
      createdAt: r.createdAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function createSchedule(
  userId: string,
  data: { name: string; frequency: string; format: string; email: string }
): Promise<ScheduledExportRecord> {
  const nextSendAt = nextRunDateTime(data.frequency);

  const row = await prisma.billingSchedule.create({
    data: {
      userId,
      name:        data.name,
      frequency:   data.frequency.toUpperCase() as any,
      format:      data.format.toUpperCase() as any,
      recipients:  JSON.stringify([data.email]),
      sections:    JSON.stringify(['summary', 'services', 'trends']),
      active:      true,
      nextSendAt,
    },
  });

  return {
    id:        row.id,
    userId:    row.userId,
    name:      row.name,
    frequency: data.frequency as any,
    format:    data.format as any,
    email:     data.email,
    nextRun:   nextSendAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    active:    true,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function toggleSchedule(userId: string, scheduleId: string): Promise<ScheduledExportRecord | null> {
  try {
    const existing = await prisma.billingSchedule.findFirst({ where: { id: scheduleId, userId } });
    if (!existing) return null;

    const updated = await prisma.billingSchedule.update({
      where: { id: scheduleId },
      data:  { active: !existing.active },
    });

    return {
      id:        updated.id,
      userId:    updated.userId,
      name:      updated.name,
      frequency: updated.frequency.toLowerCase() as any,
      format:    updated.format.toLowerCase() as any,
      email:     (JSON.parse(updated.recipients as string)?.[0]) || '',
      nextRun:   updated.nextSendAt
        ? updated.nextSendAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '',
      active:    updated.active,
      createdAt: updated.createdAt.toISOString(),
    };
  } catch {
    return null;
  }
}

export async function deleteSchedule(userId: string, scheduleId: string): Promise<boolean> {
  try {
    await prisma.billingSchedule.delete({ where: { id: scheduleId } });
    return true;
  } catch {
    return false;
  }
}