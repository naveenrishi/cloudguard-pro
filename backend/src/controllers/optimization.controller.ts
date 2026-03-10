import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class OptimizationController {
  
  async getRecommendations(req: Request, res: Response) {
    try {
      const { category, impact, status } = req.query;

      const where: any = {};

      if (category) {
        where.category = category;
      }

      if (impact) {
        where.impact = impact;
      }

      if (status) {
        where.status = status;
      }

      const recommendations = await prisma.recommendation.findMany({
        where,
        orderBy: [
          { impact: 'asc' },
          { savings: 'desc' },
        ],
      });

      res.json({ recommendations });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
  }

  async getAccountRecommendations(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const recommendations = await prisma.recommendation.findMany({
        where: { accountId },
        orderBy: [
          { impact: 'asc' },
          { savings: 'desc' },
        ],
      });

      res.json({ recommendations });
    } catch (error) {
      console.error('Error fetching account recommendations:', error);
      res.status(500).json({ error: 'Failed to fetch account recommendations' });
    }
  }

  async updateRecommendationStatus(req: Request, res: Response) {
    try {
      const { recommendationId } = req.params;
      const { status } = req.body;

      const recommendation = await prisma.recommendation.update({
        where: { id: recommendationId },
        data: { status },
      });

      res.json({ recommendation });
    } catch (error) {
      console.error('Error updating recommendation:', error);
      res.status(500).json({ error: 'Failed to update recommendation' });
    }
  }

  async generateRecommendations(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      // Get account resources
      const resources = await prisma.resource.findMany({
        where: { accountId },
        include: {
          metrics: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });

      const recommendations = [];

      // Analyze EC2 instances
      for (const resource of resources) {
        if (resource.resourceType === 'EC2') {
          const metadata = JSON.parse(resource.metadata);
          
          // Check CPU utilization
          const cpuMetrics = resource.metrics.filter(m => m.metricName === 'CPUUtilization');
          if (cpuMetrics.length > 0) {
            const avgCPU = cpuMetrics.reduce((sum, m) => sum + m.metricValue, 0) / cpuMetrics.length;
            
            if (avgCPU < 20) {
              recommendations.push({
                accountId,
                resourceId: resource.id,
                category: 'COST',
                title: `Underutilized EC2 Instance: ${resource.resourceName}`,
                description: `This instance has average CPU utilization of ${avgCPU.toFixed(2)}%. Consider downsizing or using auto-scaling.`,
                impact: 'HIGH',
                savings: 150, // Estimate
                effort: 'LOW',
                implementationSteps: `1. Review instance type\n2. Downsize to smaller instance\n3. Monitor performance`,
              });
            }
          }
        }

        // Check for unattached EBS volumes
        if (resource.resourceType === 'EBS') {
          const metadata = JSON.parse(resource.metadata);
          if (!metadata.attachments || metadata.attachments.length === 0) {
            recommendations.push({
              accountId,
              resourceId: resource.id,
              category: 'COST',
              title: `Unattached EBS Volume: ${resource.resourceName}`,
              description: `This EBS volume is not attached to any instance and is incurring unnecessary costs.`,
              impact: 'MEDIUM',
              savings: 20,
              effort: 'LOW',
              implementationSteps: `1. Verify data is backed up\n2. Delete unused volume\n3. Consider snapshots for archival`,
            });
          }
        }
      }

      // Save recommendations
      for (const rec of recommendations) {
        await prisma.recommendation.create({ data: rec });
      }

      res.json({ 
        message: 'Recommendations generated successfully',
        count: recommendations.length,
        recommendations,
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      res.status(500).json({ error: 'Failed to generate recommendations' });
    }
  }
}