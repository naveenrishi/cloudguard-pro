import express from 'express';
import prisma from '../config/database';
import * as nukeService from '../services/nuke.service';

const router = express.Router();

// Get all nuke accounts for user
router.get('/accounts/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const nukeAccounts = await prisma.nukeAccount.findMany({
      where: {
        cloudAccount: { userId },
      },
      include: {
        cloudAccount: true,
        nukeRuns: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        retentions: {
          where: { status: 'active' },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { nextRunAt: 'asc' },
    });

    res.json({ accounts: nukeAccounts });
  } catch (error: any) {
    console.error('Get nuke accounts error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get specific nuke account details
router.get('/account/:nukeAccountId', async (req, res) => {
  try {
    const { nukeAccountId } = req.params;
    
    const nukeAccount = await prisma.nukeAccount.findUnique({
      where: { id: nukeAccountId },
      include: {
        cloudAccount: true,
        nukeRuns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        retentions: {
          where: { status: 'active' },
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!nukeAccount) {
      return res.status(404).json({ error: 'Nuke account not found' });
    }

    res.json(nukeAccount);
  } catch (error: any) {
    console.error('Get nuke account error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Scan resources for a nuke account
router.post('/scan/:nukeAccountId', async (req, res) => {
  try {
    const { nukeAccountId } = req.params;
    
    const nukeAccount = await prisma.nukeAccount.findUnique({
      where: { id: nukeAccountId },
      include: { cloudAccount: true },
    });

    if (!nukeAccount) {
      return res.status(404).json({ error: 'Nuke account not found' });
    }

    const resources = await nukeService.scanAWSResources(
      nukeAccount.cloudAccount.accountId,
      nukeAccount.cloudAccount.region || 'us-east-1'
    );

    res.json({ resources, count: resources.length });
  } catch (error: any) {
    console.error('Scan resources error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create retention policy for resource
router.post('/retention', async (req, res) => {
  try {
    const {
      nukeAccountId,
      userId,
      resourceType,
      resourceId,
      resourceName,
      resourceArn,
      resourceRegion,
      retentionType,
      retainUntil,
      retainDays,
      reason,
    } = req.body;

    // Calculate expiration date
    let expiresAt = null;
    if (retentionType === 'until_date') {
      expiresAt = new Date(retainUntil);
    } else if (retentionType === 'days') {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + retainDays);
    }

    const retention = await prisma.resourceRetention.create({
      data: {
        nukeAccountId,
        userId,
        resourceType,
        resourceId,
        resourceName,
        resourceArn,
        resourceRegion,
        retentionType,
        retainUntil: retentionType === 'until_date' ? new Date(retainUntil) : null,
        retainDays: retentionType === 'days' ? retainDays : null,
        reason,
        status: 'active',
        expiresAt,
      },
    });

    res.json({ retention, message: 'Retention policy created successfully' });
  } catch (error: any) {
    console.error('Create retention error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all retentions for nuke account
router.get('/retentions/:nukeAccountId', async (req, res) => {
  try {
    const { nukeAccountId } = req.params;
    const { status } = req.query;

    const retentions = await prisma.resourceRetention.findMany({
      where: {
        nukeAccountId,
        ...(status && { status: status as string }),
      },
      include: {
        user: { select: { name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ retentions });
  } catch (error: any) {
    console.error('Get retentions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete retention policy
router.delete('/retention/:retentionId', async (req, res) => {
  try {
    const { retentionId } = req.params;
    const { userId } = req.body;

    const retention = await prisma.resourceRetention.findUnique({
      where: { id: retentionId },
    });

    if (!retention) {
      return res.status(404).json({ error: 'Retention not found' });
    }

    // Only creator or admin can delete
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (retention.userId !== userId && user?.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this retention' });
    }

    await prisma.resourceRetention.delete({
      where: { id: retentionId },
    });

    res.json({ message: 'Retention policy deleted successfully' });
  } catch (error: any) {
    console.error('Delete retention error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule nuke run
router.post('/schedule', async (req, res) => {
  try {
    const { nukeAccountId, scheduledFor, runType, userId } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can schedule nuke runs' });
    }

    const nukeRun = await prisma.nukeRun.create({
      data: {
        nukeAccountId,
        runType: runType || 'dry-run',
        status: 'scheduled',
        scheduledFor: new Date(scheduledFor),
      },
    });

    res.json({ nukeRun, message: 'Nuke run scheduled successfully' });
  } catch (error: any) {
    console.error('Schedule nuke error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Execute nuke run (dry-run or live)
router.post('/execute/:nukeRunId', async (req, res) => {
  try {
    const { nukeRunId } = req.params;
    const { userId } = req.body;

    // Check if user is admin
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can execute nuke runs' });
    }

    const nukeRun = await prisma.nukeRun.findUnique({
      where: { id: nukeRunId },
    });

    if (!nukeRun) {
      return res.status(404).json({ error: 'Nuke run not found' });
    }

    // Execute in background
    const isDryRun = nukeRun.runType === 'dry-run';
    nukeService.executeNuke(nukeRunId, isDryRun).catch(console.error);

    res.json({ message: `Nuke execution started (${isDryRun ? 'DRY RUN' : 'LIVE'})`, nukeRunId });
  } catch (error: any) {
    console.error('Execute nuke error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get nuke run results
router.get('/run/:nukeRunId', async (req, res) => {
  try {
    const { nukeRunId } = req.params;

    const nukeRun = await prisma.nukeRun.findUnique({
      where: { id: nukeRunId },
      include: {
        nukeAccount: {
          include: { cloudAccount: true },
        },
      },
    });

    if (!nukeRun) {
      return res.status(404).json({ error: 'Nuke run not found' });
    }

    res.json(nukeRun);
  } catch (error: any) {
    console.error('Get nuke run error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve retention (admin only)
router.post('/retention/:retentionId/approve', async (req, res) => {
  try {
    const { retentionId } = req.params;
    const { userId } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can approve retentions' });
    }

    const retention = await prisma.resourceRetention.update({
      where: { id: retentionId },
      data: {
        isApproved: true,
        approvedBy: userId,
        approvedAt: new Date(),
      },
    });

    res.json({ retention, message: 'Retention approved successfully' });
  } catch (error: any) {
    console.error('Approve retention error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update nuke account settings (admin only)
router.put('/account/:nukeAccountId', async (req, res) => {
  try {
    const { nukeAccountId } = req.params;
    const { userId, scheduleDay, notificationDays, enabled } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can update nuke settings' });
    }

    const nukeAccount = await prisma.nukeAccount.update({
      where: { id: nukeAccountId },
      data: {
        scheduleDay,
        notificationDays,
        enabled,
      },
    });

    res.json({ nukeAccount, message: 'Nuke account updated successfully' });
  } catch (error: any) {
    console.error('Update nuke account error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manually initialize nuke accounts for testing
router.post('/initialize/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get all AWS accounts for this user
      const awsAccounts = await prisma.cloudAccount.findMany({
        where: { userId, provider: 'aws' },
      });
  
      let initialized = 0;
      for (const account of awsAccounts) {
        await nukeService.initializeNukeAccounts(account.id, account.accountName);
        initialized++;
      }
  
      res.json({ 
        message: `Initialized ${initialized} nuke accounts`,
        initialized 
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create test nuke account (for demo/testing)
router.post('/create-test-account/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const { accountName } = req.body;
  
      // Get or create a demo AWS account
      let cloudAccount = await prisma.cloudAccount.findFirst({
        where: { 
          userId, 
          provider: 'aws',
          accountName: accountName || 'Devops Sandbox'
        },
      });
  
      if (!cloudAccount) {
        cloudAccount = await prisma.cloudAccount.create({
          data: {
            userId,
            provider: 'aws',
            accountName: accountName || 'Devops Sandbox',
            accountId: '123456789012', // Demo account ID
            isDemo: true,
            isConnected: true,
          },
        });
      }
  
      // Create nuke account
      const nextRunDate = new Date();
      nextRunDate.setMonth(nextRunDate.getMonth() + 1);
      nextRunDate.setDate(1);
      nextRunDate.setHours(0, 0, 0, 0);
  
      const nukeAccount = await prisma.nukeAccount.create({
        data: {
          cloudAccountId: cloudAccount.id,
          accountName: accountName || 'Devops Sandbox',
          accountId: cloudAccount.accountId,
          nukeType: 'monthly',
          scheduleDay: 1,
          notificationDays: 5,
          enabled: true,
          nextRunAt: nextRunDate,
        },
      });
  
      res.json({ 
        message: 'Test nuke account created',
        nukeAccount,
        cloudAccount
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

export default router;
