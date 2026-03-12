// backend/src/services/nuke.service.ts
import {
  EC2Client, DescribeInstancesCommand, DescribeVolumesCommand,
  TerminateInstancesCommand, DeleteVolumeCommand,
} from '@aws-sdk/client-ec2';
import {
  S3Client, ListBucketsCommand, ListObjectsV2Command,
  DeleteObjectsCommand, DeleteBucketCommand,
} from '@aws-sdk/client-s3';
import {
  RDSClient, DescribeDBInstancesCommand, DescribeDBClustersCommand,
  DeleteDBInstanceCommand,
} from '@aws-sdk/client-rds';
import { LambdaClient, ListFunctionsCommand, DeleteFunctionCommand } from '@aws-sdk/client-lambda';
import { ECSClient, ListClustersCommand, ListServicesCommand } from '@aws-sdk/client-ecs';
import { EKSClient, ListClustersCommand as ListEKSClustersCommand } from '@aws-sdk/client-eks';
import { ECRClient, DescribeRepositoriesCommand } from '@aws-sdk/client-ecr';
import { DynamoDBClient, ListTablesCommand } from '@aws-sdk/client-dynamodb';
import { ElastiCacheClient, DescribeCacheClustersCommand } from '@aws-sdk/client-elasticache';
import { SQSClient, ListQueuesCommand } from '@aws-sdk/client-sqs';
import { SNSClient, ListTopicsCommand } from '@aws-sdk/client-sns';
import { KinesisClient, ListStreamsCommand } from '@aws-sdk/client-kinesis';
import { CloudFormationClient, ListStacksCommand } from '@aws-sdk/client-cloudformation';
import { ElasticLoadBalancingV2Client, DescribeLoadBalancersCommand } from '@aws-sdk/client-elastic-load-balancing-v2';
import { AutoScalingClient, DescribeAutoScalingGroupsCommand } from '@aws-sdk/client-auto-scaling';
import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway';
import { SFNClient, ListStateMachinesCommand } from '@aws-sdk/client-sfn';
import { CognitoIdentityProviderClient, ListUserPoolsCommand } from '@aws-sdk/client-cognito-identity-provider';
import { EventBridgeClient, ListEventBusesCommand } from '@aws-sdk/client-eventbridge';
import { CloudFrontClient, ListDistributionsCommand } from '@aws-sdk/client-cloudfront';
import { Route53Client, ListHostedZonesCommand } from '@aws-sdk/client-route-53';
import { SecretsManagerClient, ListSecretsCommand } from '@aws-sdk/client-secrets-manager';
import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import { RedshiftClient, DescribeClustersCommand as DescribeRedshiftClustersCommand } from '@aws-sdk/client-redshift';
import { GlueClient, GetDatabasesCommand } from '@aws-sdk/client-glue';
import { CodeBuildClient, ListProjectsCommand } from '@aws-sdk/client-codebuild';
import { CodePipelineClient, ListPipelinesCommand } from '@aws-sdk/client-codepipeline';

import { prisma } from '../lib/prisma';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// ─── Types ─────────────────────────────────────────────────────────────────

