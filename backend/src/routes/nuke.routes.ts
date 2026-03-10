import express from 'express';
import { NukeController } from '../controllers/nuke.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new NukeController();

// Get nuke config for account
router.get('/account/:accountId', authenticateToken, controller.getNukeConfig.bind(controller));

// Update nuke mode
router.put('/account/:accountId/mode', authenticateToken, controller.updateNukeMode.bind(controller));

// Scan resources
router.post('/scan/:accountId', authenticateToken, controller.scanResources.bind(controller));

// Execute nuke
router.post('/execute', authenticateToken, controller.executeNuke.bind(controller));

// Get retentions for account
router.get('/retentions/account/:accountId', authenticateToken, controller.getRetentions.bind(controller));

// Create retention
router.post('/retention', authenticateToken, controller.createRetention.bind(controller));

// Approve retention
router.post('/retention/:id/approve', authenticateToken, controller.approveRetention.bind(controller));

export default router;