process.env.OPENSSL_CONF = '/dev/null';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import reportsRouter from './routes/reports.routes';
import gcpRouter from './routes/gcp.routes';
import apiRouter from './routes/index';
import cron from 'node-cron';
import { checkNukeSchedules } from './services/nuke.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ── Encryption ────────────────────────────────────────────────────────────────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum-xx';
const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  try {
    const [ivHex, encryptedHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
  } catch (e) { return '{}'; }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function getDateRanges() {
  const now = new Date();
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
  return {
    currentMonthStart:  fmtDate(new Date(Date.UTC(y, mo, 1))),
    currentMonthEnd:    fmtDate(new Date(Date.UTC(y, mo, d + 1))),
    lastMonthStart:     fmtDate(new Date(Date.UTC(y, mo - 1, 1))),
    lastMonthEnd:       fmtDate(new Date(Date.UTC(y, mo, 1))),
    currentDay: d, daysInCurrentMonth: new Date(Date.UTC(y, mo + 1, 0)).getUTCDate(), y, mo, d,
  };
}

// ── Interfaces ────────────────────────────────────────────────────────────────
interface StoredAccount {
  id: string; accountName: string; accountId: string;
  provider: 'AWS' | 'AZURE' | 'GCP'; region?: string;
  status: string; createdAt: string; isDemo?: boolean; encryptedCreds: string;
}
interface AzureNukeJob {
  id: string; accountId: string; scheduledAt: string;
  status: 'scheduled' | 'running' | 'completed' | 'dry_run_complete';
  dryRun: boolean; resources: AzureNukeResource[];
  lastRunAt?: string; lastRunResult?: string;
}
interface AzureNukeResource {
  id: string; name: string; type: string; resourceGroup: string;
  region: string; risk: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string; estimatedSavings: number;
}

// ── In-memory store ───────────────────────────────────────────────────────────
let connectedAccounts: StoredAccount[] = [];
const azureNukeJobs: Record<string, AzureNukeJob> = {};

// ── Helpers ───────────────────────────────────────────────────────────────────
function getNextFriday6pm(): Date {
  const now = new Date();
  const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilFriday, 18, 0, 0));
}

async function collectAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  try { for await (const item of iter) items.push(item); }
  catch (e: any) { console.warn('collectAsync warn:', e.message); }
  return items;
}

function getCredentials(account: StoredAccount): any {
  try { return JSON.parse(decrypt(account.encryptedCreds)); } catch (e) { return {}; }
}

function fixGCPKey(creds: any): any {
  if (!creds?.private_key) return creds;
  return { ...creds, private_key: creds.private_key.replace(/\\n/g, '\n') };
}

// ── Prisma (lazy, graceful fallback) ─────────────────────────────────────────
let prisma: any = null;

async function saveAccountToDB(account: StoredAccount) {
  if (!prisma) return;
  try {
    await prisma.user.upsert({
      where:  { id: 'default-user' },
      update: {},
      create: { id: 'default-user', email: 'system@cloudguard.local', password: 'not-used', name: 'System User', emailVerified: true },
    });
    await prisma.cloudAccount.upsert({
      where:  { userId_provider_accountId: { userId: 'default-user', provider: account.provider, accountId: account.accountId } },
      update: { accountName: account.accountName, region: account.region, credentials: account.encryptedCreds, status: 'ACTIVE', lastSyncAt: new Date() },
      create: { id: account.id, userId: 'default-user', provider: account.provider, accountName: account.accountName, accountId: account.accountId, region: account.region, credentials: account.encryptedCreds, status: 'ACTIVE' },
    });
    console.log(`✅ Account saved to DB: ${account.accountName} (${account.provider})`);
  } catch (e: any) { console.error('❌ DB save failed:', e.message); }
}

async function initDB() {
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.user.upsert({
      where:  { id: 'default-user' },
      update: {},
      create: { id: 'default-user', email: 'system@cloudguard.local', password: 'not-used', name: 'System User', emailVerified: true },
    });
    const dbAccounts = await prisma.cloudAccount.findMany({ where: { userId: 'default-user' } });
    for (const acc of dbAccounts) {
      if (!connectedAccounts.find(a => a.id === acc.id)) {
        connectedAccounts.push({
          id: acc.id, accountName: acc.accountName, accountId: acc.accountId,
          provider: acc.provider as 'AWS' | 'AZURE' | 'GCP',
          region: acc.region || undefined, status: 'Active',
          createdAt: acc.createdAt.toISOString(), isDemo: false,
          encryptedCreds: acc.credentials || '',
        });
      }
    }
    console.log(`✅ DB connected. Loaded ${connectedAccounts.length} accounts.`);
  } catch (e: any) {
    console.warn('⚠️  No DB, using in-memory only:', e.message);
    prisma = null;
  }
}

// ── Express setup ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://cloudguard-pro.vercel.app',
    process.env.FRONTEND_URL,
  ].filter(Boolean),
  credentials: true,
}));

// ============================================
// HEALTH
// ============================================
app.get('/api/health',                  (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' }));
app.get('/api/health/status',           (_req, res) => res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() }));
app.get('/api/health/version-updates',  (_req, res) => res.json({ currentVersion: '1.0.0', latestVersion: '1.0.0', updateAvailable: false }));

// ============================================
// CHATBOT — inline, no OpenAI import at top level
// ============================================
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'messages array is required' });

    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey    = process.env.OPENAI_API_KEY;

    if (anthropicKey) {
      // Use Anthropic Claude
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1000,
          system: system || 'You are a helpful cloud cost management assistant.',
          messages,
        }),
      });
      const data: any = await response.json();
      return res.json({ content: data.content?.[0]?.text || '' });

    } else if (openaiKey) {
      // Fallback to OpenAI
      const { default: OpenAI } = require('openai');
      const openai = new OpenAI({ apiKey: openaiKey });
      const response = await openai.chat.completions.create({
        model: 'gpt-4o', max_tokens: 1000,
        messages: [
          { role: 'system', content: system || 'You are a helpful cloud cost management assistant.' },
          ...messages,
        ],
      });
      return res.json({ content: response.choices[0]?.message?.content || '' });

    } else {
      return res.status(500).json({ error: 'No AI API key configured (ANTHROPIC_API_KEY or OPENAI_API_KEY)' });
    }
  } catch (error: any) {
    console.error('[ChatBot] error:', error?.message || error);
    res.status(500).json({ error: error?.message || 'Failed to call AI API' });
  }
});

