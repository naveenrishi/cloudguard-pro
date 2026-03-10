import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

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
    const iv = Buffer.from(ivHex, 'hex');
    const encryptedText = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, iv);
    return Buffer.concat([decipher.update(encryptedText), decipher.final()]).toString('utf8');
  } catch (e) { return '{}'; }
}

interface StoredAccount {
  id: string; accountName: string; accountId: string;
  provider: 'AWS' | 'AZURE' | 'GCP'; region?: string;
  status: string; createdAt: string; isDemo?: boolean; encryptedCreds: string;
}

let connectedAccounts: StoredAccount[] = [];

// ── Azure Nuke store ──
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
const azureNukeJobs: Record<string, AzureNukeJob> = {};

function getNextFriday6pm(): Date {
  const now = new Date();
  const day = now.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7 || 7;
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilFriday, 18, 0, 0));
}

// Safe async iterator — never throws
async function collectAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  try { for await (const item of iter) items.push(item); }
  catch (e: any) { console.warn('collectAsync warn:', e.message); }
  return items;
}

let prisma: any = null;
async function initDB() {
  try {
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    await prisma.$connect();
    const dbAccounts = await prisma.cloudAccount.findMany();
    for (const acc of dbAccounts) {
      if (!connectedAccounts.find(a => a.id === acc.id)) {
        connectedAccounts.push({
          id: acc.id, accountName: acc.accountName, accountId: acc.accountId,
          provider: acc.provider as 'AWS' | 'AZURE' | 'GCP',
          region: acc.region || undefined, status: 'Active',
          createdAt: acc.createdAt.toISOString(), isDemo: false,
          encryptedCreds: acc.credentials,
        });
      }
    }
    console.log(`✅ DB connected. Loaded ${connectedAccounts.length} accounts.`);
  } catch (e: any) {
    console.warn('⚠️  No DB, using in-memory only:', e.message);
    prisma = null;
  }
}

async function saveAccountToDB(account: StoredAccount) {
  if (!prisma) return;
  try {
    await prisma.cloudAccount.upsert({
      where: { userId_provider_accountId: { userId: 'default-user', provider: account.provider, accountId: account.accountId } },
      update: { accountName: account.accountName, region: account.region, credentials: account.encryptedCreds, status: 'ACTIVE', lastSyncAt: new Date() },
      create: { id: account.id, userId: 'default-user', provider: account.provider, accountName: account.accountName, accountId: account.accountId, region: account.region, credentials: account.encryptedCreds, status: 'ACTIVE' },
    });
  } catch (e: any) { console.warn('⚠️  DB save failed:', e.message); }
}

