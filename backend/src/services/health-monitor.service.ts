import axios from 'axios';
import * as cheerio from 'cheerio';
import prisma from '../config/database';
import { sendOutageAlert } from './email.service';

interface HealthEvent {
  id: string;
  provider: 'aws' | 'azure' | 'gcp';
  service: string;
  region: string;
  status: 'active' | 'resolved';
  severity: 'critical' | 'major' | 'minor';
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  url?: string;
}

interface ServiceStatus {
  provider: 'aws' | 'azure' | 'gcp';
  healthy: boolean;
  message: string;
  activeIssues: number;
  lastChecked: Date;
}

// AWS Status from Official Dashboard
export const getAWSStatus = async (): Promise<ServiceStatus> => {
  try {
    const response = await axios.get('https://health.aws.amazon.com/health/status', {
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Check for service disruptions
    const disruptions: HealthEvent[] = [];
    
    // Look for any service issues on the page
    $('.service-status').each((i, elem) => {
      const serviceName = $(elem).find('.service-name').text().trim();
      const status = $(elem).find('.status').text().trim().toLowerCase();
      
      if (status.includes('disruption') || status.includes('degradation') || status.includes('outage')) {
        disruptions.push({
          id: `aws-${Date.now()}-${i}`,
          provider: 'aws',
          service: serviceName || 'AWS Service',
          region: 'global',
          status: 'active',
          severity: 'critical',
          title: `${serviceName} - Service Disruption`,
          description: status,
          startTime: new Date(),
          url: 'https://health.aws.amazon.com/health/status',
        });
      }
    });

    // Alternative: Check AWS Health RSS feed
    const rssResponse = await axios.get('https://status.aws.amazon.com/rss/all.rss', {
      timeout: 10000,
    });

    const rssHtml = rssResponse.data;
    const $rss = cheerio.load(rssHtml, { xmlMode: true });

    $rss('item').each((i, elem) => {
      const title = $rss(elem).find('title').text();
      const description = $rss(elem).find('description').text();
      const pubDate = $rss(elem).find('pubDate').text();

      // Only include recent issues (within last 24 hours)
      const itemDate = new Date(pubDate);
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);

      if (itemDate > dayAgo && (
        title.toLowerCase().includes('issue') ||
        title.toLowerCase().includes('increased error') ||
        title.toLowerCase().includes('degradation') ||
        title.toLowerCase().includes('outage')
      )) {
        disruptions.push({
          id: `aws-rss-${Date.now()}-${i}`,
          provider: 'aws',
          service: title.split('-')[0].trim(),
          region: 'multiple',
          status: 'active',
          severity: 'major',
          title: title,
          description: description.replace(/<[^>]*>/g, '').substring(0, 200),
          startTime: itemDate,
          url: 'https://status.aws.amazon.com',
        });
      }
    });

    return {
      provider: 'aws',
      healthy: disruptions.length === 0,
      message: disruptions.length === 0 
        ? 'All AWS services operating normally' 
        : `${disruptions.length} active issue(s) detected`,
      activeIssues: disruptions.length,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    console.error('AWS Status fetch error:', error.message);
    return {
      provider: 'aws',
      healthy: true,
      message: 'Unable to check AWS status',
      activeIssues: 0,
      lastChecked: new Date(),
    };
  }
};

// Azure Status
export const getAzureStatus = async (): Promise<ServiceStatus> => {
  try {
    const response = await axios.get('https://status.azure.com/en-us/status', {
      timeout: 10000,
    });

    const html = response.data;
    const $ = cheerio.load(html);

    let hasIssues = false;
    let issueCount = 0;

    // Check for active incidents
    if (html.includes('Service degradation') || 
        html.includes('Service interruption') ||
        html.includes('Investigating') ||
        $('.active-incident').length > 0) {
      hasIssues = true;
      issueCount = $('.active-incident').length || 1;
    }

    return {
      provider: 'azure',
      healthy: !hasIssues,
      message: hasIssues 
        ? `${issueCount} active issue(s) detected` 
        : 'All Azure services operating normally',
      activeIssues: issueCount,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    console.error('Azure Status fetch error:', error.message);
    return {
      provider: 'azure',
      healthy: true,
      message: 'Unable to check Azure status',
      activeIssues: 0,
      lastChecked: new Date(),
    };
  }
};

// GCP Status
export const getGCPStatus = async (): Promise<ServiceStatus> => {
  try {
    const response = await axios.get('https://status.cloud.google.com/incidents.json', {
      timeout: 10000,
    });

    const incidents = response.data || [];
    const activeIncidents = incidents.filter((incident: any) => !incident.end);

    return {
      provider: 'gcp',
      healthy: activeIncidents.length === 0,
      message: activeIncidents.length === 0 
        ? 'All GCP services operating normally' 
        : `${activeIncidents.length} active incident(s)`,
      activeIssues: activeIncidents.length,
      lastChecked: new Date(),
    };
  } catch (error: any) {
    console.error('GCP Status fetch error:', error.message);
    return {
      provider: 'gcp',
      healthy: true,
      message: 'Unable to check GCP status',
      activeIssues: 0,
      lastChecked: new Date(),
    };
  }
};

// Get all cloud provider statuses
export const getAllCloudStatuses = async () => {
  try {
    const [awsStatus, azureStatus, gcpStatus] = await Promise.all([
      getAWSStatus(),
      getAzureStatus(),
      getGCPStatus(),
    ]);

    const allHealthy = awsStatus.healthy && azureStatus.healthy && gcpStatus.healthy;
    const totalIssues = awsStatus.activeIssues + azureStatus.activeIssues + gcpStatus.activeIssues;

    return {
      allHealthy,
      totalIssues,
      providers: {
        aws: awsStatus,
        azure: azureStatus,
        gcp: gcpStatus,
      },
      lastChecked: new Date(),
    };
  } catch (error: any) {
    console.error('Cloud status fetch error:', error);
    throw error;
  }
};

// Version updates (keeping this)
export const checkVersionUpdates = async () => {
  const updates = {
    aws: [
      { service: 'RDS PostgreSQL', currentVersion: '14.5', latestVersion: '15.3', upgrade: true },
      { service: 'EKS', currentVersion: '1.27', latestVersion: '1.28', upgrade: true },
      { service: 'Lambda Runtime Node.js', currentVersion: '16.x', latestVersion: '20.x', upgrade: true },
    ],
    azure: [],
    gcp: [],
  };

  // Send email alerts for new outages
if (!allHealthy) {
    // Get all users to notify
    const users = await prisma.user.findMany({
      where: { emailVerified: true },
      select: { id: true, email: true, name: true },
    });
  
    for (const user of users) {
      // Check each provider for issues
      for (const [providerKey, providerStatus] of Object.entries({ aws: awsStatus, azure: azureStatus, gcp: gcpStatus })) {
        if (!providerStatus.healthy) {
          // Check if we've already sent notification for this issue
          const recentNotification = await prisma.healthEvent.findFirst({
            where: {
              userId: user.id,
              provider: providerKey as any,
              status: 'active',
              createdAt: {
                gte: new Date(Date.now() - 60 * 60 * 1000), // Within last hour
              },
            },
          });
  
          if (!recentNotification) {
            // Send email alert
            try {
              await sendOutageAlert(user.email, {
                provider: providerKey,
                service: 'Multiple Services',
                region: 'global',
                severity: 'critical',
                status: 'active',
                title: `${providerKey.toUpperCase()} Service Issues Detected`,
                description: providerStatus.message,
                startTime: new Date(),
                url: providerKey === 'aws' ? 'https://status.aws.amazon.com' : 
                     providerKey === 'azure' ? 'https://status.azure.com' : 
                     'https://status.cloud.google.com',
              });
  
              // Log the notification
              await prisma.healthEvent.create({
                data: {
                  externalId: `${providerKey}-alert-${Date.now()}`,
                  userId: user.id,
                  provider: providerKey as any,
                  service: 'Multiple Services',
                  region: 'global',
                  status: 'active',
                  severity: 'critical',
                  title: `${providerKey.toUpperCase()} Service Issues`,
                  description: providerStatus.message,
                  startTime: new Date(),
                  url: providerKey === 'aws' ? 'https://status.aws.amazon.com' : 
                       providerKey === 'azure' ? 'https://status.azure.com' : 
                       'https://status.cloud.google.com',
                },
              });
  
              console.log(`✅ Outage alert sent to ${user.email} for ${providerKey.toUpperCase()}`);
            } catch (emailError) {
              console.error(`Failed to send outage alert to ${user.email}:`, emailError);
            }
          }
        }
      }
    }
  }
  
  return updates;
};
