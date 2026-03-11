// backend/src/services/servicenow.service.ts
// Manages ServiceNow ticket integration.
// - Connection config persisted via ServiceNowConfig Prisma model (credentials encrypted)
// - Tickets cached via ServiceNowTicket Prisma model
// - When not configured: returns empty list; frontend shows DEMO_TICKETS

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ── Encryption helpers (reuse same key as index.ts) ───────────────────────

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum-xx';
const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

function encrypt(text: string): string {
  const iv      = crypto.randomBytes(16);
  const cipher  = crypto.createCipheriv('aes-256-cbc', ENC_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text: string): string {
  try {
    const [ivHex, encHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encHex, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return '{}';
  }
}

// ── Types ─────────────────────────────────────────────────────────────────

interface SNTicket {
  id:               string;
  number:           string;
  shortDescription: string;
  description:      string;
  priority:         string;
  status:           string;
  category:         string;
  subcategory?:     string;
  assignedTo:       string;
  assignedGroup:    string;
  requester:        string;
  createdAt:        string;
  updatedAt:        string;
  resolvedAt?:      string | null;
  closedAt?:        string | null;
  resourceType:     string;
  resourceId:       string;
  resourceRegion:   string;
  provider:         string;
  severity:         string;
  impact:           string;
  urgency:          string;
  comments:         any[];
  workNotes:        any[];
  sla: {
    breached:       boolean;
    timeRemaining:  string | null;
    responseTime:   string;
    resolutionTime: string;
  };
  costImpact?: number;
}

// ── ServiceNow REST API helper ─────────────────────────────────────────────

async function callServiceNow(
  instanceUrl: string,
  credentials: { username?: string; password?: string; apiKey?: string },
  method:      string,
  path:        string,
  body?:       any,
): Promise<any> {
  const url = `${instanceUrl}/api/now/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept:         'application/json',
  };

  if (credentials.apiKey) {
    headers['Authorization'] = `Bearer ${credentials.apiKey}`;
  } else {
    const b64 = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    headers['Authorization'] = `Basic ${b64}`;
  }

  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ServiceNow API error ${resp.status}: ${text}`);
  }

  return resp.json();
}

// ── Map ServiceNow record → SNTicket ──────────────────────────────────────

function mapSnRecord(record: any): SNTicket {
  const priorityMap: Record<string, string> = { '1':'P1', '2':'P2', '3':'P3', '4':'P4' };
  const statusMap:   Record<string, string> = {
    '1':'Open', '2':'In Progress', '3':'On Hold',
    '4':'Resolved', '5':'Closed', '6':'Canceled',
    'awaiting_info': 'Client Action Required',
  };

  return {
    id:               record.sys_id,
    number:           record.number,
    shortDescription: record.short_description,
    description:      record.description || '',
    priority:         priorityMap[record.priority] || 'P3',
    status:           statusMap[record.state] || record.state,
    category:         record.category || 'General',
    subcategory:      record.subcategory || undefined,
    assignedTo:       record.assigned_to?.display_value      || 'Unassigned',
    assignedGroup:    record.assignment_group?.display_value  || 'Unassigned',
    requester:        record.caller_id?.display_value         || 'CloudGuard Pro',
    createdAt:        record.sys_created_on,
    updatedAt:        record.sys_updated_on,
    resolvedAt:       record.resolved_at || null,
    closedAt:         record.closed_at   || null,
    resourceType:     record.u_resource_type   || 'Unknown',
    resourceId:       record.u_resource_id     || 'Unknown',
    resourceRegion:   record.u_resource_region || 'global',
    provider:         record.u_cloud_provider  || 'AWS',
    severity: record.severity === '1' ? 'Critical' : record.severity === '2' ? 'High' : record.severity === '3' ? 'Medium' : 'Low',
    impact:   record.impact   === '1' ? 'High'     : record.impact   === '2' ? 'Medium' : 'Low',
    urgency:  record.urgency  === '1' ? 'High'     : record.urgency  === '2' ? 'Medium' : 'Low',
    comments:  [],
    workNotes: [],
    sla: { breached: false, timeRemaining: null, responseTime: '4h', resolutionTime: '24h' },
    costImpact: record.u_cost_impact ? parseFloat(record.u_cost_impact) : undefined,
  };
}

// ── Load connection config from DB ─────────────────────────────────────────

async function getConfig(userId: string) {
  try {
    const row = await prisma.serviceNowConfig.findUnique({ where: { userId } });
    if (!row) return null;
    const creds = JSON.parse(decrypt(row.credentials as string));
    return { row, creds };
  } catch {
    return null;
  }
}