// ============================================
// ACCOUNTS
// ============================================
app.get('/api/cloud/accounts', (_req, res) =>
  res.json(connectedAccounts.map(({ encryptedCreds, ...acc }) => acc))
);

app.get('/api/cloud/accounts/:accountId', (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const { encryptedCreds, ...safe } = account;
  res.json(safe);
});

// ============================================
// DELETE ACCOUNT
// ============================================
app.delete('/api/cloud/accounts/:accountId', async (req, res) => {
  const { accountId } = req.params;
  const account = connectedAccounts.find(a => a.id === accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  // Remove from in-memory store
  connectedAccounts = connectedAccounts.filter(a => a.id !== accountId);

  // Remove from DB if available
  if (prisma) {
    try {
      await prisma.cloudAccount.delete({ where: { id: accountId } });
      console.log(`✅ Account deleted from DB: ${account.accountName}`);
    } catch (e: any) {
      console.warn('⚠️  DB delete failed (may not exist):', e.message);
    }
  }

  console.log(`🗑️  Account removed: ${account.accountName} (${account.provider})`);
  res.json({ message: `Account "${account.accountName}" deleted successfully` });
});

// ============================================
// CONNECT AWS
// ============================================
app.post('/api/cloud/accounts/aws/connect', async (req, res) => {
  const { accountName, accessKeyId, secretAccessKey, region } = req.body;
  if (!accountName || !accessKeyId || !secretAccessKey || !region)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
    const identity = await new STSClient({ region, credentials: { accessKeyId, secretAccessKey } }).send(new GetCallerIdentityCommand({}));
    connectedAccounts = connectedAccounts.filter(a => !(a.provider === 'AWS' && a.accountId === identity.Account));
    const newAccount: StoredAccount = {
      id: `aws-${Date.now()}`, accountName, accountId: identity.Account, provider: 'AWS',
      region, status: 'Active', createdAt: new Date().toISOString(), isDemo: false,
      encryptedCreds: encrypt(JSON.stringify({ accessKeyId, secretAccessKey, region })),
    };
    connectedAccounts.push(newAccount);
    await saveAccountToDB(newAccount);
    console.log('✅ AWS Connected:', identity.Account);
    const { encryptedCreds, ...safe } = newAccount;
    res.status(201).json({ message: 'AWS account connected successfully', account: safe });
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid AWS credentials', details: error.message });
  }
});

// ============================================
// CONNECT AZURE
// ============================================
app.post('/api/cloud/accounts/azure/connect', async (req, res) => {
  const { accountName, tenantId, clientId, clientSecret, subscriptionId } = req.body;
  if (!accountName || !tenantId || !clientId || !clientSecret || !subscriptionId)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');
    if (!token?.token) throw new Error('Failed to acquire token');
    connectedAccounts = connectedAccounts.filter(a => !(a.provider === 'AZURE' && a.accountId === subscriptionId));
    const newAccount: StoredAccount = {
      id: `azure-${Date.now()}`, accountName, accountId: subscriptionId, provider: 'AZURE',
      status: 'Active', createdAt: new Date().toISOString(), isDemo: false,
      encryptedCreds: encrypt(JSON.stringify({ tenantId, clientId, clientSecret, subscriptionId })),
    };
    connectedAccounts.push(newAccount);
    await saveAccountToDB(newAccount);
    const { encryptedCreds, ...safe } = newAccount;
    res.status(201).json({ message: 'Azure account connected successfully', account: safe });
  } catch (error: any) {
    res.status(400).json({ error: 'Invalid Azure credentials', details: error.message });
  }
});

// ============================================
// CONNECT GCP
// ============================================
async function handleGCPConnect(req: any, res: any) {
  const { accountName, serviceAccountKey } = req.body;
  if (!accountName || !serviceAccountKey)
    return res.status(400).json({ error: 'Missing required fields: accountName, serviceAccountKey' });

  let keyJson: any;
  try {
    keyJson = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
    if (!keyJson.project_id || !keyJson.client_email || !keyJson.private_key)
      throw new Error('Invalid service account key format');
  } catch (e: any) {
    return res.status(400).json({ error: 'Invalid service account JSON', details: e.message });
  }

  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({
      credentials: fixGCPKey(keyJson),
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });
    const authClient = await auth.getClient();
    const tokenResponse = await authClient.getAccessToken();
    if (!tokenResponse.token) throw new Error('Failed to obtain access token from Google');

    const projectId = keyJson.project_id;
    connectedAccounts = connectedAccounts.filter(a => !(a.provider === 'GCP' && a.accountId === projectId));
    const newAccount: StoredAccount = {
      id: `gcp-${Date.now()}`, accountName, accountId: projectId, provider: 'GCP',
      region: 'global', status: 'Active', createdAt: new Date().toISOString(), isDemo: false,
      encryptedCreds: encrypt(JSON.stringify(keyJson)),
    };
    connectedAccounts.push(newAccount);
    await saveAccountToDB(newAccount);
    console.log('✅ GCP Connected:', projectId);
    const { encryptedCreds, ...safe } = newAccount;
    res.status(201).json({ message: 'GCP account connected successfully', account: safe });
  } catch (error: any) {
    console.error('❌ GCP connect error:', error.message);
    res.status(400).json({ error: 'Invalid GCP credentials or project access denied', details: error.message });
  }
}

app.post('/api/cloud/accounts/gcp/connect', handleGCPConnect);
app.post('/api/gcp/connect',                handleGCPConnect);