function getCredentials(account: StoredAccount): any {
  try { return JSON.parse(decrypt(account.encryptedCreds)); } catch (e) { return {}; }
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health/status', (_req, res) => res.json({ status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() }));
app.get('/api/health/version-updates', (_req, res) => res.json({ currentVersion: '1.0.0', latestVersion: '1.0.0', updateAvailable: false }));

app.get('/api/cloud/accounts', (_req, res) => res.json(connectedAccounts.map(({ encryptedCreds, ...acc }) => acc)));

app.get('/api/cloud/accounts/:accountId', (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const { encryptedCreds, ...safe } = account;
  res.json(safe);
});

// ============================================
// CONNECT AWS — UNCHANGED
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
// CONNECT AZURE — UNCHANGED
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
// AWS COST FETCHER — UNCHANGED
// ============================================
async function fetchAWSCosts(creds: { accessKeyId: string; secretAccessKey: string }) {
  const { CostExplorerClient, GetCostAndUsageCommand } = require('@aws-sdk/client-cost-explorer');
  const ce = new CostExplorerClient({ region: 'us-east-1', credentials: creds });
  const now = new Date();
  const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
  const curMonthStart  = fmtDate(new Date(Date.UTC(y, mo, 1)));
  const curMonthEnd    = fmtDate(new Date(Date.UTC(y, mo, d + 1)));
  const lastMonthStart = fmtDate(new Date(Date.UTC(y, mo - 1, 1)));
  const lastMonthEnd   = fmtDate(new Date(Date.UTC(y, mo, 1)));
  const daysInCurMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();

  const [curDailyData, curServicesData, lastMonthData] = await Promise.all([
    ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: curMonthStart, End: curMonthEnd }, Granularity: 'DAILY', Metrics: ['UnblendedCost'] })),
    ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: curMonthStart, End: curMonthEnd }, Granularity: 'DAILY', Metrics: ['UnblendedCost'], GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }] })),
    ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: lastMonthStart, End: lastMonthEnd }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'] })),
  ]);

  const currentMonthTotal = (curDailyData.ResultsByTime || []).reduce((s: number, d: any) => s + parseFloat(d.Total?.UnblendedCost?.Amount || '0'), 0);
  const lastMonthTotal = parseFloat(lastMonthData.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || '0');

  const serviceMap: Record<string, number> = {};
  for (const day of (curServicesData.ResultsByTime || []))
    for (const g of (day.Groups || [])) {
      const name = g.Keys?.[0] || 'Unknown';
      serviceMap[name] = (serviceMap[name] || 0) + parseFloat(g.Metrics?.UnblendedCost?.Amount || '0');
    }
  const services = Object.entries(serviceMap)
    .filter(([_, c]) => c > 0.001)
    .map(([name, cost]) => ({ name, cost, percentage: currentMonthTotal > 0 ? (cost / currentMonthTotal) * 100 : 0 }))
    .sort((a, b) => b.cost - a.cost);

  const dailyAvg = d > 0 ? currentMonthTotal / d : 0;
  const forecast = dailyAvg * daysInCurMonth;

  const monthlyData: any[] = [];
  for (let i = 13; i >= 0; i--) {
    const mStart = new Date(Date.UTC(y, mo - i, 1));
    const mEnd   = new Date(Date.UTC(y, mo - i + 1, 1));
    const capEnd = new Date(Date.UTC(y, mo, d + 1));
    const useEnd = mEnd > capEnd ? capEnd : mEnd;
    if (mStart >= capEnd) continue;
    try {
      const mData = await ce.send(new GetCostAndUsageCommand({ TimePeriod: { Start: fmtDate(mStart), End: fmtDate(useEnd) }, Granularity: 'MONTHLY', Metrics: ['UnblendedCost'] }));
      const total = parseFloat(mData.ResultsByTime?.[0]?.Total?.UnblendedCost?.Amount || '0');
      monthlyData.push({ month: mStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), total });
    } catch (e: any) { console.warn(`   ⚠️  Skipped AWS month ${fmtDate(mStart)}:`, e.message); }
  }

  const yearTotal = monthlyData.reduce((s: number, m: any) => s + m.total, 0);
  console.log(`   📤 AWS: currentMonth=$${currentMonthTotal.toFixed(2)} lastMonth=$${lastMonthTotal.toFixed(2)} year=$${yearTotal.toFixed(2)}`);
  return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
}

// ============================================
// AZURE RATE LIMIT MANAGER
// ─────────────────────────────────────────────
// Tracks when Azure says to back off and enforces
// a global cooldown across ALL Azure Cost API calls.
// ============================================
const azureRateLimitState = {
  // Timestamp (ms) until which ALL Azure cost calls must wait
  blockedUntil: 0,

  // Record a rate limit hit — parse Retry-After if available
  recordHit(retryAfterSeconds?: number) {
    const waitMs = (retryAfterSeconds ?? 60) * 1000; // default 60s if no header
    this.blockedUntil = Math.max(this.blockedUntil, Date.now() + waitMs);
    console.log(`   🚫 Azure rate limit hit — blocked until ${new Date(this.blockedUntil).toISOString()}`);
  },

  // How many ms remain before we can call again (0 = clear)
  msRemaining(): number {
    return Math.max(0, this.blockedUntil - Date.now());
  },

  async waitIfBlocked(): Promise<void> {
    const ms = this.msRemaining();
    if (ms > 0) {
      console.log(`   ⏸️  Azure globally rate-limited — waiting ${(ms/1000).toFixed(1)}s`);
      await new Promise(r => setTimeout(r, ms));
    }
  },
};

// ============================================
// AZURE COST CACHE
// ─────────────────────────────────────────────
// TTL: 15 minutes (Azure Cost API updates hourly anyway)
// Mutex: prevents parallel fetches for the same subscription
// ============================================
const AZURE_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const azureCostCache     = new Map<string, { data: any; fetchedAt: number }>();
const azureFetchInFlight = new Map<string, Promise<any>>();

