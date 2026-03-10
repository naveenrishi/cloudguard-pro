import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AWSService } from '../services/aws.service';
import { AzureService } from '../services/azure.service';

export class CostController {
  
  // Get cost analysis
  async getCostAnalysis(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { startDate, endDate } = req.query;

      // Get user's accounts
      const accounts = await prisma.cloudAccount.findMany({
        where: { userId },
      });

      let totalCost = 0;
      let awsCost = 0;
      let azureCost = 0;
      let gcpCost = 0;
      const serviceBreakdown: any[] = [];

      for (const account of accounts) {
        // Get cost data from database
        const costs = await prisma.costData.findMany({
          where: {
            accountId: account.id,
            date: {
              gte: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              lte: endDate ? new Date(endDate as string) : new Date(),
            },
          },
        });

        const accountTotal = costs.reduce((sum, cost) => sum + cost.cost, 0);
        totalCost += accountTotal;

        if (account.provider === 'AWS') {
          awsCost += accountTotal;
        } else if (account.provider === 'AZURE') {
          azureCost += accountTotal;
        } else if (account.provider === 'GCP') {
          gcpCost += accountTotal;
        }

        // Group by service
        costs.forEach(cost => {
          const existing = serviceBreakdown.find(s => s.name === cost.service);
          if (existing) {
            existing.cost += cost.cost;
          } else {
            serviceBreakdown.push({
              name: cost.service,
              cost: cost.cost,
            });
          }
        });
      }

      // Sort services by cost
      serviceBreakdown.sort((a, b) => b.cost - a.cost);

      res.json({
        totalCost: parseFloat(totalCost.toFixed(2)),
        aws: parseFloat(awsCost.toFixed(2)),
        azure: parseFloat(azureCost.toFixed(2)),
        gcp: parseFloat(gcpCost.toFixed(2)),
        topServices: serviceBreakdown.slice(0, 10),
      });
    } catch (error) {
      console.error('Error fetching cost analysis:', error);
      res.status(500).json({ error: 'Failed to fetch cost analysis' });
    }
  }

  // Sync cost data from cloud providers
  async syncCostData(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const credentials = JSON.parse(account.credentials);
      const endDate = new Date();
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

      let costData: any[] = [];

      if (account.provider === 'AWS') {
        const awsService = new AWSService(
          credentials.accessKeyId,
          credentials.secretAccessKey,
          account.region || 'us-east-1'
        );

        const costs = await awsService.getCostAndUsage(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Transform and store cost data
        for (const period of costs) {
          for (const service of period.services) {
            await prisma.costData.upsert({
              where: {
                accountId_date_service_region: {
                  accountId: account.id,
                  date: new Date(period.timePeriod!.Start!),
                  service: service.service,
                  region: account.region || 'global',
                },
              },
              create: {
                accountId: account.id,
                date: new Date(period.timePeriod!.Start!),
                service: service.service,
                cost: service.cost,
                usage: service.usage,
                region: account.region || 'global',
              },
              update: {
                cost: service.cost,
                usage: service.usage,
              },
            });
          }
        }
      } else if (account.provider === 'AZURE') {
        const azureService = new AzureService(
          credentials.tenantId,
          credentials.clientId,
          credentials.clientSecret,
          credentials.subscriptionId
        );

        const costs = await azureService.getCostAndUsage(
          startDate.toISOString().split('T')[0],
          endDate.toISOString().split('T')[0]
        );

        // Store Azure cost data
        for (const service of costs.services) {
          await prisma.costData.upsert({
            where: {
              accountId_date_service_region: {
                accountId: account.id,
                date: new Date(costs.period.start),
                service: service.service,
                region: 'global',
              },
            },
            create: {
              accountId: account.id,
              date: new Date(costs.period.start),
              service: service.service,
              cost: service.cost,
              currency: service.currency,
              region: 'global',
            },
            update: {
              cost: service.cost,
            },
          });
        }
      }

      res.json({ message: 'Cost data synced successfully' });
    } catch (error) {
      console.error('Error syncing cost data:', error);
      res.status(500).json({ error: 'Failed to sync cost data' });
    }
  }
}