// ============================================
// GCP COST FETCHER
// ============================================
async function fetchGCPCosts(creds: any): Promise<{
  currentMonthTotal: number; lastMonthTotal: number; forecast: number;
  yearTotal: number; services: { name: string; cost: number; percentage: number }[];
  monthlyData: { month: string; total: number }[];
}> {
  const empty = { currentMonthTotal: 0, lastMonthTotal: 0, forecast: 0, yearTotal: 0, services: [], monthlyData: [] };
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const billing = google.cloudbilling({ version: 'v1', auth: authClient });
    const billingInfo = await billing.projects.getBillingInfo({ name: `projects/${creds.project_id}` });
    const billingAccountName = billingInfo.data?.billingAccountName;
    if (!billingAccountName) { console.warn('⚠️  GCP: No billing account linked to project'); return empty; }

    const now = new Date();
    const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
    const daysInCurMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    const token = (await authClient.getAccessToken()).token;

    const costResp = await fetch(
      `https://cloudbilling.googleapis.com/v1/${billingAccountName}/reports?usage_period_start.year=${y}&usage_period_start.month=${mo + 1}&usage_period_start.day=1&usage_period_end.year=${y}&usage_period_end.month=${mo + 1}&usage_period_end.day=${d}&group_by=SERVICE`,
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );

    let currentMonthTotal = 0;
    const serviceMap: Record<string, number> = {};
    if (costResp.ok) {
      const costData: any = await costResp.json();
      for (const item of (costData.reports || [])) {
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
        const mResp = await fetch(
          `https://cloudbilling.googleapis.com/v1/${billingAccountName}/reports?usage_period_start.year=${mY}&usage_period_start.month=${mM}&usage_period_start.day=1&usage_period_end.year=${mY}&usage_period_end.month=${mM}&usage_period_end.day=${endDay}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (mResp.ok) {
          const mData: any = await mResp.json();
          let total = 0;
          for (const item of (mData.reports || []))
            total += parseFloat(item.cost?.units || '0') + (item.cost?.nanos || 0) / 1e9;
          monthlyData.push({ month: mDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), total });
        }
      } catch (e: any) { console.warn(`   ⚠️  GCP month ${mY}-${mM} failed: ${e.message}`); }
      if (i > 0) await new Promise(r => setTimeout(r, 200));
    }

    if (currentMonthTotal === 0 && monthlyData.length > 0)
      currentMonthTotal = monthlyData[monthlyData.length - 1]?.total || 0;
    const lastMonthTotal = monthlyData.length >= 2 ? monthlyData[monthlyData.length - 2]?.total || 0 : 0;
    const forecast = (d > 0 ? currentMonthTotal / d : 0) * daysInCurMonth;
    const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);
    const services = Object.entries(serviceMap)
      .filter(([_, c]) => c > 0.001)
      .map(([name, cost]) => ({ name, cost, percentage: currentMonthTotal > 0 ? (cost / currentMonthTotal) * 100 : 0 }))
      .sort((a, b) => b.cost - a.cost);

    return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
  } catch (e: any) { console.warn('⚠️  GCP cost fetch error:', e.message); return empty; }
}

// ============================================
// GCP RESOURCES FETCHER
// ============================================
async function fetchGCPResources(creds: any): Promise<any[]> {
  const resources: any[] = [];
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const compute = google.compute({ version: 'v1', auth: authClient });
    const projectId = creds.project_id;

    try {
      const agg = await compute.instances.aggregatedList({ project: projectId });
      for (const [zone, zd] of Object.entries(agg.data?.items || {}) as any[])
        for (const i of (zd.instances || []))
          resources.push({ id: String(i.id), name: i.name, type: 'Compute Instance', state: i.status, region: zone.replace('zones/', ''), machineType: i.machineType?.split('/').pop() || '' });
    } catch (e: any) { console.warn('   ⚠️  GCP instances error:', e.message); }

    try {
      const agg = await compute.disks.aggregatedList({ project: projectId });
      for (const [zone, zd] of Object.entries(agg.data?.items || {}) as any[])
        for (const disk of ((zd as any).disks || []))
          resources.push({ id: String(disk.id), name: disk.name, type: 'Disk', state: disk.status, region: zone.replace('zones/', ''), sizeGb: disk.sizeGb });
    } catch (e: any) { console.warn('   ⚠️  GCP disks error:', e.message); }

    try {
      const storage = google.storage({ version: 'v1', auth: authClient });
      const buckets = await storage.buckets.list({ project: projectId });
      for (const b of (buckets.data?.items || []))
        resources.push({ id: b.id, name: b.name, type: 'Cloud Storage Bucket', state: 'Active', region: b.location || 'global' });
    } catch (e: any) { console.warn('   ⚠️  GCP buckets error:', e.message); }

  } catch (e: any) { console.warn('⚠️  GCP resources fetch error:', e.message); }
  return resources;
}

// ============================================
// GCP SECURITY FETCHER
// ============================================
async function fetchGCPSecurity(creds: any): Promise<{ score: number; findings: any[] }> {
  const findings: any[] = [];
  let score = 100;
  try {
    const { google } = require('googleapis');
    const auth = new google.auth.GoogleAuth({ credentials: fixGCPKey(creds), scopes: ['https://www.googleapis.com/auth/cloud-platform'] });
    const authClient = await auth.getClient();
    const securitycenter = google.securitycenter({ version: 'v1', auth: authClient });
    const response = await securitycenter.projects.sources.findings.list({
      parent: `projects/${creds.project_id}/sources/-`, filter: 'state="ACTIVE"', pageSize: 50,
    });
    for (const finding of (response.data?.listFindingsResults || [])) {
      const f = finding.finding;
      if (!f) continue;
      const severity = (f.severity || 'MEDIUM').toUpperCase();
      findings.push({ severity, title: f.category || 'Security Finding', description: f.description || '', resource: f.resourceName || '', remediation: 'Review in Google Security Command Center' });
      if      (severity === 'CRITICAL') score -= 15;
      else if (severity === 'HIGH')     score -= 8;
      else if (severity === 'MEDIUM')   score -= 3;
      else if (severity === 'LOW')      score -= 1;
    }
  } catch (e: any) { console.warn('⚠️  GCP security fetch error:', e.message); }
  return { score: Math.max(0, score), findings };
}

// ============================================
// GCP ENDPOINTS
// ============================================
app.get('/api/gcp/costs/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'GCP');
  if (!account) return res.status(404).json({ error: 'GCP account not found' });
  try {
    const r = await fetchGCPCosts(getCredentials(account));
    res.json({ ...r, currency: 'USD', accountId: account.accountId, accountName: account.accountName });
  } catch (e: any) { res.status(500).json({ error: 'Failed to fetch GCP costs', details: e.message }); }
});

app.get('/api/gcp/resources/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'GCP');
  if (!account) return res.status(404).json({ error: 'GCP account not found' });
  const resources = await fetchGCPResources(getCredentials(account));
  res.json({ resources, fetchedAt: new Date().toISOString() });
});

app.get('/api/gcp/security/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'GCP');
  if (!account) return res.status(404).json({ error: 'GCP account not found' });
  const { score, findings } = await fetchGCPSecurity(getCredentials(account));
  res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'GCP', score, findings, scannedAt: new Date().toISOString() });
});

// ============================================
// AWS COST FETCHER
// ============================================
async function fetchAWSCosts(creds: { accessKeyId: string; secretAccessKey: string }) {
  const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
  const ce = new CostExplorerClient({ region: 'us-east-1', credentials: creds });
  const dates = getDateRanges();

  const [currentMonthData, lastMonthData] = await Promise.all([
    ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: dates.currentMonthStart, End: dates.currentMonthEnd }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] })),
    ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: dates.lastMonthStart, End: dates.lastMonthEnd }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] })),
  ]);

  const currentMonthResult = currentMonthData.ResultsByTime?.[0];
  const lastMonthResult    = lastMonthData.ResultsByTime?.[0];
  const currentMonthTotal  = (currentMonthResult?.Groups || []).reduce((s: number, g: any) => s + parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'), 0);
  const lastMonthTotal     = (lastMonthResult?.Groups || []).reduce((s: number, g: any) => s + parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'), 0);

  const services = (currentMonthResult?.Groups || [])
    .map((g: any) => ({ name: g.Keys?.[0] || 'Unknown', cost: parseFloat(g.Metrics?.UnblendedCost?.Amount || '0'), percentage: 0 }))
    .filter((s: any) => s.cost > 0.001);
  services.forEach((s: any) => { s.percentage = currentMonthTotal > 0 ? (s.cost / currentMonthTotal) * 100 : 0; });
  services.sort((a: any, b: any) => b.cost - a.cost);

  const forecast = (dates.currentDay > 0 ? currentMonthTotal / dates.currentDay : 0) * dates.daysInCurrentMonth;

  const monthlyData: any[] = [];
  for (let i = 11; i >= 0; i--) {
    const mStart = new Date(Date.UTC(dates.y, dates.mo - i, 1));
    const mEnd   = new Date(Date.UTC(dates.y, dates.mo - i + 1, 1));
    const capEnd = new Date(Date.UTC(dates.y, dates.mo, dates.d + 1));
    const useEnd = mEnd > capEnd ? capEnd : mEnd;
    if (mStart >= capEnd) continue;
    try {
      const mData = await ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmtDate(mStart), End: fmtDate(useEnd) }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'] }));
      const total = parseFloat(mData.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || '0');
      monthlyData.push({ month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), total });
    } catch (e: any) { console.warn(`   ⚠️  Skipped AWS month ${fmtDate(mStart)}:`, e.message); }
  }

  const yearTotal = monthlyData.reduce((s: number, m: any) => s + m.total, 0);
  return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
}

// ============================================
// AZURE COST FETCHER
// ============================================
const azureCostCache     = new Map<string, { data: any; fetchedAt: number }>();
const azureFetchInFlight = new Map<string, Promise<any>>();

async function azureQueryWithRetry(client: any, scope: string, body: any, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try { return await client.query.usage(scope, body); }
    catch (e: any) {
      const isRateLimit = e.message?.includes('Too many requests') || e.statusCode === 429 || e.code === 'TooManyRequests';
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = (attempt + 1) * 4000;
        console.log(`   ⏳ Azure rate limited — retrying in ${delay / 1000}s`);
        await new Promise(r => setTimeout(r, delay));
      } else { throw e; }
    }
  }
}

async function fetchAzureCosts(creds: any) {
  const subId = creds.subscriptionId;
  const cached = azureCostCache.get(subId);
  if (cached && Date.now() - cached.fetchedAt < 5 * 60 * 1000) return cached.data;
  if (azureFetchInFlight.has(subId)) return azureFetchInFlight.get(subId);
  const fetchPromise = _doFetchAzureCosts(creds);
  azureFetchInFlight.set(subId, fetchPromise);
  try {
    const result = await fetchPromise;
    azureCostCache.set(subId, { data: result, fetchedAt: Date.now() });
    return result;
  } finally { azureFetchInFlight.delete(subId); }
}

async function _doFetchAzureCosts(creds: any) {
  const { ClientSecretCredential } = require('@azure/identity');
  const { CostManagementClient }   = require('@azure/arm-costmanagement');
  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const client     = new CostManagementClient(credential);
  const scope      = `/subscriptions/${creds.subscriptionId}`;
  const dates      = getDateRanges();
  const trendEnd   = fmtDate(new Date(Date.UTC(dates.y, dates.mo, 0)));
  const trendStart = fmtDate(new Date(Date.UTC(dates.y, dates.mo - 11, 1)));

  const curResult = await azureQueryWithRetry(client, scope, {
    type: 'ActualCost', timeframe: 'Custom',
    timePeriod: { from: new Date(dates.currentMonthStart), to: new Date(dates.currentMonthEnd) },
    dataset: { granularity: 'None', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } }, grouping: [{ type: 'Dimension', name: 'ServiceName' }] },
  });

  const services: { name: string; cost: number; percentage: number }[] = [];
  let currentMonthTotal = 0;
  for (const row of (curResult.rows || [])) {
    const cost = parseFloat(String(row[0])) || 0;
    const name = String(row[1] || 'Other');
    if (cost > 0.001) { services.push({ name, cost, percentage: 0 }); currentMonthTotal += cost; }
  }
  services.sort((a, b) => b.cost - a.cost);
  services.forEach(s => { s.percentage = currentMonthTotal > 0 ? (s.cost / currentMonthTotal) * 100 : 0; });

  await new Promise(r => setTimeout(r, 500));

  const monthlyData: { month: string; total: number }[] = [];
  try {
    const trendResult = await azureQueryWithRetry(client, scope, {
      type: 'ActualCost', timeframe: 'Custom',
      timePeriod: { from: new Date(trendStart), to: new Date(trendEnd) },
      dataset: { granularity: 'Monthly', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } } },
    });
    for (const row of (trendResult.rows || [])) {
      const cost = parseFloat(String(row[0])) || 0;
      let monthLabel = 'Unknown';
      for (let col = 1; col < row.length; col++) {
        const val = String(row[col]);
        if (/^\d{8}$/.test(val)) { monthLabel = new Date(Date.UTC(parseInt(val.slice(0, 4)), parseInt(val.slice(4, 6)) - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); break; }
        if (val.includes('-') && val.length >= 10) { monthLabel = new Date(val).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); break; }
      }
      if (monthLabel !== 'Unknown') monthlyData.push({ month: monthLabel, total: cost });
    }
  } catch (e: any) { console.warn(`   ⚠️  Trend call failed: ${e.message}`); }

  await new Promise(r => setTimeout(r, 500));

  let lastMonthTotal = 0;
  try {
    const lastResult = await azureQueryWithRetry(client, scope, {
      type: 'ActualCost', timeframe: 'Custom',
      timePeriod: { from: new Date(Date.UTC(dates.y, dates.mo - 1, 1)), to: new Date(Date.UTC(dates.y, dates.mo, 1)) },
      dataset: { granularity: 'None', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } } },
    });
    for (const row of (lastResult.rows || [])) lastMonthTotal += parseFloat(String(row[0])) || 0;
  } catch (e: any) {
    const lbl = new Date(Date.UTC(dates.y, dates.mo - 1, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    lastMonthTotal = monthlyData.find(m => m.month === lbl)?.total || 0;
  }

  const curMonthLabel = new Date(Date.UTC(dates.y, dates.mo, 1)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (!monthlyData.find(m => m.month === curMonthLabel)) monthlyData.push({ month: curMonthLabel, total: currentMonthTotal });

  const forecast  = (dates.d > 0 ? currentMonthTotal / dates.d : 0) * dates.daysInCurrentMonth;
  const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);
  return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
}

// ============================================
// AZURE RESOURCES
// ============================================
async function fetchAzureResources(creds: any): Promise<any[]> {
  const resources: any[] = [];
  try {
    const { ClientSecretCredential }     = require('@azure/identity');
    const { ResourceManagementClient }   = require('@azure/arm-resources');
    const { ComputeManagementClient }    = require('@azure/arm-compute');
    const credential     = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);
    const computeClient  = new ComputeManagementClient(credential, creds.subscriptionId);
    const vms = await collectAsync(computeClient.virtualMachines.listAll());
    for (const vm of vms)
      resources.push({ id: vm.id, name: vm.name, type: 'Virtual Machine', state: vm.provisioningState || 'Unknown', region: vm.location, resourceGroup: (vm.id || '').split('/')[4] || '' });
    const allRes = await collectAsync(resourceClient.resources.list());
    for (const r of allRes)
      resources.push({ id: r.id, name: r.name, type: (r.type || '').split('/').pop() || 'Resource', state: 'Active', region: r.location, resourceGroup: (r.id || '').split('/')[4] || '' });
  } catch (e: any) { console.warn('⚠️  Azure resources fetch error:', e.message); }
  return resources;
}

// ============================================
// AZURE SECURITY
// ============================================
async function fetchAzureSecurity(creds: any): Promise<{ score: number; findings: any[] }> {
  const findings: any[] = [];
  let score = 100;
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { SecurityCenter }         = require('@azure/arm-security');
    const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const secClient  = new SecurityCenter(credential, creds.subscriptionId);
    const alerts = await collectAsync(secClient.alerts.list());
    for (const alert of alerts) {
      const severity = (alert.severity || 'MEDIUM').toUpperCase();
      findings.push({ severity, title: alert.alertDisplayName || 'Security Alert', description: alert.description || '', resource: alert.compromisedEntity || '', remediation: alert.remediationSteps?.[0] || 'Review in Azure Security Center' });
      if      (severity === 'CRITICAL') score -= 15;
      else if (severity === 'HIGH')     score -= 8;
      else if (severity === 'MEDIUM')   score -= 3;
    }
  } catch (e: any) { console.warn('⚠️  Azure security fetch error:', e.message); }
  return { score: Math.max(0, score), findings };
}

// ============================================
// AZURE NUKE SCAN
// ============================================
async function scanAzureNukeResources(creds: any): Promise<AzureNukeResource[]> {
  const targets: AzureNukeResource[] = [];
  try {
    const { ClientSecretCredential }   = require('@azure/identity');
    const { ComputeManagementClient }  = require('@azure/arm-compute');
    const { ResourceManagementClient } = require('@azure/arm-resources');
    const credential     = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const computeClient  = new ComputeManagementClient(credential, creds.subscriptionId);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);

    const vms = await collectAsync(computeClient.virtualMachines.listAll());
    for (const vm of vms) {
      try {
        const iv = await computeClient.virtualMachines.instanceView(vm.id!.split('/')[4], vm.name!);
        const ps = (iv.statuses || []).find((s: any) => s.code?.startsWith('PowerState/'))?.code || '';
        if (ps === 'PowerState/deallocated' || ps === 'PowerState/stopped')
          targets.push({ id: vm.id!, name: vm.name!, type: 'Stopped VM', resourceGroup: vm.id!.split('/')[4], region: vm.location!, risk: 'HIGH', reason: `VM is ${ps.replace('PowerState/', '')}`, estimatedSavings: 15 });
      } catch (_) {}
    }

    const disks = await collectAsync(computeClient.disks.list());
    for (const disk of disks)
      if (!disk.managedBy && disk.diskState !== 'Reserved')
        targets.push({ id: disk.id!, name: disk.name!, type: 'Unattached Disk', resourceGroup: disk.id!.split('/')[4], region: disk.location!, risk: 'MEDIUM', reason: `Disk (${disk.diskSizeGB || 0}GB) not attached`, estimatedSavings: Math.round((disk.diskSizeGB || 0) * 0.05) });

    const rgs = await collectAsync(resourceClient.resourceGroups.list());
    for (const rg of rgs) {
      try {
        const items = await collectAsync(resourceClient.resources.listByResourceGroup(rg.name!));
        if (items.length === 0)
          targets.push({ id: rg.id!, name: rg.name!, type: 'Empty Resource Group', resourceGroup: rg.name!, region: rg.location!, risk: 'LOW', reason: 'No resources', estimatedSavings: 0 });
      } catch (_) {}
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snaps = await collectAsync(computeClient.snapshots.list());
    for (const snap of snaps) {
      const created = snap.timeCreated ? new Date(snap.timeCreated) : null;
      if (created && created < thirtyDaysAgo)
        targets.push({ id: snap.id!, name: snap.name!, type: 'Old Snapshot', resourceGroup: snap.id!.split('/')[4], region: snap.location!, risk: 'LOW', reason: `${Math.floor((Date.now() - created.getTime()) / 86400000)} days old`, estimatedSavings: Math.round((snap.diskSizeGB || 0) * 0.03) });
    }
  } catch (e: any) { console.warn('⚠️  Azure nuke scan error:', e.message); }
  return targets;
}

// ============================================
// AZURE ADVISOR / RESOURCE GROUPS / ACTIVITY
// ============================================
async function fetchAzureAdvisor(creds: any): Promise<any[]> {
  const recommendations: any[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');
    const response = await fetch(`https://management.azure.com/subscriptions/${creds.subscriptionId}/providers/Microsoft.Advisor/recommendations?api-version=2023-01-01`, { headers: { Authorization: `Bearer ${token.token}` } });
    if (!response.ok) throw new Error(`Advisor API ${response.status}`);
    const data: any = await response.json();
    for (const rec of (data.value || [])) {
      const props = rec.properties || {};
      recommendations.push({ id: rec.id, category: props.category || 'General', impact: props.impact || 'Medium', title: props.shortDescription?.solution || props.shortDescription?.problem || 'Recommendation', description: props.shortDescription?.problem || '', effort: props.impact === 'High' ? 'LOW' : 'HIGH', estimatedSaving: props.extendedProperties?.savingsAmount ? parseFloat(props.extendedProperties.savingsAmount) : undefined });
    }
  } catch (e: any) { console.warn('⚠️  Azure Advisor error:', e.message); }
  return recommendations;
}

async function fetchAzureResourceGroups(creds: any): Promise<{ name: string; cost: number; resources: number }[]> {
  const groups: { name: string; cost: number; resources: number }[] = [];
  try {
    const { ClientSecretCredential }   = require('@azure/identity');
    const { CostManagementClient }     = require('@azure/arm-costmanagement');
    const { ResourceManagementClient } = require('@azure/arm-resources');
    const credential     = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const costClient     = new CostManagementClient(credential);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);
    const dates = getDateRanges();
    const allRes = await collectAsync(resourceClient.resources.list()).catch(() => [] as any[]);
    const rgCount: Record<string, number> = {};
    const rgNames: Set<string> = new Set();
    for (const r of allRes) {
      const rg = (r.id || '').split('/')[4] || '';
      if (rg) { rgCount[rg.toLowerCase()] = (rgCount[rg.toLowerCase()] || 0) + 1; rgNames.add(rg); }
    }
    try {
      const costResult = await costClient.query.usage(`/subscriptions/${creds.subscriptionId}`, {
        type: 'ActualCost', timeframe: 'Custom',
        timePeriod: { from: new Date(dates.currentMonthStart), to: new Date(dates.currentMonthEnd) },
        dataset: { granularity: 'None', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } }, grouping: [{ type: 'Dimension', name: 'ResourceGroupName' }] },
      });
      for (const row of (costResult.rows || [])) {
        const name = String(row[1] || 'Unknown');
        const cost = parseFloat(String(row[0])) || 0;
        if (name && name !== 'Unknown') groups.push({ name, cost, resources: rgCount[name.toLowerCase()] || 0 });
      }
    } catch (_) {
      for (const rgName of Array.from(rgNames))
        groups.push({ name: rgName, cost: 0, resources: rgCount[rgName.toLowerCase()] || 0 });
    }
    groups.sort((a, b) => b.cost - a.cost || b.resources - a.resources);
  } catch (e: any) { console.warn('⚠️  Azure resource groups error:', e.message); }
  return groups;
}

