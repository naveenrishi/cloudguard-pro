import express from 'express';
import * as analyticsService from '../services/analytics/analytics.service';
import * as changeTrackingService from '../services/analytics/change-tracking.service';
import * as aiAnalysisService from '../services/analytics/ai-analysis.service';
import * as demoData from '../services/analytics/demo-data.service';

const router = express.Router();

// ============================================
// COMPREHENSIVE DASHBOARD (ALL ANALYTICS)
// ============================================

// ✅ NEW: Demo-enabled comprehensive dashboard endpoint
router.get('/dashboard/:cloudAccountId/:userId', async (req, res) => {
  try {
    const { cloudAccountId, userId } = req.params;
    
    // ✅ DEMO MODE - Return demo dashboard
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo analytics dashboard for account:', cloudAccountId, 'user:', userId);
      
      const demoDashboard = {
        cost: demoData.generateDemoCostData(cloudAccountId),
        utilization: demoData.generateDemoUtilizationData(),
        security: demoData.generateDemoSecurityData(),
        performance: demoData.generateDemoPerformanceData(),
        business: demoData.generateDemoBusinessData(),
        insights: demoData.generateDemoInsights(),
        generatedAt: new Date(),
      };
      
      return res.json(demoDashboard);
    }
    
    // Real data
    const dashboard = await analyticsService.getComprehensiveDashboard(cloudAccountId, userId);
    res.json(dashboard);
  } catch (error: any) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INDIVIDUAL ANALYTICS ENDPOINTS
// ============================================

// Cost Intelligence
router.get('/cost/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    const days = parseInt(req.query.days as string) || 30;
    
    const data = await analyticsService.getCostIntelligence(cloudAccountId, days);
    res.json(data);
  } catch (error: any) {
    console.error('Cost intelligence error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Resource Utilization
router.get('/utilization/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const data = await analyticsService.getResourceUtilization(cloudAccountId, hours);
    res.json(data);
  } catch (error: any) {
    console.error('Utilization error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Security & Compliance
router.get('/security/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    
    const data = await analyticsService.getSecurityCompliance(cloudAccountId);
    res.json(data);
  } catch (error: any) {
    console.error('Security error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Performance Analytics
router.get('/performance/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    const hours = parseInt(req.query.hours as string) || 24;
    
    const data = await analyticsService.getPerformanceAnalytics(cloudAccountId, hours);
    res.json(data);
  } catch (error: any) {
    console.error('Performance error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Business Intelligence
router.get('/business/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const months = parseInt(req.query.months as string) || 3;
    
    const data = await analyticsService.getBusinessIntelligence(userId, months);
    res.json(data);
  } catch (error: any) {
    console.error('Business intelligence error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CHANGE TRACKING
// ============================================

// Get change timeline
router.get('/changes/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    
    // ✅ DEMO MODE
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo changes for account:', cloudAccountId);
      return res.json(demoData.generateDemoChanges(cloudAccountId));
    }
    
    const filters = {
      startTime: req.query.startTime ? new Date(req.query.startTime as string) : undefined,
      endTime: req.query.endTime ? new Date(req.query.endTime as string) : undefined,
      resourceType: req.query.resourceType as string,
      changedBy: req.query.changedBy as string,
      changeType: req.query.changeType as string,
    };
    
    const changes = await changeTrackingService.getUnifiedChangeTimeline(cloudAccountId, filters);
    res.json(changes);
  } catch (error: any) {
    console.error('Changes error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync changes
router.post('/changes/sync/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    
    // ✅ DEMO MODE - Just return success
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Demo mode: Skipping change sync for account:', cloudAccountId);
      return res.json({ 
        message: 'Changes synced successfully (demo mode)',
        changeCount: 50,
        success: true 
      });
    }
    
    const result = await changeTrackingService.syncChangesToTimeline(cloudAccountId);
    res.json(result);
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INCIDENTS & AI ANALYSIS
// ============================================

// Get incidents
router.get('/incidents/:cloudAccountId', async (req, res) => {
  try {
    const { cloudAccountId } = req.params;
    
    // ✅ DEMO MODE
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo incidents for account:', cloudAccountId);
      return res.json(demoData.generateDemoIncidents());
    }
    
    const incidents = await aiAnalysisService.getIncidents(cloudAccountId);
    res.json(incidents);
  } catch (error: any) {
    console.error('Incidents error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create incident
router.post('/incidents', async (req, res) => {
  try {
    // ✅ DEMO MODE - Return mock incident
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Demo mode: Creating mock incident');
      return res.json({
        id: 'demo-incident-' + Date.now(),
        ...req.body,
        status: 'investigating',
        createdAt: new Date(),
      });
    }
    
    const incident = await aiAnalysisService.createIncident(req.body);
    res.json(incident);
  } catch (error: any) {
    console.error('Create incident error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get AI analysis for incident
router.get('/incidents/:incidentId/analysis', async (req, res) => {
  try {
    const { incidentId } = req.params;
    
    // ✅ DEMO MODE - Return mock analysis
    if (process.env.DEMO_MODE === 'true') {
      console.log('🎨 Returning demo AI analysis for incident:', incidentId);
      return res.json({
        incidentId,
        rootCauses: [
          {
            id: 'rc-1',
            causeType: 'Configuration Change',
            description: 'Database connection limit was reduced from 1000 to 500',
            confidence: 0.92,
            relatedChanges: ['change-1', 'change-2'],
          }
        ],
        resolutionSteps: [
          {
            id: 'step-1',
            stepNumber: 1,
            description: 'Revert max_connections parameter to 1000',
            command: 'aws rds modify-db-parameter-group --db-parameter-group-name mydb --parameters "ParameterName=max_connections,ParameterValue=1000"',
            status: 'pending',
          }
        ],
        generatedAt: new Date(),
      });
    }
    
    const analysis = await aiAnalysisService.analyzeIncident(incidentId);
    res.json(analysis);
  } catch (error: any) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;