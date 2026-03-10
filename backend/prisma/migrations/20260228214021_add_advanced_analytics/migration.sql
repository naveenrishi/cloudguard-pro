-- CreateTable
CREATE TABLE "CostForecast" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "forecastDate" TIMESTAMP(3) NOT NULL,
    "predictedCost" DOUBLE PRECISION NOT NULL,
    "confidenceLevel" DOUBLE PRECISION NOT NULL,
    "confidenceRange" JSONB NOT NULL,
    "service" TEXT,
    "region" TEXT,
    "model" TEXT NOT NULL,
    "accuracy" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "CostForecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostOptimization" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "optimizationType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "optimizedCost" DOUBLE PRECISION NOT NULL,
    "monthlySavings" DOUBLE PRECISION NOT NULL,
    "annualSavings" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "implementationEffort" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "implementedAt" TIMESTAMP(3),
    "actualSavings" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "CostOptimization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceUtilization" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "region" TEXT NOT NULL,
    "cpuUtilization" DOUBLE PRECISION,
    "memoryUtilization" DOUBLE PRECISION,
    "diskUtilization" DOUBLE PRECISION,
    "networkIn" DOUBLE PRECISION,
    "networkOut" DOUBLE PRECISION,
    "requestCount" INTEGER,
    "errorCount" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "ResourceUtilization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdleResource" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "region" TEXT NOT NULL,
    "idleDays" INTEGER NOT NULL,
    "avgUtilization" DOUBLE PRECISION NOT NULL,
    "monthlyCost" DOUBLE PRECISION NOT NULL,
    "recommendation" TEXT NOT NULL,
    "potentialSavings" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'detected',
    "actionTaken" TEXT,
    "actionedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "IdleResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityPostureHistory" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallScore" INTEGER NOT NULL,
    "criticalIssues" INTEGER NOT NULL,
    "highIssues" INTEGER NOT NULL,
    "mediumIssues" INTEGER NOT NULL,
    "lowIssues" INTEGER NOT NULL,
    "complianceScores" JSONB NOT NULL,
    "topVulnerabilities" JSONB NOT NULL,
    "fixedIssues" JSONB,
    "newIssues" JSONB,
    "metadata" JSONB,

    CONSTRAINT "SecurityPostureHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceViolation" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "framework" TEXT NOT NULL,
    "rule" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "region" TEXT NOT NULL,
    "violation" TEXT NOT NULL,
    "remediation" TEXT NOT NULL,
    "estimatedEffort" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "remediatedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "ComplianceViolation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricType" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "endpoint" TEXT,
    "p50" DOUBLE PRECISION,
    "p95" DOUBLE PRECISION,
    "p99" DOUBLE PRECISION,
    "avg" DOUBLE PRECISION,
    "max" DOUBLE PRECISION,
    "min" DOUBLE PRECISION,
    "count" INTEGER,
    "errorCount" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerformanceAlert" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "alertType" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "endpoint" TEXT,
    "threshold" DOUBLE PRECISION NOT NULL,
    "actualValue" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "PerformanceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessMetric" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metricType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "breakdown" JSONB,
    "metadata" JSONB,

    CONSTRAINT "BusinessMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamCostAllocation" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "teamName" TEXT NOT NULL,
    "projectName" TEXT,
    "totalCost" DOUBLE PRECISION NOT NULL,
    "serviceBreakdown" JSONB NOT NULL,
    "budgetAllocated" DOUBLE PRECISION,
    "budgetRemaining" DOUBLE PRECISION,
    "forecastedCost" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "TeamCostAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomReport" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dataSources" JSONB NOT NULL,
    "visualizations" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "schedule" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "lastGenerated" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "CustomReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "dayOfWeek" INTEGER,
    "dayOfMonth" INTEGER,
    "timeOfDay" TEXT NOT NULL,
    "recipients" JSONB NOT NULL,
    "format" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRun" TIMESTAMP(3),
    "nextRun" TIMESTAMP(3),

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insightType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "potentialImpact" TEXT NOT NULL,
    "relatedResources" JSONB,
    "estimatedSavings" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'new',
    "actionedAt" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AWSConfigChange" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "changeTime" TIMESTAMP(3) NOT NULL,
    "changeType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "resourceArn" TEXT,
    "region" TEXT NOT NULL,
    "configurationItemStatus" TEXT NOT NULL,
    "changedProperties" JSONB,
    "principalId" TEXT,
    "principalName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "configurationItem" JSONB NOT NULL,
    "relatedEvents" JSONB,
    "complianceType" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AWSConfigChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AzureActivityLog" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "operationName" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "resourceGroupName" TEXT,
    "subscriptionId" TEXT NOT NULL,
    "changedProperties" JSONB,
    "caller" TEXT,
    "callerIpAddress" TEXT,
    "claims" JSONB,
    "authorization" JSONB,
    "properties" JSONB,
    "httpRequest" JSONB,
    "level" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "metadata" JSONB,

    CONSTRAINT "AzureActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GCPAuditLog" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "logName" TEXT NOT NULL,
    "serviceName" TEXT NOT NULL,
    "methodName" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "request" JSONB,
    "response" JSONB,
    "metadata" JSONB,
    "principalEmail" TEXT,
    "callerIp" TEXT,
    "callerSuppliedUserAgent" TEXT,
    "authenticationInfo" JSONB,
    "authorizationInfo" JSONB,
    "severity" TEXT NOT NULL,
    "status" JSONB,
    "protoPayload" JSONB NOT NULL,

    CONSTRAINT "GCPAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChangeEvent" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "region" TEXT,
    "changeType" TEXT NOT NULL,
    "changedBy" TEXT,
    "changedByIp" TEXT,
    "changeDetails" JSONB NOT NULL,
    "beforeState" JSONB,
    "afterState" JSONB,
    "awsConfigChangeId" TEXT,
    "azureActivityLogId" TEXT,
    "gcpAuditLogId" TEXT,
    "impactScore" INTEGER,
    "affectedResources" JSONB,
    "metadata" JSONB,

    CONSTRAINT "ChangeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "incidentType" TEXT NOT NULL,
    "affectedServices" JSONB NOT NULL,
    "affectedResources" JSONB NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "acknowledgedAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "assignedTo" TEXT,
    "metadata" JSONB,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RootCause" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "identifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "causeType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "relatedChangeId" TEXT,
    "changeTime" TIMESTAMP(3),
    "changedBy" TEXT,
    "evidence" JSONB NOT NULL,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiModel" TEXT,
    "metadata" JSONB,

    CONSTRAINT "RootCause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResolutionStep" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "command" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "executedAt" TIMESTAMP(3),
    "executedBy" TEXT,
    "result" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION,
    "metadata" JSONB,

    CONSTRAINT "ResolutionStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIQuery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "query" TEXT NOT NULL,
    "intent" TEXT,
    "response" TEXT NOT NULL,
    "sqlGenerated" TEXT,
    "dataReturned" JSONB,
    "satisfaction" TEXT,
    "feedbackText" TEXT,
    "executionTime" INTEGER,
    "metadata" JSONB,

    CONSTRAINT "AIQuery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CostForecast_cloudAccountId_forecastDate_idx" ON "CostForecast"("cloudAccountId", "forecastDate");

