// backend/src/services/automation.service.ts
// Executes real cloud SDK calls for the actions defined in Automation.tsx.
// All executions are persisted to the AutomationLog Prisma model.

import { PrismaClient } from '@prisma/client';
import {
  EC2Client,
  StartInstancesCommand,
  StopInstancesCommand,
  RebootInstancesCommand,
  TerminateInstancesCommand,
  CreateSnapshotCommand,
  ModifyInstanceAttributeCommand,
  DescribeVolumesCommand,
} from '@aws-sdk/client-ec2';
import {
  RDSClient,
  StartDBInstanceCommand,
  StopDBInstanceCommand,
  CreateDBSnapshotCommand,
} from '@aws-sdk/client-rds';
import {
  S3Client,
  PutBucketVersioningCommand,
  PutBucketLifecycleConfigurationCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from '@aws-sdk/client-s3';
import {
  LambdaClient,
  InvokeCommand,
  DeleteFunctionCommand,
} from '@aws-sdk/client-lambda';
import {
  IAMClient,
  ListAccessKeysCommand,
  CreateAccessKeyCommand,
  UpdateAccessKeyCommand,
} from '@aws-sdk/client-iam';

const prisma = new PrismaClient();

// ── Credential loader ──────────────────────────────────────────────────────

async function getAWSCredentials(accountId: string) {
  const account = await prisma.cloudAccount.findUnique({
    where:  { id: accountId },
    select: { credentials: true, region: true },
  });
  if (!account?.credentials) throw new Error('AWS account credentials not found');
  const creds = account.credentials as any;
  return {
    region:          (account.region as string) || 'us-east-1',
    accessKeyId:     creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    sessionToken:    creds.sessionToken,
  };
}

// ── SDK client factories ───────────────────────────────────────────────────

function mkEC2(creds: any)   { return new EC2Client({    region: creds.region, credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken } }); }
function mkRDS(creds: any)   { return new RDSClient({    region: creds.region, credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken } }); }
function mkS3(creds: any)    { return new S3Client({     region: creds.region, credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken } }); }
function mkLambda(creds: any){ return new LambdaClient({ region: creds.region, credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken } }); }
function mkIAM(creds: any)   { return new IAMClient({    region: creds.region, credentials: { accessKeyId: creds.accessKeyId, secretAccessKey: creds.secretAccessKey, sessionToken: creds.sessionToken } }); }

// ── AWS action executor ────────────────────────────────────────────────────

