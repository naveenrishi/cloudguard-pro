import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export class ResourceController {
  
  // Get all resources for an account
  async getAccountResources(req: Request, res: Response) {
    try {
      const { accountId } = req.params;
      const { type, search } = req.query;

      const where: any = { accountId };

      if (type) {
        where.resourceType = type;
      }

      if (search) {
        where.OR = [
          { resourceName: { contains: search as string, mode: 'insensitive' } },
          { resourceId: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const resources = await prisma.resource.findMany({
        where,
        include: {
          account: {
            select: {
              accountName: true,
              provider: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ resources });
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ error: 'Failed to fetch resources' });
    }
  }

  // Search resources across all accounts
  async searchResources(req: Request, res: Response) {
    try {
      const { q } = req.query;
      const userId = (req as any).user.id;

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query required' });
      }

      const resources = await prisma.resource.findMany({
        where: {
          account: {
            userId,
          },
          OR: [
            { resourceName: { contains: q, mode: 'insensitive' } },
            { resourceId: { contains: q, mode: 'insensitive' } },
            { resourceType: { contains: q, mode: 'insensitive' } },
          ],
        },
        include: {
          account: {
            select: {
              accountName: true,
              provider: true,
              accountId: true,
            },
          },
        },
        take: 20,
      });

      res.json({ resources });
    } catch (error) {
      console.error('Error searching resources:', error);
      res.status(500).json({ error: 'Failed to search resources' });
    }
  }

  // Get resource details
  async getResourceDetails(req: Request, res: Response) {
    try {
      const { resourceId } = req.params;

      const resource = await prisma.resource.findUnique({
        where: { id: resourceId },
        include: {
          account: true,
          metrics: {
            orderBy: { timestamp: 'desc' },
            take: 100,
          },
        },
      });

      if (!resource) {
        return res.status(404).json({ error: 'Resource not found' });
      }

      res.json({ resource });
    } catch (error) {
      console.error('Error fetching resource details:', error);
      res.status(500).json({ error: 'Failed to fetch resource details' });
    }
  }
}