import { 
  EC2Client, 
  DescribeInstancesCommand,
  DescribeVolumesCommand,
  DescribeSnapshotsCommand 
} from '@aws-sdk/client-ec2';
import { 
  RDSClient, 
  DescribeDBInstancesCommand,
  DescribeDBClustersCommand 
} from '@aws-sdk/client-rds';
import { 
  S3Client, 
  ListBucketsCommand,
  GetBucketLocationCommand 
} from '@aws-sdk/client-s3';
import { 
  CostExplorerClient, 
  GetCostAndUsageCommand 
} from '@aws-sdk/client-cost-explorer';
import { 
  CloudWatchClient,
  GetMetricStatisticsCommand 
} from '@aws-sdk/client-cloudwatch';
import { 
  IAMClient,
  ListUsersCommand,
  GetCredentialReportCommand,
  GenerateCredentialReportCommand 
} from '@aws-sdk/client-iam';

export class AWSService {
  private ec2Client: EC2Client;
  private rdsClient: RDSClient;
  private s3Client: S3Client;
  private costExplorerClient: CostExplorerClient;
  private cloudWatchClient: CloudWatchClient;
  private iamClient: IAMClient;

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    const credentials = { accessKeyId, secretAccessKey };
    
    this.ec2Client = new EC2Client({ region, credentials });
    this.rdsClient = new RDSClient({ region, credentials });
    this.s3Client = new S3Client({ region, credentials });
    this.costExplorerClient = new CostExplorerClient({ region: 'us-east-1', credentials }); // CE is only in us-east-1
    this.cloudWatchClient = new CloudWatchClient({ region, credentials });
    this.iamClient = new IAMClient({ region: 'us-east-1', credentials }); // IAM is global
  }

  // ============================================
  // EC2 INSTANCES
  // ============================================

  async getEC2Instances() {
    try {
      const command = new DescribeInstancesCommand({});
      const response = await this.ec2Client.send(command);

      const instances = [];
      for (const reservation of response.Reservations || []) {
        for (const instance of reservation.Instances || []) {
          instances.push({
            id: instance.InstanceId,
            name: instance.Tags?.find(tag => tag.Key === 'Name')?.Value || instance.InstanceId,
            type: instance.InstanceType,
            state: instance.State?.Name,
            launchTime: instance.LaunchTime,
            privateIp: instance.PrivateIpAddress,
            publicIp: instance.PublicIpAddress,
            availabilityZone: instance.Placement?.AvailabilityZone,
            platform: instance.Platform || 'linux',
            vpcId: instance.VpcId,
            subnetId: instance.SubnetId,
            tags: instance.Tags,
          });
        }
      }

      return instances;
    } catch (error) {
      console.error('Error fetching EC2 instances:', error);
      throw error;
    }
  }

  // ============================================
  // EBS VOLUMES
  // ============================================

  async getEBSVolumes() {
    try {
      const command = new DescribeVolumesCommand({});
      const response = await this.ec2Client.send(command);

      return (response.Volumes || []).map(volume => ({
        id: volume.VolumeId,
        name: volume.Tags?.find(tag => tag.Key === 'Name')?.Value || volume.VolumeId,
        size: volume.Size,
        type: volume.VolumeType,
        state: volume.State,
        availabilityZone: volume.AvailabilityZone,
        encrypted: volume.Encrypted,
        attachments: volume.Attachments,
        createTime: volume.CreateTime,
        tags: volume.Tags,
      }));
    } catch (error) {
      console.error('Error fetching EBS volumes:', error);
      throw error;
    }
  }

  // ============================================
  // RDS DATABASES
  // ============================================

  async getRDSInstances() {
    try {
      const command = new DescribeDBInstancesCommand({});
      const response = await this.rdsClient.send(command);

      return (response.DBInstances || []).map(db => ({
        id: db.DBInstanceIdentifier,
        name: db.DBInstanceIdentifier,
        engine: db.Engine,
        engineVersion: db.EngineVersion,
        instanceClass: db.DBInstanceClass,
        status: db.DBInstanceStatus,
        allocatedStorage: db.AllocatedStorage,
        availabilityZone: db.AvailabilityZone,
        multiAZ: db.MultiAZ,
        publiclyAccessible: db.PubliclyAccessible,
        encrypted: db.StorageEncrypted,
        endpoint: db.Endpoint?.Address,
        port: db.Endpoint?.Port,
        createTime: db.InstanceCreateTime,
      }));
    } catch (error) {
      console.error('Error fetching RDS instances:', error);
      throw error;
    }
  }

  // ============================================
  // S3 BUCKETS
  // ============================================

  async getS3Buckets() {
    try {
      const command = new ListBucketsCommand({});
      const response = await this.s3Client.send(command);

      const buckets = [];
      for (const bucket of response.Buckets || []) {
        try {
          const locationCommand = new GetBucketLocationCommand({ Bucket: bucket.Name });
          const location = await this.s3Client.send(locationCommand);

          buckets.push({
            id: bucket.Name,
            name: bucket.Name,
            creationDate: bucket.CreationDate,
            region: location.LocationConstraint || 'us-east-1',
          });
        } catch (error) {
          console.error(`Error getting location for bucket ${bucket.Name}:`, error);
          buckets.push({
            id: bucket.Name,
            name: bucket.Name,
            creationDate: bucket.CreationDate,
            region: 'unknown',
          });
        }
      }

      return buckets;
    } catch (error) {
      console.error('Error fetching S3 buckets:', error);
      throw error;
    }
  }

  // ============================================
  // COST & USAGE
  // ============================================

  async getCostAndUsage(startDate: string, endDate: string) {
    try {
      const command = new GetCostAndUsageCommand({
        TimePeriod: {
          Start: startDate,
          End: endDate,
        },
        Granularity: 'MONTHLY',
        Metrics: ['UnblendedCost', 'UsageQuantity'],
        GroupBy: [
          {
            Type: 'DIMENSION',
            Key: 'SERVICE',
          },
        ],
      });

      const response = await this.costExplorerClient.send(command);

      const costData = response.ResultsByTime?.map(result => ({
        timePeriod: result.TimePeriod,
        total: parseFloat(result.Total?.UnblendedCost?.Amount || '0'),
        services: result.Groups?.map(group => ({
          service: group.Keys?.[0] || 'Unknown',
          cost: parseFloat(group.Metrics?.UnblendedCost?.Amount || '0'),
          usage: parseFloat(group.Metrics?.UsageQuantity?.Amount || '0'),
        })) || [],
      })) || [];

      return costData;
    } catch (error) {
      console.error('Error fetching cost data:', error);
      throw error;
    }
  }

  // ============================================
  // IAM SECURITY
  // ============================================

  async getIAMUsers() {
    try {
      const command = new ListUsersCommand({});
      const response = await this.iamClient.send(command);

      return (response.Users || []).map(user => ({
        userName: user.UserName,
        userId: user.UserId,
        arn: user.Arn,
        createDate: user.CreateDate,
        passwordLastUsed: user.PasswordLastUsed,
      }));
    } catch (error) {
      console.error('Error fetching IAM users:', error);
      throw error;
    }
  }

  async getSecurityFindings() {
    try {
      // Generate credential report
      await this.iamClient.send(new GenerateCredentialReportCommand({}));
      
      // Wait a bit for report generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const reportCommand = new GetCredentialReportCommand({});
      const response = await this.iamClient.send(reportCommand);

      // Parse CSV report
      const reportContent = Buffer.from(response.Content!).toString('utf-8');
      const lines = reportContent.split('\n');
      const headers = lines[0].split(',');
      
      const findings = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length < headers.length) continue;

        const user: any = {};
        headers.forEach((header, index) => {
          user[header] = values[index];
        });

        // Check for security issues
        if (user.mfa_active === 'false' && user.password_enabled === 'true') {
          findings.push({
            severity: 'high',
            title: 'MFA Not Enabled',
            resourceType: 'IAM User',
            resourceId: user.user,
            description: `User ${user.user} has password authentication enabled but MFA is not active`,
          });
        }

        if (user.access_key_1_active === 'true' && user.access_key_1_last_rotated) {
          const rotationDate = new Date(user.access_key_1_last_rotated);
          const daysSinceRotation = Math.floor((Date.now() - rotationDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysSinceRotation > 90) {
            findings.push({
              severity: 'medium',
              title: 'Access Key Not Rotated',
              resourceType: 'IAM User',
              resourceId: user.user,
              description: `Access key 1 for ${user.user} has not been rotated in ${daysSinceRotation} days`,
            });
          }
        }
      }

      return findings;
    } catch (error) {
      console.error('Error getting security findings:', error);
      return [];
    }
  }

  // ============================================
  // CLOUDWATCH METRICS
  // ============================================

  async getEC2CPUUtilization(instanceId: string, startTime: Date, endTime: Date) {
    try {
      const command = new GetMetricStatisticsCommand({
        Namespace: 'AWS/EC2',
        MetricName: 'CPUUtilization',
        Dimensions: [
          {
            Name: 'InstanceId',
            Value: instanceId,
          },
        ],
        StartTime: startTime,
        EndTime: endTime,
        Period: 3600, // 1 hour
        Statistics: ['Average', 'Maximum'],
      });

      const response = await this.cloudWatchClient.send(command);

      return response.Datapoints?.map(datapoint => ({
        timestamp: datapoint.Timestamp,
        average: datapoint.Average,
        maximum: datapoint.Maximum,
      })) || [];
    } catch (error) {
      console.error('Error fetching CloudWatch metrics:', error);
      throw error;
    }
  }
}