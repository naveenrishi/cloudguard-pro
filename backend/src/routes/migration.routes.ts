// backend/src/routes/migration.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getRecommendations,
  acceptRecommendation,
  dismissRecommendation,
  getRecommendationStatus,
} from '../services/migration-advisor.service';

const router = Router();

// All migration routes require authentication
router.use(authenticateToken);

/**
 * GET /api/migration/recommendations
 * Query params:
 *   scope=all-accounts  (default)
 *   accountId=xxx       (filter to one account)
 */
router.get('/recommendations', async (req: Request, res: Response) => {
  try {
    const userId    = (req as any).user?.id;
    const scope     = req.query.scope as string | undefined;
    const accountId = req.query.accountId as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const data = await getRecommendations(userId, scope, accountId);
    return res.json(data);
  } catch (err: any) {
    console.error('[migration.routes] GET /recommendations error:', err);
    return res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

/**
 * POST /api/migration/recommendations/:id/accept
 */
router.post('/recommendations/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await acceptRecommendation(id);
    return res.json(result);
  } catch (err: any) {
    console.error('[migration.routes] POST /accept error:', err);
    return res.status(500).json({ error: 'Failed to accept recommendation' });
  }
});

/**
 * POST /api/migration/recommendations/:id/dismiss
 */
router.post('/recommendations/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await dismissRecommendation(id);
    return res.json(result);
  } catch (err: any) {
    console.error('[migration.routes] POST /dismiss error:', err);
    return res.status(500).json({ error: 'Failed to dismiss recommendation' });
  }
});

/**
 * GET /api/migration/recommendations/:id/status
 */
router.get('/recommendations/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await getRecommendationStatus(id);
    return res.json(result);
  } catch (err: any) {
    console.error('[migration.routes] GET /status error:', err);
    return res.status(500).json({ error: 'Failed to get recommendation status' });
  }
});

export default router;