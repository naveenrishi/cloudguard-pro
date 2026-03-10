import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AWSService } from '../services/aws.service';
import { AzureService } from '../services/azure.service';

export class SecurityController {
  
  async getViolations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { severity, status } = req.query;

      const where: any = {
        account: { userId },
      };

      if (severity) {
        where.severity = severity;
      }

      if (status) {
        where.status = status;
      }

      const violations = await prisma.securityFinding.findMany({
        where,
        include: {
          account: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
        orderBy: [
          { severity: 'asc' },
          { detectedAt: 'desc' },
        ],
      });

      res.json({ violations });
    } catch (error) {
      console.error('Error fetching violations:', error);
      res.status(500).json({ error: 'Failed to fetch violations' });
    }
  }

  async searchViolations(req: Request, res: Response) {
    try {
      const userId = (req as any).user.id;
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }

      const violations = await prisma.securityFinding.findMany({
        where: {
          account: { userId },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { resourceType: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          account: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
        take: 20,
      });

      res.json({ violations });
    } catch (error) {
      console.error('Error searching violations:', error);
      res.status(500).json({ error: 'Failed to search violations' });
    }
  }

  async getViolationDetails(req: Request, res: Response) {
    try {
      const { findingId } = req.params;

      const violation = await prisma.securityFinding.findUnique({
        where: { id: findingId },
        include: {
          account: true,
        },
      });

      if (!violation) {
        return res.status(404).json({ error: 'Violation not found' });
      }

      res.json({ violation });
    } catch (error) {
      console.error('Error fetching violation details:', error);
      res.status(500).json({ error: 'Failed to fetch violation details' });
    }
  }

  async updateViolationStatus(req: Request, res: Response) {
    try {
      const { findingId } = req.params;
      const { status } = req.body;

      const violation = await prisma.securityFinding.update({
        where: { id: findingId },
        data: {
          status,
          resolvedAt: status === 'RESOLVED' ? new Date() : null,
        },
      });

      res.json({ violation });
    } catch (error) {
      console.error('Error updating violation status:', error);
      res.status(500).json({ error: 'Failed to update violation status' });
    }
  }

  async syncSecurityFindings(req: Request, res: Response) {
    try {
      const { accountId } = req.params;

      const account = await prisma.cloudAccount.findUnique({
        where: { id: accountId },
      });

      if (!account) {
        return res.status(404).json({ error: 'Account not found' });
      }

      const credentials = JSON.parse(account.credentials);
      let findings: any[] = [];

      if (account.provider === 'AWS') {
        const awsService = new AWSService(
          credentials.accessKeyId,
          credentials.secretAccessKey,
          account.region || 'us-east-1'
        );

        findings = await awsService.getSecurityFindings();
      } else if (account.provider === 'AZURE') {
        const azureService = new AzureService(
          credentials.tenantId,
          credentials.clientId,
          credentials.clientSecret,
          credentials.subscriptionId
        );

        const [recommendations, alerts] = await Promise.all([
          azureService.getSecurityRecommendations(),
          azureService.getSecurityAlerts(),
        ]);

        findings = [...recommendations, ...alerts];
      }

      // Store findings
      for (const finding of findings) {
        await prisma.securityFinding.upsert({
          where: {
            accountId_findingId: {
              accountId: account.id,
              findingId: finding.id || `${finding.severity}-${finding.title}-${Date.now()}`,
            },
          },
          create: {
            accountId: account.id,
            findingId: finding.id || `${finding.severity}-${finding.title}-${Date.now()}`,
            severity: finding.severity,
            title: finding.title,
            description: finding.description,
            resourceType: finding.resourceType,
            resourceId: finding.resourceId,
            region: finding.region || account.region,
            detectedAt: new Date(),
          },
          update: {
            description: finding.description,
            status: 'ACTIVE',
          },
        });
      }

      res.json({ 
        message: 'Security findings synced successfully',
        count: findings.length,
      });
    } catch (error) {
      console.error('Error syncing security findings:', error);
      res.status(500).json({ error: 'Failed to sync security findings' });
    }
  }
}