async function azureQueryWithRetry(
  client: any,
  scope: string,
  body: any,
  maxRetries = 3,
): Promise<any> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Always wait if globally blocked before attempting
    await azureRateLimitState.waitIfBlocked();

    try {
      return await client.query.usage(scope, body);
    } catch (e: any) {
      const status = e.statusCode ?? e.status ?? 0;
      const isRateLimit =
        status === 429 ||
        e.code === 'TooManyRequests' ||
        e.message?.toLowerCase().includes('too many requests');

      if (isRateLimit) {
        // Parse Retry-After header if the SDK surfaces it
        const retryAfter =
          parseInt(e.response?.headers?.['retry-after'] ?? e.headers?.['retry-after'] ?? '0', 10) || null;

        azureRateLimitState.recordHit(retryAfter ?? undefined);

        if (attempt < maxRetries - 1) {
          console.log(`   ♻️  Azure rate limited — retry ${attempt + 1}/${maxRetries - 1} after cooldown`);
          continue; // waitIfBlocked at top of next iteration handles the delay
        }
      }

      throw e;
    }
  }
}

async function fetchAzureCosts(creds: any): Promise<any> {
  const subId = creds.subscriptionId;

  // ── 1. Return from cache if still fresh ────────────────────────────
  const cached = azureCostCache.get(subId);
  if (cached && Date.now() - cached.fetchedAt < AZURE_CACHE_TTL_MS) {
    const ageSeconds = ((Date.now() - cached.fetchedAt) / 1000).toFixed(0);
    console.log(`   ✅ Azure costs served from cache for ${subId} (age: ${ageSeconds}s)`);
    return cached.data;
  }

  // ── 2. Coalesce: if a fetch is already running, piggyback on it ─────
  if (azureFetchInFlight.has(subId)) {
    console.log(`   ⏳ Azure fetch already in-flight for ${subId} — coalescing`);
    return azureFetchInFlight.get(subId)!;
  }

  // ── 3. Kick off a fresh fetch, store the promise as the mutex ───────
  const fetchPromise = _doFetchAzureCosts(creds);
  azureFetchInFlight.set(subId, fetchPromise);

  try {
    const result = await fetchPromise;
    azureCostCache.set(subId, { data: result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    // On failure, serve stale cache if available rather than showing $0
    if (cached) {
      console.warn(`   ⚠️  Azure cost fetch failed — serving stale cache for ${subId}`);
      return cached.data;
    }
    throw err;
  } finally {
    azureFetchInFlight.delete(subId);
  }
}

async function _doFetchAzureCosts(creds: any): Promise<any> {
  const { ClientSecretCredential } = require('@azure/identity');
  const { CostManagementClient } = require('@azure/arm-costmanagement');

  const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
  const client     = new CostManagementClient(credential);
  const scope      = `/subscriptions/${creds.subscriptionId}`;

  const now = new Date();
  const y  = now.getUTCFullYear();
  const mo = now.getUTCMonth();
  const d  = now.getUTCDate();

  const curMonthStart  = fmtDate(new Date(Date.UTC(y, mo, 1)));
  const curMonthEnd    = fmtDate(new Date(Date.UTC(y, mo, d + 1)));
  const daysInCurMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const trendEnd       = fmtDate(new Date(Date.UTC(y, mo, 0)));        // end of previous month
  const trendStart     = fmtDate(new Date(Date.UTC(y, mo - 11, 1)));   // 11 full months ago

  console.log(`\n💙 Fetching Azure costs: ${creds.subscriptionId}`);
  console.log(`   curMonthStart=${curMonthStart} curMonthEnd=${curMonthEnd} trendStart=${trendStart} trendEnd=${trendEnd}`);

  // ── CALL 1: current month by service ──────────────────────────────
  const curResult = await azureQueryWithRetry(client, scope, {
    type: 'ActualCost',
    timeframe: 'Custom',
    timePeriod: { from: new Date(curMonthStart), to: new Date(curMonthEnd) },
    dataset: {
      granularity: 'None',
      aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      grouping: [{ type: 'Dimension', name: 'ServiceName' }],
    },
  });

  const services: { name: string; cost: number; percentage: number }[] = [];
  let currentMonthTotal = 0;
  for (const row of (curResult.rows || [])) {
    const cost = parseFloat(String(row[0])) || 0;
    const name = String(row[1] || 'Other');
    if (cost > 0.001) {
      services.push({ name, cost, percentage: 0 });
      currentMonthTotal += cost;
    }
  }
  services.sort((a, b) => b.cost - a.cost);
  services.forEach(s => { s.percentage = currentMonthTotal > 0 ? (s.cost / currentMonthTotal) * 100 : 0; });

  // Polite inter-call delay to reduce burst pressure
  await new Promise(r => setTimeout(r, 1000));

  // ── CALL 2: monthly trend (last 11 complete months) ───────────────
  const monthlyData: { month: string; total: number }[] = [];
  try {
    const trendResult = await azureQueryWithRetry(client, scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: { from: new Date(trendStart), to: new Date(trendEnd) },
      dataset: {
        granularity: 'Monthly',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      },
    });

    const trendRows = trendResult.rows || [];
    console.log(`   📦 Trend rows: ${trendRows.length}`);

    for (const row of trendRows) {
      const cost = parseFloat(String(row[0])) || 0;
      let monthLabel = 'Unknown';

      for (let col = 1; col < row.length; col++) {
        const val = String(row[col]);
        if (/^\d{8}$/.test(val)) {
          const dt = new Date(Date.UTC(
            parseInt(val.slice(0, 4)),
            parseInt(val.slice(4, 6)) - 1,
            1,
          ));
          monthLabel = dt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;
        }
        if (val.includes('-') && val.length >= 10) {
          monthLabel = new Date(val).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          break;
        }
      }

      if (monthLabel !== 'Unknown') monthlyData.push({ month: monthLabel, total: cost });
      console.log(`   📊 ${monthLabel}: $${cost.toFixed(2)}`);
    }
  } catch (e: any) {
    console.warn(`   ⚠️  Trend call failed: ${e.message}`);
  }

  await new Promise(r => setTimeout(r, 1000));

  // ── CALL 3: last month total ───────────────────────────────────────
  let lastMonthTotal = 0;
  try {
    const lastResult = await azureQueryWithRetry(client, scope, {
      type: 'ActualCost',
      timeframe: 'Custom',
      timePeriod: {
        from: new Date(Date.UTC(y, mo - 1, 1)),
        to:   new Date(Date.UTC(y, mo, 1)),
      },
      dataset: {
        granularity: 'None',
        aggregation: { totalCost: { name: 'Cost', function: 'Sum' } },
      },
    });
    for (const row of (lastResult.rows || [])) lastMonthTotal += parseFloat(String(row[0])) || 0;
  } catch (e: any) {
    console.warn(`   ⚠️  Last month call failed: ${e.message}`);
    // Fall back to trend data if available
    const lbl = new Date(Date.UTC(y, mo - 1, 1))
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    lastMonthTotal = monthlyData.find(m => m.month === lbl)?.total || 0;
  }

  // Always include current month in trend chart
  const curMonthLabel = new Date(Date.UTC(y, mo, 1))
    .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (!monthlyData.find(m => m.month === curMonthLabel)) {
    monthlyData.push({ month: curMonthLabel, total: currentMonthTotal });
  }

  const dailyAvg = d > 0 ? currentMonthTotal / d : 0;
  const forecast  = dailyAvg * daysInCurMonth;
  const yearTotal = monthlyData.reduce((s, m) => s + m.total, 0);

  console.log(`   📤 Azure: currentMonth=$${currentMonthTotal.toFixed(2)} lastMonth=$${lastMonthTotal.toFixed(2)} year=$${yearTotal.toFixed(2)} services=${services.length} months=${monthlyData.length}`);
  return { currentMonthTotal, lastMonthTotal, forecast, yearTotal, services, monthlyData };
}

// ============================================
// AZURE RESOURCES — unchanged, safe
// ============================================
async function fetchAzureResources(creds: any): Promise<any[]> {
  const resources: any[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { ResourceManagementClient } = require('@azure/arm-resources');
    const { ComputeManagementClient } = require('@azure/arm-compute');
    const credential     = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);
    const computeClient  = new ComputeManagementClient(credential, creds.subscriptionId);

    const vms = await collectAsync(computeClient.virtualMachines.listAll());
    for (const vm of vms)
      resources.push({ id: vm.id, name: vm.name, type: 'Virtual Machine', state: vm.provisioningState || 'Unknown', region: vm.location, resourceGroup: (vm.id || '').split('/')[4] || '' });

    const allRes = await collectAsync(resourceClient.resources.list());
    for (const r of allRes) {
      const shortType = (r.type || '').split('/').pop() || 'Resource';
      resources.push({ id: r.id, name: r.name, type: shortType, state: 'Active', region: r.location, resourceGroup: (r.id || '').split('/')[4] || '' });
    }
  } catch (e: any) { console.warn('⚠️  Azure resources fetch error:', e.message); }
  return resources;
}

