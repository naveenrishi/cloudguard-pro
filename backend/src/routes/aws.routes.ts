import express from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import prisma from '../config/database';

const router = express.Router();

// Get AWS regions for an account
router.get('/regions/:accountId', authenticateToken, async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const account = await prisma.cloudAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.provider !== 'AWS') {
      return res.status(404).json({ error: 'AWS account not found' });
    }

    // TODO: When you're ready to connect real AWS:
    // 1. Install: npm install @aws-sdk/client-ec2 @aws-sdk/client-s3
    // 2. Implement AWS SDK calls
    
    return res.json([]);
    
  } catch (error: any) {
    console.error('Error fetching AWS regions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get resources for a region
router.get('/regions/:regionCode/resources', authenticateToken, async (req, res) => {
  try {
    // TODO: Implement when ready
    return res.json([]);
  } catch (error: any) {
    console.error('Error fetching region resources:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;