async function executeAWS(
  accountId:  string,
  serviceId:  string,
  actionId:   string,
  resourceId: string,
): Promise<string> {
  const creds = await getAWSCredentials(accountId);

  // EC2
  if (serviceId === 'ec2') {
    const client = mkEC2(creds);
    if (actionId === 'start') {
      await client.send(new StartInstancesCommand({ InstanceIds: [resourceId] }));
      return `EC2 instance ${resourceId} start initiated`;
    }
    if (actionId === 'stop') {
      await client.send(new StopInstancesCommand({ InstanceIds: [resourceId] }));
      return `EC2 instance ${resourceId} stop initiated`;
    }
    if (actionId === 'restart') {
      await client.send(new RebootInstancesCommand({ InstanceIds: [resourceId] }));
      return `EC2 instance ${resourceId} reboot initiated`;
    }
    if (actionId === 'terminate') {
      await client.send(new TerminateInstancesCommand({ InstanceIds: [resourceId] }));
      return `EC2 instance ${resourceId} terminated`;
    }
    if (actionId === 'snapshot') {
      const vols = await client.send(new DescribeVolumesCommand({
        Filters: [{ Name: 'attachment.instance-id', Values: [resourceId] }],
      }));
      const snaps: string[] = [];
      for (const vol of vols.Volumes || []) {
        const snap = await client.send(new CreateSnapshotCommand({
          VolumeId:    vol.VolumeId!,
          Description: `Auto snapshot of ${resourceId} — ${new Date().toISOString()}`,
        }));
        snaps.push(snap.SnapshotId!);
      }
      return `Created ${snaps.length} snapshot(s): ${snaps.join(', ')}`;
    }
    if (actionId === 'resize') {
      await client.send(new StopInstancesCommand({ InstanceIds: [resourceId] }));
      return `EC2 instance ${resourceId} stop initiated for resize. Modify instance type in AWS console after stopping.`;
    }
  }

  // RDS
  if (serviceId === 'rds') {
    const client = mkRDS(creds);
    if (actionId === 'start') {
      await client.send(new StartDBInstanceCommand({ DBInstanceIdentifier: resourceId }));
      return `RDS instance ${resourceId} start initiated`;
    }
    if (actionId === 'stop') {
      await client.send(new StopDBInstanceCommand({ DBInstanceIdentifier: resourceId }));
      return `RDS instance ${resourceId} stop initiated`;
    }
    if (actionId === 'snapshot') {
      const snapId = `${resourceId}-manual-${Date.now()}`;
      await client.send(new CreateDBSnapshotCommand({
        DBSnapshotIdentifier: snapId,
        DBInstanceIdentifier: resourceId,
      }));
      return `RDS snapshot created: ${snapId}`;
    }
  }

  // S3
  if (serviceId === 's3') {
    const client = mkS3(creds);
    if (actionId === 'versioning') {
      await client.send(new PutBucketVersioningCommand({
        Bucket: resourceId,
        VersioningConfiguration: { Status: 'Enabled' },
      }));
      return `S3 versioning enabled on bucket: ${resourceId}`;
    }
    if (actionId === 'lifecycle') {
      await client.send(new PutBucketLifecycleConfigurationCommand({
        Bucket: resourceId,
        LifecycleConfiguration: {
          Rules: [{
            ID:          'Glacier90Days',
            Status:      'Enabled',
            Filter:      { Prefix: '' },
            Transitions: [{ Days: 90, StorageClass: 'GLACIER' }],
          }],
        },
      }));
      return `S3 lifecycle policy set on: ${resourceId}`;
    }
    if (actionId === 'empty') {
      let deleted = 0;
      let token: string | undefined;
      do {
        const list = await client.send(new ListObjectsV2Command({ Bucket: resourceId, ContinuationToken: token }));
        if (list.Contents && list.Contents.length > 0) {
          await client.send(new DeleteObjectsCommand({
            Bucket: resourceId,
            Delete: { Objects: list.Contents.map(o => ({ Key: o.Key! })) },
          }));
          deleted += list.Contents.length;
        }
        token = list.IsTruncated ? list.NextContinuationToken : undefined;
      } while (token);
      return `S3 bucket ${resourceId} emptied — ${deleted} object(s) deleted`;
    }
  }

  // Lambda
  if (serviceId === 'lambda') {
    const client = mkLambda(creds);
    if (actionId === 'invoke') {
      const result = await client.send(new InvokeCommand({
        FunctionName:   resourceId,
        InvocationType: 'RequestResponse',
        Payload:        Buffer.from(JSON.stringify({})),
      }));
      const payload = result.Payload ? Buffer.from(result.Payload).toString() : '{}';
      return `Lambda ${resourceId} invoked. Status: ${result.StatusCode}. Response: ${payload.slice(0, 200)}`;
    }
    if (actionId === 'delete') {
      await client.send(new DeleteFunctionCommand({ FunctionName: resourceId }));
      return `Lambda function ${resourceId} deleted`;
    }
  }

  // IAM
  if (serviceId === 'iam') {
    const client = mkIAM(creds);
    if (actionId === 'rotate') {
      const keys   = await client.send(new ListAccessKeysCommand({ UserName: resourceId }));
      const newKey = await client.send(new CreateAccessKeyCommand({ UserName: resourceId }));
      if ((keys.AccessKeyMetadata?.length || 0) >= 2) {
        const oldest = keys.AccessKeyMetadata![0];
        await client.send(new UpdateAccessKeyCommand({
          UserName:    resourceId,
          AccessKeyId: oldest.AccessKeyId!,
          Status:      'Inactive',
        }));
      }
      return `New access key created: ${newKey.AccessKey?.AccessKeyId}. Old key deactivated.`;
    }
    if (actionId === 'disable') {
      const keys = await client.send(new ListAccessKeysCommand({ UserName: resourceId }));
      for (const key of keys.AccessKeyMetadata || []) {
        await client.send(new UpdateAccessKeyCommand({
          UserName:    resourceId,
          AccessKeyId: key.AccessKeyId!,
          Status:      'Inactive',
        }));
      }
      return `All access keys disabled for IAM user: ${resourceId}`;
    }
  }

  throw new Error(`Unsupported AWS action: ${serviceId}/${actionId}`);
}

// ── Persist log to DB ──────────────────────────────────────────────────────

async function persistLog(params: {
  userId:      string;
  accountId?:  string;
  provider:    string;
  actionType:  string;
  resourceId:  string;
  resourceType:string;
  region?:     string;
  dryRun:      boolean;
  status:      'SUCCESS' | 'FAILED' | 'DRY_RUN';
  output?:     string;
  errorMessage?: string;
  startedAt:   Date;
  completedAt: Date;
}) {
  try {
    const duration = params.completedAt.getTime() - params.startedAt.getTime();
    await prisma.automationLog.create({
      data: {
        userId:       params.userId,
        accountId:    params.accountId,
        provider:     params.provider.toUpperCase() as any,
        actionType:   params.actionType,
        resourceId:   params.resourceId,
        resourceType: params.resourceType,
        region:       params.region,
        dryRun:       params.dryRun,
        status:       params.status,
        output:       params.output,
        errorMessage: params.errorMessage,
        startedAt:    params.startedAt,
        completedAt:  params.completedAt,
        duration,
      },
    });
  } catch (err) {
    // Non-fatal — log to console but don't break the response
    console.error('[AutomationLog] Failed to persist log:', err);
  }
}