-- CreateIndex
CREATE INDEX "CostOptimization_cloudAccountId_status_idx" ON "CostOptimization"("cloudAccountId", "status");

-- CreateIndex
CREATE INDEX "CostOptimization_monthlySavings_idx" ON "CostOptimization"("monthlySavings");

-- CreateIndex
CREATE INDEX "ResourceUtilization_cloudAccountId_timestamp_idx" ON "ResourceUtilization"("cloudAccountId", "timestamp");

-- CreateIndex
CREATE INDEX "ResourceUtilization_resourceType_resourceId_idx" ON "ResourceUtilization"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "IdleResource_cloudAccountId_status_idx" ON "IdleResource"("cloudAccountId", "status");

-- CreateIndex
CREATE INDEX "SecurityPostureHistory_cloudAccountId_timestamp_idx" ON "SecurityPostureHistory"("cloudAccountId", "timestamp");

-- CreateIndex
CREATE INDEX "ComplianceViolation_cloudAccountId_framework_idx" ON "ComplianceViolation"("cloudAccountId", "framework");

-- CreateIndex
CREATE INDEX "ComplianceViolation_status_severity_idx" ON "ComplianceViolation"("status", "severity");

-- CreateIndex
CREATE INDEX "PerformanceMetric_cloudAccountId_timestamp_idx" ON "PerformanceMetric"("cloudAccountId", "timestamp");

-- CreateIndex
CREATE INDEX "PerformanceMetric_metricType_service_idx" ON "PerformanceMetric"("metricType", "service");

-- CreateIndex
CREATE INDEX "PerformanceAlert_cloudAccountId_status_idx" ON "PerformanceAlert"("cloudAccountId", "status");

-- CreateIndex
CREATE INDEX "BusinessMetric_userId_timestamp_idx" ON "BusinessMetric"("userId", "timestamp");

-- CreateIndex
CREATE INDEX "BusinessMetric_metricType_idx" ON "BusinessMetric"("metricType");

