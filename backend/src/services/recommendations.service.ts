import AWS from 'aws-sdk';
import { decrypt } from '../utils/encryption';
import prisma from '../config/database';

interface Recommendation {
  title: string;
  description: string;
  savings: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
  resourceCount: number;
}

export const getAWSRecommendations = async (cloudAccountId: string): Promise<Recommendation[]> => {
  try {
    const account = await prisma.cloudAccount.findUnique({
      where: { id: cloudAccountId },
    });

    if (!account || !account.awsRoleArn || !account.awsExternalId) {
      throw new Error('AWS account not found');
    }

    const externalId = decrypt(account.awsExternalId);

    // Assume role
    const sts = new AWS.STS();
    const assumedRole = await sts.assumeRole({
      RoleArn: account.awsRoleArn,
      RoleSessionName: 'CloudGuardProRecommendations',
      ExternalId: externalId,
      DurationSeconds: 900,
    }).promise();

    if (!assumedRole.Credentials) {
      throw new Error('Failed to assume role');
    }

    const credentials = {
      accessKeyId: assumedRole.Credentials.AccessKeyId,
      secretAccessKey: assumedRole.Credentials.SecretAccessKey,
      sessionToken: assumedRole.Credentials.SessionToken,
    };

    const recommendations: Recommendation[] = [];

    // Get EC2 recommendations
    const ec2Recs = await getEC2Recommendations(credentials);
    recommendations.push(...ec2Recs);

    // Get EBS recommendations
    const ebsRecs = await getEBSRecommendations(credentials);
    recommendations.push(...ebsRecs);

    // Get S3 recommendations
    const s3Recs = await getS3Recommendations(credentials);
    recommendations.push(...s3Recs);

    console.log('💡 Generated recommendations:', recommendations.length);
    
    return recommendations;
  } catch (error: any) {
    console.error('Recommendations error:', error);
    throw new Error(`Failed to generate recommendations: ${error.message}`);
  }
};

async function getEC2Recommendations(credentials: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
  
    try {
      const ec2 = new AWS.EC2({ ...credentials, region: 'us-east-1' }); // ADD REGION
      const cloudwatch = new AWS.CloudWatch({ ...credentials, region: 'us-east-1' }); // ADD REGION

    // Get all running instances
    const instances = await ec2.describeInstances({
      Filters: [{ Name: 'instance-state-name', Values: ['running'] }],
    }).promise();

    let undersizedCount = 0;
    let totalSavings = 0;

    for (const reservation of instances.Reservations || []) {
      for (const instance of reservation.Instances || []) {
        const instanceId = instance.InstanceId!;

        // Get CPU utilization for last 14 days
        const endTime = new Date();
        const startTime = new Date();
        startTime.setDate(startTime.getDate() - 14);

        const metrics = await cloudwatch.getMetricStatistics({
          Namespace: 'AWS/EC2',
          MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'InstanceId', Value: instanceId }],
          StartTime: startTime,
          EndTime: endTime,
          Period: 86400, // 1 day
          Statistics: ['Average'],
        }).promise();

        // Calculate average CPU
        const avgCPU = metrics.Datapoints && metrics.Datapoints.length > 0
          ? metrics.Datapoints.reduce((sum, dp) => sum + (dp.Average || 0), 0) / metrics.Datapoints.length
          : 100; // Default to 100% if no data

        // If average CPU < 10%, recommend downsizing
        if (avgCPU < 10) {
          undersizedCount++;
          // Estimate 30% savings from downsizing
          const estimatedMonthlyCost = 50; // Rough estimate
          totalSavings += estimatedMonthlyCost * 0.3;
        }
      }
    }

    if (undersizedCount > 0) {
      recommendations.push({
        title: 'Rightsize Underutilized EC2 Instances',
        description: `${undersizedCount} instances running with less than 10% CPU utilization`,
        savings: `$${Math.round(totalSavings)}/mo`,
        priority: 'high',
        category: 'EC2',
        resourceCount: undersizedCount,
      });
    }
  } catch (error) {
    console.error('EC2 recommendations error:', error);
  }

  return recommendations;
}