export interface CloudResource {
  id: string;
  name: string;
  type: string;
  category: string;
  region: string;
  status: string;
  costPerMonth?: number;
  deleteProtection?: boolean;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface DryRunResult {
  total: number;
  wouldDelete: CloudResource[];
  wouldRetain: CloudResource[];
  wouldSkip: CloudResource[];   // delete-protected
}

export interface LiveNukeResult {
  total: number;
  deleted: { resource: CloudResource; message: string }[];
  retained: { resource: CloudResource; reason: string }[];
  failed: { resource: CloudResource; error: string }[];
  skipped: { resource: CloudResource; reason: string }[];
}

// ─── Service Category Definitions ─────────────────────────────────────────

export const AWS_SERVICE_CATEGORIES: Record<string, string[]> = {
  Compute: ['EC2Instance', 'EC2SpotInstance', 'LambdaFunction', 'LightsailInstance', 'BatchComputeEnvironment', 'AppRunnerService', 'ElasticBeanstalkEnvironment'],
  Containers: ['ECSCluster', 'ECSService', 'ECSTask', 'EKSCluster', 'EKSNodeGroup', 'ECRRepository', 'AppMeshMesh'],
  Storage: ['S3Bucket', 'EBSVolume', 'EBSSnapshot', 'EFSFilesystem', 'FSxFilesystem', 'StorageGateway', 'BackupVault'],
  Database: ['RDSInstance', 'RDSCluster', 'DynamoDBTable', 'ElastiCacheCluster', 'ElastiCacheReplicationGroup', 'RedshiftCluster', 'DocumentDBCluster', 'NeptuneCluster', 'MemoryDBCluster'],
  Networking: ['VPC', 'Subnet', 'SecurityGroup', 'NATGateway', 'InternetGateway', 'TransitGateway', 'VPNGateway', 'DirectConnectGateway', 'ElasticIP', 'NetworkACL', 'VPCPeeringConnection'],
  LoadBalancing: ['ALB', 'NLB', 'CLB', 'TargetGroup', 'GlobalAccelerator'],
  DNS: ['Route53HostedZone', 'Route53ResolverEndpoint'],
  CDN: ['CloudFrontDistribution'],
  Messaging: ['SQSQueue', 'SNSTopic', 'SNSSubscription', 'EventBridgeBus', 'EventBridgeRule', 'KinesisStream', 'KinesisFirehose', 'MSKCluster'],
  Security: ['IAMRole', 'IAMPolicy', 'IAMUser', 'IAMGroup', 'SecretsManagerSecret', 'ACMCertificate', 'WAFWebACL', 'ShieldProtection', 'GuardDutyDetector'],
  Analytics: ['AthenaWorkgroup', 'EMRCluster', 'GlueCrawler', 'GlueDatabase', 'GlueJob', 'QuickSightDashboard', 'OpenSearchDomain'],
  DevOps: ['CodeBuildProject', 'CodePipelinePipeline', 'CodeDeployApplication', 'CodeCommitRepository', 'CloudFormationStack', 'CDKToolkit'],
  Serverless: ['APIGatewayRestAPI', 'APIGatewayV2API', 'StepFunctionStateMachine', 'AppSyncAPI', 'CognitoUserPool', 'CognitoIdentityPool'],
  AutoScaling: ['AutoScalingGroup', 'LaunchTemplate', 'LaunchConfiguration', 'ScheduledAction'],
  Monitoring: ['CloudWatchAlarm', 'CloudWatchDashboard', 'CloudWatchLogGroup', 'CloudTrailTrail', 'ConfigRule'],
  ML: ['SageMakerEndpoint', 'SageMakerNotebook', 'ComprehendEndpoint', 'RekognitionCollection'],
  IoT: ['IoTThing', 'IoTTopicRule', 'IoTGreengrass'],
  Other: ['ElasticMapReduce', 'SimpleWorkflow', 'MechanicalTurk'],
};

export const AZURE_SERVICE_CATEGORIES: Record<string, string[]> = {
  Compute: ['VirtualMachine', 'VirtualMachineScaleSet', 'AppServicePlan', 'AppService', 'FunctionApp', 'ContainerInstance', 'SpringCloudService', 'BatchAccount'],
  Containers: ['AKSCluster', 'ContainerRegistry', 'ContainerApp', 'ContainerAppsEnvironment'],
  Storage: ['StorageAccount', 'BlobContainer', 'FileShare', 'QueueStorage', 'TableStorage', 'DataLakeStorageGen2', 'ManagedDisk'],
  Database: ['SQLServer', 'SQLDatabase', 'CosmosDB', 'MySQLServer', 'PostgreSQLServer', 'MariaDBServer', 'CacheForRedis', 'SQLManagedInstance', 'SynapseWorkspace'],
  Networking: ['VirtualNetwork', 'Subnet', 'NetworkSecurityGroup', 'PublicIPAddress', 'NetworkInterface', 'VNetPeering', 'PrivateEndpoint', 'ExpressRouteCircuit', 'VPNGateway'],
  LoadBalancing: ['LoadBalancer', 'ApplicationGateway', 'FrontDoor', 'TrafficManagerProfile'],
  DNS: ['DNSZone', 'PrivateDNSZone'],
  CDN: ['CDNProfile', 'CDNEndpoint'],
  Messaging: ['ServiceBusNamespace', 'EventHubNamespace', 'EventHub', 'StorageQueue', 'NotificationHub', 'ServiceBusQueue', 'ServiceBusTopic'],
  Security: ['KeyVault', 'ManagedIdentity', 'RoleAssignment', 'PolicyAssignment', 'DDoSProtectionPlan'],
  Analytics: ['DataFactory', 'DataBricks', 'HDInsightCluster', 'StreamAnalyticsJob', 'LogAnalyticsWorkspace', 'ApplicationInsights'],
  DevOps: ['DevOpsProject', 'DevTestLab', 'AutomationAccount', 'LogicApp', 'APIManagement'],
  Serverless: ['EventGridTopic', 'EventGridSubscription', 'SignalRService', 'StaticWebApp'],
  ML: ['MachineLearningWorkspace', 'CognitiveServicesAccount', 'BotService'],
  Other: ['ResourceGroup', 'ManagementGroup', 'Blueprint', 'MigrationProject'],
};

export const GCP_SERVICE_CATEGORIES: Record<string, string[]> = {
  Compute: ['ComputeInstance', 'InstanceGroup', 'InstanceTemplate', 'ManagedInstanceGroup', 'AppEngineService', 'CloudRunService', 'CloudRunJob'],
  Containers: ['GKECluster', 'GKENodePool', 'ArtifactRegistryRepository', 'ContainerRegistryRepository'],
  Storage: ['GCSBucket', 'PersistentDisk', 'Snapshot', 'Filestore', 'CloudStorageTransfer'],
  Database: ['CloudSQLInstance', 'BigtableInstance', 'FirestoreDatabase', 'SpannerInstance', 'MemorystoreRedis', 'MemorystoreMemcached', 'AlloyDB'],
  Networking: ['VPCNetwork', 'Subnet', 'FirewallRule', 'CloudRouter', 'VPNGateway', 'VPNTunnel', 'InterconnectAttachment', 'PrivateServiceConnect'],
  LoadBalancing: ['LoadBalancer', 'BackendService', 'TargetHTTPProxy', 'URLMap', 'ForwardingRule'],
  DNS: ['CloudDNSManagedZone', 'CloudDNSPolicy'],
  CDN: ['CloudCDN'],
  Messaging: ['PubSubTopic', 'PubSubSubscription', 'CloudTasksQueue', 'CloudSchedulerJob'],
  Security: ['ServiceAccount', 'IAMPolicy', 'SecretManagerSecret', 'CertificateManagerCert', 'ArmorPolicy'],
  Analytics: ['BigQueryDataset', 'BigQueryTable', 'DataflowJob', 'DataprocCluster', 'DataFusionInstance', 'ComposerEnvironment'],
  DevOps: ['CloudBuildTrigger', 'CloudDeployPipeline', 'ArtifactRegistryRepo', 'SourceRepository', 'DeploymentManagerDeployment'],
  Serverless: ['CloudFunction', 'CloudFunctionV2', 'EventarcTrigger', 'WorkflowsWorkflow'],
  ML: ['VertexAIEndpoint', 'VertexAIModel', 'AINotebookInstance', 'TranslationAPI', 'VisionAPIModel'],
  Other: ['ProjectIAMBinding', 'OrganizationPolicy', 'FolderIAMBinding'],
};

// ─── AWS Credential Helper ─────────────────────────────────────────────────

function awsClients(account: any) {
  let creds: any = {};
  try { creds = JSON.parse(account.credentials || '{}'); } catch {}

  const cfg = {
    region: account.region || 'us-east-1',
    credentials: {
      accessKeyId: creds.accessKeyId || process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: creds.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY || '',
      ...(creds.sessionToken && { sessionToken: creds.sessionToken }),
    },
  };
  return cfg;
}

// ─── Demo Resources ────────────────────────────────────────────────────────

function getDemoResources(provider: string): CloudResource[] {
  if (provider === 'aws') return [
    { id: 'i-0abc123def456', name: 'web-server-prod', type: 'EC2Instance', category: 'Compute', region: 'us-east-1', status: 'running', costPerMonth: 145.60 },
    { id: 'i-0def789abc012', name: 'api-server-staging', type: 'EC2Instance', category: 'Compute', region: 'us-east-1', status: 'stopped', costPerMonth: 72.80 },
    { id: 'vol-0abc123', name: 'data-volume-1', type: 'EBSVolume', category: 'Storage', region: 'us-east-1', status: 'available', costPerMonth: 23.50 },
    { id: 'my-app-bucket', name: 'my-app-bucket', type: 'S3Bucket', category: 'Storage', region: 'us-east-1', status: 'active', costPerMonth: 12.30 },
    { id: 'db-prod-instance', name: 'prod-postgres', type: 'RDSInstance', category: 'Database', region: 'us-east-1', status: 'available', costPerMonth: 185.40, deleteProtection: true },
    { id: 'my-lambda-fn', name: 'data-processor', type: 'LambdaFunction', category: 'Serverless', region: 'us-east-1', status: 'active', costPerMonth: 3.20 },
    { id: 'prod-cluster', name: 'prod-ecs-cluster', type: 'ECSCluster', category: 'Containers', region: 'us-east-1', status: 'active', costPerMonth: 0 },
    { id: 'dynamo-sessions', name: 'user-sessions', type: 'DynamoDBTable', category: 'Database', region: 'us-east-1', status: 'active', costPerMonth: 8.70 },
    { id: 'queue-jobs', name: 'background-jobs', type: 'SQSQueue', category: 'Messaging', region: 'us-east-1', status: 'active', costPerMonth: 1.50 },
    { id: 'cache-cluster-1', name: 'session-cache', type: 'ElastiCacheCluster', category: 'Database', region: 'us-east-1', status: 'available', costPerMonth: 55.80 },
    { id: 'api-gw-main', name: 'main-api-gateway', type: 'APIGatewayRestAPI', category: 'Serverless', region: 'us-east-1', status: 'active', costPerMonth: 15.20 },
    { id: 'cf-dist-1', name: 'app-cdn', type: 'CloudFrontDistribution', category: 'CDN', region: 'us-east-1', status: 'enabled', costPerMonth: 28.40 },
  ];

  if (provider === 'azure') return [
    { id: '/subscriptions/sub1/vm/web-vm-01', name: 'web-vm-01', type: 'VirtualMachine', category: 'Compute', region: 'eastus', status: 'running', costPerMonth: 132.40 },
    { id: '/subscriptions/sub1/storage/mystorageacct', name: 'mystorageacct', type: 'StorageAccount', category: 'Storage', region: 'eastus', status: 'available', costPerMonth: 45.20 },
    { id: '/subscriptions/sub1/sql/prod-sql', name: 'prod-sql', type: 'SQLDatabase', category: 'Database', region: 'eastus', status: 'online', costPerMonth: 220.00, deleteProtection: true },
    { id: '/subscriptions/sub1/aks/prod-aks', name: 'prod-aks', type: 'AKSCluster', category: 'Containers', region: 'eastus', status: 'running', costPerMonth: 380.00 },
    { id: '/subscriptions/sub1/fn/api-functions', name: 'api-functions', type: 'FunctionApp', category: 'Compute', region: 'eastus', status: 'running', costPerMonth: 12.60 },
    { id: '/subscriptions/sub1/cosmos/app-cosmos', name: 'app-cosmos', type: 'CosmosDB', category: 'Database', region: 'eastus', status: 'active', costPerMonth: 95.00 },
    { id: '/subscriptions/sub1/sb/notifications', name: 'notifications', type: 'ServiceBusNamespace', category: 'Messaging', region: 'eastus', status: 'active', costPerMonth: 22.50 },
    { id: '/subscriptions/sub1/kv/prod-keyvault', name: 'prod-keyvault', type: 'KeyVault', category: 'Security', region: 'eastus', status: 'active', costPerMonth: 5.00 },
  ];

  // GCP
  return [
    { id: 'projects/proj/zones/us-central1-a/instances/web-instance-1', name: 'web-instance-1', type: 'ComputeInstance', category: 'Compute', region: 'us-central1', status: 'running', costPerMonth: 112.30 },
    { id: 'projects/proj/buckets/app-data-bucket', name: 'app-data-bucket', type: 'GCSBucket', category: 'Storage', region: 'us-central1', status: 'active', costPerMonth: 34.80 },
    { id: 'projects/proj/instances/prod-postgres', name: 'prod-postgres', type: 'CloudSQLInstance', category: 'Database', region: 'us-central1', status: 'runnable', costPerMonth: 165.00, deleteProtection: true },
    { id: 'projects/proj/clusters/prod-gke', name: 'prod-gke', type: 'GKECluster', category: 'Containers', region: 'us-central1', status: 'running', costPerMonth: 290.00 },
    { id: 'projects/proj/topics/events-topic', name: 'events-topic', type: 'PubSubTopic', category: 'Messaging', region: 'global', status: 'active', costPerMonth: 8.20 },
    { id: 'projects/proj/datasets/analytics', name: 'analytics', type: 'BigQueryDataset', category: 'Analytics', region: 'US', status: 'active', costPerMonth: 42.00 },
    { id: 'projects/proj/functions/image-processor', name: 'image-processor', type: 'CloudFunction', category: 'Serverless', region: 'us-central1', status: 'active', costPerMonth: 5.40 },
    { id: 'projects/proj/services/api', name: 'api', type: 'CloudRunService', category: 'Compute', region: 'us-central1', status: 'active', costPerMonth: 18.70 },
  ];
}

// ─── AWS Resource Scanner ──────────────────────────────────────────────────

export async function scanAllAWSResources(account: any): Promise<CloudResource[]> {
  const cfg = awsClients(account);
  const resources: CloudResource[] = [];

  const safe = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  // EC2 Instances
  const ec2 = new EC2Client(cfg);
  const ec2Res = await safe(() => ec2.send(new DescribeInstancesCommand({})), { Reservations: [] });
  for (const r of ec2Res.Reservations || []) {
    for (const i of r.Instances || []) {
      if (i.State?.Name === 'terminated') continue;
      const name = i.Tags?.find((t: any) => t.Key === 'Name')?.Value || i.InstanceId || '';
      resources.push({
        id: i.InstanceId || '',
        name,
        type: 'EC2Instance',
        category: 'Compute',
        region: account.region || 'us-east-1',
        status: i.State?.Name || 'unknown',
        deleteProtection: (i as any).DisableApiTermination?.Value === true,
      });
    }
  }

  // EBS Volumes
  const ebsRes = await safe(() => ec2.send(new DescribeVolumesCommand({})), { Volumes: [] });
  for (const v of ebsRes.Volumes || []) {
    resources.push({
      id: v.VolumeId || '',
      name: v.Tags?.find((t: any) => t.Key === 'Name')?.Value || v.VolumeId || '',
      type: 'EBSVolume',
      category: 'Storage',
      region: v.AvailabilityZone || cfg.region,
      status: v.State || 'unknown',
    });
  }

  // S3 Buckets
  const s3 = new S3Client(cfg);
  const s3Res = await safe(() => s3.send(new ListBucketsCommand({})), { Buckets: [] });
  for (const b of s3Res.Buckets || []) {
    resources.push({ id: b.Name || '', name: b.Name || '', type: 'S3Bucket', category: 'Storage', region: 'global', status: 'active' });
  }

  // RDS Instances
  const rds = new RDSClient(cfg);
  const rdsRes = await safe(() => rds.send(new DescribeDBInstancesCommand({})), { DBInstances: [] });
  for (const db of rdsRes.DBInstances || []) {
    resources.push({
      id: db.DBInstanceIdentifier || '',
      name: db.DBInstanceIdentifier || '',
      type: 'RDSInstance',
      category: 'Database',
      region: cfg.region,
      status: db.DBInstanceStatus || 'unknown',
      deleteProtection: db.DeletionProtection || false,
    });
  }

  // RDS Clusters
  const rdsCRes = await safe(() => rds.send(new DescribeDBClustersCommand({})), { DBClusters: [] });
  for (const c of rdsCRes.DBClusters || []) {
    resources.push({
      id: c.DBClusterIdentifier || '',
      name: c.DBClusterIdentifier || '',
      type: 'RDSCluster',
      category: 'Database',
      region: cfg.region,
      status: c.Status || 'unknown',
      deleteProtection: c.DeletionProtection || false,
    });
  }

  // Lambda
  const lambda = new LambdaClient(cfg);
  const lambdaRes = await safe(() => lambda.send(new ListFunctionsCommand({})), { Functions: [] });
  for (const fn of lambdaRes.Functions || []) {
    resources.push({ id: fn.FunctionName || '', name: fn.FunctionName || '', type: 'LambdaFunction', category: 'Serverless', region: cfg.region, status: 'active' });
  }

  // ECS
  const ecs = new ECSClient(cfg);
  const ecsRes = await safe(() => ecs.send(new ListClustersCommand({})), { clusterArns: [] });
  for (const arn of ecsRes.clusterArns || []) {
    const name = arn.split('/').pop() || arn;
    resources.push({ id: arn, name, type: 'ECSCluster', category: 'Containers', region: cfg.region, status: 'active' });
  }

  // EKS
  const eks = new EKSClient(cfg);
  const eksRes = await safe(() => eks.send(new ListEKSClustersCommand({})), { clusters: [] });
  for (const name of eksRes.clusters || []) {
    resources.push({ id: name, name, type: 'EKSCluster', category: 'Containers', region: cfg.region, status: 'active' });
  }

  // ECR
  const ecr = new ECRClient(cfg);
  const ecrRes = await safe(() => ecr.send(new DescribeRepositoriesCommand({})), { repositories: [] });
  for (const repo of ecrRes.repositories || []) {
    resources.push({ id: repo.repositoryName || '', name: repo.repositoryName || '', type: 'ECRRepository', category: 'Containers', region: cfg.region, status: 'active' });
  }

  // DynamoDB
  const dynamo = new DynamoDBClient(cfg);
  const dynamoRes = await safe(() => dynamo.send(new ListTablesCommand({})), { TableNames: [] });
  for (const table of dynamoRes.TableNames || []) {
    resources.push({ id: table, name: table, type: 'DynamoDBTable', category: 'Database', region: cfg.region, status: 'active' });
  }

  // ElastiCache
  const elasticache = new ElastiCacheClient(cfg);
  const cacheRes = await safe(() => elasticache.send(new DescribeCacheClustersCommand({})), { CacheClusters: [] });
  for (const c of cacheRes.CacheClusters || []) {
    resources.push({ id: c.CacheClusterId || '', name: c.CacheClusterId || '', type: 'ElastiCacheCluster', category: 'Database', region: cfg.region, status: c.CacheClusterStatus || 'unknown' });
  }

  // SQS
  const sqs = new SQSClient(cfg);
  const sqsRes = await safe(() => sqs.send(new ListQueuesCommand({})), { QueueUrls: [] });
  for (const url of sqsRes.QueueUrls || []) {
    const name = url.split('/').pop() || url;
    resources.push({ id: url, name, type: 'SQSQueue', category: 'Messaging', region: cfg.region, status: 'active' });
  }

  // SNS
  const sns = new SNSClient(cfg);
  const snsRes = await safe(() => sns.send(new ListTopicsCommand({})), { Topics: [] });
  for (const t of snsRes.Topics || []) {
    const name = t.TopicArn?.split(':').pop() || t.TopicArn || '';
    resources.push({ id: t.TopicArn || '', name, type: 'SNSTopic', category: 'Messaging', region: cfg.region, status: 'active' });
  }

  // Kinesis
  const kinesis = new KinesisClient(cfg);
  const kinesisRes = await safe(() => kinesis.send(new ListStreamsCommand({})), { StreamNames: [] });
  for (const name of kinesisRes.StreamNames || []) {
    resources.push({ id: name, name, type: 'KinesisStream', category: 'Messaging', region: cfg.region, status: 'active' });
  }

  // CloudFormation
  const cfn = new CloudFormationClient(cfg);
  const cfnRes = await safe(() => cfn.send(new ListStacksCommand({ StackStatusFilter: ['CREATE_COMPLETE', 'UPDATE_COMPLETE', 'ROLLBACK_COMPLETE'] as any })), { StackSummaries: [] });
  for (const s of cfnRes.StackSummaries || []) {
    resources.push({ id: s.StackId || s.StackName || '', name: s.StackName || '', type: 'CloudFormationStack', category: 'DevOps', region: cfg.region, status: s.StackStatus || 'unknown' });
  }

  // ALB/NLB
  const elb = new ElasticLoadBalancingV2Client(cfg);
  const elbRes = await safe(() => elb.send(new DescribeLoadBalancersCommand({})), { LoadBalancers: [] });
  for (const lb of elbRes.LoadBalancers || []) {
    resources.push({ id: lb.LoadBalancerArn || '', name: lb.LoadBalancerName || '', type: lb.Type === 'network' ? 'NLB' : 'ALB', category: 'LoadBalancing', region: cfg.region, status: lb.State?.Code || 'unknown' });
  }

  // AutoScaling
  const asg = new AutoScalingClient(cfg);
  const asgRes = await safe(() => asg.send(new DescribeAutoScalingGroupsCommand({})), { AutoScalingGroups: [] });
  for (const g of asgRes.AutoScalingGroups || []) {
    resources.push({ id: g.AutoScalingGroupARN || g.AutoScalingGroupName || '', name: g.AutoScalingGroupName || '', type: 'AutoScalingGroup', category: 'AutoScaling', region: cfg.region, status: 'active' });
  }

  // API Gateway
  const apigw = new APIGatewayClient(cfg);
  const apigwRes = await safe(() => apigw.send(new GetRestApisCommand({})), { items: [] });
  for (const api of apigwRes.items || []) {
    resources.push({ id: api.id || '', name: api.name || '', type: 'APIGatewayRestAPI', category: 'Serverless', region: cfg.region, status: 'active' });
  }

  // Step Functions
  const sfn = new SFNClient(cfg);
  const sfnRes = await safe(() => sfn.send(new ListStateMachinesCommand({})), { stateMachines: [] });
  for (const sm of sfnRes.stateMachines || []) {
    resources.push({ id: sm.stateMachineArn || '', name: sm.name || '', type: 'StepFunctionStateMachine', category: 'Serverless', region: cfg.region, status: 'active' });
  }

  // Cognito
  const cognito = new CognitoIdentityProviderClient(cfg);
  const cognitoRes = await safe(() => cognito.send(new ListUserPoolsCommand({ MaxResults: 60 })), { UserPools: [] });
  for (const pool of cognitoRes.UserPools || []) {
    resources.push({ id: pool.Id || '', name: pool.Name || '', type: 'CognitoUserPool', category: 'Serverless', region: cfg.region, status: 'active' });
  }

  // EventBridge
  const eb = new EventBridgeClient(cfg);
  const ebRes = await safe(() => eb.send(new ListEventBusesCommand({})), { EventBuses: [] });
  for (const bus of ebRes.EventBuses || []) {
    if (bus.Name === 'default') continue;
    resources.push({ id: bus.Arn || bus.Name || '', name: bus.Name || '', type: 'EventBridgeBus', category: 'Messaging', region: cfg.region, status: 'active' });
  }

  // CloudFront
  const cf = new CloudFrontClient(cfg);
  const cfRes = await safe(() => cf.send(new ListDistributionsCommand({})), { DistributionList: { Items: [] } });
  for (const dist of cfRes.DistributionList?.Items || []) {
    resources.push({ id: dist.Id || '', name: dist.DomainName || dist.Id || '', type: 'CloudFrontDistribution', category: 'CDN', region: 'global', status: dist.Status || 'unknown' });
  }

  // Route53
  const r53 = new Route53Client(cfg);
  const r53Res = await safe(() => r53.send(new ListHostedZonesCommand({})), { HostedZones: [] });
  for (const zone of r53Res.HostedZones || []) {
    resources.push({ id: zone.Id || '', name: zone.Name || '', type: 'Route53HostedZone', category: 'DNS', region: 'global', status: 'active' });
  }

  // Secrets Manager
  const sm = new SecretsManagerClient(cfg);
  const smRes = await safe(() => sm.send(new ListSecretsCommand({})), { SecretList: [] });
  for (const secret of smRes.SecretList || []) {
    resources.push({ id: secret.ARN || secret.Name || '', name: secret.Name || '', type: 'SecretsManagerSecret', category: 'Security', region: cfg.region, status: 'active' });
  }

  // IAM Roles
  const iam = new IAMClient(cfg);
  const iamRes = await safe(() => iam.send(new ListRolesCommand({})), { Roles: [] });
  for (const role of iamRes.Roles || []) {
    if (role.Path?.startsWith('/aws-service-role/')) continue;
    resources.push({ id: role.RoleId || '', name: role.RoleName || '', type: 'IAMRole', category: 'Security', region: 'global', status: 'active' });
  }

  // Redshift
  const redshift = new RedshiftClient(cfg);
  const redshiftRes = await safe(() => redshift.send(new DescribeRedshiftClustersCommand({})), { Clusters: [] });
  for (const c of redshiftRes.Clusters || []) {
    resources.push({ id: c.ClusterIdentifier || '', name: c.ClusterIdentifier || '', type: 'RedshiftCluster', category: 'Analytics', region: cfg.region, status: c.ClusterStatus || 'unknown' });
  }

  // Glue
  const glue = new GlueClient(cfg);
  const glueRes = await safe(() => glue.send(new GetDatabasesCommand({})), { DatabaseList: [] });
  for (const db of glueRes.DatabaseList || []) {
    resources.push({ id: db.Name || '', name: db.Name || '', type: 'GlueDatabase', category: 'Analytics', region: cfg.region, status: 'active' });
  }

  // CodeBuild
  const cb = new CodeBuildClient(cfg);
  const cbRes = await safe(() => cb.send(new ListProjectsCommand({})), { projects: [] });
  for (const proj of cbRes.projects || []) {
    resources.push({ id: proj, name: proj, type: 'CodeBuildProject', category: 'DevOps', region: cfg.region, status: 'active' });
  }

  // CodePipeline
  const cp = new CodePipelineClient(cfg);
  const cpRes = await safe(() => cp.send(new ListPipelinesCommand({})), { pipelines: [] });
  for (const p of cpRes.pipelines || []) {
    resources.push({ id: p.name || '', name: p.name || '', type: 'CodePipelinePipeline', category: 'DevOps', region: cfg.region, status: 'active' });
  }

  return resources.length > 0 ? resources : getDemoResources('aws');
}

// ─── Azure Scanner (SDK requires @azure/arm-* packages) ───────────────────

export async function scanAllAzureResources(account: any): Promise<CloudResource[]> {
  // Azure SDK packages (@azure/arm-compute, @azure/arm-storage, etc.) are not
  // currently installed. Returns demo data. Install packages to enable real scan:
  // npm install @azure/arm-compute @azure/arm-network @azure/arm-storage @azure/arm-sql
  //             @azure/arm-containerservice @azure/arm-cosmos-db @azure/identity
  console.warn('[nuke] Azure SDK packages not installed — returning demo resources');
  return getDemoResources('azure');
}

// ─── GCP Scanner ──────────────────────────────────────────────────────────

export async function scanAllGCPResources(account: any): Promise<CloudResource[]> {
  // GCP SDK packages (@google-cloud/compute, @google-cloud/storage, etc.) are not
  // all currently installed. Returns demo data. Install packages to enable real scan:
  // npm install @google-cloud/compute @google-cloud/storage @google-cloud/bigtable
  //             @google-cloud/pubsub @google-cloud/firestore
  console.warn('[nuke] GCP full scan packages not installed — returning demo resources');
  return getDemoResources('gcp');
}

// ─── Generate Nuke Config YAML ─────────────────────────────────────────────

export async function generateNukeConfig(account: any, retentions: any[]): Promise<string> {
  const retainedIds = new Set(retentions.map((r: any) => r.cloudResourceId));
  const provider = account.provider.toLowerCase();

  if (provider === 'aws') {
    const excludeBlocks = retentions.map((r: any) =>
      `      - property: id\n        value: "${r.cloudResourceId}"  # ${r.resourceName} — ${r.reason}`
    ).join('\n');

    const serviceEntries = Object.entries(AWS_SERVICE_CATEGORIES).flatMap(([, types]) =>
      types.map(t => `  ${t}:\n    - filters:\n        include:\n          - ALL`)
    ).join('\n\n');

    return `# aws-nuke configuration — generated by CloudGuard Pro
# Account: ${account.accountName} (${account.accountId})
# Generated: ${new Date().toISOString()}
# ⚠️  DANGER: This config will DELETE all listed resources in the target account.
#     Always run a dry-run first. Review carefully before executing.

regions:
  - ${account.region || 'us-east-1'}

account-blocklist:
  - "000000000000"  # Add production account IDs here to prevent accidental nuke

accounts:
  ${account.accountId}:
    filters:
${retentions.length > 0 ? `      # === Retained Resources (CloudGuard Retentions) ===\n${excludeBlocks}` : '      # No retentions configured'}

resource-types:
  targets:
${Object.values(AWS_SERVICE_CATEGORIES).flat().map(t => `    - ${t}`).join('\n')}

# Per-resource overrides
resources:
${serviceEntries}
`;
  }

  if (provider === 'azure') {
    const excludeList = retentions.map((r: any) =>
      `  - id: "${r.cloudResourceId}"  # ${r.resourceName}`
    ).join('\n');

    const serviceList = Object.values(AZURE_SERVICE_CATEGORIES).flat().map(t => `  - ${t}`).join('\n');

    return `# CloudGuard Azure Cleanup Config
# Account: ${account.accountName} (${account.accountId})
# Generated: ${new Date().toISOString()}
# ⚠️  CloudGuard-native format — not a third-party tool.
#     CloudGuard uses this config internally via Azure SDK to target resources.
#     Always run a dry-run first.

subscription: "${account.accountId}"

retentions:
${retentions.length > 0 ? excludeList : '  # No retentions configured'}

resource_types:
${serviceList}

options:
  dry_run: true  # CloudGuard sets this automatically — changed to false on live run
  delete_resource_groups: false  # Safety: don't delete resource groups unless explicitly targeted
  regions:
    - ${account.region || 'eastus'}
`;
  }

