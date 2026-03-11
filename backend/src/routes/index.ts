import express from 'express';
import authRoutes from './auth.routes';
import awsRoutes from './aws.routes';
import azureRoutes from './azure.routes';
import gcpRoutes from './gcp.routes';
import cloudAccountRoutes from './cloudAccounts.routes';
import costRoutes from './cost.routes';
import securityRoutes from './security.routes';
import optimizationRoutes from './optimization.routes';
import nukeRoutes from './nuke.routes';
import migrationRoutes from './migration.routes';
import resourceRoutes from './resource.routes';
import userRoutes from './user.routes';
import budgetRoutes from './budget.routes';
import analyticsRoutes from './analytics.routes';
import healthRoutes from './health.routes';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/aws', awsRoutes);
router.use('/azure', azureRoutes);
router.use('/gcp', gcpRoutes);
router.use('/cloud/accounts', cloudAccountRoutes);
router.use('/cost', costRoutes);
router.use('/security', securityRoutes);
router.use('/optimization', optimizationRoutes);
router.use('/nuke', nukeRoutes);
router.use('/migration', migrationRoutes);
router.use('/resources', resourceRoutes);
router.use('/users', userRoutes);
router.use('/budgets', budgetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/health', healthRoutes);

export default router;