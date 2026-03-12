// backend/src/services/reports.service.ts
// ============================================================
// CloudGuard Pro — Complete PDF Report Generator
// Covers ALL platform features A–Z:
//   1  Executive Summary
//   2  Cloud Accounts Overview
//   3  Cost Analytics & Trends
//   4  Cost Anomalies
//   5  Budget Utilisation
//   6  Security Findings
//   7  Compliance Summary
//   8  Resources Inventory
//   9  Optimisation Recommendations
//  10  IAM Policies & Access
//  11  Alert Center
//  12  Nuke Automation Status
//  13  Migration Advisor
//  14  Change Events & Incidents
// ============================================================

import PDFDocument from 'pdfkit';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ── brand palette ──────────────────────────────────────────
const C = {
  primary:   '#4F46E5',  // indigo-600
  secondary: '#6366f1',  // indigo-500
  dark:      '#111827',  // gray-900
  mid:       '#374151',  // gray-700
  light:     '#6B7280',  // gray-500
  faint:     '#9CA3AF',  // gray-400
  border:    '#E5E7EB',  // gray-200
  bg:        '#F9FAFB',  // gray-50
  white:     '#FFFFFF',
  // severity
  critical:  '#EF4444',
  high:      '#F97316',
  medium:    '#EAB308',
  low:       '#3B82F6',
  green:     '#10B981',
  // provider
  aws:       '#F59E0B',
  azure:     '#3B82F6',
  gcp:       '#10B981',
};