  // GCP
  const excludeList = retentions.map((r: any) =>
    `  - id: "${r.cloudResourceId}"  # ${r.resourceName}`
  ).join('\n');

  const serviceList = Object.values(GCP_SERVICE_CATEGORIES).flat().map(t => `  - ${t}`).join('\n');

  return `# CloudGuard GCP Cleanup Config
# Project: ${account.accountName} (${account.accountId})
# Generated: ${new Date().toISOString()}
# ⚠️  CloudGuard-native format — not a third-party tool.
#     CloudGuard uses this config internally via GCP SDK to target resources.
#     Always run a dry-run first.

project: "${account.accountId}"

retentions:
${retentions.length > 0 ? excludeList : '  # No retentions configured'}

resource_types:
${serviceList}

options:
  dry_run: true  # CloudGuard sets this automatically — changed to false on live run
  regions:
    - ${account.region || 'us-central1'}
`;
}

// ─── Dry Run ───────────────────────────────────────────────────────────────

export async function performDryRun(account: any, retentions: any[]): Promise<DryRunResult> {
  const provider = account.provider.toLowerCase();
  let allResources: CloudResource[] = [];

  if (provider === 'aws') allResources = await scanAllAWSResources(account);
  else if (provider === 'azure') allResources = await scanAllAzureResources(account);
  else allResources = await scanAllGCPResources(account);

  const retainedIds = new Set(retentions.map((r: any) => r.cloudResourceId));

  const wouldDelete: CloudResource[] = [];
  const wouldRetain: CloudResource[] = [];
  const wouldSkip: CloudResource[] = [];

  for (const resource of allResources) {
    if (resource.deleteProtection) {
      wouldSkip.push(resource);
    } else if (retainedIds.has(resource.id)) {
      wouldRetain.push(resource);
    } else {
      wouldDelete.push(resource);
    }
  }

  return { total: allResources.length, wouldDelete, wouldRetain, wouldSkip };
}

