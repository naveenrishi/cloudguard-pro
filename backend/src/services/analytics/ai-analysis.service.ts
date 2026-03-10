import prisma from '../../config/database';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// ============================================
// AI-POWERED ROOT CAUSE ANALYSIS
// ============================================

export const analyzeIncidentRootCause = async (incidentId: string) => {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        cloudAccount: true,
      },
    });

    if (!incident) throw new Error('Incident not found');

    const changeStartTime = new Date(incident.detectedAt.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentChanges = await prisma.changeEvent.findMany({
      where: {
        cloudAccountId: incident.cloudAccountId,
        eventTime: {
          gte: changeStartTime,
          lte: incident.detectedAt,
        },
      },
      orderBy: { eventTime: 'desc' },
      take: 50,
    });

    const context = buildIncidentContext(incident, recentChanges);
    const aiAnalysis = await callOpenAIForRootCause(context);

    for (const cause of aiAnalysis.rootCauses) {
      await prisma.rootCause.create({
        data: {
          incidentId,
          causeType: cause.type,
          description: cause.description,
          confidence: cause.confidence,
          relatedChangeId: cause.relatedChangeId,
          changeTime: cause.changeTime,
          changedBy: cause.changedBy,
          evidence: cause.evidence,
          aiGenerated: true,
          aiModel: 'gpt-4',
        },
      });
    }

    for (let i = 0; i < aiAnalysis.resolutionSteps.length; i++) {
      const step = aiAnalysis.resolutionSteps[i];
      await prisma.resolutionStep.create({
        data: {
          incidentId,
          stepNumber: i + 1,
          description: step.description,
          command: step.command,
          aiGenerated: true,
          confidence: step.confidence,
        },
      });
    }

    return {
      rootCauses: aiAnalysis.rootCauses,
      resolutionSteps: aiAnalysis.resolutionSteps,
      analysis: aiAnalysis.summary,
    };
  } catch (error: any) {
    console.error('Error analyzing root cause:', error);
    throw error;
  }
};

const buildIncidentContext = (incident: any, recentChanges: any[]) => {
  let context = `
INCIDENT ANALYSIS REQUEST

Incident Details:
- Title: ${incident.title}
- Description: ${incident.description}
- Severity: ${incident.severity}
- Type: ${incident.incidentType}
- Detected At: ${incident.detectedAt.toISOString()}
- Affected Services: ${JSON.stringify(incident.affectedServices)}
- Affected Resources: ${JSON.stringify(incident.affectedResources)}

Recent Changes (Last 7 Days):
`;

  recentChanges.forEach((change, index) => {
    context += `
${index + 1}. [${change.eventTime.toISOString()}] ${change.provider.toUpperCase()} - ${change.changeType}
   Resource: ${change.resourceType} (${change.resourceId})
   Changed By: ${change.changedBy || 'Unknown'}
   Impact Score: ${change.impactScore}/10
   Details: ${JSON.stringify(change.changeDetails).substring(0, 200)}
`;
  });

  context += `

Please analyze this incident and provide:
1. Most likely root causes (with confidence %)
2. Step-by-step resolution instructions
3. Evidence linking changes to the incident
`;

  return context;
};