// ============================================
// AZURE SECURITY — unchanged, safe
// ============================================
async function fetchAzureSecurity(creds: any): Promise<{ score: number; findings: any[] }> {
  const findings: any[] = [];
  let score = 100;
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { SecurityCenter } = require('@azure/arm-security');
    const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const secClient  = new SecurityCenter(credential, creds.subscriptionId);

    const alerts = await collectAsync(secClient.alerts.list());
    for (const alert of alerts) {
      const severity = (alert.severity || 'MEDIUM').toUpperCase();
      findings.push({ severity, title: alert.alertDisplayName || 'Security Alert', description: alert.description || '', resource: alert.compromisedEntity || '', remediation: alert.remediationSteps?.[0] || 'Review in Azure Security Center' });
      if (severity === 'CRITICAL') score -= 15;
      else if (severity === 'HIGH')   score -= 8;
      else if (severity === 'MEDIUM') score -= 3;
    }
  } catch (e: any) { console.warn('⚠️  Azure security fetch error:', e.message); }
  return { score: Math.max(0, score), findings };
}

// ============================================
// AZURE NUKE SCAN — unchanged, safe
// ============================================
async function scanAzureNukeResources(creds: any): Promise<AzureNukeResource[]> {
  const targets: AzureNukeResource[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { ComputeManagementClient } = require('@azure/arm-compute');
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
          targets.push({ id: vm.id!, name: vm.name!, type: 'Stopped VM', resourceGroup: vm.id!.split('/')[4], region: vm.location!, risk: 'HIGH', reason: `VM is ${ps.replace('PowerState/','')} but disks still incur cost`, estimatedSavings: 15 });
      } catch (_) {}
    }

    const disks = await collectAsync(computeClient.disks.list());
    for (const disk of disks)
      if (!disk.managedBy && disk.diskState !== 'Reserved')
        targets.push({ id: disk.id!, name: disk.name!, type: 'Unattached Disk', resourceGroup: disk.id!.split('/')[4], region: disk.location!, risk: 'MEDIUM', reason: `Disk (${disk.diskSizeGB||0}GB) not attached to any VM`, estimatedSavings: Math.round((disk.diskSizeGB||0) * 0.05) });

    const rgs = await collectAsync(resourceClient.resourceGroups.list());
    for (const rg of rgs) {
      try {
        const items = await collectAsync(resourceClient.resources.listByResourceGroup(rg.name!));
        if (items.length === 0)
          targets.push({ id: rg.id!, name: rg.name!, type: 'Empty Resource Group', resourceGroup: rg.name!, region: rg.location!, risk: 'LOW', reason: 'Resource group has no resources', estimatedSavings: 0 });
      } catch (_) {}
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const snaps = await collectAsync(computeClient.snapshots.list());
    for (const snap of snaps) {
      const created = snap.timeCreated ? new Date(snap.timeCreated) : null;
      if (created && created < thirtyDaysAgo)
        targets.push({ id: snap.id!, name: snap.name!, type: 'Old Snapshot', resourceGroup: snap.id!.split('/')[4], region: snap.location!, risk: 'LOW', reason: `Snapshot ${Math.floor((Date.now()-created.getTime())/86400000)} days old`, estimatedSavings: Math.round((snap.diskSizeGB||0) * 0.03) });
    }
  } catch (e: any) { console.warn('⚠️  Azure nuke scan error:', e.message); }
  return targets;
}

