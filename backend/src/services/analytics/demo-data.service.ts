// Demo data generator for Analytics & Change Tracking

export const generateDemoCostData = (cloudAccountId: string) => {
    return {
      summary: {
        totalCost: 12847.56,
        averageDailyCost: 428.25,
        anomalyCount: 3,
        savingsOpportunity: 2340.00,
      },
      serviceBreakdown: {
        'EC2': 4250.00,
        'S3': 1850.00,
        'RDS': 3200.00,
        'Lambda': 890.00,
        'CloudFront': 1257.56,
        'ECS': 1400.00,
      },
      costTrend: generateCostTrend(),
      anomalies: [
        {
          id: 'demo-anomaly-1',
          service: 'EC2',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          expectedCost: 140.00,
          actualCost: 320.00,
          deviation: 128.57,
          severity: 'high',
          isReviewed: false,
        },
        {
          id: 'demo-anomaly-2',
          service: 'RDS',
          date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          expectedCost: 105.00,
          actualCost: 185.00,
          deviation: 76.19,
          severity: 'medium',
          isReviewed: false,
        },
        {
          id: 'demo-anomaly-3',
          service: 'S3',
          date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          expectedCost: 58.00,
          actualCost: 142.00,
          deviation: 144.83,
          severity: 'critical',
          isReviewed: true,
        },
      ],
      forecasts: generateForecasts(),
      optimizations: [
        {
          id: 'demo-opt-1',
          optimizationType: 'right_sizing',
          priority: 'critical',
          resourceType: 'EC2',
          resourceId: 'i-0a1b2c3d4e5f6g7h8',
          resourceName: 'prod-web-server-1',
          currentCost: 245.00,
          optimizedCost: 120.00,
          monthlySavings: 125.00,
          annualSavings: 1500.00,
          recommendation: 'Downsize from m5.2xlarge to m5.xlarge - Current utilization is only 35%',
          implementationEffort: 'easy',
          status: 'pending',
        },
        {
          id: 'demo-opt-2',
          optimizationType: 'reserved_instance',
          priority: 'high',
          resourceType: 'RDS',
          resourceId: 'db-prod-mysql-01',
          resourceName: 'production-database',
          currentCost: 380.00,
          optimizedCost: 250.00,
          monthlySavings: 130.00,
          annualSavings: 1560.00,
          recommendation: 'Purchase 1-year Reserved Instance for RDS db.r5.xlarge',
          implementationEffort: 'easy',
          status: 'pending',
        },
        {
          id: 'demo-opt-3',
          optimizationType: 'unused_resource',
          priority: 'high',
          resourceType: 'EBS',
          resourceId: 'vol-0a1b2c3d4e5f',
          resourceName: 'unattached-volume-1',
          currentCost: 45.00,
          optimizedCost: 0.00,
          monthlySavings: 45.00,
          annualSavings: 540.00,
          recommendation: 'Delete unattached EBS volume - No usage in 90 days',
          implementationEffort: 'easy',
          status: 'pending',
        },
        {
          id: 'demo-opt-4',
          optimizationType: 'storage_tier',
          priority: 'medium',
          resourceType: 'S3',
          resourceId: 'backup-archive-bucket',
          resourceName: 'backup-archive-bucket',
          currentCost: 280.00,
          optimizedCost: 95.00,
          monthlySavings: 185.00,
          annualSavings: 2220.00,
          recommendation: 'Move 850GB of infrequently accessed data to S3 Glacier',
          implementationEffort: 'medium',
          status: 'pending',
        },
      ],
    };
  };
  
  const generateCostTrend = () => {
    const trend = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const baseCost = 400 + Math.random() * 100;
      const variance = Math.sin(i / 3) * 50;
      
      trend.push({
        date: date.toISOString(),
        amount: baseCost + variance,
        service: 'Total',
      });
    }
    
    return trend;
  };
  
  const generateForecasts = () => {
    const forecasts = [];
    const today = new Date();
    
    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      
      const predictedCost = 420 + (i * 2) + (Math.random() * 50);
      
      forecasts.push({
        id: `forecast-${i}`,
        forecastDate: date.toISOString(),
        predictedCost,
        confidenceLevel: 0.85 - (i * 0.002),
        confidenceRange: {
          min: predictedCost * 0.9,
          max: predictedCost * 1.1,
        },
        service: null,
        model: 'prophet',
      });
    }
    
    return forecasts;
  };
  
  export const generateDemoUtilizationData = () => {
    return {
      summary: {
        totalResources: 47,
        idleResourceCount: 8,
        wastedCost: 845.00,
      },
      utilizationByType: {
        'EC2': {
          count: 15,
          avgCpu: 42.5,
          avgMemory: 58.3,
          avgDisk: 35.2,
        },
        'RDS': {
          count: 6,
          avgCpu: 65.8,
          avgMemory: 72.1,
          avgDisk: 48.9,
        },
        'Lambda': {
          count: 23,
          avgCpu: 15.2,
          avgMemory: 28.7,
          avgDisk: 0,
        },
        'ECS': {
          count: 3,
          avgCpu: 78.4,
          avgMemory: 82.6,
          avgDisk: 45.3,
        },
      },
      metrics: generateUtilizationMetrics(),
      idleResources: [
        {
          id: 'idle-1',
          resourceType: 'EC2',
          resourceId: 'i-dev-test-server-01',
          resourceName: 'dev-test-server-01',
          region: 'us-east-1',
          idleDays: 45,
          avgUtilization: 3.2,
          monthlyCost: 145.00,
          potentialSavings: 145.00,
          recommendation: 'Terminate unused development instance',
          status: 'detected',
        },
        {
          id: 'idle-2',
          resourceType: 'RDS',
          resourceId: 'db-staging-old',
          resourceName: 'staging-database-old',
          region: 'us-west-2',
          idleDays: 30,
          avgUtilization: 8.5,
          monthlyCost: 280.00,
          potentialSavings: 280.00,
          recommendation: 'Delete old staging database - replaced by new instance',
          status: 'detected',
        },
        {
          id: 'idle-3',
          resourceType: 'ELB',
          resourceId: 'elb-legacy-app',
          resourceName: 'legacy-app-load-balancer',
          region: 'eu-west-1',
          idleDays: 60,
          avgUtilization: 0.0,
          monthlyCost: 25.00,
          potentialSavings: 25.00,
          recommendation: 'Delete unused load balancer with zero traffic',
          status: 'detected',
        },
      ],
      heatmap: generateUtilizationHeatmap(),
    };
  };
  
  const generateUtilizationMetrics = () => {
    const metrics = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      metrics.push({
        timestamp: timestamp.toISOString(),
        resourceType: 'EC2',
        resourceId: 'i-prod-web-1',
        cpuUtilization: 40 + Math.random() * 30,
        memoryUtilization: 55 + Math.random() * 20,
        diskUtilization: 35 + Math.random() * 15,
      });
    }
    
    return metrics;
  };
  
  const generateUtilizationHeatmap = () => {
    const heatmap = [];
    
    for (let hour = 0; hour < 24; hour++) {
      heatmap.push({
        hour: `${hour.toString().padStart(2, '0')}:00`,
        utilization: 30 + Math.random() * 50,
      });
    }
    
    return heatmap;
  };
  
  export const generateDemoSecurityData = () => {
    return {
      currentScore: 78,
      scoreHistory: generateSecurityScoreHistory(),
      complianceScores: {
        'HIPAA': 82,
        'SOC2': 88,
        'PCI-DSS': 75,
        'GDPR': 91,
        'ISO27001': 79,
      },
      violations: {
        total: 23,
        byFramework: {
          'HIPAA': [
            {
              id: 'v1',
              framework: 'HIPAA',
              rule: 'Encryption at Rest',
              severity: 'high',
              resourceType: 'S3',
              resourceId: 'patient-records-bucket',
              violation: 'S3 bucket does not have encryption enabled',
              remediation: 'Enable default encryption using AES-256 or AWS KMS',
              estimatedEffort: 'easy',
              status: 'open',
            },
          ],
          'SOC2': [],
          'PCI-DSS': [
            {
              id: 'v2',
              framework: 'PCI-DSS',
              rule: 'Network Segmentation',
              severity: 'critical',
              resourceType: 'SecurityGroup',
              resourceId: 'sg-payment-processing',
              violation: 'Security group allows unrestricted inbound traffic on port 22',
              remediation: 'Restrict SSH access to specific IP ranges',
              estimatedEffort: 'easy',
              status: 'open',
            },
          ],
        },
        bySeverity: {
          critical: 3,
          high: 8,
          medium: 9,
          low: 3,
        },
        list: [
          {
            id: 'viol-1',
            framework: 'PCI-DSS',
            rule: 'Unrestricted SSH Access',
            severity: 'critical',
            resourceType: 'SecurityGroup',
            resourceId: 'sg-0a1b2c3d',
            resourceName: 'payment-app-sg',
            region: 'us-east-1',
            violation: 'Security group allows 0.0.0.0/0 on port 22 (SSH)',
            remediation: 'Restrict SSH access to specific IP addresses or VPN range. Remove 0.0.0.0/0 and add specific CIDR blocks.',
            estimatedEffort: 'easy',
            status: 'open',
            detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'viol-2',
            framework: 'HIPAA',
            rule: 'S3 Bucket Encryption',
            severity: 'high',
            resourceType: 'S3',
            resourceId: 'patient-records-2024',
            resourceName: 'patient-records-2024',
            region: 'us-west-2',
            violation: 'S3 bucket storing PHI does not have default encryption enabled',
            remediation: 'Enable default encryption: aws s3api put-bucket-encryption --bucket patient-records-2024 --server-side-encryption-configuration \'{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}\'',
            estimatedEffort: 'easy',
            status: 'open',
            detectedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            id: 'viol-3',
            framework: 'GDPR',
            rule: 'Data Retention Policy',
            severity: 'high',
            resourceType: 'S3',
            resourceId: 'user-logs-archive',
            resourceName: 'user-logs-archive',
            region: 'eu-west-1',
            violation: 'Bucket contains user data older than 2 years without lifecycle policy',
            remediation: 'Configure S3 lifecycle policy to delete objects after 2 years',
            estimatedEffort: 'medium',
            status: 'open',
            detectedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ],
      },
      trend: 'improving',
    };
  };
  
  const generateSecurityScoreHistory = () => {
    const history = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      const score = 70 + (Math.random() * 15) + (i * 0.2);
      
      history.push({
        date: date.toISOString(),
        score: Math.min(100, Math.round(score)),
      });
    }
    
    return history;
  };
  
  export const generateDemoPerformanceData = () => {
    return {
      summary: {
        avgResponseTime: 245,
        errorRate: 0.85,
        activeAlerts: 2,
      },
      metricsByType: {
        'api_response_time': {
          avgP50: 180,
          avgP95: 420,
          avgP99: 680,
          errorRatePercent: 0.85,
          totalCount: 125000,
        },
        'database_query': {
          avgP50: 45,
          avgP95: 120,
          avgP99: 280,
          errorRatePercent: 0.12,
          totalCount: 450000,
        },
        'lambda_execution': {
          avgP50: 95,
          avgP95: 250,
          avgP99: 450,
          errorRatePercent: 1.2,
          totalCount: 85000,
        },
      },
      alerts: [
        {
          id: 'alert-1',
          alertType: 'high_latency',
          severity: 'high',
          service: 'API Gateway',
          endpoint: '/api/users',
          threshold: 500,
          actualValue: 850,
          deviation: 70,
          description: 'API response time exceeds 500ms threshold',
          recommendation: 'Check database query performance and consider adding caching',
          status: 'open',
          triggeredAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        },
        {
          id: 'alert-2',
          alertType: 'error_rate',
          severity: 'critical',
          service: 'Lambda',
          endpoint: 'processPayments',
          threshold: 1.0,
          actualValue: 3.5,
          deviation: 250,
          description: 'Error rate spike detected in payment processing function',
          recommendation: 'Review recent code changes and check external API availability',
          status: 'open',
          triggeredAt: new Date(Date.now() - 30 * 60 * 1000),
        },
      ],
      timeline: generatePerformanceTimeline(),
    };
  };
  
  const generatePerformanceTimeline = () => {
    const timeline = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      
      timeline.push({
        timestamp: timestamp.toISOString(),
        metricType: 'api_response_time',
        p50: 150 + Math.random() * 100,
        p95: 350 + Math.random() * 150,
        p99: 600 + Math.random() * 200,
      });
    }
    
    return timeline;
  };
  
  export const generateDemoBusinessData = () => {
    return {
      summary: {
        totalRevenue: 485000,
        totalCloudCost: 12847.56,
        roi: 37.75,
        costPerCustomer: 2.14,
        customerCount: 6000,
      },
      teamBreakdown: {
        'Engineering': 4850.00,
        'Data Science': 3200.00,
        'DevOps': 2100.00,
        'Product': 1897.56,
        'Shared Services': 800.00,
      },
      monthlyTrend: [
        { month: '2024-09', revenue: 440000, cost: 11200, customers: 5500 },
        { month: '2024-10', revenue: 455000, cost: 11850, customers: 5700 },
        { month: '2024-11', revenue: 470000, cost: 12400, customers: 5900 },
        { month: '2024-12', revenue: 485000, cost: 12847.56, customers: 6000 },
      ],
      allocations: [],
    };
  };
  
  export const generateDemoInsights = () => {
    return [
      {
        id: 'insight-1',
        insightType: 'cost_optimization',
        priority: 'critical',
        title: 'Significant Savings Opportunity in EC2',
        description: 'Analysis shows 15 EC2 instances are consistently underutilized',
        recommendation: 'Right-size 15 EC2 instances to save $1,875/month. Consider m5.xlarge instead of m5.2xlarge for web servers.',
        confidence: 0.92,
        potentialImpact: 'high',
        estimatedSavings: 1875,
        status: 'new',
        generatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
      {
        id: 'insight-2',
        insightType: 'security',
        priority: 'high',
        title: 'Security Group Misconfiguration Detected',
        description: '3 security groups allow unrestricted SSH access from internet',
        recommendation: 'Restrict SSH access to VPN IP range (10.0.0.0/8) or specific management IPs. This reduces attack surface by 95%.',
        confidence: 0.98,
        potentialImpact: 'critical',
        status: 'new',
        generatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
      },
      {
        id: 'insight-3',
        insightType: 'performance',
        priority: 'medium',
        title: 'Database Query Optimization Needed',
        description: 'RDS instance shows high CPU during peak hours (85-95%)',
        recommendation: 'Add read replicas for read-heavy queries or upgrade to db.r5.2xlarge. Consider implementing query caching.',
        confidence: 0.88,
        potentialImpact: 'medium',
        status: 'new',
        generatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
      },
    ];
  };
  
  // ============================================
  // CHANGE TRACKING DEMO DATA
  // ============================================
  
  export const generateDemoChanges = () => {
    const changes = [];
    const now = new Date();
    
    const changeTypes = ['CREATE', 'UPDATE', 'DELETE'];
    const resourceTypes = ['EC2', 'S3', 'RDS', 'Lambda', 'SecurityGroup', 'IAM'];
    const users = ['admin@company.com', 'devops@company.com', 'developer@company.com'];
    
    for (let i = 0; i < 50; i++) {
      const eventTime = new Date(now.getTime() - i * 3 * 60 * 60 * 1000);
      const changeType = changeTypes[Math.floor(Math.random() * changeTypes.length)];
      const resourceType = resourceTypes[Math.floor(Math.random() * resourceTypes.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      
      changes.push({
        id: `change-${i}`,
        eventTime: eventTime.toISOString(),
        provider: 'aws',
        eventType: changeType.toLowerCase(),
        resourceType,
        resourceId: `${resourceType.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`,
        resourceName: `${resourceType}-resource-${i}`,
        region: 'us-east-1',
        changeType,
        changedBy: user,
        changedByIp: `203.0.113.${Math.floor(Math.random() * 255)}`,
        changeDetails: {
          action: changeType,
          properties: {
            tags: { Environment: 'production', Team: 'Engineering' },
          },
        },
        impactScore: Math.floor(Math.random() * 10) + 1,
      });
    }
    
    return changes.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
  };
  
  export const generateDemoIncidents = () => {
    return [
      {
        id: 'incident-1',
        title: 'Production Database Performance Degradation',
        description: 'RDS instance experiencing high CPU and slow query performance',
        severity: 'high',
        status: 'open',
        incidentType: 'performance',
        detectedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        affectedServices: ['RDS', 'API'],
        affectedResources: ['db-prod-mysql-01', 'api-gateway-prod'],
        createdBy: 'system',
        rootCauses: [
          {
            id: 'rc-1',
            causeType: 'config_change',
            description: 'Database parameter group was modified 3 hours ago, changing max_connections from 1000 to 500',
            confidence: 0.89,
            changeTime: new Date(Date.now() - 3 * 60 * 60 * 1000),
            changedBy: 'devops@company.com',
            evidence: {
              changes: ['Parameter: max_connections changed from 1000 to 500'],
              metrics: ['CPU utilization increased from 45% to 92%'],
            },
            aiGenerated: true,
          },
        ],
        resolutionSteps: [
          {
            id: 'rs-1',
            stepNumber: 1,
            description: 'Revert database parameter group changes to previous configuration',
            command: 'aws rds modify-db-parameter-group --db-parameter-group-name prod-mysql-params --parameters "ParameterName=max_connections,ParameterValue=1000,ApplyMethod=immediate"',
            status: 'pending',
            aiGenerated: true,
            confidence: 0.92,
          },
          {
            id: 'rs-2',
            stepNumber: 2,
            description: 'Monitor CPU utilization for 15 minutes to confirm resolution',
            command: 'aws cloudwatch get-metric-statistics --namespace AWS/RDS --metric-name CPUUtilization --dimensions Name=DBInstanceIdentifier,Value=prod-mysql-01 --start-time 2024-01-01T00:00:00Z --end-time 2024-01-01T01:00:00Z --period 300 --statistics Average',
            status: 'pending',
            aiGenerated: true,
            confidence: 0.88,
          },
          {
            id: 'rs-3',
            stepNumber: 3,
            description: 'If issue persists, consider adding read replica to distribute load',
            status: 'pending',
            aiGenerated: true,
            confidence: 0.75,
          },
        ],
      },
      {
        id: 'incident-2',
        title: 'S3 Bucket Access Denied Errors',
        description: 'Application unable to read from production S3 bucket',
        severity: 'critical',
        status: 'acknowledged',
        incidentType: 'access',
        detectedAt: new Date(Date.now() - 30 * 60 * 1000),
        affectedServices: ['S3', 'Lambda'],
        affectedResources: ['prod-assets-bucket', 'asset-processor-lambda'],
        createdBy: 'system',
        rootCauses: [
          {
            id: 'rc-2',
            causeType: 'infrastructure_change',
            description: 'S3 bucket policy was updated 45 minutes ago, removing IAM role permissions',
            confidence: 0.95,
            changeTime: new Date(Date.now() - 45 * 60 * 1000),
            changedBy: 'admin@company.com',
            evidence: {
              changes: ['S3 bucket policy modified'],
              logs: ['AccessDenied errors in CloudWatch'],
            },
            aiGenerated: true,
          },
        ],
        resolutionSteps: [
          {
            id: 'rs-4',
            stepNumber: 1,
            description: 'Restore previous S3 bucket policy from version history',
            command: 'aws s3api put-bucket-policy --bucket prod-assets-bucket --policy file://previous-policy.json',
            status: 'completed',
            executedAt: new Date(Date.now() - 10 * 60 * 1000),
            executedBy: 'admin@company.com',
            aiGenerated: true,
          },
        ],
      },
    ];
  };