-- CreateIndex
CREATE INDEX "TeamCostAllocation_cloudAccountId_month_idx" ON "TeamCostAllocation"("cloudAccountId", "month");

-- CreateIndex
CREATE INDEX "TeamCostAllocation_teamName_idx" ON "TeamCostAllocation"("teamName");

-- CreateIndex
CREATE INDEX "CustomReport_userId_idx" ON "CustomReport"("userId");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRun_enabled_idx" ON "ReportSchedule"("nextRun", "enabled");

-- CreateIndex
CREATE INDEX "AIInsight_cloudAccountId_status_idx" ON "AIInsight"("cloudAccountId", "status");

-- CreateIndex
CREATE INDEX "AIInsight_priority_generatedAt_idx" ON "AIInsight"("priority", "generatedAt");

-- CreateIndex
CREATE INDEX "AWSConfigChange_cloudAccountId_changeTime_idx" ON "AWSConfigChange"("cloudAccountId", "changeTime");

-- CreateIndex
CREATE INDEX "AWSConfigChange_resourceType_resourceId_idx" ON "AWSConfigChange"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AWSConfigChange_principalId_idx" ON "AWSConfigChange"("principalId");

-- CreateIndex
CREATE INDEX "AzureActivityLog_cloudAccountId_eventTime_idx" ON "AzureActivityLog"("cloudAccountId", "eventTime");

-- CreateIndex
CREATE INDEX "AzureActivityLog_resourceType_resourceId_idx" ON "AzureActivityLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AzureActivityLog_caller_idx" ON "AzureActivityLog"("caller");

-- CreateIndex
CREATE INDEX "AzureActivityLog_status_idx" ON "AzureActivityLog"("status");

-- CreateIndex
CREATE INDEX "GCPAuditLog_cloudAccountId_timestamp_idx" ON "GCPAuditLog"("cloudAccountId", "timestamp");

-- CreateIndex
CREATE INDEX "GCPAuditLog_resourceType_resourceName_idx" ON "GCPAuditLog"("resourceType", "resourceName");

-- CreateIndex
CREATE INDEX "GCPAuditLog_principalEmail_idx" ON "GCPAuditLog"("principalEmail");

-- CreateIndex
CREATE INDEX "GCPAuditLog_methodName_idx" ON "GCPAuditLog"("methodName");

-- CreateIndex
CREATE INDEX "ChangeEvent_cloudAccountId_eventTime_idx" ON "ChangeEvent"("cloudAccountId", "eventTime");

-- CreateIndex
CREATE INDEX "ChangeEvent_resourceType_resourceId_idx" ON "ChangeEvent"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "ChangeEvent_changedBy_idx" ON "ChangeEvent"("changedBy");

-- CreateIndex
CREATE INDEX "Incident_cloudAccountId_status_idx" ON "Incident"("cloudAccountId", "status");

-- CreateIndex
CREATE INDEX "Incident_severity_createdAt_idx" ON "Incident"("severity", "createdAt");

-- CreateIndex
CREATE INDEX "RootCause_incidentId_idx" ON "RootCause"("incidentId");

-- CreateIndex
CREATE INDEX "ResolutionStep_incidentId_stepNumber_idx" ON "ResolutionStep"("incidentId", "stepNumber");

-- CreateIndex
CREATE INDEX "AIQuery_userId_createdAt_idx" ON "AIQuery"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "CostForecast" ADD CONSTRAINT "CostForecast_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostOptimization" ADD CONSTRAINT "CostOptimization_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceUtilization" ADD CONSTRAINT "ResourceUtilization_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdleResource" ADD CONSTRAINT "IdleResource_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityPostureHistory" ADD CONSTRAINT "SecurityPostureHistory_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceViolation" ADD CONSTRAINT "ComplianceViolation_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerformanceAlert" ADD CONSTRAINT "PerformanceAlert_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BusinessMetric" ADD CONSTRAINT "BusinessMetric_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamCostAllocation" ADD CONSTRAINT "TeamCostAllocation_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomReport" ADD CONSTRAINT "CustomReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportSchedule" ADD CONSTRAINT "ReportSchedule_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "CustomReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AWSConfigChange" ADD CONSTRAINT "AWSConfigChange_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AzureActivityLog" ADD CONSTRAINT "AzureActivityLog_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GCPAuditLog" ADD CONSTRAINT "GCPAuditLog_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChangeEvent" ADD CONSTRAINT "ChangeEvent_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RootCause" ADD CONSTRAINT "RootCause_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResolutionStep" ADD CONSTRAINT "ResolutionStep_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIQuery" ADD CONSTRAINT "AIQuery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
