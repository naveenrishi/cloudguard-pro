// backend/src/routes/alerts.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getAlerts,
  getAlertSummary,
  updateAlertStatus,
  bulkUpdateAlerts,
  scanAndGenerateAlerts,
  cleanupOldAlerts,
} from '../services/alerts.service';

const router = Router();
router.use(authenticateToken);

// GET /api/alerts — list with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { status, severity, type, cloudAccountId, provider, limit, offset } = req.query;

    const result = await getAlerts(userId, {
      status:         status         as any,
      severity:       severity       as any,
      type:           type           as any,
      cloudAccountId: cloudAccountId as string,
      provider:       provider       as string,
      limit:          limit  ? parseInt(limit  as string) : 50,
      offset:         offset ? parseInt(offset as string) : 0,
    });

    return res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[alerts] list error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// GET /api/alerts/summary
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const summary = await getAlertSummary(userId);
    return res.json({ success: true, data: summary });
  } catch (err: any) {
    console.error('[alerts] summary error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

// POST /api/alerts/scan — trigger alert generation from live data
router.post('/scan', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const count  = await scanAndGenerateAlerts(userId);
    return res.json({ success: true, generated: count });
  } catch (err: any) {
    console.error('[alerts] scan error:', err.message);
    return res.status(500).json({ error: 'Failed to scan for alerts' });
  }
});

// PATCH /api/alerts/:id — update single alert status
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const { status } = req.body;
    const userName   = (req as any).user?.name || (req as any).user?.email || 'User';

    if (!status) return res.status(400).json({ error: 'status required' });

    const alert = await updateAlertStatus(req.params.id, userId, status, userName);
    return res.json({ success: true, alert });
  } catch (err: any) {
    console.error('[alerts] update error:', err.message);
    return res.status(500).json({ error: 'Failed to update alert' });
  }
});

// POST /api/alerts/bulk — bulk status update
router.post('/bulk', async (req: Request, res: Response) => {
  try {
    const userId   = (req as any).user?.id || (req as any).user?.userId;
    const { alertIds, status } = req.body;

    if (!alertIds?.length || !status) {
      return res.status(400).json({ error: 'alertIds and status required' });
    }

    const result = await bulkUpdateAlerts(alertIds, userId, status);
    return res.json({ success: true, updated: result.count });
  } catch (err: any) {
    console.error('[alerts] bulk error:', err.message);
    return res.status(500).json({ error: 'Failed to bulk update alerts' });
  }
});

// DELETE /api/alerts/cleanup — remove old resolved/dismissed alerts
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id || (req as any).user?.userId;
    const result = await cleanupOldAlerts(userId);
    return res.json({ success: true, deleted: result.count });
  } catch (err: any) {
    console.error('[alerts] cleanup error:', err.message);
    return res.status(500).json({ error: 'Failed to cleanup alerts' });
  }
});

export default router;