import express from 'express';
import * as migrationService from '../services/migration/migration-advisor.service';
import * as tcoService from '../services/migration/tco-calculator.service';

const router = express.Router();

// ============================================
// MIGRATION RECOMMENDATIONS
// ============================================

// Get all migration recommendations for user
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const recommendations = await migrationService.getMigrationRecommendations(userId);
    res.json(recommendations);
  } catch (error: any) {
    console.error('Migration recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get service comparison across clouds
router.get('/compare/services', async (req, res) => {
  try {
    const { userId, serviceType } = req.query;
    
    const comparison = await migrationService.getServiceComparison(
      userId as string,
      serviceType as string
    );
    
    res.json(comparison);
  } catch (error: any) {
    console.error('Service comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cost breakdown for specific cloud account
router.get('/costs/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    
    const breakdown = await migrationService.getCostBreakdown(cloudAccountId);
    res.json(breakdown);
  } catch (error: any) {
    console.error('Cost breakdown error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate migration plan for specific recommendation
router.post('/plan/generate', async (req, res) => {
  try {
    const { recommendationId, userId } = req.body;
    
    if (!recommendationId || !userId) {
      return res.status(400).json({ error: 'recommendationId and userId required' });
    }
    
    const plan = await migrationService.generateMigrationPlan(recommendationId, userId);
    res.json(plan);
  } catch (error: any) {
    console.error('Generate plan error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze workloads
router.get('/workloads/analyze/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const analysis = await migrationService.analyzeWorkloads(userId);
    res.json(analysis);
  } catch (error: any) {
    console.error('Workload analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Compare pricing for specific service type
router.post('/compare/pricing', async (req, res) => {
  try {
    const { serviceType, specifications } = req.body;
    
    if (!serviceType || !specifications) {
      return res.status(400).json({ error: 'serviceType and specifications required' });
    }
    
    const comparison = await migrationService.comparePricing(serviceType, specifications);
    res.json(comparison);
  } catch (error: any) {
    console.error('Pricing comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TCO CALCULATOR
// ============================================

// Get TCO analysis
router.get('/tco/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { timeframe } = req.query;
    
    const tco = await tcoService.calculateTCO(userId, timeframe as string || '5-year');
    res.json(tco);
  } catch (error: any) {
    console.error('TCO calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get cross-account cost aggregation
router.get('/tco/cross-account/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const costs = await tcoService.aggregateCrossAccountCosts(userId);
    res.json(costs);
  } catch (error: any) {
    console.error('Cross-account costs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate what-if scenario
router.post('/tco/what-if', async (req, res) => {
  try {
    const { userId, scenario } = req.body;
    
    if (!userId || !scenario) {
      return res.status(400).json({ error: 'userId and scenario required' });
    }
    
    const result = await tcoService.calculateWhatIfScenario(userId, scenario);
    res.json(result);
  } catch (error: any) {
    console.error('What-if scenario error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Analyze hidden costs
router.get('/tco/hidden-costs/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const analysis = await tcoService.analyzeHiddenCosts(userId);
    res.json(analysis);
  } catch (error: any) {
    console.error('Hidden costs analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Calculate migration ROI
router.post('/tco/roi', async (req, res) => {
  try {
    const { userId, migrationPlan } = req.body;
    
    if (!userId || !migrationPlan) {
      return res.status(400).json({ error: 'userId and migrationPlan required' });
    }
    
    const roi = await tcoService.calculateMigrationROI(userId, migrationPlan);
    res.json(roi);
  } catch (error: any) {
    console.error('ROI calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;