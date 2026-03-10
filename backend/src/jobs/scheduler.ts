import cron from 'node-cron';
import { CloudAccountController } from '../controllers/cloudAccount.controller';
import { CostController } from '../controllers/cost.controller';
import { SecurityController } from '../controllers/security.controller';
import { prisma } from '../lib/prisma';

export class JobScheduler {
  private cloudAccountController: CloudAccountController;
  private costController: CostController;
  private securityController: SecurityController;

  constructor() {
    this.cloudAccountController = new CloudAccountController();
    this.costController = new CostController();
    this.securityController = new SecurityController();
  }

  start() {
    console.log('🚀 Starting background job scheduler...');

    // Sync all accounts every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      console.log('⏰ Running scheduled account sync...');
      await this.syncAllAccounts();
    });

    // Sync cost data daily at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('⏰ Running scheduled cost sync...');
      await this.syncAllCostData();
    });

    // Sync security findings every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      console.log('⏰ Running scheduled security sync...');
      await this.syncAllSecurityFindings();
    });

    // Check nuke schedules every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Checking nuke schedules...');
      await this.checkNukeSchedules();
    });

    console.log('✅ Background jobs scheduled successfully!');
  }

  private async syncAllAccounts() {
    try {
      const accounts = await prisma.cloudAccount.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const account of accounts) {
        try {
          if (account.provider === 'AWS') {
            await this.cloudAccountController.syncAWSAccount(account.id);
          } else if (account.provider === 'AZURE') {
            await this.cloudAccountController.syncAzureAccount(account.id);
          }
          console.log(`✅ Synced account: ${account.accountName}`);
        } catch (error) {
          console.error(`❌ Failed to sync account ${account.accountName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing accounts:', error);
    }
  }

  private async syncAllCostData() {
    try {
      const accounts = await prisma.cloudAccount.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const account of accounts) {
        try {
          const mockReq: any = { params: { accountId: account.id } };
          const mockRes: any = {
            json: () => {},
            status: () => ({ json: () => {} }),
          };

          await this.costController.syncCostData(mockReq, mockRes);
          console.log(`✅ Synced cost data for: ${account.accountName}`);
        } catch (error) {
          console.error(`❌ Failed to sync cost for ${account.accountName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing cost data:', error);
    }
  }

  private async syncAllSecurityFindings() {
    try {
      const accounts = await prisma.cloudAccount.findMany({
        where: { status: 'ACTIVE' },
      });

      for (const account of accounts) {
        try {
          const mockReq: any = { params: { accountId: account.id } };
          const mockRes: any = {
            json: () => {},
            status: () => ({ json: () => {} }),
          };

          await this.securityController.syncSecurityFindings(mockReq, mockRes);
          console.log(`✅ Synced security findings for: ${account.accountName}`);
        } catch (error) {
          console.error(`❌ Failed to sync security for ${account.accountName}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing security findings:', error);
    }
  }

  private async checkNukeSchedules() {
    try {
      const configs = await prisma.nukeConfig.findMany({
        where: {
          mode: 'AUTOMATIC',
          enabled: true,
          nextRunAt: {
            lte: new Date(),
          },
        },
      });

      for (const config of configs) {
        console.log(`⚡ Executing scheduled nuke for account: ${config.accountId}`);
        // TODO: Implement automatic nuke execution
      }
    } catch (error) {
      console.error('Error checking nuke schedules:', error);
    }
  }
}