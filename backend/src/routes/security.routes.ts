import express from 'express';
import { SecurityController } from '../controllers/security.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new SecurityController();

// Get security violations
router.get('/violations', authenticateToken, controller.getViolations.bind(controller));

// Search violations
router.get('/violations/search', authenticateToken, controller.searchViolations.bind(controller));

// Get violation details
router.get('/violations/:findingId', authenticateToken, controller.getViolationDetails.bind(controller));

// Update violation status
router.patch('/violations/:findingId', authenticateToken, controller.updateViolationStatus.bind(controller));

// Sync security findings for account
router.post('/account/:accountId/sync', authenticateToken, controller.syncSecurityFindings.bind(controller));

export default router;