async function fetchAzureActivity(creds: any): Promise<any[]> {
  const activities: any[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const response = await fetch(
      `https://management.azure.com/subscriptions/${creds.subscriptionId}/providers/microsoft.insights/eventtypes/management/values?api-version=2015-04-01&$filter=${encodeURIComponent(`eventTimestamp ge '${since}'`)}&$select=operationName,resourceGroupName,caller,eventTimestamp,status,resourceType`,
      { headers: { Authorization: `Bearer ${token.token}` } }
    );
    if (!response.ok) throw new Error(`Activity API ${response.status}`);
    const data: any = await response.json();
    for (const event of (data.value || []).slice(0, 50)) {
      if (event.status?.value === 'Started') continue;
      activities.push({ operationName: event.operationName?.localizedValue || 'Operation', resourceGroup: event.resourceGroupName || 'N/A', caller: event.caller || 'System', eventTimestamp: event.eventTimestamp, status: event.status?.value || '' });
    }
  } catch (e: any) { console.warn('⚠️  Azure Activity error:', e.message); }
  return activities;
}

// ============================================
// AZURE NUKE ENDPOINTS
// ============================================
app.get('/api/azure/nuke/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  let job = azureNukeJobs[account.id];
  if (!job) {
    job = { id: `nuke-${account.id}`, accountId: account.id, scheduledAt: getNextFriday6pm().toISOString(), status: 'scheduled', dryRun: true, resources: [] };
    azureNukeJobs[account.id] = job;
  }
  res.json({ ...job, nextScheduled: getNextFriday6pm().toISOString(), totalWaste: job.resources.reduce((s, r) => s + r.estimatedSavings, 0) });
});

