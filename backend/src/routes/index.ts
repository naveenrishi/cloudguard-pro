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
import resourceRoutes from './resource.routes';
import userRoutes from './user.routes';

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
router.use('/resources', resourceRoutes);
router.use('/users', userRoutes);

export default router;