import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AWSService } from '../services/aws.service';

export class NukeController {
  
  async getNukeConfig(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      let config = await prisma.nukeConfig.findUnique({
        where: { accountId },
        include: {
          nukeRuns: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!config) {
        // Create default config
        config = await prisma.nukeConfig.create({
          data: {
            accountId,
            mode: 'MANUAL',
            enabled: false,
          },
          include: {
            nukeRuns: true,
          },
        });
      }

      res.json({ config });
    } catch (error) {
      console.error('Error fetching nuke config:', error);
      res.status(500).json({ error: 'Failed to fetch nuke config' });
    }
  }

  async updateNukeMode(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { mode } = req.body;

      const config = await prisma.nukeConfig.upsert({
        where: { accountId },
        update: { mode },
        create: {
          accountId,
          mode,
          enabled: false,
        },
      });

      res.json({ config });
    } catch (error) {
      console.error('Error updating nuke mode:', error);
      res.status(500).json({ error: 'Failed to update nuke mode' });
    }
  }

  async scanResources(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const resources = await prisma.resource.findMany({
        where: { accountId },
        include: {
          nukeRetentions: {
            where: { isApproved: true },
          },
        },
      });

      res.json({ resources });
    } catch (error) {
      console.error('Error scanning resources:', error);
      res.status(500).json({ error: 'Failed to scan resources' });
    }
  }

  async executeNuke(req: Request, res: Response) {
    try {
      const { accountId, userId, runType, respectRetentions, resources } = req.body;

      // Get nuke config
      const config = await prisma.nukeConfig.findUnique({
        where: { accountId },
      });

      if (!config) {
        return res.status(404).json({ error: 'Nuke config not found' });
      }

      // Create nuke run
      const nukeRun = await prisma.nukeRun.create({
        data: {
          configId: config.id,
          userId,
          runType,
          status: 'RUNNING',
          totalResources: resources.length,
          startedAt: new Date(),
        },
      });

      // Get account credentials
      const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const credentials = JSON.parse(account.credentials);
      const awsService = new AWSService(
        credentials.accessKeyId,
        credentials.secretAccessKey,
        account.region || 'us-east-1'
      );

      let deletedCount = 0;
      let retainedCount = 0;
      let failedCount = 0;

      // Execute deletion (or dry run)
      for (const resource of resources) {
        try {
          if (runType === 'DRY_RUN') {
            deletedCount++; // Just count, don't actually delete
          } else {
            // TODO: Implement actual deletion based on resource type
            // Example: awsService.deleteEC2Instance(resource.id);
            deletedCount++;
          }
        } catch (error) {
          failedCount++;
          console.error(`Failed to delete resource ${resource.id}:`, error);
        }
      }

      // Update nuke run
      const completedRun = await prisma.nukeRun.update({
        where: { id: nukeRun.id },
        data: {
          status: 'COMPLETED',
          deletedResources: deletedCount,
          retainedResources: retainedCount,
          failedResources: failedCount,
          completedAt: new Date(),
          duration: Math.floor((Date.now() - nukeRun.startedAt!.getTime()) / 1000),
        },
      });

      res.json({ 
        result: {
          totalResources: resources.length,
          deletedResources: deletedCount,
          retainedResources: retainedCount,
          failedResources: failedCount,
          duration: `${completedRun.duration}s`,
        },
      });
    } catch (error) {
      console.error('Error executing nuke:', error);
      res.status(500).json({ error: 'Failed to execute nuke' });
    }
  }

  async getRetentions(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const retentions = await prisma.nukeRetention.findMany({
        where: { accountId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ retentions });
    } catch (error) {
      console.error('Error fetching retentions:', error);
      res.status(500).json({ error: 'Failed to fetch retentions' });
    }
  }

  async createRetention(req: Request, res: Response) {
    try {
      const {
        accountId,
        userId,
        resourceType,
        resourceId,
        resourceName,
        resourceRegion,
        retentionType,
        retainUntil,
        retainDays,
        reason,
      } = req.body;

      const retention = await prisma.nukeRetention.create({
        data: {
          accountId,
          userId,
          resourceId,
          resourceType,
          resourceName,
          resourceRegion,
          retentionType,
          expiresAt: retainUntil ? new Date(retainUntil) : null,
          retainDays,
          reason,
          status: 'PENDING',
        },
      });

      res.status(201).json({ retention });
    } catch (error) {
      console.error('Error creating retention:', error);
      res.status(500).json({ error: 'Failed to create retention' });
    }
  }

  async approveRetention(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const retention = await prisma.nukeRetention.update({
        where: { id },
        data: {
          isApproved: true,
          approvedBy: userId,
          approvedAt: new Date(),
          status: 'ACTIVE',
        },
      });

      res.json({ retention });
    } catch (error) {
      console.error('Error approving retention:', error);
      res.status(500).json({ error: 'Failed to approve retention' });
    }
  }
}