// ============================================
// AZURE ADVISOR — unchanged
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
      recommendations.push({ id: rec.id, category: props.category || 'General', impact: props.impact || 'Medium', title: props.shortDescription?.solution || props.shortDescription?.problem || 'Recommendation', description: props.shortDescription?.problem || '', effort: props.impact === 'High' ? 'LOW' : props.impact === 'Medium' ? 'MEDIUM' : 'HIGH', estimatedSaving: props.extendedProperties?.savingsAmount ? parseFloat(props.extendedProperties.savingsAmount) : undefined });
    }
    console.log(`   💡 Azure Advisor: ${recommendations.length} recommendations`);
  } catch (e: any) { console.warn('⚠️  Azure Advisor error:', e.message); }
  return recommendations;
}

// ============================================
// AZURE RESOURCE GROUPS — unchanged
// ============================================
async function fetchAzureResourceGroups(creds: any): Promise<{ name: string; cost: number; resources: number }[]> {
  const groups: { name: string; cost: number; resources: number }[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const { CostManagementClient } = require('@azure/arm-costmanagement');
    const { ResourceManagementClient } = require('@azure/arm-resources');
    const credential     = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const costClient     = new CostManagementClient(credential);
    const resourceClient = new ResourceManagementClient(credential, creds.subscriptionId);
    const scope = `/subscriptions/${creds.subscriptionId}`;
    const now = new Date();
    const y = now.getUTCFullYear(), mo = now.getUTCMonth(), d = now.getUTCDate();
    const start = fmtDate(new Date(Date.UTC(y, mo, 1)));
    const end   = fmtDate(new Date(Date.UTC(y, mo, d + 1)));

    const allRes = await collectAsync(resourceClient.resources.list()).catch(() => [] as any[]);
    const rgCount: Record<string, number> = {};
    const rgNames: Set<string> = new Set();
    for (const r of allRes) {
      const parts = (r.id || '').split('/');
      const rg = parts[4] || '';
      if (rg) { rgCount[rg.toLowerCase()] = (rgCount[rg.toLowerCase()] || 0) + 1; rgNames.add(rg); }
    }

    try {
      const costResult = await costClient.query.usage(scope, {
        type: 'ActualCost', timeframe: 'Custom',
        timePeriod: { from: new Date(start), to: new Date(end) },
        dataset: { granularity: 'None', aggregation: { totalCost: { name: 'Cost', function: 'Sum' } }, grouping: [{ type: 'Dimension', name: 'ResourceGroupName' }] },
      });
      for (const row of (costResult.rows || [])) {
        const name = String(row[1] || 'Unknown');
        const cost = parseFloat(String(row[0])) || 0;
        if (name && name !== 'Unknown') groups.push({ name, cost, resources: rgCount[name.toLowerCase()] || 0 });
      }
      console.log(`   📁 Resource groups with cost: ${groups.length}`);
    } catch (costErr: any) {
      console.warn(`   ⚠️  RG cost grouping failed (${costErr.message}) — showing resource counts only`);
      for (const rgName of Array.from(rgNames)) {
        groups.push({ name: rgName, cost: 0, resources: rgCount[rgName.toLowerCase()] || 0 });
      }
    }

    groups.sort((a, b) => b.cost - a.cost || b.resources - a.resources);
  } catch (e: any) { console.warn('⚠️  Azure resource groups error:', e.message); }
  return groups;
}

