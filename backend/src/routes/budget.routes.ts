import express from 'express';
import * as budgetService from '../services/budget.service';
import * as activityService from '../services/activity.service';

const router = express.Router();

// Create budget
router.post('/create', async (req, res) => {
  try {
    const budget = await budgetService.createBudget(req.body);
    res.json({ message: 'Budget created successfully', budget });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user budgets
router.get('/:userId', async (req, res) => {
  try {
    const budgets = await budgetService.getUserBudgets(req.params.userId);
    res.json({ budgets });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get cost anomalies
router.get('/anomalies/:userId', async (req, res) => {
  try {
    const anomalies = await budgetService.detectCostAnomalies(req.params.userId);
    res.json({ anomalies });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get recommendations
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const recommendations = await budgetService.generateRecommendations(req.params.userId);
    res.json({ recommendations });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get activity feed
router.get('/activity/:userId', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const activities = await activityService.getActivityFeed(req.params.userId, limit);
    const unreadCount = await activityService.getUnreadCount(req.params.userId);
    res.json({ activities, unreadCount });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Mark activities as read
router.post('/activity/mark-read', async (req, res) => {
  try {
    await activityService.markAsRead(req.body.activityIds);
    res.json({ message: 'Activities marked as read' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
