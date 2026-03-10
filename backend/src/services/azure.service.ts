import { ClientSecretCredential } from '@azure/identity';
import { ComputeManagementClient } from '@azure/arm-compute';
import { StorageManagementClient } from '@azure/arm-storage';
import { SqlManagementClient } from '@azure/arm-sql';
import { MonitorClient } from '@azure/arm-monitor';
import { CostManagementClient } from '@azure/arm-costmanagement';
import { SecurityCenter } from '@azure/arm-security';
import { ResourceManagementClient } from '@azure/arm-resources';

export class AzureService {
  private credentials: ClientSecretCredential;
  private subscriptionId: string;
  private computeClient: ComputeManagementClient;
  private storageClient: StorageManagementClient;
  private sqlClient: SqlManagementClient;
  private monitorClient: MonitorClient;
  private costManagementClient: CostManagementClient;
  private securityClient: SecurityCenter;
  private resourceClient: ResourceManagementClient;

  constructor(tenantId: string, clientId: string, clientSecret: string, subscriptionId: string) {
    this.credentials = new ClientSecretCredential(tenantId, clientId, clientSecret);
    this.subscriptionId = subscriptionId;

    this.computeClient = new ComputeManagementClient(this.credentials, this.subscriptionId);
    this.storageClient = new StorageManagementClient(this.credentials, this.subscriptionId);
    this.sqlClient = new SqlManagementClient(this.credentials, this.subscriptionId);
    this.monitorClient = new MonitorClient(this.credentials, this.subscriptionId);
    this.costManagementClient = new CostManagementClient(this.credentials);
    this.securityClient = new SecurityCenter(this.credentials, this.subscriptionId);
    this.resourceClient = new ResourceManagementClient(this.credentials, this.subscriptionId);
  }

  // ============================================
  // VIRTUAL MACHINES
  // ============================================

  async getVirtualMachines() {
    try {
      const vms = [];
      
      for await (const vm of this.computeClient.virtualMachines.listAll()) {
        const instanceView = await this.computeClient.virtualMachines.instanceView(
          this.getResourceGroupFromId(vm.id!),
          vm.name!
        );

        vms.push({
          id: vm.id,
          name: vm.name,
          location: vm.location,
          vmSize: vm.hardwareProfile?.vmSize,
          osType: vm.storageProfile?.osDisk?.osType,
          provisioningState: vm.provisioningState,
          powerState: instanceView.statuses?.find(s => s.code?.startsWith('PowerState/'))?.displayStatus,
          privateIp: vm.networkProfile?.networkInterfaces?.[0]?.id,
          tags: vm.tags,
          resourceGroup: this.getResourceGroupFromId(vm.id!),
        });
      }

      return vms;
    } catch (error) {
      console.error('Error fetching Azure VMs:', error);
      throw error;
    }
  }

  // ============================================
  // STORAGE ACCOUNTS
  // ============================================

  async getStorageAccounts() {
    try {
      const accounts = [];

      for await (const account of this.storageClient.storageAccounts.list()) {
        accounts.push({
          id: account.id,
          name: account.name,
          location: account.location,
          kind: account.kind,
          sku: account.sku?.name,
          provisioningState: account.provisioningState,
          primaryEndpoints: account.primaryEndpoints,
          encryption: account.encryption?.services,
          networkRuleSet: account.networkRuleSet,
          tags: account.tags,
          resourceGroup: this.getResourceGroupFromId(account.id!),
        });
      }

      return accounts;
    } catch (error) {
      console.error('Error fetching storage accounts:', error);
      throw error;
    }
  }

  // ============================================
  // SQL DATABASES
  // ============================================

  async getSqlDatabases() {
    try {
      const databases = [];
      
      // First, get all SQL servers
      for await (const server of this.sqlClient.servers.list()) {
        const resourceGroup = this.getResourceGroupFromId(server.id!);
        
        // Then get databases for each server
        for await (const db of this.sqlClient.databases.listByServer(resourceGroup, server.name!)) {
          if (db.name !== 'master') { // Skip master database
            databases.push({
              id: db.id,
              name: db.name,
              serverName: server.name,
              location: db.location,
              edition: db.sku?.tier,
              capacity: db.sku?.capacity,
              maxSizeBytes: db.maxSizeBytes,
              status: db.status,
              creationDate: db.creationDate,
              collation: db.collation,
              tags: db.tags,
              resourceGroup,
            });
          }
        }
      }

      return databases;
    } catch (error) {
      console.error('Error fetching SQL databases:', error);
      throw error;
    }
  }

  // ============================================
  // COST MANAGEMENT
  // ============================================

