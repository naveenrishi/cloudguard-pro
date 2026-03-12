// backend/src/routes/nuke.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { prisma } from '../lib/prisma';
import {
  scanAllAWSResources,
  scanAllAzureResources,
  scanAllGCPResources,
  generateNukeConfig,
  performDryRun,
  executeLiveNuke,
  AWS_SERVICE_CATEGORIES,
  AZURE_SERVICE_CATEGORIES,
  GCP_SERVICE_CATEGORIES,
} from '../services/nuke.service';

const router = Router();

function durationString(startedAt: Date): string {
  const s = Math.floor((Date.now() - startedAt.getTime()) / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

// ─── GET /api/nuke/account/:accountId ─────────────────────────────────────

router.get('/account/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await prisma.cloudAccount.findFirst({
      where: { id: accountId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let config = await prisma.nukeConfig.findUnique({ where: { accountId } });
    if (!config) {
      config = await prisma.nukeConfig.create({
        data: { accountId, mode: 'AUTOMATIC', enabled: true, notificationEmails: '[]' },
      });
    }

    const nukeRuns = await prisma.nukeRun.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({
      account: { id: account.id, provider: account.provider, accountName: account.accountName, accountId: account.accountId },
      config: { ...config, notificationEmails: JSON.parse(config.notificationEmails || '[]') },
      nukeRuns,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/nuke/resources/:accountId ───────────────────────────────────

router.get('/resources/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await prisma.cloudAccount.findFirst({
      where: { id: accountId },
    });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const provider = account.provider.toLowerCase();
    let resources: any[] = [];
    if (provider === 'aws') resources = await scanAllAWSResources(account);
    else if (provider === 'azure') resources = await scanAllAzureResources(account);
    else if (provider === 'gcp') resources = await scanAllGCPResources(account);

    const retentions = await prisma.nukeRetention.findMany({ where: { accountId, status: 'ACTIVE' } });
    const retainedMap = new Map(retentions.map((r: any) => [r.cloudResourceId, r.id]));

    const annotated = resources.map((r: any) => ({
      ...r,
      isRetained: retainedMap.has(r.id),
      retentionId: retainedMap.get(r.id) || null,
    }));

    res.json({ resources: annotated, total: annotated.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/nuke/services/:provider ─────────────────────────────────────

router.get('/services/:provider', authenticateToken, async (req: Request, res: Response) => {
  const map: Record<string, any> = { aws: AWS_SERVICE_CATEGORIES, azure: AZURE_SERVICE_CATEGORIES, gcp: GCP_SERVICE_CATEGORIES };
  const categories = map[req.params.provider.toLowerCase()];
  if (!categories) return res.status(400).json({ error: 'Unknown provider' });
  res.json({ categories });
});

// ─── GET /api/nuke/retentions/account/:accountId ──────────────────────────

router.get('/retentions/account/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const retentions = await prisma.nukeRetention.findMany({
      where: { accountId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } },
    });

    res.json({
      retentions: retentions.map((r: any) => ({
        id: r.id,
        cloudResourceId: r.cloudResourceId,
        resourceType: r.resourceType,
        resourceName: r.resourceName,
        resourceRegion: r.resourceRegion,
        retentionType: r.retentionType,
        expiresAt: r.expiresAt,
        retainDays: r.retainDays,
        reason: r.reason,
        status: r.status,
        addedBy: r.user?.name || r.user?.email || 'Unknown',
        createdAt: r.createdAt,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/nuke/retention ─────────────────────────────────────────────

router.post('/retention', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { accountId, cloudResourceId, resourceType, resourceName, resourceRegion, resourceMeta, retentionType = 'PERMANENT', expiresAt, retainDays, reason } = req.body;

    if (!accountId || !cloudResourceId || !resourceName || !reason) {
      return res.status(400).json({ error: 'accountId, cloudResourceId, resourceName and reason are required' });
    }

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const existing = await prisma.nukeRetention.findFirst({ where: { accountId, cloudResourceId, status: 'ACTIVE' } });
    if (existing) return res.status(409).json({ error: 'Retention already exists for this resource', retentionId: existing.id });

    const retention = await prisma.nukeRetention.create({
      data: {
        accountId,
        userId,
        cloudResourceId,
        resourceType: resourceType || 'Unknown',
        resourceName,
        resourceRegion: resourceRegion || null,
        resourceMeta: resourceMeta ? JSON.stringify(resourceMeta) : null,
        retentionType,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        retainDays: retainDays ? parseInt(retainDays) : null,
        reason,
        status: 'ACTIVE',
      },
    });

    // Invalidate cached nukeCode so retentions are reflected on next fetch
    await prisma.nukeConfig.updateMany({ where: { accountId }, data: { nukeCode: null } });

    res.status(201).json({ retention, message: 'Resource added to retention — will be skipped during nuke' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/nuke/retention/:id ───────────────────────────────────────

router.delete('/retention/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const retention = await prisma.nukeRetention.findFirst({ where: { id: req.params.id, userId } });
    if (!retention) return res.status(404).json({ error: 'Retention not found' });

    await prisma.nukeRetention.update({ where: { id: req.params.id }, data: { status: 'REMOVED' } });

    // Invalidate cached nukeCode
    await prisma.nukeConfig.updateMany({ where: { accountId: retention.accountId }, data: { nukeCode: null } });

    res.json({ message: 'Retention removed — resource will be included in future nuke runs' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/nuke/code/:accountId ────────────────────────────────────────

router.get('/code/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { refresh } = req.query;

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const config = await prisma.nukeConfig.findUnique({ where: { accountId } });

    if (config?.nukeCode && refresh !== 'true') {
      return res.json({ nukeCode: config.nukeCode, cached: true });
    }

    const retentions = await prisma.nukeRetention.findMany({ where: { accountId, status: 'ACTIVE' } });
    const nukeCode = await generateNukeConfig(account, retentions);

    await prisma.nukeConfig.upsert({
      where: { accountId },
      update: { nukeCode },
      create: { accountId, mode: 'AUTOMATIC', enabled: true, notificationEmails: '[]', nukeCode },
    });

    res.json({ nukeCode, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/nuke/dry-run/:accountId ────────────────────────────────────

router.post('/dry-run/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const user = (req as any).user;

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let config = await prisma.nukeConfig.findUnique({ where: { accountId } });
    if (!config) {
      config = await prisma.nukeConfig.create({ data: { accountId, mode: 'AUTOMATIC', enabled: true, notificationEmails: '[]' } });
    }

    const startedAt = new Date();
    const run = await prisma.nukeRun.create({
      data: { configId: config.id, userId: user.id, runType: 'DRY_RUN', status: 'RUNNING', triggeredBy: user.name || user.email, startedAt },
    });

    const retentions = await prisma.nukeRetention.findMany({ where: { accountId, status: 'ACTIVE' } });
    const result = await performDryRun(account, retentions);

    await prisma.nukeRun.update({
      where: { id: run.id },
      data: {
        status: 'COMPLETED',
        totalResources: result.total,
        wouldDelete: result.wouldDelete.length,
        retainedResources: result.wouldRetain.length,
        skippedResources: result.wouldSkip.length,
        dryRunReport: JSON.stringify(result),
        completedAt: new Date(),
        duration: durationString(startedAt),
      },
    });

    res.json({ runId: run.id, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/nuke/execute ────────────────────────────────────────────────

router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { accountId, dryRun = true } = req.body;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    let config = await prisma.nukeConfig.findUnique({ where: { accountId } });
    if (!config) {
      config = await prisma.nukeConfig.create({ data: { accountId, mode: 'AUTOMATIC', enabled: true, notificationEmails: '[]' } });
    }

    const startedAt = new Date();
    const runType = dryRun ? 'DRY_RUN' : 'LIVE';

    const run = await prisma.nukeRun.create({
      data: { configId: config.id, userId: user.id, runType, status: 'RUNNING', triggeredBy: user.name || user.email, startedAt },
    });

    const retentions = await prisma.nukeRetention.findMany({ where: { accountId, status: 'ACTIVE' } });
    let result: any;

    if (dryRun) {
      result = await performDryRun(account, retentions);
      await prisma.nukeRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          totalResources: result.total,
          wouldDelete: result.wouldDelete.length,
          retainedResources: result.wouldRetain.length,
          skippedResources: result.wouldSkip.length,
          dryRunReport: JSON.stringify(result),
          completedAt: new Date(),
          duration: durationString(startedAt),
        },
      });
    } else {
      result = await executeLiveNuke(account, retentions);
      await prisma.nukeRun.update({
        where: { id: run.id },
        data: {
          status: 'COMPLETED',
          totalResources: result.total || 0,
          deletedResources: result.deleted?.length || 0,
          retainedResources: result.retained?.length || 0,
          failedResources: result.failed?.length || 0,
          skippedResources: result.skipped?.length || 0,
          completedAt: new Date(),
          duration: durationString(startedAt),
        },
      });
      // Invalidate cached YAML after live run
      await prisma.nukeConfig.update({ where: { accountId }, data: { nukeCode: null } });
    }

    res.json({ runId: run.id, dryRun, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/nuke/history/:accountId ─────────────────────────────────────

router.get('/history/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { limit = '20' } = req.query;

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const config = await prisma.nukeConfig.findUnique({ where: { accountId } });
    if (!config) return res.json({ runs: [] });

    const runs = await prisma.nukeRun.findMany({
      where: { configId: config.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      include: { user: { select: { name: true, email: true } } },
    });

    res.json({
      runs: runs.map(r => ({
        id: r.id,
        runType: r.runType,
        status: r.status,
        totalResources: r.totalResources,
        deletedResources: r.deletedResources,
        retainedResources: r.retainedResources,
        failedResources: r.failedResources,
        skippedResources: r.skippedResources,
        wouldDelete: r.wouldDelete,
        triggeredBy: r.triggeredBy || r.user?.name || r.user?.email,
        startedAt: r.startedAt,
        completedAt: r.completedAt,
        duration: r.duration,
        createdAt: r.createdAt,
        hasDryRunReport: !!r.dryRunReport,
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/nuke/history/:accountId/run/:runId ──────────────────────────

router.get('/history/:accountId/run/:runId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId, runId } = req.params;
    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const config = await prisma.nukeConfig.findUnique({ where: { accountId } });
    if (!config) return res.status(404).json({ error: 'Config not found' });

    const run = await prisma.nukeRun.findFirst({ where: { id: runId, configId: config.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });

    res.json({
      run: {
        ...run,
        dryRunReport: run.dryRunReport ? JSON.parse(run.dryRunReport) : null,
        skippedDetails: run.skippedDetails ? JSON.parse(run.skippedDetails) : null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/nuke/account/:accountId/settings ────────────────────────────

router.put('/account/:accountId/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { mode, enabled, scheduleLabel, nextRunAt, notificationDays, notificationEmails } = req.body;

    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const config = await prisma.nukeConfig.upsert({
      where: { accountId },
      update: {
        ...(mode !== undefined && { mode }),
        ...(enabled !== undefined && { enabled }),
        ...(scheduleLabel !== undefined && { scheduleLabel }),
        ...(nextRunAt !== undefined && { nextRunAt: nextRunAt ? new Date(nextRunAt) : null }),
        ...(notificationDays !== undefined && { notificationDays }),
        ...(notificationEmails !== undefined && { notificationEmails: JSON.stringify(notificationEmails) }),
      },
      create: {
        accountId,
        mode: mode || 'AUTOMATIC',
        enabled: enabled ?? true,
        scheduleLabel: scheduleLabel || null,
        nextRunAt: nextRunAt ? new Date(nextRunAt) : null,
        notificationDays: notificationDays || 7,
        notificationEmails: JSON.stringify(notificationEmails || []),
      },
    });

    res.json({ config: { ...config, notificationEmails: JSON.parse(config.notificationEmails || '[]') } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Backward-compat alias
router.put('/account/:accountId/mode', authenticateToken, async (req: Request, res: Response) => {
  const { accountId } = req.params;
  const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
  if (!account) return res.status(404).json({ error: 'Account not found' });
  const config = await prisma.nukeConfig.upsert({
    where: { accountId },
    update: req.body,
    create: { accountId, mode: 'AUTOMATIC', enabled: true, notificationEmails: '[]', ...req.body },
  });
  res.json({ config });
});

// ─── POST /api/nuke/scan/:accountId ───────────────────────────────────────

router.post('/scan/:accountId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const account = await prisma.cloudAccount.findFirst({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });

    const provider = account.provider.toLowerCase();
    let resources: any[] = [];
    if (provider === 'aws') resources = await scanAllAWSResources(account);
    else if (provider === 'azure') resources = await scanAllAzureResources(account);
    else if (provider === 'gcp') resources = await scanAllGCPResources(account);

    res.json({ resources, total: resources.length, scannedAt: new Date() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/nuke/retention/:id/approve — no-op ─────────────────────────

router.post('/retention/:id/approve', authenticateToken, async (_req: Request, res: Response) => {
  res.json({ message: 'Retentions are instantly active — no approval required' });
});

export default router;