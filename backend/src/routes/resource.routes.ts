import express from 'express';
import { ResourceController } from '../controllers/resource.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new ResourceController();

// Search resources across all accounts
router.get('/search', authenticateToken, controller.searchResources.bind(controller));

// Get resources for specific account
router.get('/account/:accountId', authenticateToken, controller.getAccountResources.bind(controller));

// Get resource details
router.get('/:resourceId', authenticateToken, controller.getResourceDetails.bind(controller));

export default router;