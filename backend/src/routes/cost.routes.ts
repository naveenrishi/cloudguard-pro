import express from 'express';
import { CostController } from '../controllers/cost.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new CostController();

// Get cost analysis
router.get('/analysis', authenticateToken, controller.getCostAnalysis.bind(controller));

// Sync cost data for account
router.post('/account/:accountId/sync', authenticateToken, controller.syncCostData.bind(controller));

// Get cost forecast
router.get('/forecast', authenticateToken, async (req, res) => {
  // TODO: Implement cost forecasting
  res.json({ message: 'Cost forecast endpoint' });
});

// Get cost trends
router.get('/trends', authenticateToken, async (req, res) => {
  // TODO: Implement cost trends
  res.json({ message: 'Cost trends endpoint' });
});

export default router;