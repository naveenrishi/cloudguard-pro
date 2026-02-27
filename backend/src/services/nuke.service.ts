import { EC2Client, DescribeInstancesCommand, TerminateInstancesCommand } from '@aws-sdk/client-ec2';
import { S3Client, ListBucketsCommand, DeleteBucketCommand } from '@aws-sdk/client-s3';
import { RDSClient, DescribeDBInstancesCommand, DeleteDBInstanceCommand } from '@aws-sdk/client-rds';
import { LambdaClient, ListFunctionsCommand, DeleteFunctionCommand } from '@aws-sdk/client-lambda';
import prisma from '../config/database';
import { sendNukeNotification as sendNukeEmail } from './email.service';

interface NukeResult {
  resourceType: string;
  resourceId: string;
  resourceName?: string;
  action: 'deleted' | 'retained' | 'failed';
  reason?: string;
  error?: string;
}

// Predefined nuke accounts
const NUKE_ACCOUNTS = [
  { name: 'Devops Sandbox', pattern: 'devops-sandbox' },
  { name: 'Devops Training', pattern: 'devops-training' },
  { name: 'App Dev Sandbox', pattern: 'app-dev-sandbox' },
  { name: 'App Dev Training', pattern: 'app-dev-training' },
  { name: 'DNA Sandbox', pattern: 'dna-sandbox' },
  { name: 'DNA Training', pattern: 'dna-training' },
];

// Initialize nuke accounts for a cloud account
export const initializeNukeAccounts = async (cloudAccountId: string, accountName: string) => {
  const matchedAccount = NUKE_ACCOUNTS.find(acc => 
    accountName.toLowerCase().includes(acc.pattern)
  );

  if (matchedAccount) {
    const nextRunDate = new Date();
    nextRunDate.setMonth(nextRunDate.getMonth() + 1);
    nextRunDate.setDate(1);
    nextRunDate.setHours(0, 0, 0, 0);

    await prisma.nukeAccount.upsert({
      where: {
        cloudAccountId_accountName: {
          cloudAccountId,
          accountName: matchedAccount.name,
        },
      },
      create: {
        cloudAccountId,
        accountName: matchedAccount.name,
        accountId: accountName,
        nukeType: 'monthly',
        scheduleDay: 1,
        notificationDays: 5,
        enabled: true,
        nextRunAt: nextRunDate,
      },
      update: {
        nextRunAt: nextRunDate,
      },
    });
  }
};

// Scan AWS resources
export const scanAWSResources = async (accountId: string, region: string = 'us-east-1') => {
  const resources: any[] = [];

  try {
    // EC2 Instances
    const ec2Client = new EC2Client({ region });
    const instancesCmd = new DescribeInstancesCommand({});
    const instancesResponse = await ec2Client.send(instancesCmd);

    instancesResponse.Reservations?.forEach(reservation => {
      reservation.Instances?.forEach(instance => {
        if (instance.State?.Name !== 'terminated') {
          resources.push({
            type: 'ec2',
            id: instance.InstanceId || '',
            name: instance.Tags?.find(t => t.Key === 'Name')?.Value || '',
            state: instance.State?.Name || '',
            launchTime: instance.LaunchTime,
            tags: instance.Tags,
            region,
          });
        }
      });
    });

    // S3 Buckets
    const s3Client = new S3Client({ region });
    const bucketsCmd = new ListBucketsCommand({});
    const bucketsResponse = await s3Client.send(bucketsCmd);

    bucketsResponse.Buckets?.forEach(bucket => {
      resources.push({
        type: 's3',
        id: bucket.Name || '',
        name: bucket.Name || '',
        creationDate: bucket.CreationDate,
        region: 'global',
      });
    });

    // RDS Instances
    const rdsClient = new RDSClient({ region });
    const dbCmd = new DescribeDBInstancesCommand({});
    const dbResponse = await rdsClient.send(dbCmd);

    dbResponse.DBInstances?.forEach(db => {
      resources.push({
        type: 'rds',
        id: db.DBInstanceIdentifier || '',
        name: db.DBInstanceIdentifier || '',
        status: db.DBInstanceStatus,
        createdTime: db.InstanceCreateTime,
        region,
      });
    });

    // Lambda Functions
    const lambdaClient = new LambdaClient({ region });
    const lambdaCmd = new ListFunctionsCommand({});
    const lambdaResponse = await lambdaClient.send(lambdaCmd);

    lambdaResponse.Functions?.forEach(func => {
      resources.push({
        type: 'lambda',
        id: func.FunctionArn || '',
        name: func.FunctionName || '',
        runtime: func.Runtime,
        lastModified: func.LastModified,
        region,
      });
    });

  } catch (error: any) {
    console.error('Error scanning AWS resources:', error);
  }

  return resources;
};

// Check if resource should be retained
const shouldRetainResource = async (
  nukeAccountId: string,
  resourceId: string,
  resourceType: string
): Promise<{ retain: boolean; reason?: string }> => {
  const retention = await prisma.resourceRetention.findFirst({
    where: {
      nukeAccountId,
      resourceId,
      resourceType,
      status: 'active',
      OR: [
        { retentionType: 'permanent' },
        { 
          retentionType: 'until_date',
          retainUntil: { gte: new Date() },
        },
        {
          retentionType: 'days',
          expiresAt: { gte: new Date() },
        },
      ],
    },
  });

  if (retention) {
    return { retain: true, reason: retention.reason };
  }

  return { retain: false };
};