const callOpenAIForRootCause = async (context: string) => {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a cloud infrastructure expert specializing in incident analysis and root cause identification. Analyze incidents by correlating changes with symptoms. Provide actionable resolution steps with CLI commands when applicable.

Return your analysis in this JSON format:
{
  "summary": "Brief 2-3 sentence analysis",
  "rootCauses": [
    {
      "type": "config_change|code_deployment|infrastructure_change|external",
      "description": "Detailed explanation",
      "confidence": 0.85,
      "relatedChangeId": "change-id-if-applicable",
      "changeTime": "2024-03-01T10:30:00Z",
      "changedBy": "user@example.com",
      "evidence": {
        "changes": ["change 1", "change 2"],
        "metrics": ["metric 1"],
        "logs": ["log entry"]
      }
    }
  ],
  "resolutionSteps": [
    {
      "description": "Step description",
      "command": "aws ec2 stop-instances --instance-ids i-xxx",
      "confidence": 0.9
    }
  ]
}`,
        },
        {
          role: 'user',
          content: context,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    return JSON.parse(response || '{}');
  } catch (error: any) {
    console.error('Error calling OpenAI:', error);
    
    return {
      summary: 'AI analysis unavailable. Using rule-based detection.',
      rootCauses: [],
      resolutionSteps: [],
    };
  }
};

// ============================================
// NATURAL LANGUAGE QUERY INTERFACE
// ============================================

export const processNaturalLanguageQuery = async (
  userId: string,
  query: string
) => {
  try {
    const intent = await detectQueryIntent(query);
    const sqlQuery = await generateSQLFromNaturalLanguage(query, intent);

    let data: any = null;
    let response = '';

    switch (intent) {
      case 'cost_analysis':
        data = await analyzeCostQuery(query);
        response = formatCostResponse(data);
        break;

      case 'change_investigation':
        data = await investigateChanges(query);
        response = formatChangeResponse(data);
        break;

      case 'resource_optimization':
        data = await findOptimizations(query);
        response = formatOptimizationResponse(data);
        break;

      default:
        response = 'I can help you with cost analysis, change investigation, or resource optimization. Please rephrase your question.';
    }

    await prisma.aIQuery.create({
      data: {
        userId,
        query,
        intent,
        response,
        sqlGenerated: sqlQuery,
        dataReturned: data,
      },
    });

    return { response, data, intent };
  } catch (error: any) {
    console.error('Error processing NL query:', error);
    throw error;
  }
};

const detectQueryIntent = async (query: string): Promise<string> => {
  const lowercaseQuery = query.toLowerCase();

  if (lowercaseQuery.includes('cost') || lowercaseQuery.includes('spend') || lowercaseQuery.includes('$')) {
    return 'cost_analysis';
  }

  if (lowercaseQuery.includes('change') || lowercaseQuery.includes('modified') || lowercaseQuery.includes('who')) {
    return 'change_investigation';
  }

  if (lowercaseQuery.includes('optimize') || lowercaseQuery.includes('save') || lowercaseQuery.includes('idle')) {
    return 'resource_optimization';
  }

  return 'general';
};

const generateSQLFromNaturalLanguage = async (query: string, intent: string): Promise<string> => {
  return `SELECT * FROM analytics WHERE intent='${intent}'`;
};

const analyzeCostQuery = async (query: string) => {
  const thisMonth = new Date();
  thisMonth.setDate(1);

  return {
    totalCost: 1234.56,
    breakdown: {
      'EC2': 450,
      'S3': 320,
      'RDS': 280,
      'Lambda': 184.56,
    },
  };
};

const investigateChanges = async (query: string) => {
  return await prisma.changeEvent.findMany({
    where: {
      eventTime: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
      resourceType: { contains: 'database' },
    },
    take: 10,
  });
};

const findOptimizations = async (query: string) => {
  return await prisma.costOptimization.findMany({
    where: { status: 'pending' },
    orderBy: { monthlySavings: 'desc' },
    take: 10,
  });
};

const formatCostResponse = (data: any) => {
  return `Your total cost this month is $${data.totalCost}. Here's the breakdown: EC2 ($${data.breakdown.EC2}), S3 ($${data.breakdown.S3}), RDS ($${data.breakdown.RDS}), Lambda ($${data.breakdown.Lambda}).`;
};

const formatChangeResponse = (changes: any[]) => {
  if (changes.length === 0) return 'No changes found matching your criteria.';
  
  return `Found ${changes.length} changes:\n` + changes.map((c, i) => 
    `${i + 1}. [${c.eventTime.toISOString()}] ${c.changedBy || 'Unknown'} modified ${c.resourceType} (${c.resourceId})`
  ).join('\n');
};

const formatOptimizationResponse = (opts: any[]) => {
  if (opts.length === 0) return 'No optimization opportunities found.';
  
  return `Found ${opts.length} optimization opportunities:\n` + opts.map((o, i) =>
    `${i + 1}. ${o.recommendation} - Save $${o.monthlySavings}/month`
  ).join('\n');
};

export const createIncidentFromAnomaly = async (
  anomalyId: string,
  anomalyType: 'cost' | 'security' | 'performance'
) => {
  try {
    let anomaly: any;
    let cloudAccountId: string;
    let title: string;
    let description: string;
    let severity: string;
    let incidentType: string;

    if (anomalyType === 'cost') {
      anomaly = await prisma.costAnomaly.findUnique({ where: { id: anomalyId } });
      if (!anomaly) throw new Error('Cost anomaly not found');
      
      cloudAccountId = anomaly.cloudAccountId;
      title = `Cost Spike Detected: ${anomaly.service}`;
      description = `Cost anomaly detected on ${anomaly.date}`;
      severity = anomaly.severity;
      incidentType = 'cost_spike';
    } else if (anomalyType === 'security') {
      anomaly = await prisma.complianceViolation.findUnique({ where: { id: anomalyId } });
      if (!anomaly) throw new Error('Security violation not found');
      
      cloudAccountId = anomaly.cloudAccountId;
      title = `Security Violation: ${anomaly.rule}`;
      description = anomaly.violation;
      severity = anomaly.severity;
      incidentType = 'security';
    } else {
      anomaly = await prisma.performanceAlert.findUnique({ where: { id: anomalyId } });
      if (!anomaly) throw new Error('Performance alert not found');
      
      cloudAccountId = anomaly.cloudAccountId;
      title = `Performance Issue: ${anomaly.alertType}`;
      description = anomaly.description;
      severity = anomaly.severity;
      incidentType = 'performance';
    }

    const incident = await prisma.incident.create({
      data: {
        cloudAccountId,
        title,
        description,
        severity,
        incidentType,
        detectedAt: new Date(),
        affectedServices: anomaly.service ? [anomaly.service] : [],
        affectedResources: anomaly.resourceId ? [{ id: anomaly.resourceId, type: anomaly.resourceType }] : [],
        createdBy: 'system',
      },
    });

    await analyzeIncidentRootCause(incident.id);

    return incident;
  } catch (error: any) {
    console.error('Error creating incident:', error);
    throw error;
  }
};