// ─── Live Nuke ─────────────────────────────────────────────────────────────

export async function executeLiveNuke(account: any, retentions: any[]): Promise<LiveNukeResult> {
  const cfg = awsClients(account);
  const provider = account.provider.toLowerCase();
  let allResources: CloudResource[] = [];

  if (provider === 'aws') allResources = await scanAllAWSResources(account);
  else if (provider === 'azure') allResources = await scanAllAzureResources(account);
  else allResources = await scanAllGCPResources(account);

  const retainedIds = new Set(retentions.map((r: any) => r.cloudResourceId));

  const deleted: LiveNukeResult['deleted'] = [];
  const retained: LiveNukeResult['retained'] = [];
  const failed: LiveNukeResult['failed'] = [];
  const skipped: LiveNukeResult['skipped'] = [];

  for (const resource of allResources) {
    if (resource.deleteProtection) {
      skipped.push({ resource, reason: 'Delete protection enabled' });
      continue;
    }
    if (retainedIds.has(resource.id)) {
      retained.push({ resource, reason: retentions.find((r: any) => r.cloudResourceId === resource.id)?.reason || 'Retained' });
      continue;
    }

    if (provider !== 'aws') {
      // Azure/GCP: SDK packages not installed — log as manual required
      failed.push({ resource, error: `Manual deletion required — ${provider.toUpperCase()} SDK not fully installed` });
      continue;
    }

    try {
      if (resource.type === 'EC2Instance') {
        const ec2 = new EC2Client(cfg);
        await ec2.send(new TerminateInstancesCommand({ InstanceIds: [resource.id] }));
        deleted.push({ resource, message: 'Instance terminated' });
      } else if (resource.type === 'EBSVolume') {
        const ec2 = new EC2Client(cfg);
        await ec2.send(new DeleteVolumeCommand({ VolumeId: resource.id }));
        deleted.push({ resource, message: 'Volume deleted' });
      } else if (resource.type === 'S3Bucket') {
        const s3 = new S3Client(cfg);
        // Empty bucket first
        let truncated = true;
        while (truncated) {
          const listed = await s3.send(new ListObjectsV2Command({ Bucket: resource.id }));
          if (listed.Contents && listed.Contents.length > 0) {
            await s3.send(new DeleteObjectsCommand({
              Bucket: resource.id,
              Delete: { Objects: listed.Contents.map((o: any) => ({ Key: o.Key })) },
            }));
          }
          truncated = listed.IsTruncated || false;
        }
        await s3.send(new DeleteBucketCommand({ Bucket: resource.id }));
        deleted.push({ resource, message: 'Bucket emptied and deleted' });
      } else if (resource.type === 'RDSInstance') {
        const rds = new RDSClient(cfg);
        await rds.send(new DeleteDBInstanceCommand({
          DBInstanceIdentifier: resource.id,
          SkipFinalSnapshot: true,
          DeleteAutomatedBackups: true,
        }));
        deleted.push({ resource, message: 'RDS instance deletion initiated' });
      } else if (resource.type === 'LambdaFunction') {
        const lambda = new LambdaClient(cfg);
        await lambda.send(new DeleteFunctionCommand({ FunctionName: resource.id }));
        deleted.push({ resource, message: 'Lambda function deleted' });
      } else {
        failed.push({ resource, error: 'Manual deletion required — SDK delete not implemented for this type' });
      }
    } catch (err: any) {
      failed.push({ resource, error: err.message || 'Unknown error' });
    }
  }

  return { total: allResources.length, deleted, retained, failed, skipped };
}

