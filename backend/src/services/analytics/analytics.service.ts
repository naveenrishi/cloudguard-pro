import prisma from '../../config/database';
import * as demoData from './demo-data.service';

// ✅ Demo mode flag
const DEMO_MODE = process.env.DEMO_MODE === 'true';

// ============================================
// 1. COST INTELLIGENCE ANALYTICS
// ============================================

export const getCostIntelligence = async (cloudAccountId: string, days: number = 30) => {
  try {
    // ✅ RETURN DEMO DATA IF IN DEMO MODE
    if (DEMO_MODE) {
      console.log('🎨 Returning demo cost intelligence data');
      return demoData.generateDemoCostData(cloudAccountId);
    }

    // Real data
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get cost data
    const costs = await prisma.costData.findMany({
      where: {
        cloudAccountId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Aggregate by service
    const serviceBreakdown: { [key: string]: number } = {};
    let totalCost = 0;

    costs.forEach(cost => {
      const service = cost.service || 'Other';
      serviceBreakdown[service] = (serviceBreakdown[service] || 0) + cost.costAmount;
      totalCost += cost.costAmount;
    });

    // Get anomalies
    const anomalies = await prisma.costAnomaly.findMany({
      where: {
        cloudAccountId,
        date: { gte: startDate },
      },
      orderBy: { date: 'desc' },
      take: 10,
    });

    // Get forecasts
    const forecasts = await prisma.costForecast.findMany({
      where: {
        cloudAccountId,
        forecastDate: { gte: new Date() },
      },
      orderBy: { forecastDate: 'asc' },
      take: 90,
    });

    // Get optimization opportunities
    const optimizations = await prisma.costOptimization.findMany({
      where: {
        cloudAccountId,
        status: { in: ['pending', 'approved'] },
      },
      orderBy: { monthlySavings: 'desc' },
    });

    const totalSavingsOpportunity = optimizations.reduce((sum, opt) => sum + opt.monthlySavings, 0);

    return {
      summary: {
        totalCost,
        averageDailyCost: totalCost / days,
        anomalyCount: anomalies.filter(a => a.isReviewed === false).length,
        savingsOpportunity: totalSavingsOpportunity,
      },
      serviceBreakdown,
      costTrend: costs.map(c => ({ date: c.date, amount: c.costAmount, service: c.service })),
      anomalies,
      forecasts,
      optimizations,
    };
  } catch (error: any) {
    console.error('Error getting cost intelligence:', error);
    throw error;
  }
};

// ============================================
// 2. RESOURCE UTILIZATION INTELLIGENCE
// ============================================

export const getResourceUtilization = async (cloudAccountId: string, hours: number = 24) => {
  try {
    if (DEMO_MODE) {
      console.log('🎨 Returning demo utilization data');
      return demoData.generateDemoUtilizationData();
    }

    // Real data
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const metrics = await prisma.resourceUtilization.findMany({
      where: {
        cloudAccountId,
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'asc' },
    });

    const utilizationByType: { [key: string]: any } = {};

    metrics.forEach(metric => {
      if (!utilizationByType[metric.resourceType]) {
        utilizationByType[metric.resourceType] = {
          count: 0,
          avgCpu: 0,
          avgMemory: 0,
          avgDisk: 0,
        };
      }

      const type = utilizationByType[metric.resourceType];
      type.count++;
      type.avgCpu += metric.cpuUtilization || 0;
      type.avgMemory += metric.memoryUtilization || 0;
      type.avgDisk += metric.diskUtilization || 0;
    });

    Object.keys(utilizationByType).forEach(type => {
      const data = utilizationByType[type];
      data.avgCpu = data.avgCpu / data.count;
      data.avgMemory = data.avgMemory / data.count;
      data.avgDisk = data.avgDisk / data.count;
    });

    const idleResources = await prisma.idleResource.findMany({
      where: {
        cloudAccountId,
        status: { in: ['detected', 'confirmed'] },
      },
      orderBy: { potentialSavings: 'desc' },
    });

    const totalWaste = idleResources.reduce((sum, r) => sum + r.potentialSavings, 0);

    return {
      summary: {
        totalResources: Object.values(utilizationByType).reduce((sum: number, t: any) => sum + t.count, 0),
        idleResourceCount: idleResources.length,
        wastedCost: totalWaste,
      },
      utilizationByType,
      metrics,
      idleResources,
      heatmap: generateUtilizationHeatmap(metrics),
    };
  } catch (error: any) {
    console.error('Error getting resource utilization:', error);
    throw error;
  }
};

const generateUtilizationHeatmap = (metrics: any[]) => {
  const heatmap: { [hour: string]: number } = {};

  metrics.forEach(metric => {
    const hour = metric.timestamp.getHours();
    const key = `${hour.toString().padStart(2, '0')}:00`;
    
    if (!heatmap[key]) heatmap[key] = 0;
    heatmap[key] += metric.cpuUtilization || 0;
  });

  return Object.entries(heatmap).map(([hour, utilization]) => ({
    hour,
    utilization: utilization / (metrics.filter(m => m.timestamp.getHours() === parseInt(hour)).length || 1),
  }));
};

// ============================================
// 3. SECURITY & COMPLIANCE ANALYTICS
// ============================================

export const getSecurityCompliance = async (cloudAccountId: string) => {
  try {
    if (DEMO_MODE) {
      console.log('🎨 Returning demo security data');
      return demoData.generateDemoSecurityData();
    }

    // Real data
    const latestPosture = await prisma.securityPostureHistory.findFirst({
      where: { cloudAccountId },
      orderBy: { timestamp: 'desc' },
    });

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const postureHistory = await prisma.securityPostureHistory.findMany({
      where: {
        cloudAccountId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const violations = await prisma.complianceViolation.findMany({
      where: {
        cloudAccountId,
        status: 'open',
      },
      orderBy: [
        { severity: 'asc' },
        { detectedAt: 'desc' },
      ],
    });

    const violationsByFramework: { [key: string]: any[] } = {};
    violations.forEach(v => {
      if (!violationsByFramework[v.framework]) {
        violationsByFramework[v.framework] = [];
      }
      violationsByFramework[v.framework].push(v);
    });

    const severityCount = {
      critical: violations.filter(v => v.severity === 'critical').length,
      high: violations.filter(v => v.severity === 'high').length,
      medium: violations.filter(v => v.severity === 'medium').length,
      low: violations.filter(v => v.severity === 'low').length,
    };

    return {
      currentScore: latestPosture?.overallScore || 0,
      scoreHistory: postureHistory.map(p => ({
        date: p.timestamp,
        score: p.overallScore,
      })),
      complianceScores: latestPosture?.complianceScores || {},
      violations: {
        total: violations.length,
        byFramework: violationsByFramework,
        bySeverity: severityCount,
        list: violations.slice(0, 20),
      },
      trend: calculateSecurityTrend(postureHistory),
    };
  } catch (error: any) {
    console.error('Error getting security compliance:', error);
    throw error;
  }
};

const calculateSecurityTrend = (history: any[]) => {
  if (history.length < 2) return 'stable';
  
  const recent = history[history.length - 1].overallScore;
  const previous = history[0].overallScore;
  
  if (recent > previous + 5) return 'improving';
  if (recent < previous - 5) return 'declining';
  return 'stable';
};

// ============================================
// 4. PERFORMANCE ANALYTICS
// ============================================

export const getPerformanceAnalytics = async (cloudAccountId: string, hours: number = 24) => {
  try {
    if (DEMO_MODE) {
      console.log('🎨 Returning demo performance data');
      return demoData.generateDemoPerformanceData();
    }

    // Real data
    const startTime = new Date();
    startTime.setHours(startTime.getHours() - hours);

    const metrics = await prisma.performanceMetric.findMany({
      where: {
        cloudAccountId,
        timestamp: { gte: startTime },
      },
      orderBy: { timestamp: 'asc' },
    });

    const metricsByType: { [key: string]: any } = {};

    metrics.forEach(metric => {
      if (!metricsByType[metric.metricType]) {
        metricsByType[metric.metricType] = {
          p50: [],
          p95: [],
          p99: [],
          errorRate: 0,
          totalCount: 0,
        };
      }

      const type = metricsByType[metric.metricType];
      if (metric.p50) type.p50.push(metric.p50);
      if (metric.p95) type.p95.push(metric.p95);
      if (metric.p99) type.p99.push(metric.p99);
      type.totalCount += metric.count || 0;
      type.errorRate += metric.errorCount || 0;
    });

    Object.keys(metricsByType).forEach(type => {
      const data = metricsByType[type];
      data.avgP50 = data.p50.length ? data.p50.reduce((a: number, b: number) => a + b, 0) / data.p50.length : 0;
      data.avgP95 = data.p95.length ? data.p95.reduce((a: number, b: number) => a + b, 0) / data.p95.length : 0;
      data.avgP99 = data.p99.length ? data.p99.reduce((a: number, b: number) => a + b, 0) / data.p99.length : 0;
      data.errorRatePercent = data.totalCount ? (data.errorRate / data.totalCount) * 100 : 0;
    });

    const alerts = await prisma.performanceAlert.findMany({
      where: {
        cloudAccountId,
        status: { in: ['open', 'acknowledged'] },
      },
      orderBy: { triggeredAt: 'desc' },
    });

    return {
      summary: {
        avgResponseTime: metricsByType.api_response_time?.avgP50 || 0,
        errorRate: metricsByType.api_response_time?.errorRatePercent || 0,
        activeAlerts: alerts.length,
      },
      metricsByType,
      alerts,
      timeline: metrics.map(m => ({
        timestamp: m.timestamp,
        metricType: m.metricType,
        p50: m.p50,
        p95: m.p95,
        p99: m.p99,
      })),
    };
  } catch (error: any) {
    console.error('Error getting performance analytics:', error);
    throw error;
  }
};

// ============================================
// 5. BUSINESS INTELLIGENCE
// ============================================

export const getBusinessIntelligence = async (userId: string, months: number = 3) => {
  try {
    if (DEMO_MODE) {
      console.log('🎨 Returning demo business data');
      return demoData.generateDemoBusinessData();
    }

    // Real data
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const metrics = await prisma.businessMetric.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      orderBy: { timestamp: 'asc' },
    });

    const allocations = await prisma.teamCostAllocation.findMany({
      where: {
        month: { gte: startDate },
      },
      orderBy: { month: 'asc' },
    });

    const revenue = metrics.filter(m => m.metricType === 'revenue').reduce((sum, m) => sum + m.value, 0);
    const cloudCost = metrics.filter(m => m.metricType === 'cloud_cost').reduce((sum, m) => sum + m.value, 0);
    const roi = cloudCost > 0 ? revenue / cloudCost : 0;

    const customerCount = metrics.find(m => m.metricType === 'customer_count')?.value || 1;
    const costPerCustomer = cloudCost / customerCount;

    const teamBreakdown: { [team: string]: number } = {};
    allocations.forEach(alloc => {
      teamBreakdown[alloc.teamName] = (teamBreakdown[alloc.teamName] || 0) + alloc.totalCost;
    });

    return {
      summary: {
        totalRevenue: revenue,
        totalCloudCost: cloudCost,
        roi,
        costPerCustomer,
        customerCount,
      },
      teamBreakdown,
      monthlyTrend: aggregateByMonth(metrics),
      allocations,
    };
  } catch (error: any) {
    console.error('Error getting business intelligence:', error);
    throw error;
  }
};

const aggregateByMonth = (metrics: any[]) => {
  const monthly: { [month: string]: any } = {};

  metrics.forEach(metric => {
    const month = metric.timestamp.toISOString().substring(0, 7);
    if (!monthly[month]) {
      monthly[month] = { revenue: 0, cost: 0, customers: 0 };
    }

    if (metric.metricType === 'revenue') monthly[month].revenue += metric.value;
    if (metric.metricType === 'cloud_cost') monthly[month].cost += metric.value;
    if (metric.metricType === 'customer_count') monthly[month].customers = metric.value;
  });

  return Object.entries(monthly).map(([month, data]) => ({ month, ...data }));
};

// ============================================
// 6. COMPREHENSIVE DASHBOARD DATA
// ============================================

export const getComprehensiveDashboard = async (cloudAccountId: string, userId: string) => {
  try {
    if (DEMO_MODE) {
      console.log('🎨 Returning demo dashboard data');
      return {
        cost: demoData.generateDemoCostData(cloudAccountId),
        utilization: demoData.generateDemoUtilizationData(),
        security: demoData.generateDemoSecurityData(),
        performance: demoData.generateDemoPerformanceData(),
        business: demoData.generateDemoBusinessData(),
        insights: demoData.generateDemoInsights(),
        generatedAt: new Date(),
      };
    }

    // Real data
    const [cost, utilization, security, performance, business] = await Promise.all([
      getCostIntelligence(cloudAccountId, 30),
      getResourceUtilization(cloudAccountId, 24),
      getSecurityCompliance(cloudAccountId),
      getPerformanceAnalytics(cloudAccountId, 24),
      getBusinessIntelligence(userId, 3),
    ]);

    const insights = await prisma.aIInsight.findMany({
      where: {
        cloudAccountId,
        status: { in: ['new', 'viewed'] },
      },
      orderBy: { generatedAt: 'desc' },
      take: 10,
    });

    return {
      cost,
      utilization,
      security,
      performance,
      business,
      insights,
      generatedAt: new Date(),
    };
  } catch (error: any) {
    console.error('Error getting comprehensive dashboard:', error);
    throw error;
  }
};