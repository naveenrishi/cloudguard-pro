import express from 'express';
import { OptimizationController } from '../controllers/optimization.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new OptimizationController();

// Get all recommendations
router.get('/recommendations', authenticateToken, controller.getRecommendations.bind(controller));

// Get recommendations by account
router.get('/account/:accountId/recommendations', authenticateToken, controller.getAccountRecommendations.bind(controller));

// Update recommendation status
router.patch('/recommendations/:recommendationId', authenticateToken, controller.updateRecommendationStatus.bind(controller));

// Generate new recommendations
router.post('/account/:accountId/generate', authenticateToken, controller.generateRecommendations.bind(controller));

export default router;