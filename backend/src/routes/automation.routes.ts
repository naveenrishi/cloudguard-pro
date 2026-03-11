// backend/src/routes/automation.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { executeAction } from '../services/automation.service';

const router = Router();

// POST /api/automation/execute
router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
  const {
    cloud,
    accountId,
    serviceId,
    actionId,
    resourceId,
    taskName,
    reason,
  } = req.body;

  if (!cloud || !serviceId || !actionId || !resourceId) {
    return res.status(400).json({
      error: 'cloud, serviceId, actionId, and resourceId are required',
    });
  }

  const userId = (req as any).user?.id;

  try {
    const result = await executeAction({
      cloud,
      accountId,
      serviceId,
      actionId,
      resourceId,
      taskName:  taskName || `${actionId}_${Date.now()}`,
      reason,
      userId,
    });

    // Log to console for audit trail (extend to DB once AutomationLog model is added)
    console.log(`[automation] LIVE EXECUTE | user=${userId} | ${cloud}/${serviceId}/${actionId} | resource=${resourceId} | task=${taskName}`);

    res.json({
      success: true,
      message: result.message,
      output:  result.output,
    });
  } catch (err: any) {
    console.error(`[automation] execute error | ${cloud}/${serviceId}/${actionId} | resource=${resourceId}:`, err.message);
    res.status(500).json({
      error:   err.message || 'Execution failed',
      success: false,
    });
  }
});

export default router;