async function getEBSRecommendations(credentials: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
  
    try {
      const ec2 = new AWS.EC2({ ...credentials, region: 'us-east-1' }); // ADD REGION

    // Get unattached EBS volumes
    const volumes = await ec2.describeVolumes({
      Filters: [{ Name: 'status', Values: ['available'] }],
    }).promise();

    const unattachedCount = volumes.Volumes?.length || 0;

    if (unattachedCount > 0) {
      // Calculate total size and estimated cost
      const totalSizeGB = volumes.Volumes?.reduce((sum, vol) => sum + (vol.Size || 0), 0) || 0;
      const monthlyCost = totalSizeGB * 0.10; // $0.10 per GB-month for gp3

      recommendations.push({
        title: 'Delete Unused EBS Volumes',
        description: `${unattachedCount} unattached volumes (${totalSizeGB} GB total)`,
        savings: `$${Math.round(monthlyCost)}/mo`,
        priority: 'medium',
        category: 'EBS',
        resourceCount: unattachedCount,
      });
    }

    // Check for old snapshots (>90 days)
    const snapshots = await ec2.describeSnapshots({
      OwnerIds: ['self'],
    }).promise();

    const oldSnapshots = snapshots.Snapshots?.filter(snap => {
      const age = Date.now() - new Date(snap.StartTime!).getTime();
      const daysOld = age / (1000 * 60 * 60 * 24);
      return daysOld > 90;
    }) || [];

    if (oldSnapshots.length > 0) {
      const totalSize = oldSnapshots.reduce((sum, snap) => sum + (snap.VolumeSize || 0), 0);
      const monthlyCost = totalSize * 0.05; // $0.05 per GB-month for snapshots

      recommendations.push({
        title: 'Clean Up Old EBS Snapshots',
        description: `${oldSnapshots.length} snapshots older than 90 days`,
        savings: `$${Math.round(monthlyCost)}/mo`,
        priority: 'low',
        category: 'EBS',
        resourceCount: oldSnapshots.length,
      });
    }
  } catch (error) {
    console.error('EBS recommendations error:', error);
  }

  return recommendations;
}

async function getS3Recommendations(credentials: any): Promise<Recommendation[]> {
    const recommendations: Recommendation[] = [];
  
    try {
      const s3 = new AWS.S3({ ...credentials, region: 'us-east-1' }); // ADD REGION

    // Get all buckets
    const buckets = await s3.listBuckets().promise();

    let bucketsWithoutLifecycle = 0;
    let totalSizeGB = 0;

    for (const bucket of buckets.Buckets || []) {
      try {
        // Check if bucket has lifecycle policy
        await s3.getBucketLifecycleConfiguration({ Bucket: bucket.Name! }).promise();
      } catch (error: any) {
        if (error.code === 'NoSuchLifecycleConfiguration') {
          bucketsWithoutLifecycle++;

          // Get bucket size (this is a rough estimate)
          try {
            const objects = await s3.listObjectsV2({ Bucket: bucket.Name!, MaxKeys: 1000 }).promise();
            const bucketSize = objects.Contents?.reduce((sum, obj) => sum + (obj.Size || 0), 0) || 0;
            totalSizeGB += bucketSize / (1024 * 1024 * 1024);
          } catch (e) {
            // Skip if can't access
          }
        }
      }
    }

    if (bucketsWithoutLifecycle > 0 && totalSizeGB > 100) {
      // Estimate 20-30% savings from intelligent tiering
      const standardCost = totalSizeGB * 0.023; // $0.023 per GB-month
      const savings = standardCost * 0.25;

      recommendations.push({
        title: 'Enable S3 Intelligent-Tiering',
        description: `${bucketsWithoutLifecycle} buckets without lifecycle policies (${Math.round(totalSizeGB)} GB)`,
        savings: `$${Math.round(savings)}/mo`,
        priority: 'medium',
        category: 'S3',
        resourceCount: bucketsWithoutLifecycle,
      });
    }
  } catch (error) {
    console.error('S3 recommendations error:', error);
  }

  return recommendations;
}
