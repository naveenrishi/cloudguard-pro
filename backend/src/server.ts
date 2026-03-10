// backend/src/server.ts
// ─────────────────────────────────────────────────────────────────────────────
// This file is intentionally a stub.
// The single entry point is index.ts — do not add app.listen() here.
// ─────────────────────────────────────────────────────────────────────────────
export {};
/*
process.env.OPENSSL_CONF = '/dev/null';

import express    from 'express';
import cors       from 'cors';
import dotenv     from 'dotenv';
import crypto     from 'crypto';
import OpenAI     from 'openai';

// ── Route files (keep these — they're correctly structured) ──────────────
import reportsRouter from './routes/reports.routes';
// Add other routers as you migrate them:
// import authRouter   from './routes/auth.routes';
// import gcpRouter    from './routes/gcp.routes';

dotenv.config();

// ── Startup validation — fail fast rather than silently use wrong key ─────
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) {
  console.error('❌ FATAL: ENCRYPTION_KEY must be set and >= 32 characters');
  process.exit(1);
}

const PORT    = process.env.PORT || 3000;
const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
const openai  = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ── Encryption helpers ────────────────────────────────────────────────────
function encrypt(text: string): string {
  const iv        = crypto.randomBytes(16);
  const cipher    = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  try {
    const [ivHex, encHex] = text.split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex')
    );
    return Buffer.concat([
      decipher.update(Buffer.from(encHex, 'hex')),
      decipher.final(),
    ]).toString('utf8');
  } catch { return '{}'; }
}

function fixGCPKey(creds: any): any {
  if (!creds?.private_key) return creds;
  return { ...creds, private_key: creds.private_key.replace(/\\n/g, '\n') };
}

// ── In-memory store (temporary — replace with DB queries once auth is wired) ─
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
  region: string; risk: 'HIGH' | 'MEDIUM' | 'LOW';
  reason: string; estimatedSavings: number;
}

let connectedAccounts: StoredAccount[] = [];
const azureNukeJobs: Record<string, AzureNukeJob> = {};

// ── Prisma (optional — graceful fallback to in-memory) ───────────────────
let prisma: any = null;

async function saveAccountToDB(account: StoredAccount) {
  if (!prisma) return;
  try {
    await prisma.user.upsert({
      where:  { id: 'default-user' },
      update: {},
      create: {
        id: 'default-user', email: 'system@cloudguard.local',
        password: 'not-used', name: 'System User', emailVerified: true,
      },
    });
    await prisma.cloudAccount.upsert({
      where: { userId_provider_accountId: {
        userId: 'default-user', provider: account.provider, accountId: account.accountId,
      }},
      update: {
        accountName: account.accountName, region: account.region,
        credentials: account.encryptedCreds, status: 'ACTIVE', lastSyncAt: new Date(),
      },
      create: {
        id: account.id, userId: 'default-user', provider: account.provider,
        accountName: account.accountName, accountId: account.accountId,
        region: account.region, credentials: account.encryptedCreds, status: 'ACTIVE',
      },
    });
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
      create: {
        id: 'default-user', email: 'system@cloudguard.local',
        password: 'not-used', name: 'System User', emailVerified: true,
      },
    });
    const dbAccounts = await prisma.cloudAccount.findMany({ where: { userId: 'default-user' } });
    for (const acc of dbAccounts) {
      if (!connectedAccounts.find(a => a.id === acc.id)) {
        connectedAccounts.push({
          id: acc.id, accountName: acc.accountName, accountId: acc.accountId,
          provider: acc.provider, region: acc.region || undefined,
          status: 'Active', createdAt: acc.createdAt.toISOString(),
          isDemo: false, encryptedCreds: acc.credentials || '',
        });
      }
    }
    console.log(`✅ DB connected. Loaded ${connectedAccounts.length} accounts.`);
  } catch (e: any) {
    console.warn('⚠️  No DB, using in-memory only:', e.message);
    prisma = null;
  }
}

function getCredentials(account: StoredAccount): any {
  try { return JSON.parse(decrypt(account.encryptedCreds)); }
  catch { return {}; }
}

function fmtDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`;
}

function getNextFriday6pm(): Date {
  const now = new Date();
  const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
  return new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(),
    now.getUTCDate() + daysUntilFriday, 18, 0, 0
  ));
}

async function collectAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  try { for await (const item of iter) items.push(item); }
  catch (e: any) { console.warn('collectAsync warn:', e.message); }
  return items;
}

// ════════════════════════════════════════════════════════════════════════════
// EXPRESS APP
// ════════════════════════════════════════════════════════════════════════════
const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health ───────────────────────────────────────────────────────────────
app.get('/api/health',          (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/api/health/status',   (_req, res) => res.json({ status: 'healthy', uptime: process.uptime() }));
app.get('/api/health/version-updates', (_req, res) => res.json({ currentVersion: '1.0.0', latestVersion: '1.0.0', updateAvailable: false }));

// ── ChatBot ──────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, system } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'messages array is required' });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o', max_tokens: 1000,
      messages: [
        { role: 'system', content: system || 'You are a helpful cloud cost management assistant.' },
        ...messages,
      ],
    });
    res.json({ content: response.choices[0]?.message?.content || '' });
  } catch (e: any) { res.status(500).json({ error: e?.message || 'OpenAI error' }); }
});

// ── Accounts (list / get) ────────────────────────────────────────────────
app.get('/api/cloud/accounts', (_req, res) =>
  res.json(connectedAccounts.map(({ encryptedCreds, ...acc }) => acc))
);

app.get('/api/cloud/accounts/:accountId', (req, res) => {
  const account = connectedAccounts.find(a => a.id === req.params.accountId);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const { encryptedCreds, ...safe } = account;
  res.json(safe);
});

// ── Connect AWS ──────────────────────────────────────────────────────────
app.post('/api/cloud/accounts/aws/connect', async (req, res) => {
  const { accountName, accessKeyId, secretAccessKey, region } = req.body;
  if (!accountName || !accessKeyId || !secretAccessKey || !region)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const { STSClient, GetCallerIdentityCommand } = require('@aws-sdk/client-sts');
    const identity = await new STSClient({
      region, credentials: { accessKeyId, secretAccessKey },
    }).send(new GetCallerIdentityCommand({}));
    connectedAccounts = connectedAccounts.filter(
      a => !(a.provider === 'AWS' && a.accountId === identity.Account)
    );
    const newAccount: StoredAccount = {
      id: `aws-${Date.now()}`, accountName, accountId: identity.Account, provider: 'AWS',
      region, status: 'Active', createdAt: new Date().toISOString(), isDemo: false,
      encryptedCreds: encrypt(JSON.stringify({ accessKeyId, secretAccessKey, region })),
    };
    connectedAccounts.push(newAccount);
    await saveAccountToDB(newAccount);
    const { encryptedCreds, ...safe } = newAccount;
    res.status(201).json({ message: 'AWS account connected successfully', account: safe });
  } catch (e: any) {
    res.status(400).json({ error: 'Invalid AWS credentials', details: e.message });
  }
});

// ── Connect Azure ────────────────────────────────────────────────────────
app.post('/api/cloud/accounts/azure/connect', async (req, res) => {
  const { accountName, tenantId, clientId, clientSecret, subscriptionId } = req.body;
  if (!accountName || !tenantId || !clientId || !clientSecret || !subscriptionId)
    return res.status(400).json({ error: 'Missing required fields' });
  try {
    const { ClientSecretCredential } = require('@azure/identity');
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const token = await credential.getToken('https://management.azure.com/.default');
    if (!token?.token) throw new Error('Failed to acquire token');
    connectedAccounts = connectedAccounts.filter(
      a => !(a.provider === 'AZURE' && a.accountId === subscriptionId)
    );
    const newAccount: StoredAccount = {
      id: `azure-${Date.now()}`, accountName, accountId: subscriptionId, provider: 'AZURE',
      status: 'Active', createdAt: new Date().toISOString(), isDemo: false,
      encryptedCreds: encrypt(JSON.stringify({ tenantId, clientId, clientSecret, subscriptionId })),
    };
    connectedAccounts.push(newAccount);
    await saveAccountToDB(newAccount);
    const { encryptedCreds, ...safe } = newAccount;
    res.status(201).json({ message: 'Azure account connected successfully', account: safe });
  } catch (e: any) {
    res.status(400).json({ error: 'Invalid Azure credentials', details: e.message });
  }
});

// ── Connect GCP — registered at BOTH paths so frontend works either way ──
async function handleGCPConnect(req: any, res: any) {
  const { accountName, serviceAccountKey } = req.body;
  if (!accountName || !serviceAccountKey)
    return res.status(400).json({ error: 'Missing required fields' });

  let keyJson: any;
  try {
    keyJson = typeof serviceAccountKey === 'string'
      ? JSON.parse(serviceAccountKey)
      : serviceAccountKey;
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
    const authClient   = await auth.getClient();
    const tokenResp    = await authClient.getAccessToken();
    if (!tokenResp.token) throw new Error('Failed to obtain access token from Google');

    const projectId = keyJson.project_id;
    connectedAccounts = connectedAccounts.filter(
      a => !(a.provider === 'GCP' && a.accountId === projectId)
    );
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
  } catch (e: any) {
    console.error('❌ GCP connect error:', e.message);
    res.status(400).json({ error: 'Invalid GCP credentials or project access denied', details: e.message });
  }
}

// Both URLs work — covers old frontend code AND the new gcp.routes path
app.post('/api/cloud/accounts/gcp/connect', handleGCPConnect);
app.post('/api/gcp/connect',                handleGCPConnect);

// ════════════════════════════════════════════════════════════════════════════
// All other routes (costs, resources, security, dashboard, Azure nuke, etc.)
// are unchanged from your original index.ts — paste them here directly below
// this line, replacing everything from "GCP COST FETCHER" to "LEGACY" in
// your current index.ts
// ════════════════════════════════════════════════════════════════════════════
// [PASTE YOUR EXISTING ROUTE HANDLERS FROM index.ts HERE]


// ── Structured routers ───────────────────────────────────────────────────
app.use('/api/reports', reportsRouter);
// app.use('/api/auth',   authRouter);   // uncomment once auth.routes is ready
// app.use('/api/gcp',   gcpRouter);     // uncomment once gcp.routes is registered

// ── 404 + error handlers — MUST be last ─────────────────────────────────
app.use((_req: express.Request, res: express.Response) =>
  res.status(404).json({ error: 'Not Found' })
);
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Server Error:', err);
  res.status(500).json({ error: 'Internal error' });
});

// ── Boot ─────────────────────────────────────────────────────────────────
async function start() {
  await initDB();
  app.listen(PORT, () => {
    console.log('='.repeat(60));
    console.log('🚀 CloudGuard Pro — single entry point (server.ts)');
    console.log(`📡 http://localhost:${PORT}`);
    console.log(`📦 Accounts loaded: ${connectedAccounts.length}`);
    console.log('='.repeat(60));
  });
}

start();
*/