// ── Build CloudGuard findings that don't have tickets yet ─────────────────

async function buildFindings(userId: string): Promise<any[]> {
  const findings: any[] = [];
  try {
    const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
    for (const account of accounts) {
      const resources = await prisma.resource.findMany({
        where: { accountId: account.id },
        take:  50,
      }).catch(() => []);

      const unencryptedDBs = resources.filter((r: any) =>
        (r.resourceType?.toLowerCase().includes('rds') ||
         r.resourceType?.toLowerCase().includes('database')) &&
        r.metadata &&
        !JSON.parse(typeof r.metadata === 'string' ? r.metadata : JSON.stringify(r.metadata))?.encrypted
      );

      if (unencryptedDBs.length > 0) {
        findings.push({
          id:          `finding-enc-${account.id}`,
          type:        'compliance',
          title:       `Unencrypted Databases — ${account.accountName}`,
          description: `${unencryptedDBs.length} database(s) without encryption at rest. Violates HIPAA §164.312 and PCI DSS 3.4.`,
          severity:    'high',
          account:     account.accountName,
          resource:    unencryptedDBs[0]?.resourceId,
          hasTicket:   false,
        });
      }
    }
  } catch (err) {
    console.error('[ServiceNow] buildFindings error:', err);
  }
  return findings;
}

// ── Cache ticket rows into DB ──────────────────────────────────────────────

async function cacheTickets(configId: string, tickets: SNTicket[]) {
  for (const t of tickets) {
    try {
      await prisma.serviceNowTicket.upsert({
        where: {
          configId_ticketNumber: { configId, ticketNumber: t.number },
        },
        update: {
          status:    mapStatusEnum(t.status),
          updatedAt: new Date(),
        },
        create: {
          configId,
          ticketNumber: t.number,
          sysId:        t.id,
          type:         'INCIDENT',
          title:        t.shortDescription,
          description:  t.description,
          severity:     mapSeverityEnum(t.severity),
          status:       mapStatusEnum(t.status),
          assignee:     t.assignedTo,
          cloudAccount: t.provider,
          resourceId:   t.resourceId,
          region:       t.resourceRegion,
          category:     t.category,
          externalUrl:  '',
          resolvedAt:   t.resolvedAt ? new Date(t.resolvedAt) : null,
        },
      });
    } catch (err) {
      console.error('[ServiceNow] cacheTicket upsert error:', err);
    }
  }
}

function mapStatusEnum(status: string) {
  const map: Record<string, any> = {
    'Open':       'NEW',
    'In Progress':'IN_PROGRESS',
    'On Hold':    'ON_HOLD',
    'Resolved':   'RESOLVED',
    'Closed':     'CLOSED',
    'Canceled':   'CANCELLED',
  };
  return map[status] || 'NEW';
}

