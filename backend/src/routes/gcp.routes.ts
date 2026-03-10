import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.middleware';
import prisma from '../config/database';

const router = express.Router();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum-xx';
const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return '{}'; }
}

function fixGCPKey(creds: any): any {
  if (!creds?.private_key) return creds;
  return { ...creds, private_key: creds.private_key.replace(/\\n/g, '\n') };
}

function getCredentials(encryptedCreds: string): any {
  try { return JSON.parse(decrypt(encryptedCreds)); } catch { return {}; }
}

// NOTE: POST /connect is handled directly in index.ts — do NOT add it here.
// The gcpRouter is mounted AFTER the inline routes so it would conflict.

router.get('/accounts', authenticateToken, async (req: any, res) => {
  try {
    const accounts = await prisma.cloudAccount.findMany({
      where: { userId: req.user.id, provider: 'GCP' },
      select: { id: true, accountName: true, accountId: true, provider: true, region: true, status: true, lastSyncAt: true, createdAt: true },
    });
    return res.json(accounts);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

router.get('/costs/:accountId', authenticateToken, async (req: any, res) => {
  try {
    const account = await prisma.cloudAccount.findFirst({ where: { id: req.params.accountId, userId: req.user.id, provider: 'GCP' } });
    if (!account) return res.status(404).json({ error: 'GCP account not found' });
    const result = await fetchGCPCosts(getCredentials(account.credentials || ''));
    return res.json({ ...result, currency: 'USD', accountId: account.accountId, accountName: account.accountName });
  } catch (e: any) { return res.status(500).json({ error: 'Failed to fetch GCP costs', details: e.message }); }
});

router.get('/resources/:accountId', authenticateToken, async (req: any, res) => {
  try {
    const account = await prisma.cloudAccount.findFirst({ where: { id: req.params.accountId, userId: req.user.id, provider: 'GCP' } });
    if (!account) return res.status(404).json({ error: 'GCP account not found' });
    const resources = await fetchGCPResources(getCredentials(account.credentials || ''));
    return res.json({ resources, fetchedAt: new Date().toISOString() });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

router.get('/security/:accountId', authenticateToken, async (req: any, res) => {
  try {
    const account = await prisma.cloudAccount.findFirst({ where: { id: req.params.accountId, userId: req.user.id, provider: 'GCP' } });
    if (!account) return res.status(404).json({ error: 'GCP account not found' });
    const { score, findings } = await fetchGCPSecurity(getCredentials(account.credentials || ''));
    return res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'GCP', score, findings, scannedAt: new Date().toISOString() });
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

router.get('/projects/:accountId', authenticateToken, async (req: any, res) => {
  try {
    const account = await prisma.cloudAccount.findFirst({ where: { id: req.params.accountId, userId: req.user.id, provider: 'GCP' } });
    if (!account) return res.status(404).json({ error: 'GCP account not found' });
    return res.json([{ id: account.accountId, name: account.accountName }]);
  } catch (e: any) { return res.status(500).json({ error: e.message }); }
});

async function fetchGCPCosts(creds: any) {
  const empty = { currentMonthTotal: 0, lastMonthTotal: 0, forecast: 0, yearTotal: 0, services: [] as any[], monthlyData: [] as any[] };
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const billing = google.cloudbilling({ version: 'v1', auth: authClient });
    const billingInfo = await billing.projects.getBillingInfo({ name: `projects/${creds.project_id}` });
    const billingAccountName = billingInfo.data?.billingAccountName;
    if (!billingAccountName) return empty;
    const now = new Date();
    const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
    const daysInCurMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const accessToken = (await authClient.getAccessToken()).token;
    const costResp = await fetch(`https://cloudbilling.googleapis.com/v1/${billingAccountName}/reports?usage_period_start.year=${y}&usage_period_start.month=${mo+1}&usage_period_start.day=1&usage_period_end.year=${y}&usage_period_end.month=${mo+1}&usage_period_end.day=${d}&group_by=SERVICE`, { headers: { Authorization: `Bearer ${accessToken}` } });
    let currentMonthTotal = 0;
    const serviceMap: Record<string, number> = {};
    if (costResp.ok) {
      const costData: any = await costResp.json();
      for (const item of costData.reports || []) {
        const cost = parseFloat(item.cost?.units || '0') + (item.cost?.nanos || 0) / 1e9;
        const name = item.service?.description || 'Other';
        if (cost > 0.001) { serviceMap[name] = (serviceMap[name] || 0) + cost; currentMonthTotal += cost; }
      }
    }
    const monthlyData: { month: string; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const mDate = new Date(Date.UTC(y, mo - i, 1));
      const mY = mDate.getUTCFullYear(), mM = mDate.getUTCMonth() + 1;
      const endDay = i === 0 ? d : new Date(Date.UTC(mY, mM, 0)).getUTCDate();
      try {
        const mResp = await fetch(`https://cloudbilling.googleapis.com/v1/${billingAccountName}/reports?usage_period_start.year=${mY}&usage_period_start.month=${mM}&usage_period_start.day=1&usage_period_end.year=${mY}&usage_period_end.month=${mM}&usage_period_end.day=${endDay}`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (mResp.ok) { const mData: any = await mResp.json(); let total = 0; for (const item of mData.reports || []) total += parseFloat(item.cost?.units || '0') + (item.cost?.nanos || 0) / 1e9; monthlyData.push({ month: mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), total }); }
      } catch (e: any) { console.warn(`GCP month ${mY}-${mM}:`, e.message); }
      if (i > 0) await new Promise(r => setTimeout(r, 200));
    }
    if (currentMonthTotal === 0 && monthlyData.length > 0) currentMonthTotal = monthlyData[monthlyData.length - 1]?.total || 0;
    const lastMonthTotal = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2]?.total || 0 : 0;
    const forecast = (d > 0 ? currentMonthTotal / d : 0) * daysInCurMonth;
    const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);
    const services = Object.entries(serviceMap).filter(([,c]) => c > 0.001).map(([name, cost]) => ({ name, cost, percentage: currentMonthTotal > 0 ? (cost / currentMonthTotal) * 100 : 0 })).sort((a, b) => b.cost - a.cost);
    return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
  } catch (e: any) { console.warn('GCP cost fetch error:', e.message); return empty; }
}

async function fetchGCPResources(creds: any): Promise<any[]> {
  const resources: any[] = [];
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const compute = google.compute({ version: 'v1', auth: authClient });
    const projectId = creds.project_id;
    try { const agg = await compute.instances.aggregatedList({ project: projectId }); for (const [zone, zd] of Object.entries(agg.data?.items || {}) as any[]) for (const i of zd.instances || []) resources.push({ id: String(i.id), name: i.name, type: 'Compute Instance', state: i.status, region: zone.replace('zones/', ''), machineType: i.machineType?.split('/').pop() || '' }); } catch (e: any) { console.warn('GCP instances:', e.message); }
    try { const agg = await compute.disks.aggregatedList({ project: projectId }); for (const [zone, zd] of Object.entries(agg.data?.items || {}) as any[]) for (const disk of (zd as any).disks || []) resources.push({ id: String(disk.id), name: disk.name, type: 'Disk', state: disk.status, region: zone.replace('zones/', ''), sizeGb: disk.sizeGb }); } catch (e: any) { console.warn('GCP disks:', e.message); }
    try { const storage = google.storage({ version: 'v1', auth: authClient }); const buckets = await storage.buckets.list({ project: projectId }); for (const b of buckets.data?.items || []) resources.push({ id: b.id, name: b.name, type: 'Cloud Storage Bucket', state: 'Active', region: b.location || 'global' }); } catch (e: any) { console.warn('GCP buckets:', e.message); }
  } catch (e: any) { console.warn('GCP resources error:', e.message); }
  return resources;
}

async function fetchGCPSecurity(creds: any): Promise<{ score: number; findings: any[] }> {
  const findings: any[] = [];
  let score = 100;
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const sc = google.securitycenter({ version: 'v1', auth: authClient });
    const response = await sc.projects.sources.findings.list({ parent: `projects/${creds.project_id}/sources/-`, filter: 'state="ACTIVE"', pageSize: 50 });
    for (const result of response.data?.listFindingsResults || []) {
      const f = result.finding; if (!f) continue;
      const severity = (f.severity || 'MEDIUM').toUpperCase();
      findings.push({ severity, title: f.category || 'Security Finding', description: f.description || '', resource: f.resourceName || '', remediation: 'Review in Google Security Command Center' });
      if (severity === 'CRITICAL') score -= 15; else if (severity === 'HIGH') score -= 8; else if (severity === 'MEDIUM') score -= 3; else if (severity === 'LOW') score -= 1;
    }
  } catch (e: any) { console.warn('GCP security error:', e.message); }
  return { score: Math.max(0, score), findings };
}

export default router;