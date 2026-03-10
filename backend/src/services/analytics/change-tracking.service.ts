import { 
    ConfigServiceClient, 
    GetResourceConfigHistoryCommand 
  } from '@aws-sdk/client-config-service';
  import { 
    CloudTrailClient, 
    LookupEventsCommand 
  } from '@aws-sdk/client-cloudtrail';
  import prisma from '../../config/database';
  import * as demoData from './demo-data.service';
  
  // ✅ Demo mode flag
  const DEMO_MODE = process.env.DEMO_MODE === 'true';
  
  // ============================================
  // AWS CONFIG CHANGE TRACKING
  // ============================================
  
  export const fetchAWSConfigChanges = async (
    cloudAccountId: string,
    startTime: Date,
    endTime: Date = new Date(),
    resourceType?: string
  ) => {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account) throw new Error('Cloud account not found');
  
      const configClient = new ConfigServiceClient({ region: account.region || 'us-east-1' });
  
      const command = new GetResourceConfigHistoryCommand({
        resourceType: resourceType || 'AWS::EC2::Instance',
        startTime,
        endTime,
        limit: 100,
      });
  
      const response = await configClient.send(command);
      const changes = [];
  
      for (const item of response.configurationItems || []) {
        const changedProperties: any = {};
        if (item.configuration) {
          changedProperties.configuration = item.configuration;
        }
  
        const change = await prisma.aWSConfigChange.create({
          data: {
            cloudAccountId,
            changeTime: item.configurationItemCaptureTime || new Date(),
            changeType: item.configurationItemStatus || 'UPDATE',
            resourceType: item.resourceType || '',
            resourceId: item.resourceId || '',
            resourceName: item.resourceName,
            resourceArn: item.arn,
            region: item.awsRegion || account.region || 'us-east-1',
            configurationItemStatus: item.configurationItemStatus || 'OK',
            changedProperties: changedProperties,
            configurationItem: item as any,
            complianceType: item.configurationItemStatus === 'OK' ? 'COMPLIANT' : 'NON_COMPLIANT',
          },
        });
  
        changes.push(change);
      }
  
      return changes;
    } catch (error: any) {
      console.error('Error fetching AWS Config changes:', error);
      throw error;
    }
  };
  
  export const fetchAWSCloudTrailEvents = async (
    cloudAccountId: string,
    startTime: Date,
    endTime: Date = new Date()
  ) => {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account) throw new Error('Cloud account not found');
  
      const cloudTrailClient = new CloudTrailClient({ region: account.region || 'us-east-1' });
  
      const command = new LookupEventsCommand({
        StartTime: startTime,
        EndTime: endTime,
        MaxResults: 50,
      });
  
      const response = await cloudTrailClient.send(command);
      return response.Events || [];
    } catch (error: any) {
      console.error('Error fetching CloudTrail events:', error);
      return [];
    }
  };
  
  // ============================================
  // AZURE ACTIVITY LOG TRACKING
  // ============================================
  
  export const fetchAzureActivityLogs = async (
    cloudAccountId: string,
    startTime: Date,
    endTime: Date = new Date()
  ) => {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account || account.provider !== 'azure') {
        throw new Error('Azure account not found');
      }
  
      const mockLogs = [
        {
          eventTime: new Date(),
          operationName: 'Microsoft.Compute/virtualMachines/write',
          status: 'Succeeded',
          resourceType: 'virtualMachines',
          resourceId: '/subscriptions/.../providers/Microsoft.Compute/virtualMachines/vm1',
          resourceName: 'vm1',
          resourceGroupName: 'production-rg',
          subscriptionId: account.accountId,
          caller: 'admin@company.com',
          callerIpAddress: '203.0.113.1',
          level: 'Informational',
          category: 'Administrative',
        },
      ];
  
      const changes = [];
  
      for (const log of mockLogs) {
        const change = await prisma.azureActivityLog.create({
          data: {
            cloudAccountId,
            eventTime: log.eventTime,
            operationName: log.operationName,
            status: log.status,
            resourceType: log.resourceType,
            resourceId: log.resourceId,
            resourceName: log.resourceName,
            resourceGroupName: log.resourceGroupName,
            subscriptionId: log.subscriptionId,
            caller: log.caller,
            callerIpAddress: log.callerIpAddress,
            level: log.level,
            category: log.category,
          },
        });
  
        changes.push(change);
      }
  
      return changes;
    } catch (error: any) {
      console.error('Error fetching Azure Activity Logs:', error);
      throw error;
    }
  };
  
  // ============================================
  // GCP CLOUD AUDIT LOGS TRACKING
  // ============================================
  
  export const fetchGCPAuditLogs = async (
    cloudAccountId: string,
    startTime: Date,
    endTime: Date = new Date()
  ) => {
    try {
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account || account.provider !== 'gcp') {
        throw new Error('GCP account not found');
      }
  
      const mockLogs = [
        {
          timestamp: new Date(),
          logName: 'projects/my-project/logs/cloudaudit.googleapis.com%2Factivity',
          serviceName: 'compute.googleapis.com',
          methodName: 'v1.compute.instances.insert',
          resourceType: 'gce_instance',
          resourceName: 'projects/my-project/zones/us-central1-a/instances/instance-1',
          principalEmail: 'admin@company.com',
          callerIp: '203.0.113.1',
          severity: 'INFO',
        },
      ];
  
      const changes = [];
  
      for (const log of mockLogs) {
        const change = await prisma.gCPAuditLog.create({
          data: {
            cloudAccountId,
            timestamp: log.timestamp,
            logName: log.logName,
            serviceName: log.serviceName,
            methodName: log.methodName,
            resourceType: log.resourceType,
            resourceName: log.resourceName,
            principalEmail: log.principalEmail,
            callerIp: log.callerIp,
            severity: log.severity,
            protoPayload: log as any,
          },
        });
  
        changes.push(change);
      }
  
      return changes;
    } catch (error: any) {
      console.error('Error fetching GCP Audit Logs:', error);
      throw error;
    }
  };
  
  // ============================================
  // UNIFIED CHANGE TIMELINE
  // ============================================
  
  export const getUnifiedChangeTimeline = async (
    cloudAccountId: string,
    startTime: Date,
    endTime: Date = new Date(),
    filters?: {
      resourceType?: string;
      changedBy?: string;
      changeType?: string;
    }
  ) => {
    try {
      // ✅ Demo mode check
      if (DEMO_MODE) {
        console.log('🎨 Returning demo changes');
        let changes = demoData.generateDemoChanges();
        
        // Apply filters if provided
        if (filters?.resourceType) {
          changes = changes.filter(c => c.resourceType === filters.resourceType);
        }
        if (filters?.changedBy) {
          changes = changes.filter(c => c.changedBy?.includes(filters.changedBy || ''));
        }
        if (filters?.changeType) {
          changes = changes.filter(c => c.changeType === filters.changeType);
        }
        
        return changes;
      }
  
      // Real data
      const where: any = {
        cloudAccountId,
        eventTime: {
          gte: startTime,
          lte: endTime,
        },
      };
  
      if (filters?.resourceType) where.resourceType = filters.resourceType;
      if (filters?.changedBy) where.changedBy = filters.changedBy;
      if (filters?.changeType) where.changeType = filters.changeType;
  
      const changes = await prisma.changeEvent.findMany({
        where,
        orderBy: { eventTime: 'desc' },
        take: 100,
      });
  
      return changes;
    } catch (error: any) {
      console.error('Error fetching unified change timeline:', error);
      throw error;
    }
  };
  
  // ============================================
  // SYNC CHANGES TO UNIFIED TIMELINE
  // ============================================
  
  export const syncChangesToTimeline = async (cloudAccountId: string) => {
    try {
      // ✅ Demo mode check - return success without syncing
      if (DEMO_MODE) {
        console.log('🎨 Demo mode: Skipping change sync');
        return { 
          success: true, 
          message: 'Demo mode active - changes are pre-generated',
          changesCount: 50,
        };
      }
  
      const account = await prisma.cloudAccount.findUnique({
        where: { id: cloudAccountId },
      });
  
      if (!account) throw new Error('Account not found');
  
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
      let changesCount = 0;
  
      if (account.provider === 'aws') {
        const awsChanges = await fetchAWSConfigChanges(cloudAccountId, startTime, endTime);
        
        for (const change of awsChanges) {
          await prisma.changeEvent.create({
            data: {
              cloudAccountId,
              eventTime: change.changeTime,
              provider: 'aws',
              eventType: change.changeType.toLowerCase(),
              resourceType: change.resourceType,
              resourceId: change.resourceId,
              resourceName: change.resourceName,
              region: change.region,
              changeType: change.changeType,
              changedBy: change.principalName,
              changedByIp: change.ipAddress,
              changeDetails: change.changedProperties || {},
              awsConfigChangeId: change.id,
              impactScore: calculateImpactScore(change),
            },
          });
          changesCount++;
        }
      }
  
      if (account.provider === 'azure') {
        const azureChanges = await fetchAzureActivityLogs(cloudAccountId, startTime, endTime);
        
        for (const change of azureChanges) {
          await prisma.changeEvent.create({
            data: {
              cloudAccountId,
              eventTime: change.eventTime,
              provider: 'azure',
              eventType: change.operationName,
              resourceType: change.resourceType,
              resourceId: change.resourceId,
              resourceName: change.resourceName,
              region: change.resourceGroupName,
              changeType: change.status === 'Succeeded' ? 'UPDATE' : 'FAILED',
              changedBy: change.caller,
              changedByIp: change.callerIpAddress,
              changeDetails: {},
              azureActivityLogId: change.id,
              impactScore: calculateImpactScore(change),
            },
          });
          changesCount++;
        }
      }
  
      if (account.provider === 'gcp') {
        const gcpChanges = await fetchGCPAuditLogs(cloudAccountId, startTime, endTime);
        
        for (const change of gcpChanges) {
          await prisma.changeEvent.create({
            data: {
              cloudAccountId,
              eventTime: change.timestamp,
              provider: 'gcp',
              eventType: change.methodName,
              resourceType: change.resourceType,
              resourceId: change.resourceName,
              resourceName: change.resourceName.split('/').pop() || '',
              changeType: change.severity === 'ERROR' ? 'FAILED' : 'UPDATE',
              changedBy: change.principalEmail,
              changedByIp: change.callerIp,
              changeDetails: {},
              gcpAuditLogId: change.id,
              impactScore: calculateImpactScore(change),
            },
          });
          changesCount++;
        }
      }
  
      return { 
        success: true, 
        message: 'Changes synced to timeline',
        changesCount,
      };
    } catch (error: any) {
      console.error('Error syncing changes:', error);
      throw error;
    }
  };
  
  const calculateImpactScore = (change: any): number => {
    let score = 5;
  
    const criticalResources = ['rds', 'database', 'production', 'prod'];
    const resourceStr = JSON.stringify(change).toLowerCase();
    
    if (criticalResources.some(r => resourceStr.includes(r))) {
      score += 3;
    }
  
    if (change.changeType === 'DELETE' || change.status === 'Failed') {
      score += 2;
    }
  
    return Math.min(score, 10);
  };
