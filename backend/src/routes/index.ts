import express from 'express';
import authRoutes from './auth.routes';
import cloudAccountRoutes from './cloudAccounts.routes';
import resourceRoutes from './resource.routes';
import costRoutes from './cost.routes';
import securityRoutes from './security.routes';
import optimizationRoutes from './optimization.routes';
import nukeRoutes from './nuke.routes';
import migrationRoutes from './migration.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/cloud/accounts', cloudAccountRoutes);
router.use('/resources', resourceRoutes);
router.use('/cost', costRoutes);
router.use('/security', securityRoutes);
router.use('/optimization', optimizationRoutes);
router.use('/nuke', nukeRoutes);
router.use('/migration', migrationRoutes);

export default router;