app.post('/api/azure/nuke/:accountId/dry-run', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  try {
    const resources = await scanAzureNukeResources(getCredentials(account));
    azureNukeJobs[account.id] = { id: `nuke-${account.id}`, accountId: account.id, scheduledAt: getNextFriday6pm().toISOString(), status: 'dry_run_complete', dryRun: true, resources, lastRunAt: new Date().toISOString(), lastRunResult: `Found ${resources.length} resources.` };
    res.json({ message: `Dry-run complete. Found ${resources.length} resources.`, resources, totalWaste: resources.reduce((s, r) => s + r.estimatedSavings, 0) });
  } catch (error: any) { res.status(500).json({ error: 'Dry-run failed', details: error.message }); }
});

app.post('/api/azure/nuke/:accountId/cancel', (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (azureNukeJobs[account.id]) { azureNukeJobs[account.id].status = 'scheduled'; azureNukeJobs[account.id].resources = []; }
  res.json({ message: 'Nuke job cancelled', nextScheduled: getNextFriday6pm().toISOString() });
});

app.get('/api/azure/advisor/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  res.json({ recommendations: await fetchAzureAdvisor(getCredentials(account)), fetchedAt: new Date().toISOString() });
});

app.get('/api/azure/resource-groups/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  res.json({ groups: await fetchAzureResourceGroups(getCredentials(account)), fetchedAt: new Date().toISOString() });
});