// ─── Scheduled Nuke Check (called by cron) ────────────────────────────────

export async function checkNukeSchedules(): Promise<void> {
  try {
    const now = new Date();
    const dueConfigs = await prisma.nukeConfig.findMany({
      where: {
        enabled: true,
        mode: 'AUTOMATIC',
        nextRunAt: { lte: now },
      },
      include: {
        account: { include: { user: true } },
        nukeNotifications: { orderBy: { sentAt: 'desc' }, take: 1 },
      },
    });

    for (const config of dueConfigs) {
      const { account } = config;

      // Send notification emails
      const emails: string[] = JSON.parse(config.notificationEmails || '[]');
      if (emails.length > 0 && process.env.SENDGRID_API_KEY) {
        const nextRunFormatted = config.nextRunAt ? config.nextRunAt.toUTCString() : 'soon';
        try {
          await sgMail.send({
            to: emails,
            from: process.env.SENDGRID_FROM_EMAIL || 'noreply@cloudguard.pro',
            subject: `⚠️ CloudGuard: Scheduled Nuke for ${account.accountName}`,
            html: `
              <h2>Scheduled Account Nuke Notification</h2>
              <p>A scheduled nuke is configured for your cloud account:</p>
              <ul>
                <li><strong>Account:</strong> ${account.accountName} (${account.accountId})</li>
                <li><strong>Provider:</strong> ${account.provider}</li>
                <li><strong>Scheduled At:</strong> ${nextRunFormatted}</li>
              </ul>
              <p>If you need to retain specific resources, add them to your retention list in CloudGuard Pro before the scheduled run.</p>
              <p style="color: red;"><strong>⚠️ This action is irreversible. All non-retained resources will be permanently deleted.</strong></p>
              <hr/>
              <p style="color: grey; font-size: 12px;">Sent by CloudGuard Pro. Manage your nuke settings at your CloudGuard dashboard.</p>
            `,
          });

          await prisma.nukeNotification.create({
            data: {
              configId: config.id,
              recipientEmails: JSON.stringify(emails),
              subject: `Scheduled Nuke for ${account.accountName}`,
              daysUntilNuke: config.notificationDays,
              status: 'sent',
            },
          });
        } catch (emailErr: any) {
          console.error('[nuke] Email send failed:', emailErr.message);
          await prisma.nukeNotification.create({
            data: {
              configId: config.id,
              recipientEmails: JSON.stringify(emails),
              subject: `Scheduled Nuke for ${account.accountName}`,
              daysUntilNuke: config.notificationDays,
              status: 'failed',
            },
          });
        }
      }

      // Execute automatic nuke
      if (config.nextRunAt && config.nextRunAt <= now) {
        const startedAt = new Date();
        const run = await prisma.nukeRun.create({
          data: {
            configId: config.id,
            userId: account.userId,
            runType: 'SCHEDULED',
            status: 'RUNNING',
            triggeredBy: 'System (Scheduled)',
            startedAt,
          },
        });

        try {
          const retentions = await prisma.nukeRetention.findMany({
            where: { accountId: account.id, status: 'ACTIVE' },
          });

          const result = await executeLiveNuke(account, retentions);

          await prisma.nukeRun.update({
            where: { id: run.id },
            data: {
              status: 'COMPLETED',
              totalResources: result.total,
              deletedResources: result.deleted.length,
              retainedResources: result.retained.length,
              failedResources: result.failed.length,
              skippedResources: result.skipped.length,
              completedAt: new Date(),
              duration: `${Math.floor((Date.now() - startedAt.getTime()) / 1000)}s`,
            },
          });
        } catch (nukeErr: any) {
          await prisma.nukeRun.update({
            where: { id: run.id },
            data: { status: 'FAILED', errorMessage: nukeErr.message },
          });
        }

        // Clear nextRunAt so it doesn't re-trigger until rescheduled
        await prisma.nukeConfig.update({
          where: { id: config.id },
          data: { nextRunAt: null, nukeCode: null },
        });
      }
    }
  } catch (err: any) {
    console.error('[nuke] checkNukeSchedules error:', err.message);
  }
}