// ============================================
// AZURE ACTIVITY LOGS — unchanged
// ============================================
async function fetchAzureActivity(creds: any): Promise<any[]> {
  const activities: any[] = [];
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const credential = new ClientSecretCredential(creds.tenantId, creds.clientId, creds.clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const filter = `eventTimestamp ge '${since}'`;
    const url = `https://management.azure.com/subscriptions/${creds.subscriptionId}/providers/microsoft.insights/eventtypes/management/values?api-version=2015-04-01&$filter=${encodeURIComponent(filter)}&$select=operationName,resourceGroupName,caller,eventTimestamp,status,resourceType`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token.token}` } });
    if (!response.ok) throw new Error(`Activity API ${response.status}`);
    const data: any = await response.json();
    for (const event of (data.value || []).slice(0, 50)) {
      if (event.status?.value === 'Started') continue;
      activities.push({ operationName: event.operationName?.localizedValue || event.operationName?.value || 'Operation', resourceGroup: event.resourceGroupName || 'N/A', caller: event.caller || 'System', eventTimestamp: event.eventTimestamp, status: event.status?.value || '' });
    }
    console.log(`   📋 Azure Activity: ${activities.length} events`);
  } catch (e: any) { console.warn('⚠️  Azure Activity error:', e.message); }
  return activities;
}

// ============================================
// AZURE NUKE ENDPOINTS — unchanged
// ============================================
app.get('/api/azure/nuke/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  let job = azureNukeJobs[account.id];
  if (!job) {
    job = { id: `nuke-${account.id}`, accountId: account.id, scheduledAt: getNextFriday6pm().toISOString(), status: 'scheduled', dryRun: true, resources: [] };
    azureNukeJobs[account.id] = job;
  }
  res.json({ ...job, nextScheduled: getNextFriday6pm().toISOString(), totalWaste: job.resources.reduce((s, r) => s + r.estimatedSavings, 0), breakdown: { stoppedVMs: job.resources.filter(r => r.type === 'Stopped VM').length, unattachedDisks: job.resources.filter(r => r.type === 'Unattached Disk').length, emptyRGs: job.resources.filter(r => r.type === 'Empty Resource Group').length, oldSnapshots: job.resources.filter(r => r.type === 'Old Snapshot').length } });
});

app.post('/api/azure/nuke/:accountId/dry-run', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  try {
    const resources = await scanAzureNukeResources(getCredentials(account));
    azureNukeJobs[account.id] = { id: `nuke-${account.id}`, accountId: account.id, scheduledAt: getNextFriday6pm().toISOString(), status: 'dry_run_complete', dryRun: true, resources, lastRunAt: new Date().toISOString(), lastRunResult: `Found ${resources.length} resources to clean.` };
    res.json({ message: `Dry-run complete. Found ${resources.length} resources.`, resources, totalWaste: resources.reduce((s, r) => s + r.estimatedSavings, 0) });
  } catch (error: any) { res.status(500).json({ error: 'Dry-run failed', details: error.message }); }
});

app.post('/api/azure/nuke/:accountId/cancel', (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (azureNukeJobs[account.id]) { azureNukeJobs[account.id].status = 'scheduled'; azureNukeJobs[account.id].resources = []; }
  res.json({ message: 'Nuke job cancelled', nextScheduled: getNextFriday6pm().toISOString() });
});

// ============================================
// AZURE ADVISOR / RESOURCE GROUPS / ACTIVITY
// ============================================
app.get('/api/azure/advisor/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  const recommendations = await fetchAzureAdvisor(getCredentials(account));
  res.json({ recommendations, fetchedAt: new Date().toISOString() });
});

app.get('/api/azure/resource-groups/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  const groups = await fetchAzureResourceGroups(getCredentials(account));
  res.json({ groups, fetchedAt: new Date().toISOString() });
});

app.get('/api/azure/activity/:accountId', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId && a.provider === 'AZURE');
  if (!account) return res.status(404).json({ error: 'Azure account not found' });
  const activities = await fetchAzureActivity(getCredentials(account));
  res.json({ activities, fetchedAt: new Date().toISOString() });
});

// ============================================
// COSTS — AWS UNCHANGED
// ============================================
app.get('/api/cloud/accounts/:accountId/costs', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.provider === 'AWS') {
    try {
      const r = await fetchAWSCosts(getCredentials(account));
      res.json({ currentMonth: r.currentMonthTotal, lastMonth: r.lastMonthTotal, forecast: r.forecast, yearTotal: r.yearTotal, monthlyData: r.monthlyData, services: r.services, currency: 'USD', accountId: account.accountId, accountName: account.accountName });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch costs', details: e.message }); }
  } else if (account.provider === 'AZURE') {
    try {
      const r = await fetchAzureCosts(getCredentials(account));
      res.json({ currentMonth: r.currentMonthTotal, lastMonth: r.lastMonthTotal, forecast: r.forecast, yearTotal: r.yearTotal, monthlyData: r.monthlyData, services: r.services, currency: 'USD', accountId: account.accountId, accountName: account.accountName });
    } catch (e: any) { res.status(500).json({ error: 'Failed to fetch Azure costs', details: e.message }); }
  } else {
    res.json({ currentMonth: 0, lastMonth: 0, forecast: 0, yearTotal: 0, monthlyData: [], services: [], currency: 'USD', accountId: account.accountId, accountName: account.accountName });
  }
});

// ============================================
// RESOURCES — AWS UNCHANGED
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
    const resources = await fetchAzureResources(getCredentials(account));
    res.json({ resources });
  } else {
    res.json({ resources: [] });
  }
});

// ============================================
// SECURITY — AWS UNCHANGED
// ============================================
app.get('/api/cloud/accounts/:accountId/security', async (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  if (account.provider === 'AWS') {
    try {
      const creds = getCredentials(account);
      const { IAMClient, GenerateCredentialReportCommand, GetCredentialReportCommand } = require('@aws-sdk/client-iam');
      const iam = new IAMClient({ region: 'us-east-1', credentials: creds });
      const findings: any[] = []; let score = 100;
      try {
        await iam.send(new GenerateCredentialReportCommand({}));
        await new Promise(r => setTimeout(r, 3000));
        const report = await iam.send(new GetCredentialReportCommand({}));
        if (report.Content) {
          Buffer.from(report.Content).toString('utf-8').split('\n').slice(1).forEach((line: string) => {
            const f = line.split(',');
            if (f.length < 15) return;
            if (f[3] === 'true' && f[7] !== 'true' && f[0] !== '<root_account>') { findings.push({ severity: 'HIGH', title: `IAM User without MFA: ${f[0]}`, description: 'Console access without MFA', resource: `arn:aws:iam::${account.accountId}:user/${f[0]}`, remediation: 'Enable MFA' }); score -= 5; }
          });
        }
      } catch (e) {}
      findings.push({ severity: 'CRITICAL', title: 'Verify Root MFA', description: 'Ensure root has MFA enabled', resource: `arn:aws:iam::${account.accountId}:root`, remediation: 'Enable MFA on root' });
      score -= 10;
      res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'AWS', score: Math.max(0, score), findings, scannedAt: new Date().toISOString() });
    } catch (e: any) { res.status(500).json({ error: 'Security scan failed', details: e.message }); }
  } else if (account.provider === 'AZURE') {
    const { score, findings } = await fetchAzureSecurity(getCredentials(account));
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: 'AZURE', score, findings, scannedAt: new Date().toISOString() });
  } else {
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: account.provider, score: 75, findings: [], scannedAt: new Date().toISOString() });
  }
});

// ============================================
// DASHBOARD — AWS UNCHANGED
// Azure: sequential fetches + stale-cache fallback
// ============================================
app.get('/api/cloud/dashboard/:accountId', async (req, res) => {
  const { accountId } = req.params;
  console.log(`\n📊 DASHBOARD: ${accountId}`);
  const account = connectedAccounts.find(a => a.id === accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  console.log(`✅ ${account.accountName} | ${account.provider}`);

  if (account.provider === 'AWS') {
    // ── AWS — COMPLETELY UNCHANGED ──────────────────────────────────
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
    // ── AZURE — run fetches sequentially to minimise burst API calls ──
    // Resources and security do NOT hit the Cost Management API,
    // so they can still run in parallel with each other.
    const creds = getCredentials(account);

    // Cost first (uses cache + mutex — safe to await alone)
    const costResult = await fetchAzureCosts(creds).catch((e: any) => {
      console.error('❌ Azure cost error:', e.message);
      return { currentMonthTotal: 0, lastMonthTotal: 0, forecast: 0, yearTotal: 0, services: [], monthlyData: [] };
    });

    // Resources + security in parallel (they don't touch Cost Management)
    const [resources, security] = await Promise.all([
      fetchAzureResources(creds).catch(() => [] as any[]),
      fetchAzureSecurity(creds).catch(() => ({ score: 0, findings: [] })),
    ]);

    res.json({
      accountId:     account.accountId,
      accountName:   account.accountName,
      provider:      'AZURE',
      region:        'Azure Global',
      status:        'Active',
      totalCost:     costResult.currentMonthTotal,
      lastMonthCost: costResult.lastMonthTotal,
      yearTotal:     costResult.yearTotal,
      forecast:      costResult.forecast,
      resourceCount: resources.length,
      securityScore: security.score,
      topServices:   costResult.services.slice(0, 5),
      monthlyData:   costResult.monthlyData,
    });

  } else {
    res.json({ accountId: account.accountId, accountName: account.accountName, provider: account.provider, totalCost: 0, lastMonthCost: 0, yearTotal: 0, forecast: 0, resourceCount: 0, securityScore: 0, topServices: [], monthlyData: [] });
  }
});

// ============================================
// LEGACY
// ============================================
app.get('/api/budgets/:accountId', (_req, res) => res.json({}));
app.get('/api/budgets/activity/:accountId', (_req, res) => res.json([]));
app.get('/api/budgets/recommendations/:accountId', (_req, res) => res.json([]));
app.get('/api/budgets/anomalies/:accountId', (_req, res) => res.json([]));
app.use((_req: express.Request, res: express.Response) => res.status(404).json({ error: 'Not Found' }));
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => { console.error('Server Error:', err); res.status(500).json({ error: 'Internal error' }); });

async function start() {
  await initDB();
  app.listen(PORT, () => {
    const now = new Date();
    console.log('='.repeat(60));
    console.log('🚀 CloudGuard Pro');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`📅 Current month: ${fmtDate(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)))} → today`);
    console.log(`🔥 Next Azure Nuke: ${getNextFriday6pm().toISOString()}`);
    console.log(`📦 Accounts loaded: ${connectedAccounts.length}`);
    console.log('='.repeat(60));
  });
}

start();