app.get('/api/azure/activity/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  res.json({ activities: await fetchAzureActivity(getCredentials(account)), fetchedAt: new Date().toISOString() });
});

// ============================================
// COSTS
// ============================================
app.get('/api/cloud/accounts/:accountId/costs', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  try {
    let r: any;
    if      (account.provider === 'AWS')   r = await fetchAWSCosts(getCredentials(account));
    else if (account.provider === 'AZURE') r = await fetchAzureCosts(getCredentials(account));
    else if (account.provider === 'GCP')   r = await fetchGCPCosts(getCredentials(account));
    else return res.json({ currentMonth: 0, lastMonth: 0, forecast: 0, yearTotal: 0, monthlyData: [], services: [], currency: 'USD' });
    res.json({ currentMonth: r.currentMonthTotal, lastMonth: r.lastMonthTotal, forecast: r.forecast, yearTotal: r.yearTotal, monthlyData: r.monthlyData, services: r.services, currency: 'USD', accountId: account.accountId, accountName: account.accountName });
  } catch (e: any) { res.status(500).json({ error: 'Failed to fetch costs', details: e.message }); }
});

// ============================================
// RESOURCES
// ============================================
app.get('/api/cloud/accounts/:accountId/resources', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.provider === 'AWS') {
    try {
      const creds = getCredentials(account);
      const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
      const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
      const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
      const [ec2Data, rdsData, s3Data] = await Promise.all([
        new EC2Client({ region: account.region, credentials: creds }).send(new DescribeInstancesCommand({})),
        new RDSClient({ region: account.region, credentials: creds }).send(new DescribeDBInstancesCommand({})),
        new S3Client({ region: account.region, credentials: creds }).send(new ListBucketsCommand({})),
      ]);
      const resources: any[] = [];
      ec2Data.Reservations?.forEach((r: any) => r.Instances?.forEach((i: any) => resources.push({ id: i.InstanceId, name: i.Tags?.find((t: any) => t.Key === 'Name')?.Value || i.InstanceId, type: 'EC2', state: i.State?.Name, region: account.region })));
      rdsData.DBInstances?.forEach((db: any) => resources.push({ id: db.DBInstanceIdentifier, name: db.DBInstanceIdentifier, type: 'RDS', state: db.DBInstanceStatus, region: account.region }));
      s3Data.Buckets?.forEach((b: any) => resources.push({ id: b.Name, name: b.Name, type: 'S3', state: 'Active', region: 'global' }));
      res.json({ resources });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch resources', details: e.message }); }
  } else if (account.provider === 'AZURE') {
    res.json({ resources: await fetchAzureResources(getCredentials(account)) });
  } else if (account.provider === 'GCP') {
    res.json({ resources: await fetchGCPResources(getCredentials(account)) });
  } else {
    res.json({ resources: [] });
  }
});

