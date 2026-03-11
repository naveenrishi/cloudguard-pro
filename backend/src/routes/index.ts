// backend/src/routes/index.ts
import { Router } from 'express';
import authRoutes         from './auth.routes';
import awsRoutes          from './aws.routes';
import gcpRoutes          from './gcp.routes';
import cloudAccountRoutes from './cloudAccounts.routes';
import costRoutes         from './cost.routes';
import securityRoutes     from './security.routes';
import optimizationRoutes from './optimization.routes';
import nukeRoutes         from './nuke.routes';
import resourceRoutes     from './resource.routes';
import userRoutes         from './user.routes';
import analyticsRoutes    from './analytics.routes';
import budgetRoutes       from './budget.routes';
import iamRoutes          from './iam.routes';
import migrationRoutes    from './migration.routes';
import servicenowRoutes   from './servicenow.routes';
import billingRoutes      from './billing.routes';
import automationRoutes   from './automation.routes';

const router = Router();

router.use('/auth',           authRoutes);
router.use('/aws',            awsRoutes);
router.use('/gcp',            gcpRoutes);
router.use('/cloud/accounts', cloudAccountRoutes);
router.use('/cost',           costRoutes);
router.use('/security',       securityRoutes);
router.use('/optimization',   optimizationRoutes);
router.use('/nuke',           nukeRoutes);
router.use('/resources',      resourceRoutes);
router.use('/users',          userRoutes);
router.use('/analytics',      analyticsRoutes);
router.use('/cloud',          budgetRoutes);      // /api/cloud/recommendations/:userId
router.use('/iam',            iamRoutes);         // /api/iam/policies
router.use('/migration',      migrationRoutes);   // /api/migration/recommendations
router.use('/servicenow',     servicenowRoutes);  // /api/servicenow/...
router.use('/billing',        billingRoutes);     // /api/billing/...
router.use('/automation',     automationRoutes);  // /api/automation/execute

export default router;