function mapSeverityEnum(sev: string) {
  const map: Record<string, any> = {
    'Critical': 'CRITICAL',
    'High':     'HIGH',
    'Medium':   'MEDIUM',
    'Low':      'LOW',
  };
  return map[sev] || 'MEDIUM';
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getTickets(userId: string) {
  const config = await getConfig(userId);

  if (!config) {
    return {
      tickets: [],
      connectionStatus: { connected: false, instance: '', lastSync: '', username: '' },
    };
  }

  try {
    const result = await callServiceNow(
      config.row.instanceUrl,
      config.creds,
      'GET',
      'table/incident?sysparm_query=active=true^ORDERBYDESCsys_created_on&sysparm_limit=50&sysparm_display_value=true',
    );

    const tickets: SNTicket[] = (result.result || []).map(mapSnRecord);

    // Persist to DB cache
    await cacheTickets(config.row.id, tickets);

    // Update lastSyncAt
    await prisma.serviceNowConfig.update({
      where: { userId },
      data:  { lastSyncAt: new Date() },
    });

    return {
      tickets,
      connectionStatus: {
        connected: true,
        instance:  config.row.instanceUrl,
        lastSync:  new Date().toISOString(),
        username:  config.creds.username || '',
      },
    };
  } catch (err: any) {
    console.error('[ServiceNow] getTickets error:', err);

    // Fall back to cached tickets from DB
    const cached = await prisma.serviceNowTicket.findMany({
      where:   { configId: config.row.id },
      orderBy: { createdAt: 'desc' },
      take:    50,
    }).catch(() => []);

    return {
      tickets: cached.map(t => ({
        id:               t.sysId || t.id,
        number:           t.ticketNumber,
        shortDescription: t.title,
        description:      t.description,
        priority:         'P3',
        status:           t.status,
        category:         t.category || 'General',
        assignedTo:       t.assignee || 'Unassigned',
        assignedGroup:    'Cloud Operations',
        requester:        'CloudGuard Pro',
        createdAt:        t.createdAt.toISOString(),
        updatedAt:        t.updatedAt.toISOString(),
        resourceType:     'Unknown',
        resourceId:       t.resourceId || 'Unknown',
        resourceRegion:   t.region || 'global',
        provider:         t.cloudAccount || 'AWS',
        severity:         t.severity,
        impact:           'Medium',
        urgency:          'Medium',
        comments: [], workNotes: [],
        sla: { breached: false, timeRemaining: null, responseTime: '4h', resolutionTime: '24h' },
      })),
      connectionStatus: {
        connected: false,
        instance:  config.row.instanceUrl,
        lastSync:  config.row.lastSyncAt?.toISOString() || '',
        username:  config.creds.username || '',
      },
      error: err.message,
    };
  }
}

export async function getFindingsWithoutTickets(userId: string) {
  const findings = await buildFindings(userId);
  return { findings };
}

export async function configureConnection(userId: string, config: {
  instance: string; username: string; password: string; apiKey?: string;
}) {
  // Test the connection first
  try {
    await callServiceNow(
      config.instance,
      { username: config.username, password: config.password, apiKey: config.apiKey },
      'GET',
      'table/incident?sysparm_limit=1',
    );
  } catch (err: any) {
    throw new Error(`Cannot connect to ServiceNow: ${err.message}`);
  }

  // Persist config with encrypted credentials
  const encryptedCreds = encrypt(JSON.stringify({
    username: config.username,
    password: config.password,
    apiKey:   config.apiKey,
  }));

  await prisma.serviceNowConfig.upsert({
    where:  { userId },
    update: {
      instanceUrl: config.instance,
      credentials: encryptedCreds,
      syncEnabled: true,
      lastSyncAt:  new Date(),
    },
    create: {
      userId,
      instanceUrl: config.instance,
      credentials: encryptedCreds,
      syncEnabled: true,
      lastSyncAt:  new Date(),
    },
  });

  return { success: true, connected: true, instance: config.instance };
}

export async function createTicket(userId: string, ticketData: any) {
  const config = await getConfig(userId);

  if (!config) {
    // Demo mode
    const demoTicketNumber = `INC${Math.floor(Math.random() * 9000000 + 1000000)}`;
    return {
      success: true,
      ticket: {
        id: `demo-${Date.now()}`,
        number:    demoTicketNumber,
        ...ticketData,
        status:    'Open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      demo: true,
    };
  }

  const priorityMap: Record<string, string> = { P1:'1', P2:'2', P3:'3', P4:'4' };
  const snPayload = {
    short_description:  ticketData.shortDescription,
    description:        ticketData.description,
    priority:           priorityMap[ticketData.priority] || '3',
    category:           ticketData.category?.toLowerCase().replace(' ', '_') || 'software',
    subcategory:        ticketData.subcategory || '',
    assignment_group:   { name: ticketData.assignedGroup || 'Cloud Operations' },
    u_resource_type:    ticketData.resourceType   || '',
    u_resource_id:      ticketData.resourceId     || '',
    u_resource_region:  ticketData.resourceRegion || '',
    u_cloud_provider:   ticketData.provider       || 'AWS',
    caller_id:          { name: 'CloudGuard Pro' },
  };

  const result = await callServiceNow(config.row.instanceUrl, config.creds, 'POST', 'table/incident', snPayload);
  const ticket = mapSnRecord(result.result);

  // Cache new ticket in DB
  await cacheTickets(config.row.id, [ticket]);

  return { success: true, ticket };
}

export async function scanAndCreateTickets(userId: string) {
  const findings      = await buildFindings(userId);
  let ticketsCreated  = 0;

  for (const finding of findings) {
    try {
      await createTicket(userId, {
        shortDescription: finding.title,
        description:      finding.description,
        priority:         finding.severity === 'critical' ? 'P1' : finding.severity === 'high' ? 'P2' : 'P3',
        category:         finding.type === 'security' ? 'Security' : finding.type === 'compliance' ? 'Compliance' : 'Cost Optimization',
        resourceType:     finding.resource || 'Unknown',
        resourceId:       finding.resource || 'Unknown',
        provider:         'AWS',
      });
      ticketsCreated++;
    } catch (err) {
      console.error('[ServiceNow] scan createTicket error:', err);
    }
  }

  return { success: true, ticketsCreated, findingsScanned: findings.length };
}