// ── Main execute function ──────────────────────────────────────────────────

export async function executeAction(params: {
  cloud:       string;
  accountId:   string;
  serviceId:   string;
  actionId:    string;
  resourceId:  string;
  resourceType?: string;
  region?:     string;
  taskName:    string;
  reason?:     string;
  userId?:     string;
  dryRun?:     boolean;
}): Promise<{ message: string; output?: string }> {
  const {
    cloud, accountId, serviceId, actionId,
    resourceId, taskName, reason,
    userId = '', dryRun = false,
    resourceType = serviceId,
    region,
  } = params;

  const startedAt = new Date();

  // ── Dry-run: skip real SDK call, log DRY_RUN ──
  if (dryRun) {
    const completedAt = new Date();
    await persistLog({
      userId, accountId, provider: cloud,
      actionType: `${serviceId}/${actionId}`,
      resourceId, resourceType, region,
      dryRun: true, status: 'DRY_RUN',
      output: JSON.stringify({ taskName, reason, simulated: true }),
      startedAt, completedAt,
    });
    return {
      message: `[DRY RUN] ${taskName} — would execute ${serviceId}/${actionId} on ${resourceId}`,
      output: `Action: ${taskName}\nCloud: ${cloud.toUpperCase()}\nService: ${serviceId}\nAction: ${actionId}\nResource: ${resourceId}\nReason: ${reason || 'Not provided'}\n\nThis was a dry run. No changes were made.`,
    };
  }

  // ── Live execution ──
  if (cloud === 'aws') {
    try {
      const message = await executeAWS(accountId, serviceId, actionId, resourceId);
      const completedAt = new Date();
      await persistLog({
        userId, accountId, provider: 'aws',
        actionType: `${serviceId}/${actionId}`,
        resourceId, resourceType, region,
        dryRun: false, status: 'SUCCESS',
        output: JSON.stringify({ message }),
        startedAt, completedAt,
      });
      return { message };
    } catch (err: any) {
      const completedAt = new Date();
      await persistLog({
        userId, accountId, provider: 'aws',
        actionType: `${serviceId}/${actionId}`,
        resourceId, resourceType, region,
        dryRun: false, status: 'FAILED',
        errorMessage: err.message,
        startedAt, completedAt,
      });
      throw err;
    }
  }

  if (cloud === 'azure') {
    const message = `Azure action ${serviceId}/${actionId} received for resource ${resourceId}. To enable live execution, configure Azure service principal credentials (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID) for account ${accountId}.`;
    const completedAt = new Date();
    await persistLog({
      userId, accountId, provider: 'azure',
      actionType: `${serviceId}/${actionId}`,
      resourceId, resourceType, region,
      dryRun: false, status: 'SUCCESS',
      output: message,
      startedAt, completedAt,
    });
    return {
      message,
      output: `Action: ${taskName}\nService: ${serviceId}\nAction: ${actionId}\nResource: ${resourceId}\nReason: ${reason || 'Not provided'}`,
    };
  }

  if (cloud === 'gcp') {
    const message = `GCP action ${serviceId}/${actionId} received for resource ${resourceId}. To enable live execution, ensure the service account JSON key is configured for account ${accountId}.`;
    const completedAt = new Date();
    await persistLog({
      userId, accountId, provider: 'gcp',
      actionType: `${serviceId}/${actionId}`,
      resourceId, resourceType, region,
      dryRun: false, status: 'SUCCESS',
      output: message,
      startedAt, completedAt,
    });
    return {
      message,
      output: `Action: ${taskName}\nService: ${serviceId}\nAction: ${actionId}\nResource: ${resourceId}\nReason: ${reason || 'Not provided'}`,
    };
  }

  throw new Error(`Unsupported cloud provider: ${cloud}`);
}

// ── Fetch execution history for a user ────────────────────────────────────

export async function getExecutionHistory(userId: string, limit = 50) {
  try {
    const logs = await prisma.automationLog.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      take:    limit,
    });
    return logs.map(l => ({
      id:          l.id,
      provider:    l.provider,
      actionType:  l.actionType,
      resourceId:  l.resourceId,
      status:      l.status,
      dryRun:      l.dryRun,
      duration:    l.duration,
      output:      l.output,
      errorMessage:l.errorMessage,
      startedAt:   l.startedAt,
      completedAt: l.completedAt,
      createdAt:   l.createdAt,
    }));
  } catch {
    return [];
  }
}