// Execute nuke (dry run or live)
export const executeNuke = async (nukeRunId: string, isDryRun: boolean = true) => {
  const nukeRun = await prisma.nukeRun.findUnique({
    where: { id: nukeRunId },
    include: { nukeAccount: { include: { cloudAccount: true } } },
  });

  if (!nukeRun) {
    throw new Error('Nuke run not found');
  }

  await prisma.nukeRun.update({
    where: { id: nukeRunId },
    data: { status: 'running', startedAt: new Date() },
  });

  const results: NukeResult[] = [];
  const account = nukeRun.nukeAccount.cloudAccount;

  try {
    // Scan resources
    const resources = await scanAWSResources(account.accountId);

    for (const resource of resources) {
      // Check retention
      const { retain, reason } = await shouldRetainResource(
        nukeRun.nukeAccountId,
        resource.id,
        resource.type
      );

      if (retain) {
        results.push({
          resourceType: resource.type,
          resourceId: resource.id,
          resourceName: resource.name,
          action: 'retained',
          reason,
        });
        continue;
      }

      // Delete resource (if not dry run)
      if (!isDryRun) {
        try {
          await deleteResource(resource, account.region || 'us-east-1');
          results.push({
            resourceType: resource.type,
            resourceId: resource.id,
            resourceName: resource.name,
            action: 'deleted',
          });
        } catch (error: any) {
          results.push({
            resourceType: resource.type,
            resourceId: resource.id,
            resourceName: resource.name,
            action: 'failed',
            error: error.message,
          });
        }
      } else {
        results.push({
          resourceType: resource.type,
          resourceId: resource.id,
          resourceName: resource.name,
          action: 'deleted',
          reason: 'DRY RUN - No actual deletion',
        });
      }
    }

    // Update run stats
    await prisma.nukeRun.update({
      where: { id: nukeRunId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        totalResources: results.length,
        retainedResources: results.filter(r => r.action === 'retained').length,
        deletedResources: results.filter(r => r.action === 'deleted').length,
        failedResources: results.filter(r => r.action === 'failed').length,
        resourcesScanned: resources,
        resourcesDeleted: results,
      },
    });

  } catch (error: any) {
    await prisma.nukeRun.update({
      where: { id: nukeRunId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errors: { message: error.message },
      },
    });
    throw error;
  }

  return results;
};

// Delete a resource
const deleteResource = async (resource: any, region: string) => {
  switch (resource.type) {
    case 'ec2':
      const ec2Client = new EC2Client({ region });
      await ec2Client.send(new TerminateInstancesCommand({
        InstanceIds: [resource.id],
      }));
      break;

    case 's3':
      const s3Client = new S3Client({ region });
      await s3Client.send(new DeleteBucketCommand({
        Bucket: resource.id,
      }));
      break;

    case 'rds':
      const rdsClient = new RDSClient({ region });
      await rdsClient.send(new DeleteDBInstanceCommand({
        DBInstanceIdentifier: resource.id,
        SkipFinalSnapshot: true,
      }));
      break;

    case 'lambda':
      const lambdaClient = new LambdaClient({ region });
      await lambdaClient.send(new DeleteFunctionCommand({
        FunctionName: resource.name,
      }));
      break;

    default:
      throw new Error(`Unsupported resource type: ${resource.type}`);
  }
};

// Send nuke notification email
export const sendNukeNotification = async (nukeAccountId: string, daysUntilNuke: number) => {
  const nukeAccount = await prisma.nukeAccount.findUnique({
    where: { id: nukeAccountId },
    include: { cloudAccount: { include: { user: true } } },
  });

  if (!nukeAccount) return;

  await sendNukeEmail(nukeAccount.cloudAccount.user.email, {
    accountName: nukeAccount.accountName,
    scheduledDate: nukeAccount.nextRunAt!,
    daysUntil: daysUntilNuke,
    dashboardUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/nuke`,
  });

  await prisma.nukeNotification.create({
    data: {
      recipientEmail: nukeAccount.cloudAccount.user.email,
      notificationType: 'upcoming_nuke',
      emailSubject: `AWS Nuke Scheduled - ${nukeAccount.accountName}`,
      emailBody: `Nuke scheduled for ${nukeAccount.nextRunAt?.toLocaleDateString()}`,
    },
  });
};

// Cron job to check and send notifications
export const checkNukeSchedules = async () => {
  const upcomingNukes = await prisma.nukeAccount.findMany({
    where: {
      enabled: true,
      nextRunAt: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    },
  });

  for (const nukeAccount of upcomingNukes) {
    const daysUntil = Math.ceil(
      (nukeAccount.nextRunAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
    );

    if (daysUntil === nukeAccount.notificationDays) {
      await sendNukeNotification(nukeAccount.id, daysUntil);
    }
  }
};