  async getCostAndUsage(startDate: string, endDate: string) {
    try {
      const scope = `/subscriptions/${this.subscriptionId}`;
      
      const queryResult = await this.costManagementClient.query.usage(scope, {
        type: 'ActualCost',
        timeframe: 'Custom',
        timePeriod: {
          from: new Date(startDate),
          to: new Date(endDate),
        },
        dataset: {
          granularity: 'Monthly',
          aggregation: {
            totalCost: {
              name: 'Cost',
              function: 'Sum',
            },
          },
          grouping: [
            {
              type: 'Dimension',
              name: 'ServiceName',
            },
          ],
        },
      });

      const costData = queryResult.rows?.map(row => ({
        service: row[2], // ServiceName
        cost: parseFloat(row[0] as string), // Cost
        currency: row[1], // Currency
      })) || [];

      const totalCost = costData.reduce((sum, item) => sum + item.cost, 0);

      return {
        totalCost,
        services: costData,
        period: { start: startDate, end: endDate },
      };
    } catch (error) {
      console.error('Error fetching Azure cost data:', error);
      throw error;
    }
  }

  // ============================================
  // SECURITY - RECOMMENDATIONS
  // ============================================

  async getSecurityRecommendations() {
    try {
      const recommendations = [];

      for await (const task of this.securityClient.tasks.list()) {
        recommendations.push({
          id: task.id,
          name: task.name,
          severity: this.mapSeverity(task.securityTaskParameters?.severity),
          title: task.securityTaskParameters?.name,
          description: task.securityTaskParameters?.description,
          resourceType: task.securityTaskParameters?.resourceType,
          resourceId: task.securityTaskParameters?.resourceId,
          state: task.state,
          creationTimeUtc: task.creationTimeUtc,
        });
      }

      return recommendations;
    } catch (error) {
      console.error('Error fetching security recommendations:', error);
      throw error;
    }
  }

  // ============================================
  // SECURITY - ALERTS
  // ============================================

  async getSecurityAlerts() {
    try {
      const alerts = [];

      for await (const alert of this.securityClient.alerts.list()) {
        alerts.push({
          id: alert.id,
          name: alert.name,
          severity: alert.severity,
          title: alert.alertDisplayName,
          description: alert.description,
          compromisedEntity: alert.compromisedEntity,
          detectedTimeUtc: alert.detectedTimeUtc,
          status: alert.status,
          intent: alert.intent,
          entities: alert.entities,
        });
      }

      return alerts;
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      throw error;
    }
  }

  // ============================================
  // METRICS
  // ============================================

  async getVMMetrics(resourceId: string, metricName: string, startTime: Date, endTime: Date) {
    try {
      const timespan = `${startTime.toISOString()}/${endTime.toISOString()}`;
      
      const metrics = await this.monitorClient.metrics.list(resourceId, {
        timespan,
        interval: 'PT1H',
        metricnames: metricName,
        aggregation: 'Average,Maximum',
      });

      const metricData = metrics.value?.[0]?.timeseries?.[0]?.data?.map(point => ({
        timestamp: point.timeStamp,
        average: point.average,
        maximum: point.maximum,
      })) || [];

      return metricData;
    } catch (error) {
      console.error('Error fetching VM metrics:', error);
      throw error;
    }
  }

  // ============================================
  // RESOURCE GROUPS
  // ============================================

  async getResourceGroups() {
    try {
      const resourceGroups = [];

      for await (const rg of this.resourceClient.resourceGroups.list()) {
        resourceGroups.push({
          id: rg.id,
          name: rg.name,
          location: rg.location,
          provisioningState: rg.properties?.provisioningState,
          tags: rg.tags,
        });
      }

      return resourceGroups;
    } catch (error) {
      console.error('Error fetching resource groups:', error);
      throw error;
    }
  }

  // ============================================
  // ALL RESOURCES
  // ============================================

  async getAllResources() {
    try {
      const resources = [];

      for await (const resource of this.resourceClient.resources.list()) {
        resources.push({
          id: resource.id,
          name: resource.name,
          type: resource.type,
          location: resource.location,
          kind: resource.kind,
          tags: resource.tags,
          resourceGroup: this.getResourceGroupFromId(resource.id!),
        });
      }

      return resources;
    } catch (error) {
      console.error('Error fetching all resources:', error);
      throw error;
    }
  }

  // ============================================
  // HELPER FUNCTIONS
  // ============================================

  private getResourceGroupFromId(resourceId: string): string {
    const match = resourceId.match(/resourceGroups\/([^\/]+)/i);
    return match ? match[1] : '';
  }

  private mapSeverity(severity?: string): string {
    switch (severity?.toLowerCase()) {
      case 'high':
        return 'critical';
      case 'medium':
        return 'high';
      case 'low':
        return 'medium';
      default:
        return 'low';
    }
  }
}