import express from 'express';
import { CloudAccountController } from '../controllers/cloudAccount.controller';
import { authenticateToken } from '../middleware/auth.middleware';

const router = express.Router();
const controller = new CloudAccountController();

// Connect cloud accounts
router.post('/aws/connect', authenticateToken, controller.connectAWSAccount.bind(controller));
router.post('/azure/connect', authenticateToken, controller.connectAzureAccount.bind(controller));

// Sync accounts
router.post('/:accountId/sync', authenticateToken, async (req, res) => {
  const account = await prisma.cloudAccount.findUnique({ 
    where: { id: req.params.accountId } 
  });
  
  if (!account) {
    return res.status(404).json({ error: 'Account not found' });
  }

  if (account.provider === 'AWS') {
    await controller.syncAWSAccount(req.params.accountId);
  } else if (account.provider === 'AZURE') {
    await controller.syncAzureAccount(req.params.accountId);
  }

  res.json({ message: 'Sync completed successfully' });
});

export default router;