// ============================================
// SECURITY
// ============================================
app.get('/api/cloud/accounts/:accountId/security', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.provider === 'AWS') {
    try {
      const creds = getCredentials(account);
      const { IAMClient, GenerateCredentialReportCommand, GetCredentialReportCommand } = require('@aws-sdk/client-iam');
      const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
      const findings: any[] = [];
      let score = 100;
      try {
        await iam.send(new GenerateCredentialReportCommand({}));
        await new Promise(r => setTimeout(r, 3000));
        const report = await iam.send(new GetCredentialReportCommand({}));
        if (report.Content) {
          Buffer.from(report.Content).toString('utf-8').split('\n').slice(1).forEach((line: string) => {
            const f = line.split(',');
            if (f.length < 15) return;
            if (f[3] === 'true' && f[7] !== 'true' && f[0] !== '<root_account>') {
              findings.push({ severity: 'HIGH', title: `IAM User without MFA: ${f[0]}`, description: 'Console access without MFA', resource: `arn:aws:iam::${account.accountId}:user/${f[0]}`, remediation: 'Enable MFA', compliance: ['CIS AWS', 'PCI-DSS'] });
              score -= 5;
            }
          });
        }
      } catch (e) {}
      findings.push({ severity: 'CRITICAL', title: 'Verify Root MFA', description: 'Ensure root has MFA enabled', resource: `arn:aws:iam::${account.accountId}:root`, remediation: 'Enable MFA on root', compliance: ['CIS AWS'] });
      score -= 10;
      res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'AWS', score: Math.max(0, score), findings, scannedAt: new Date().toISOString() });
    } catch (e: any) { res.status(500).json({ error: 'Security scan failed', details: e.message }); }
  } else if (account.provider === 'AZURE') {
    const { score, findings } = await fetchAzureSecurity(getCredentials(account));
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'AZURE', score, findings, scannedAt: new Date().toISOString() });
  } else if (account.provider === 'GCP') {
    const { score, findings } = await fetchGCPSecurity(getCredentials(account));
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'GCP', score, findings, scannedAt: new Date().toISOString() });
  } else {
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: account.provider, score: 75, findings: [], scannedAt: new Date().toISOString() });
  }
});

