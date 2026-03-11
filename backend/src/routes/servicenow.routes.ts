// backend/src/routes/servicenow.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getTickets,
  getFindingsWithoutTickets,
  configureConnection,
  createTicket,
  scanAndCreateTickets,
} from '../services/servicenow.service';

const router = Router();

router.use(authenticateToken);

/**
 * GET /api/servicenow/tickets/:userId
 */
router.get('/tickets/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;

    // Users can only access their own tickets
    if (authUser?.id !== userId && authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const data = await getTickets(userId);
    return res.json(data);
  } catch (err: any) {
    console.error('[servicenow.routes] GET /tickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

/**
 * GET /api/servicenow/findings-without-tickets
 * Uses JWT user id from token
 */
router.get('/findings-without-tickets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const data = await getFindingsWithoutTickets(userId);
    return res.json(data);
  } catch (err: any) {
    console.error('[servicenow.routes] GET /findings-without-tickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch findings' });
  }
});

/**
 * POST /api/servicenow/configure/:userId
 * Body: { instance, username, password, apiKey? }
 */
router.post('/configure/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;

    if (authUser?.id !== userId && authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { instance, username, password, apiKey } = req.body;

    if (!instance || (!apiKey && (!username || !password))) {
      return res.status(400).json({ error: 'instance and (apiKey or username+password) are required' });
    }

    const result = await configureConnection(userId, { instance, username, password, apiKey });
    return res.json(result);
  } catch (err: any) {
    console.error('[servicenow.routes] POST /configure error:', err);
    return res.status(400).json({ error: err.message || 'Failed to configure ServiceNow' });
  }
});

/**
 * POST /api/servicenow/tickets/:userId  — create a ticket manually
 * Body: { shortDescription, description, priority, category, ... }
 */
router.post('/tickets/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;

    if (authUser?.id !== userId && authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await createTicket(userId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('[servicenow.routes] POST /tickets error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create ticket' });
  }
});

/**
 * POST /api/servicenow/tickets  — create ticket from a finding (no userId in path)
 */
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await createTicket(userId, req.body);
    return res.json(result);
  } catch (err: any) {
    console.error('[servicenow.routes] POST /tickets (no userId) error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create ticket' });
  }
});

/**
 * POST /api/servicenow/scan/:userId  — scan all accounts and auto-create tickets
 */
router.post('/scan/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const authUser = (req as any).user;

    if (authUser?.id !== userId && authUser?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const result = await scanAndCreateTickets(userId);
    return res.json(result);
  } catch (err: any) {
    console.error('[servicenow.routes] POST /scan error:', err);
    return res.status(500).json({ error: 'Failed to run scan' });
  }
});

export default router;