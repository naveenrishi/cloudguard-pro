import express from 'express';
import authRoutes from './auth.routes';
import cloudAccountRoutes from './cloudAccount.routes';
import resourceRoutes from './resource.routes';
import costRoutes from './cost.routes';
import securityRoutes from './security.routes';
import optimizationRoutes from './optimization.routes';
import nukeRoutes from './nuke.routes';
import notificationRoutes from './notification.routes';
import migrationRoutes from './migration.routes';

const router = express.Router();

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0' 
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/cloud/accounts', cloudAccountRoutes);
router.use('/resources', resourceRoutes);
router.use('/cost', costRoutes);
router.use('/security', securityRoutes);
router.use('/optimization', optimizationRoutes);
router.use('/nuke', nukeRoutes);
router.use('/notifications', notificationRoutes);
router.use('/migration', migrationRoutes);

export default router;