// ============================================
// DASHBOARD
// ============================================
app.get('/api/cloud/dashboard/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  if (account.provider === 'AWS') {
    try {
      const creds = getCredentials(account);
      const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');
      const { RDSClient, DescribeDBInstancesCommand } = require('@aws-sdk/client-rds');
      const { S3Client, ListBucketsCommand } = require('@aws-sdk/client-s3');
      const [costResult, ec2, rds, s3] = await Promise.all([
        fetchAWSCosts(creds),
        new EC2Client({ region: account.region, credentials: creds }).send(new DescribeInstancesCommand({})).catch(() => ({ Reservations: [] })),
        new RDSClient({ region: account.region, credentials: creds }).send(new DescribeDBInstancesCommand({})).catch(() => ({ DBInstances: [] })),
        new S3Client({ region: account.region, credentials: creds }).send(new ListBucketsCommand({})).catch(() => ({ Buckets: [] })),
      ]);
      let resourceCount = 0;
      (ec2 as any).Reservations?.forEach((r: any) => resourceCount += r.Instances?.length || 0);
      resourceCount += (rds as any).DBInstances?.length || 0;
      resourceCount += (s3 as any).Buckets?.length || 0;
      let securityScore = 100;
      try {
        const { IAMClient, GenerateCredentialReportCommand, GetCredentialReportCommand } = require('@aws-sdk/client-iam');
        const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
        await iam.send(new GenerateCredentialReportCommand({}));
        await new Promise(r => setTimeout(r, 2000));
        const report = await iam.send(new GetCredentialReportCommand({}));
        if (report.Content) Buffer.from(report.Content).toString('utf-8').split('\n').slice(1).forEach((line: string) => { const f = line.split(','); if (f.length >= 15 && f[3] === 'true' && f[7] !== 'true') securityScore -= 5; });
        securityScore -= 10;
      } catch (e) {}
      res.json({ accountId: account.accountId, accountName: account.accountName, provider: account.provider, region: account.region, status: 'Active', totalCost: costResult.currentMonthTotal, lastMonthCost: costResult.lastMonthTotal, yearTotal: costResult.yearTotal, forecast: costResult.forecast, resourceCount, securityScore: Math.max(0, securityScore), topServices: costResult.services.slice(0, 5), monthlyData: costResult.monthlyData });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch dashboard', details: e.message }); }

  } else if (account.provider === 'AZURE') {
    const creds = getCredentials(account);
    const [costResult, resources, security] = await Promise.all([
      fetchAzureCosts(creds).catch(() => ({ currentMonthTotal: 0, lastMonthTotal: 0, forecast: 0, yearTotal: 0, services: [], monthlyData: [] })),
      fetchAzureResources(creds).catch(() => [] as any[]),
      fetchAzureSecurity(creds).catch(() => ({ score: 0, findings: [] })),
    ]);
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'AZURE', region: 'Azure Global', status: 'Active', totalCost: costResult.currentMonthTotal, lastMonthCost: costResult.lastMonthTotal, yearTotal: costResult.yearTotal, forecast: costResult.forecast, resourceCount: resources.length, securityScore: security.score, topServices: costResult.services.slice(0, 5), monthlyData: costResult.monthlyData });

  } else if (account.provider === 'GCP') {
    const creds = getCredentials(account);
    const [costResult, resources, security] = await Promise.all([
      fetchGCPCosts(creds).catch(() => ({ currentMonthTotal: 0, lastMonthTotal: 0, forecast: 0, yearTotal: 0, services: [], monthlyData: [] })),
      fetchGCPResources(creds).catch(() => [] as any[]),
      fetchGCPSecurity(creds).catch(() => ({ score: 75, findings: [] })),
    ]);
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'GCP', region: 'GCP Global', status: 'Active', totalCost: costResult.currentMonthTotal, lastMonthCost: costResult.lastMonthTotal, yearTotal: costResult.yearTotal, forecast: costResult.forecast, resourceCount: resources.length, securityScore: security.score, topServices: costResult.services.slice(0, 5), monthlyData: costResult.monthlyData });

  } else {
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: account.provider, totalCost: 0, lastMonthCost: 0, yearTotal: 0, forecast: 0, resourceCount: 0, securityScore: 0, topServices: [], monthlyData: [] });
  }
});

// ============================================
// LEGACY STUBS
// ============================================
app.get('/api/budgets/:accountId',                 (_req, res) => res.json({}));
app.get('/api/budgets/activity/:accountId',        (_req, res) => res.json([]));
app.get('/api/budgets/recommendations/:accountId', (_req, res) => res.json([]));
app.get('/api/budgets/anomalies/:accountId',       (_req, res) => res.json([]));

// ============================================
// ROUTERS — mounted AFTER inline routes
// ============================================
app.use('/api/reports', reportsRouter);
app.use('/api/gcp',     gcpRouter);
app.use('/api',         apiRouter);

// ============================================
// FALLBACK
// ============================================
app.use((_req: express.Request, res: express.Response) =>
  res.status(404).json({ error: 'Not Found' })
);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal error' });
});

// ============================================
// BOOT
// ============================================
async function start() {
  try {
    await initDB();
  } catch (e: any) {
    console.warn('⚠️  DB init failed, continuing without DB:', e.message);
  }

  const dates = getDateRanges();
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('='.repeat(60));
    console.log('🚀 CloudGuard Pro');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`📅 Current month: ${dates.currentMonthStart} → ${dates.currentMonthEnd}`);
    console.log(`📦 Accounts loaded: ${connectedAccounts.length}`);
    console.log(`🤖 ChatBot: ${process.env.ANTHROPIC_API_KEY ? '✅ Anthropic ready' : process.env.OPENAI_API_KEY ? '✅ OpenAI ready' : '⚠️  No AI key set'}`);
    console.log('='.repeat(60));

    cron.schedule('0 * * * *', async () => {
      console.log('[cron] Running nuke schedule check...');
      try { await checkNukeSchedules(); } catch (e: any) { console.warn('[cron] nuke check failed:', e.message); }
    });
    console.log('[cron] Nuke scheduler registered — runs every hour');
  });

  server.on('error', (error: any) => {
    if (error.code === 'EADDRINUSE') { console.error(`❌ Port ${PORT} already in use`); process.exit(1); }
    else { console.error('Server error:', error); process.exit(1); }
  });
}

start().catch(e => {
  console.error('❌ Fatal startup error:', e);
  process.exit(1);
});