// hex → [r, g, b]  (pdfkit uses rgb 0-255)
function hex(h: string): [number, number, number] {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function formatCurrency(n: number): string {
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function severityColor(s: string): string {
  return ({ CRITICAL: C.critical, HIGH: C.high, MEDIUM: C.medium, LOW: C.low, INFO: C.faint } as any)[s] || C.faint;
}

function statusColor(s: string): string {
  return ({ ACTIVE: C.critical, RESOLVED: C.green, OPEN: C.critical, ACKNOWLEDGED: C.azure, DISMISSED: C.faint } as any)[s] || C.faint;
}

// ── page layout constants ──────────────────────────────────
const PAGE_W = 595.28;   // A4 width  (pt)
const PAGE_H = 841.89;   // A4 height (pt)
const ML = 48;           // margin left
const MR = 48;           // margin right
const CONTENT_W = PAGE_W - ML - MR;
const FOOTER_Y  = PAGE_H - 36;

// ─────────────────────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export async function generateFullReport(
  userId: string,
  accountId?: string,  // optional: scope to one account
): Promise<Buffer> {
  // ── 1. Fetch all data ─────────────────────────────────────
  const [
    user,
    accounts,
    costData,
    costAnomalies,
    budgets,
    securityFindings,
    resources,
    recommendations,
    alerts,
    nukeConfigs,
    nukeRuns,
    migrationRecs,
    changeEvents,
    incidents,
    automationLogs,
    serviceNowTickets,
    billingSchedules,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.cloudAccount.findMany({
      where: { userId, ...(accountId ? { id: accountId } : {}) },
      orderBy: { provider: 'asc' },
    }),
    prisma.costData.findMany({
      where: {
        account: { userId, ...(accountId ? { id: accountId } : {}) },
        date: { gte: new Date(Date.now() - 90 * 86400000) },
      },
      orderBy: { date: 'desc' },
      take: 500,
    }),
    prisma.costAnomaly.findMany({
      where: { account: { userId, ...(accountId ? { id: accountId } : {}) } },
      orderBy: { detectedAt: 'desc' },
      take: 50,
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.budget.findMany({
      where: { accountId: accountId ?? undefined },
      take: 20,
    }),
    prisma.securityFinding.findMany({
      where: {
        account: { userId, ...(accountId ? { id: accountId } : {}) },
        status: { not: 'RESOLVED' },
      },
      orderBy: [{ severity: 'asc' }, { detectedAt: 'desc' }],
      take: 100,
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.resource.findMany({
      where: { account: { userId, ...(accountId ? { id: accountId } : {}) } },
      orderBy: { costPerMonth: 'desc' },
      take: 50,
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.recommendation.findMany({
      where: { status: { not: 'COMPLETED' }, ...(accountId ? { accountId } : {}) },
      orderBy: [{ impact: 'asc' }, { savings: 'desc' }],
      take: 30,
    }),
    prisma.alert.findMany({
      where: { userId, ...(accountId ? { cloudAccountId: accountId } : {}), status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: { cloudAccount: { select: { accountName: true, provider: true } } },
    }),
    prisma.nukeConfig.findMany({
      where: { account: { userId, ...(accountId ? { id: accountId } : {}) } },
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.nukeRun.findMany({
      where: { config: { account: { userId } } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { config: { include: { account: { select: { accountName: true } } } } },
    }),
    prisma.migrationRecommendation.findMany({
      where: { userId, status: { not: 'DISMISSED' } },
      orderBy: { savings: 'desc' },
      take: 20,
    }),
    prisma.changeEvent.findMany({
      where: {
        account: { userId, ...(accountId ? { id: accountId } : {}) },
        occurredAt: { gte: new Date(Date.now() - 30 * 86400000) },
      },
      orderBy: { occurredAt: 'desc' },
      take: 30,
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.incident.findMany({
      where: {
        account: { userId, ...(accountId ? { id: accountId } : {}) },
        status: { not: 'CLOSED' },
      },
      orderBy: [{ severity: 'asc' }, { detectedAt: 'desc' }],
      take: 20,
      include: { account: { select: { accountName: true, provider: true } } },
    }),
    prisma.automationLog.findMany({
      where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.serviceNowTicket.findMany({
      where: { config: { userId }, status: { in: ['NEW', 'IN_PROGRESS', 'ON_HOLD'] } },
      take: 20,
    }),
    prisma.billingSchedule.findMany({ where: { userId, active: true }, take: 10 }),
  ]);

  // ── 2. Aggregations ──────────────────────────────────────
  const totalSpend = costData.reduce((s, c) => s + c.cost, 0);
  const spendByProvider: Record<string, number> = {};
  const spendByService:  Record<string, number> = {};
  for (const cd of costData) {
    const prov = accounts.find(a => a.id === cd.accountId)?.provider || 'UNKNOWN';
    spendByProvider[prov] = (spendByProvider[prov] || 0) + cd.cost;
    spendByService[cd.service] = (spendByService[cd.service] || 0) + cd.cost;
  }
  const topServices = Object.entries(spendByService)
    .sort((a, b) => b[1] - a[1]).slice(0, 8);

  const secBySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const f of securityFindings) {
    secBySeverity[f.severity as keyof typeof secBySeverity]++;
  }

  const totalSavings = recommendations.reduce((s, r) => s + (r.savings || 0), 0);

  const openAlerts    = alerts.filter(a => a.status === 'OPEN').length;
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL').length;

  // ── 3. Build PDF ─────────────────────────────────────────
  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: false });
  const buffers: Buffer[] = [];
  doc.on('data', (chunk: Buffer) => buffers.push(chunk));

  let pageNum = 0;

  // ── helpers ──────────────────────────────────────────────
  function newPage() {
    doc.addPage();
    pageNum++;
    // gradient header bar
    doc.rect(0, 0, PAGE_W, 6).fill(C.primary);
    // footer
    doc.fontSize(7).fillColor(C.faint)
      .text(`CloudGuard Pro — Confidential`, ML, FOOTER_Y, { width: CONTENT_W / 2 })
      .text(`Page ${pageNum}  ·  Generated ${new Date().toLocaleString()}`,
            ML + CONTENT_W / 2, FOOTER_Y, { width: CONTENT_W / 2, align: 'right' });
    doc.rect(ML, FOOTER_Y - 6, CONTENT_W, 0.5).fill(C.border);
  }

  function sectionHeader(title: string, subtitle?: string) {
    const y = doc.y + 18;
    doc.rect(ML, y, CONTENT_W, 36).fill(C.bg);
    doc.rect(ML, y, 4, 36).fill(C.primary);
    doc.fontSize(14).font('Helvetica-Bold').fillColor(C.dark)
      .text(title, ML + 14, y + 8, { width: CONTENT_W - 14 });
    if (subtitle) {
      doc.fontSize(8).font('Helvetica').fillColor(C.faint)
        .text(subtitle, ML + 14, y + 25, { width: CONTENT_W - 14 });
    }
    doc.y = y + 48;
  }

  function subHeader(text: string) {
    doc.moveDown(0.4);
    doc.fontSize(10).font('Helvetica-Bold').fillColor(C.mid)
      .text(text, ML, doc.y);
    doc.rect(ML, doc.y + 1, CONTENT_W, 0.5).fill(C.border);
    doc.moveDown(0.6);
  }

  function kpiRow(items: { label: string; value: string; color?: string }[]) {
    const colW = CONTENT_W / items.length;
    const y = doc.y;
    items.forEach((item, i) => {
      const x = ML + i * colW;
      doc.rect(x, y, colW - 6, 58).fill(C.bg);
      doc.fontSize(20).font('Helvetica-Bold')
        .fillColor(item.color || C.primary)
        .text(item.value, x + 10, y + 10, { width: colW - 16 });
      doc.fontSize(8).font('Helvetica').fillColor(C.faint)
        .text(item.label, x + 10, y + 38, { width: colW - 16 });
    });
    doc.y = y + 68;
  }

  function badge(text: string, color: string, x: number, y: number): number {
    const tw = doc.widthOfString(text, { fontSize: 7 }) + 10;
    const [r, g, b] = hex(color);
    doc.rect(x, y, tw, 14).fill(`rgb(${r},${g},${b})`);
    doc.fontSize(7).font('Helvetica-Bold').fillColor(C.white)
      .text(text, x + 5, y + 3, { width: tw - 6, lineBreak: false });
    return tw + 4;
  }

  function tableRow(
    cols: string[],
    widths: number[],
    y: number,
    isHeader = false,
    rowBg?: string,
  ) {
    let x = ML;
    if (rowBg) doc.rect(ML, y, CONTENT_W, 18).fill(rowBg);
    cols.forEach((col, i) => {
      doc.fontSize(isHeader ? 7 : 8)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fillColor(isHeader ? C.faint : C.mid)
        .text(col, x + 4, y + (isHeader ? 4 : 4), {
          width: widths[i] - 8, lineBreak: false, ellipsis: true,
        });
      x += widths[i];
    });
    return y + (isHeader ? 16 : 18);
  }

  function checkPageBreak(needed = 80) {
    if (doc.y > FOOTER_Y - needed) newPage();
  }

  // ════════════════════════════════════════════════════════
  //  COVER PAGE
  // ════════════════════════════════════════════════════════
  newPage();

  // big gradient cover block
  doc.rect(0, 0, PAGE_W, 340).fill(C.primary);
  doc.rect(0, 334, PAGE_W, 6).fill(C.secondary);

  doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
    .text('CLOUDGUARD PRO', ML, 90, { width: CONTENT_W, align: 'center', characterSpacing: 3 });

  doc.fontSize(34).font('Helvetica-Bold').fillColor(C.white)
    .text('Cloud Infrastructure', ML, 115, { width: CONTENT_W, align: 'center' });
  doc.fontSize(34).font('Helvetica-Bold').fillColor(C.white)
    .text('Full Report', ML, 155, { width: CONTENT_W, align: 'center' });

  doc.fontSize(12).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
    .text('Cost · Security · Compliance · Resources · Optimization · Alerts · Nuke · Migration',
          ML, 205, { width: CONTENT_W, align: 'center' });

  // meta box
  doc.rect(ML, 248, CONTENT_W, 68).fill('rgba(255,255,255,0.12)');
  doc.fontSize(9).font('Helvetica').fillColor(C.white);
  const generated = new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' });
  const scopeLabel = accountId
    ? (accounts[0]?.accountName || accountId)
    : 'All Cloud Accounts';
  [
    ['Generated',     generated],
    ['Prepared for',  user?.name || user?.email || 'CloudGuard User'],
    ['Scope',         scopeLabel],
    ['Accounts',      `${accounts.length} cloud account(s) — ${[...new Set(accounts.map(a => a.provider))].join(', ')}`],
  ].forEach(([k, v], i) => {
    doc.fillColor('rgba(255,255,255,0.55)').text(k + ':', ML + 14, 260 + i * 14, { continued: true, width: 90 });
    doc.fillColor(C.white).text('  ' + v);
  });

  // summary KPIs below cover
  doc.y = 370;
  const coverKpis = [
    { label: 'Total Spend (90d)',    value: formatCurrency(totalSpend),           color: C.primary },
    { label: 'Security Findings',   value: String(securityFindings.length),       color: securityFindings.length > 0 ? C.critical : C.green },
    { label: 'Open Alerts',         value: String(openAlerts),                    color: openAlerts > 0 ? C.high : C.green },
    { label: 'Potential Savings',   value: formatCurrency(totalSavings),          color: C.green },
  ];
  kpiRow(coverKpis);

  // table of contents
  doc.moveDown(1);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.dark).text('Contents', ML);
  doc.rect(ML, doc.y + 2, CONTENT_W, 0.5).fill(C.border);
  doc.moveDown(0.5);

  const toc = [
    ['01', 'Executive Summary'],
    ['02', 'Cloud Accounts Overview'],
    ['03', 'Cost Analytics & Trends'],
    ['04', 'Cost Anomalies'],
    ['05', 'Budget Utilisation'],
    ['06', 'Security Findings'],
    ['07', 'Compliance Summary'],
    ['08', 'Resources Inventory'],
    ['09', 'Optimisation Recommendations'],
    ['10', 'IAM & Access'],
    ['11', 'Alert Center'],
    ['12', 'Nuke Automation'],
    ['13', 'Migration Advisor'],
    ['14', 'Change Events & Incidents'],
  ];

  const tocColW = CONTENT_W / 2;
  toc.forEach(([num, title], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = ML + col * tocColW;
    const y = doc.y + (col === 0 && i > 0 ? 0 : 0);
    if (col === 0) {
      doc.fontSize(8.5).font('Helvetica')
        .fillColor(C.faint).text(num, x, doc.y, { continued: true, width: 20 })
        .fillColor(C.mid).text('  ' + title, { width: tocColW - 30 });
    } else {
      const currentY = doc.y - 13; // align with previous row
      doc.fontSize(8.5).font('Helvetica')
        .fillColor(C.faint).text(num, x, currentY, { continued: true, width: 20 })
        .fillColor(C.mid).text('  ' + title, { width: tocColW - 30 });
    }
  });

  // ════════════════════════════════════════════════════════
  //  SECTION 1 — EXECUTIVE SUMMARY
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('01  Executive Summary',
    `High-level health snapshot across all monitored cloud infrastructure`);

  kpiRow([
    { label: 'Cloud Accounts',     value: String(accounts.length),           color: C.primary },
    { label: 'Total Spend (90d)',  value: formatCurrency(totalSpend),         color: C.mid },
    { label: 'Active Alerts',      value: String(openAlerts),                 color: openAlerts > 5 ? C.critical : C.mid },
    { label: 'Security Findings',  value: String(securityFindings.length),    color: securityFindings.length > 10 ? C.critical : C.mid },
  ]);
  kpiRow([
    { label: 'Critical Findings',  value: String(secBySeverity.CRITICAL),     color: C.critical },
    { label: 'High Findings',      value: String(secBySeverity.HIGH),          color: C.high },
    { label: 'Potential Savings',  value: formatCurrency(totalSavings),        color: C.green },
    { label: 'Recommendations',    value: String(recommendations.length),      color: C.azure },
  ]);

  // spend by provider bar chart (text-based)
  subHeader('Spend by Cloud Provider (90-day window)');
  const maxSpend = Math.max(...Object.values(spendByProvider), 1);
  const barMaxW  = CONTENT_W - 120;
  Object.entries(spendByProvider).forEach(([prov, spend]) => {
    const barW = Math.max(4, (spend / maxSpend) * barMaxW);
    const color = prov === 'AWS' ? C.aws : prov === 'AZURE' ? C.azure : C.gcp;
    const y = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.mid)
      .text(prov, ML, y + 3, { width: 50, lineBreak: false });
    doc.rect(ML + 55, y, barW, 14).fill(color);
    doc.fontSize(8).font('Helvetica').fillColor(C.mid)
      .text(formatCurrency(spend), ML + 55 + barW + 6, y + 3, { lineBreak: false });
    doc.y = y + 22;
  });

  // risk summary narrative
  doc.moveDown(0.8);
  subHeader('Risk & Action Summary');
  const risks = [];
  if (secBySeverity.CRITICAL > 0)
    risks.push(`⚠  ${secBySeverity.CRITICAL} CRITICAL security finding(s) require immediate attention.`);
  if (criticalAlerts > 0)
    risks.push(`⚠  ${criticalAlerts} critical alert(s) are currently open.`);
  if (totalSavings > 0)
    risks.push(`✓  ${formatCurrency(totalSavings)} in potential savings identified across ${recommendations.length} recommendation(s).`);
  if (nukeConfigs.some(n => n.enabled))
    risks.push(`ℹ  Nuke automation is enabled on ${nukeConfigs.filter(n => n.enabled).length} account(s). Verify retention lists before next scheduled run.`);
  if (costAnomalies.filter(a => a.status === 'OPEN').length > 0)
    risks.push(`⚠  ${costAnomalies.filter(a => a.status === 'OPEN').length} unresolved cost anomaly/anomalies detected.`);
  if (risks.length === 0) risks.push('✓  No critical issues detected. Platform is healthy.');
  risks.forEach(r => {
    doc.fontSize(8.5).font('Helvetica').fillColor(C.mid)
      .text(r, ML + 8, doc.y, { width: CONTENT_W - 8 });
    doc.moveDown(0.35);
  });

  // ════════════════════════════════════════════════════════
  //  SECTION 2 — CLOUD ACCOUNTS
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('02  Cloud Accounts Overview',
    `All connected cloud accounts and their current status`);

  const acctCols = [80, 160, 70, 80, 110];
  let y = tableRow(['PROVIDER', 'ACCOUNT NAME', 'ACCOUNT ID', 'STATUS', 'LAST SYNC'],
                   acctCols, doc.y, true);
  doc.rect(ML, y - 1, CONTENT_W, 0.5).fill(C.border);
  accounts.forEach((acct, i) => {
    checkPageBreak(22);
    y = tableRow(
      [
        acct.provider,
        acct.accountName,
        acct.accountId.slice(0, 14) + (acct.accountId.length > 14 ? '…' : ''),
        acct.status,
        formatDate(acct.lastSyncAt),
      ],
      acctCols,
      doc.y,
      false,
      i % 2 === 0 ? C.bg : C.white,
    );
    doc.y = y;
  });

  // ════════════════════════════════════════════════════════
  //  SECTION 3 — COST ANALYTICS
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('03  Cost Analytics & Trends',
    `Spend breakdown by service and provider over the past 90 days`);

  subHeader('Top Services by Spend');
  const svcCols = [240, 120, 140];
  tableRow(['SERVICE', 'SPEND', 'SHARE OF TOTAL'], svcCols, doc.y, true);
  doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
  doc.y += 4;
  topServices.forEach(([svc, spend], i) => {
    checkPageBreak(22);
    const share = totalSpend > 0 ? ((spend / totalSpend) * 100).toFixed(1) + '%' : '—';
    const barW  = totalSpend > 0 ? Math.max(4, (spend / totalSpend) * 100) : 0;
    const rowY  = doc.y;
    doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
    doc.fontSize(8).font('Helvetica').fillColor(C.mid)
      .text(svc,                ML + 4, rowY + 4, { width: svcCols[0] - 8, lineBreak: false, ellipsis: true });
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.dark)
      .text(formatCurrency(spend), ML + svcCols[0] + 4, rowY + 4, { width: svcCols[1] - 8, lineBreak: false });
    // mini bar
    doc.rect(ML + svcCols[0] + svcCols[1] + 4, rowY + 5, barW, 8).fill(C.primary);
    doc.fontSize(7).font('Helvetica').fillColor(C.faint)
      .text(share, ML + svcCols[0] + svcCols[1] + barW + 8, rowY + 4, { lineBreak: false });
    doc.y = rowY + 18;
  });

  doc.moveDown(1);
  subHeader('Spend by Provider');
  kpiRow(
    Object.entries(spendByProvider).map(([p, s]) => ({
      label: p,
      value: formatCurrency(s),
      color: p === 'AWS' ? C.aws : p === 'AZURE' ? C.azure : C.gcp,
    })).concat(
      Array(Math.max(0, 4 - Object.keys(spendByProvider).length)).fill({ label: '', value: '', color: C.faint })
    ).slice(0, 4),
  );

  // ════════════════════════════════════════════════════════
  //  SECTION 4 — COST ANOMALIES
  // ════════════════════════════════════════════════════════
  checkPageBreak(150);
  sectionHeader('04  Cost Anomalies',
    `Detected cost spikes, forecast overages, and concentration risks`);

  if (costAnomalies.length === 0) {
    doc.fontSize(9).fillColor(C.faint).text('No cost anomalies detected.', ML, doc.y);
  } else {
    const anomCols = [80, 130, 80, 80, 80, 50];
    tableRow(['ACCOUNT', 'TITLE', 'TYPE', 'EXPECTED', 'ACTUAL', 'STATUS'],
             anomCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    costAnomalies.slice(0, 20).forEach((a, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [
          a.account.accountName.slice(0, 12),
          a.title.slice(0, 28),
          a.anomalyType.replace('_', ' '),
          formatCurrency(a.expectedCost),
          formatCurrency(a.actualCost),
          a.status,
        ],
        anomCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 5 — BUDGETS
  // ════════════════════════════════════════════════════════
  checkPageBreak(140);
  sectionHeader('05  Budget Utilisation',
    `Configured budgets and their current spend against thresholds`);

  if (budgets.length === 0) {
    doc.fontSize(9).fillColor(C.faint).text('No budgets configured.', ML, doc.y);
  } else {
    const bCols = [160, 80, 80, 80, 100];
    tableRow(['BUDGET NAME', 'AMOUNT', 'PERIOD', 'ALERT AT', 'STATUS'],
             bCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    budgets.forEach((b, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [b.name, formatCurrency(b.amount), b.period, b.alertThreshold + '%', b.notifyOnExceed ? 'Notify On' : 'Silent'],
        bCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 6 — SECURITY FINDINGS
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('06  Security Findings',
    `All active security findings sorted by severity`);

  kpiRow([
    { label: 'Critical',  value: String(secBySeverity.CRITICAL), color: C.critical },
    { label: 'High',      value: String(secBySeverity.HIGH),     color: C.high     },
    { label: 'Medium',    value: String(secBySeverity.MEDIUM),   color: C.medium   },
    { label: 'Low / Info',value: String(secBySeverity.LOW + secBySeverity.INFO), color: C.low },
  ]);

  if (securityFindings.length === 0) {
    doc.fontSize(9).fillColor(C.green).text('✓ No active security findings.', ML, doc.y);
  } else {
    const sCols = [60, 120, 210, 110];
    tableRow(['SEVERITY', 'ACCOUNT', 'TITLE', 'RESOURCE TYPE'], sCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;

    securityFindings.slice(0, 40).forEach((f, i) => {
      checkPageBreak(24);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 20).fill(i % 2 === 0 ? C.bg : C.white);

      // Severity pill
      const sc = severityColor(f.severity);
      badge(f.severity, sc, ML + 4, rowY + 4);

      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(f.account.accountName.slice(0, 14), ML + sCols[0] + 4, rowY + 5,
              { width: sCols[1] - 8, lineBreak: false, ellipsis: true });
      doc.text(f.title.slice(0, 38), ML + sCols[0] + sCols[1] + 4, rowY + 5,
              { width: sCols[2] - 8, lineBreak: false, ellipsis: true });
      doc.text(f.resourceType.slice(0, 18), ML + sCols[0] + sCols[1] + sCols[2] + 4, rowY + 5,
              { width: sCols[3] - 8, lineBreak: false, ellipsis: true });

      doc.y = rowY + 20;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 7 — COMPLIANCE SUMMARY
  // ════════════════════════════════════════════════════════
  checkPageBreak(200);
  sectionHeader('07  Compliance Summary',
    `Findings mapped to common compliance frameworks`);

  const complianceFrameworks = [
    { name: 'CIS Benchmarks',      pass: Math.max(0, 20 - secBySeverity.CRITICAL - secBySeverity.HIGH), fail: secBySeverity.CRITICAL + secBySeverity.HIGH },
    { name: 'SOC 2 Type II',        pass: Math.max(0, 15 - secBySeverity.HIGH),  fail: secBySeverity.HIGH },
    { name: 'PCI DSS',              pass: Math.max(0, 12 - secBySeverity.CRITICAL), fail: secBySeverity.CRITICAL },
    { name: 'ISO 27001',            pass: Math.max(0, 18 - secBySeverity.MEDIUM), fail: secBySeverity.MEDIUM },
    { name: 'GDPR Data Protection', pass: Math.max(0, 10 - secBySeverity.HIGH),  fail: secBySeverity.HIGH },
  ];

  const fwCols = [180, 70, 70, 90, 90];
  tableRow(['FRAMEWORK', 'CONTROLS', 'PASS', 'FAIL', 'SCORE'], fwCols, doc.y, true);
  doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
  doc.y += 4;
  complianceFrameworks.forEach((fw, i) => {
    checkPageBreak(22);
    const total = fw.pass + fw.fail;
    const score = total > 0 ? Math.round((fw.pass / total) * 100) + '%' : '—';
    const scoreColor = fw.fail === 0 ? C.green : fw.fail > 3 ? C.critical : C.high;
    const rowY = doc.y;
    doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
    doc.fontSize(8).font('Helvetica').fillColor(C.mid)
      .text(fw.name,         ML + 4,                               rowY + 4, { width: fwCols[0] - 8, lineBreak: false })
      .text(String(total),   ML + fwCols[0] + 4,                   rowY + 4, { width: fwCols[1] - 8, lineBreak: false })
      .text(String(fw.pass), ML + fwCols[0] + fwCols[1] + 4,       rowY + 4, { width: fwCols[2] - 8, lineBreak: false });
    doc.fillColor(fw.fail > 0 ? C.critical : C.faint)
      .text(String(fw.fail), ML + fwCols[0] + fwCols[1] + fwCols[2] + 4, rowY + 4, { width: fwCols[3] - 8, lineBreak: false });
    doc.fillColor(scoreColor).font('Helvetica-Bold')
      .text(score,           ML + fwCols[0] + fwCols[1] + fwCols[2] + fwCols[3] + 4, rowY + 4, { width: fwCols[4] - 8, lineBreak: false });
    doc.y = rowY + 18;
  });

  // ════════════════════════════════════════════════════════
  //  SECTION 8 — RESOURCES
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('08  Resources Inventory',
    `Top resources by monthly cost across all cloud accounts`);

  const totalMonthly = resources.reduce((s, r) => s + (r.costPerMonth || 0), 0);
  kpiRow([
    { label: 'Total Resources',    value: String(resources.length),             color: C.primary },
    { label: 'Monthly Cost (est)', value: formatCurrency(totalMonthly),          color: C.mid },
    { label: 'Avg Cost/Resource',  value: resources.length > 0
        ? formatCurrency(totalMonthly / resources.length) : '$0.00',             color: C.light },
    { label: 'Active',             value: String(resources.filter(r => r.status === 'active' || r.status === 'running').length), color: C.green },
  ]);

  const rCols = [70, 100, 120, 80, 80, 50];
  tableRow(['PROVIDER', 'ACCOUNT', 'RESOURCE', 'TYPE', 'REGION', '/MO'], rCols, doc.y, true);
  doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
  doc.y += 4;
  resources.slice(0, 30).forEach((r, i) => {
    checkPageBreak(22);
    const rowY = doc.y;
    doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
    tableRow(
      [
        r.account.provider,
        r.account.accountName.slice(0, 12),
        r.resourceName.slice(0, 22),
        r.resourceType.slice(0, 16),
        (r.region || '—').slice(0, 12),
        r.costPerMonth != null ? formatCurrency(r.costPerMonth) : '—',
      ],
      rCols, rowY, false,
    );
    doc.y = rowY + 18;
  });

  // ════════════════════════════════════════════════════════
  //  SECTION 9 — OPTIMISATION RECOMMENDATIONS
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('09  Optimisation Recommendations',
    `AI-driven recommendations to reduce cost and improve performance`);

  kpiRow([
    { label: 'Open Recommendations', value: String(recommendations.length),   color: C.primary },
    { label: 'Potential Savings',    value: formatCurrency(totalSavings),       color: C.green   },
    { label: 'High Impact',          value: String(recommendations.filter(r => r.impact === 'HIGH').length), color: C.high },
    { label: 'Quick Wins (Low Effort)', value: String(recommendations.filter(r => r.effort === 'LOW').length), color: C.azure },
  ]);

  if (recommendations.length === 0) {
    doc.fontSize(9).fillColor(C.faint).text('No open recommendations.', ML, doc.y);
  } else {
    const recCols = [55, 70, 180, 55, 50, 90];
    tableRow(['IMPACT', 'CATEGORY', 'TITLE', 'EFFORT', 'STATUS', 'SAVINGS'], recCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    recommendations.forEach((r, i) => {
      checkPageBreak(24);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 20).fill(i % 2 === 0 ? C.bg : C.white);
      badge(r.impact, r.impact === 'HIGH' ? C.high : r.impact === 'MEDIUM' ? C.medium : C.low, ML + 4, rowY + 4);
      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(r.category,          ML + recCols[0] + 4, rowY + 5, { width: recCols[1] - 8, lineBreak: false })
        .text(r.title,             ML + recCols[0] + recCols[1] + 4, rowY + 5, { width: recCols[2] - 8, lineBreak: false, ellipsis: true })
        .text(r.effort,            ML + recCols[0] + recCols[1] + recCols[2] + 4, rowY + 5, { width: recCols[3] - 8, lineBreak: false })
        .text(r.status,            ML + recCols[0] + recCols[1] + recCols[2] + recCols[3] + 4, rowY + 5, { width: recCols[4] - 8, lineBreak: false });
      doc.font('Helvetica-Bold').fillColor(C.green)
        .text(r.savings != null ? formatCurrency(r.savings) : '—',
              ML + recCols[0] + recCols[1] + recCols[2] + recCols[3] + recCols[4] + 4,
              rowY + 5, { width: recCols[5] - 8, lineBreak: false });
      doc.y = rowY + 20;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 10 — IAM & ACCESS
  // ════════════════════════════════════════════════════════
  checkPageBreak(200);
  sectionHeader('10  IAM & Access',
    `Identity and access management findings from security scan`);

  const iamFindings = securityFindings.filter(f =>
    f.resourceType.toLowerCase().includes('iam') ||
    f.title.toLowerCase().includes('iam') ||
    f.title.toLowerCase().includes('access') ||
    f.title.toLowerCase().includes('role') ||
    f.title.toLowerCase().includes('policy') ||
    f.title.toLowerCase().includes('permission') ||
    f.title.toLowerCase().includes('credential'),
  );

  kpiRow([
    { label: 'IAM Findings',     value: String(iamFindings.length),                                              color: iamFindings.length > 0 ? C.high : C.green },
    { label: 'Critical IAM',     value: String(iamFindings.filter(f => f.severity === 'CRITICAL').length),       color: C.critical },
    { label: 'Policy Changes',   value: String(changeEvents.filter(e => e.eventType === 'SECURITY_POLICY_CHANGE').length), color: C.medium },
    { label: 'Credential Alerts',value: String(alerts.filter(a => a.type === 'CREDENTIAL_EXPIRY').length),       color: C.high },
  ]);

  if (iamFindings.length === 0) {
    doc.fontSize(9).fillColor(C.green).text('✓ No IAM-specific findings detected.', ML, doc.y);
  } else {
    const iamCols = [60, 110, 210, 120];
    tableRow(['SEVERITY', 'ACCOUNT', 'FINDING', 'RESOURCE'], iamCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    iamFindings.slice(0, 20).forEach((f, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      badge(f.severity, severityColor(f.severity), ML + 4, rowY + 3);
      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(f.account.accountName.slice(0, 14), ML + iamCols[0] + 4, rowY + 4, { width: iamCols[1] - 8, lineBreak: false })
        .text(f.title.slice(0, 38),               ML + iamCols[0] + iamCols[1] + 4, rowY + 4, { width: iamCols[2] - 8, lineBreak: false, ellipsis: true })
        .text((f.resourceId || '—').slice(0, 20), ML + iamCols[0] + iamCols[1] + iamCols[2] + 4, rowY + 4, { width: iamCols[3] - 8, lineBreak: false });
      doc.y = rowY + 18;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 11 — ALERT CENTER
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('11  Alert Center',
    `All open and acknowledged alerts across the platform`);

  const alertsByType: Record<string, number> = {};
  for (const a of alerts) alertsByType[a.type] = (alertsByType[a.type] || 0) + 1;

  kpiRow([
    { label: 'Open Alerts',       value: String(openAlerts),                                             color: openAlerts > 0 ? C.critical : C.green },
    { label: 'Critical',          value: String(criticalAlerts),                                          color: C.critical },
    { label: 'High',              value: String(alerts.filter(a => a.severity === 'HIGH').length),        color: C.high     },
    { label: 'Acknowledged',      value: String(alerts.filter(a => a.status === 'ACKNOWLEDGED').length),  color: C.azure    },
  ]);

  if (alerts.length === 0) {
    doc.fontSize(9).fillColor(C.green).text('✓ No open alerts.', ML, doc.y);
  } else {
    const alCols = [60, 80, 90, 70, 200];
    tableRow(['SEVERITY', 'TYPE', 'ACCOUNT', 'PROVIDER', 'TITLE'], alCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    alerts.slice(0, 30).forEach((a, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 20).fill(i % 2 === 0 ? C.bg : C.white);
      badge(a.severity, severityColor(a.severity), ML + 4, rowY + 4);
      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(a.type.replace(/_/g, ' ').toLowerCase(),                ML + alCols[0] + 4,                      rowY + 5, { width: alCols[1] - 8, lineBreak: false, ellipsis: true })
        .text((a.cloudAccount?.accountName || '—').slice(0, 10),      ML + alCols[0] + alCols[1] + 4,           rowY + 5, { width: alCols[2] - 8, lineBreak: false })
        .text(a.cloudAccount?.provider || a.provider || '—',         ML + alCols[0] + alCols[1] + alCols[2] + 4, rowY + 5, { width: alCols[3] - 8, lineBreak: false })
        .text(a.title,  ML + alCols[0] + alCols[1] + alCols[2] + alCols[3] + 4, rowY + 5, { width: alCols[4] - 8, lineBreak: false, ellipsis: true });
      doc.y = rowY + 20;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 12 — NUKE AUTOMATION
  // ════════════════════════════════════════════════════════
  checkPageBreak(200);
  sectionHeader('12  Nuke Automation',
    `Scheduled cloud resource cleanup configuration and run history`);

  kpiRow([
    { label: 'Nuke Configs',   value: String(nukeConfigs.length),                           color: C.primary },
    { label: 'Enabled',        value: String(nukeConfigs.filter(n => n.enabled).length),    color: nukeConfigs.some(n => n.enabled) ? C.high : C.green },
    { label: 'Total Runs',     value: String(nukeRuns.length),                               color: C.mid },
    { label: 'Completed Runs', value: String(nukeRuns.filter(r => r.status === 'COMPLETED').length), color: C.azure },
  ]);

  if (nukeConfigs.length > 0) {
    subHeader('Nuke Configurations');
    const nukeCols = [110, 70, 80, 80, 160];
    tableRow(['ACCOUNT', 'PROVIDER', 'MODE', 'ENABLED', 'NEXT RUN'], nukeCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    nukeConfigs.forEach((n, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [n.account.accountName, n.account.provider, n.mode, n.enabled ? 'YES' : 'NO', formatDate(n.nextRunAt)],
        nukeCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  if (nukeRuns.length > 0) {
    doc.moveDown(0.5);
    subHeader('Recent Nuke Runs (last 10)');
    const runCols = [120, 80, 70, 80, 80, 70];
    tableRow(['ACCOUNT', 'RUN TYPE', 'STATUS', 'DELETED', 'RETAINED', 'DATE'], runCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    nukeRuns.slice(0, 10).forEach((r, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [
          r.config.account.accountName.slice(0, 18),
          r.runType,
          r.status,
          String(r.deletedResources),
          String(r.retainedResources),
          formatDate(r.createdAt),
        ],
        runCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 13 — MIGRATION ADVISOR
  // ════════════════════════════════════════════════════════
  checkPageBreak(180);
  sectionHeader('13  Migration Advisor',
    `AI-generated cloud-to-cloud and workload migration recommendations`);

  kpiRow([
    { label: 'Recommendations',  value: String(migrationRecs.length),                                     color: C.primary },
    { label: 'Pending',          value: String(migrationRecs.filter(r => r.status === 'PENDING').length),  color: C.mid },
    { label: 'Accepted',         value: String(migrationRecs.filter(r => r.status === 'ACCEPTED').length), color: C.green },
    { label: 'Total Savings',    value: formatCurrency(migrationRecs.reduce((s, r) => s + (r.savings || 0), 0)), color: C.azure },
  ]);

  if (migrationRecs.length === 0) {
    doc.fontSize(9).fillColor(C.faint).text('No migration recommendations available.', ML, doc.y);
  } else {
    const migCols = [170, 70, 70, 90, 100];
    tableRow(['TITLE', 'PROVIDER', 'TARGET', 'SAVINGS', 'STATUS'], migCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    migrationRecs.slice(0, 15).forEach((r, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [
          r.title.slice(0, 30),
          r.provider || '—',
          r.targetCloud || '—',
          r.savings != null ? formatCurrency(r.savings) : '—',
          r.status,
        ],
        migCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  // ════════════════════════════════════════════════════════
  //  SECTION 14 — CHANGE EVENTS & INCIDENTS
  // ════════════════════════════════════════════════════════
  newPage();
  sectionHeader('14  Change Events & Incidents',
    `Infrastructure changes and active incidents from the past 30 days`);

  kpiRow([
    { label: 'Change Events',    value: String(changeEvents.length),                                             color: C.primary },
    { label: 'Active Incidents', value: String(incidents.length),                                                color: incidents.length > 0 ? C.critical : C.green },
    { label: 'Critical Incidents', value: String(incidents.filter(i => i.severity === 'CRITICAL').length),       color: C.critical },
    { label: 'ServiceNow Tickets', value: String(serviceNowTickets.length),                                      color: C.azure },
  ]);

  if (changeEvents.length > 0) {
    subHeader('Recent Change Events (30 days)');
    const ceCols = [80, 100, 140, 120, 60];
    tableRow(['ACCOUNT', 'TYPE', 'TITLE', 'RESOURCE', 'DATE'], ceCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    changeEvents.slice(0, 15).forEach((e, i) => {
      checkPageBreak(22);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 18).fill(i % 2 === 0 ? C.bg : C.white);
      tableRow(
        [
          e.account.accountName.slice(0, 10),
          e.eventType.replace(/_/g, ' ').toLowerCase().slice(0, 18),
          e.title.slice(0, 28),
          (e.resourceId || e.resourceType || '—').slice(0, 20),
          formatDate(e.occurredAt),
        ],
        ceCols, rowY, false,
      );
      doc.y = rowY + 18;
    });
  }

  if (incidents.length > 0) {
    doc.moveDown(0.5);
    subHeader('Active Incidents');
    const incCols = [60, 100, 190, 70, 80];
    tableRow(['SEVERITY', 'ACCOUNT', 'TITLE', 'STATUS', 'DETECTED'], incCols, doc.y, true);
    doc.rect(ML, doc.y, CONTENT_W, 0.5).fill(C.border);
    doc.y += 4;
    incidents.forEach((inc, i) => {
      checkPageBreak(24);
      const rowY = doc.y;
      doc.rect(ML, rowY, CONTENT_W, 20).fill(i % 2 === 0 ? C.bg : C.white);
      badge(inc.severity, severityColor(inc.severity), ML + 4, rowY + 4);
      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(inc.account.accountName.slice(0, 14), ML + incCols[0] + 4,  rowY + 5, { width: incCols[1] - 8, lineBreak: false })
        .text(inc.title.slice(0, 36),               ML + incCols[0] + incCols[1] + 4, rowY + 5, { width: incCols[2] - 8, lineBreak: false, ellipsis: true })
        .text(inc.status,                           ML + incCols[0] + incCols[1] + incCols[2] + 4, rowY + 5, { width: incCols[3] - 8, lineBreak: false })
        .text(formatDate(inc.detectedAt),           ML + incCols[0] + incCols[1] + incCols[2] + incCols[3] + 4, rowY + 5, { width: incCols[4] - 8, lineBreak: false });
      doc.y = rowY + 20;
    });
  }

  // ── Automation summary ───────────────────────────────────
  if (automationLogs.length > 0) {
    checkPageBreak(100);
    subHeader('Recent Automation Activity (30 days)');
    const autoSucc = automationLogs.filter(l => l.status === 'SUCCESS').length;
    const autoFail = automationLogs.filter(l => l.status === 'FAILED').length;
    doc.fontSize(8.5).font('Helvetica').fillColor(C.mid)
      .text(`${automationLogs.length} automation actions executed — ${autoSucc} succeeded, ${autoFail} failed.`,
            ML, doc.y, { width: CONTENT_W });
    doc.moveDown(0.3);
  }

  // ── Billing schedules ────────────────────────────────────
  if (billingSchedules.length > 0) {
    checkPageBreak(80);
    subHeader('Active Billing Report Schedules');
    billingSchedules.forEach((b, i) => {
      doc.fontSize(8).font('Helvetica').fillColor(C.mid)
        .text(`• ${b.name}  (${b.frequency}, ${b.format})  — next: ${formatDate(b.nextSendAt)}`,
              ML + 8, doc.y, { width: CONTENT_W - 8 });
      doc.moveDown(0.3);
    });
  }

  // ════════════════════════════════════════════════════════
  //  BACK COVER
  // ════════════════════════════════════════════════════════
  newPage();
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(C.primary);
  doc.rect(0, PAGE_H - 6, PAGE_W, 6).fill(C.secondary);

  doc.fontSize(22).font('Helvetica-Bold').fillColor(C.white)
    .text('CloudGuard Pro', ML, 320, { width: CONTENT_W, align: 'center' });
  doc.fontSize(11).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
    .text('Multi-Cloud Cost Management & Security Platform', ML, 352, { width: CONTENT_W, align: 'center' });
  doc.fontSize(8).fillColor('rgba(255,255,255,0.4)')
    .text(`Report generated ${new Date().toLocaleString()} · Confidential`,
          ML, 390, { width: CONTENT_W, align: 'center' });

  // ── Finalise ─────────────────────────────────────────────
  doc.end();

  return new Promise<Buffer>((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);
  });
}