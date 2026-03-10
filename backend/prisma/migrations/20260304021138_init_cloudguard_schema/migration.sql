/*
  Warnings:

  - You are about to drop the `AIInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AIQuery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AWSConfigChange` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ApiKey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AzureActivityLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Budget` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BudgetAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BusinessMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChangeEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CloudAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ComplianceViolation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CostAnomaly` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CostData` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CostForecast` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CostOptimization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CostRecommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomReport` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ErrorDetection` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GCPAuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HealthEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IdleResource` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Incident` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NukeAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NukeNotification` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `NukeRun` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceAlert` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceMetric` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Recommendation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RefreshToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ReportSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResolutionStep` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResourceRetention` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResourceSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ResourceUtilization` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RetentionPolicy` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RootCause` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScheduledDeletion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SecurityPostureHistory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceNowTicket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Session` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TeamCostAllocation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'VIEWER');

-- CreateEnum
CREATE TYPE "CloudProvider" AS ENUM ('AWS', 'AZURE', 'GCP');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ERROR');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('ACTIVE', 'RESOLVED', 'SUPPRESSED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "RecommendationCategory" AS ENUM ('COST', 'PERFORMANCE', 'SECURITY', 'RELIABILITY', 'SUSTAINABILITY');

-- CreateEnum
CREATE TYPE "Impact" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "Effort" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RecommendationStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NukeMode" AS ENUM ('AUTOMATIC', 'MANUAL');

-- CreateEnum
CREATE TYPE "RetentionType" AS ENUM ('PERMANENT', 'UNTIL_DATE', 'DAYS');

-- CreateEnum
CREATE TYPE "RetentionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RunType" AS ENUM ('DRY_RUN', 'LIVE', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('COST_ALERT', 'SECURITY_ALERT', 'NUKE_SCHEDULED', 'NUKE_COMPLETED', 'RETENTION_APPROVED', 'RETENTION_REJECTED', 'SYNC_COMPLETED', 'SYNC_FAILED', 'ACCOUNT_CONNECTED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BudgetPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- DropForeignKey
ALTER TABLE "AIInsight" DROP CONSTRAINT "AIInsight_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "AIQuery" DROP CONSTRAINT "AIQuery_userId_fkey";

-- DropForeignKey
ALTER TABLE "AWSConfigChange" DROP CONSTRAINT "AWSConfigChange_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ActivityLog" DROP CONSTRAINT "ActivityLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "ApiKey" DROP CONSTRAINT "ApiKey_userId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_userId_fkey";

-- DropForeignKey
ALTER TABLE "AzureActivityLog" DROP CONSTRAINT "AzureActivityLog_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Budget" DROP CONSTRAINT "Budget_userId_fkey";

-- DropForeignKey
ALTER TABLE "BudgetAlert" DROP CONSTRAINT "BudgetAlert_budgetId_fkey";

-- DropForeignKey
ALTER TABLE "BusinessMetric" DROP CONSTRAINT "BusinessMetric_userId_fkey";

-- DropForeignKey
ALTER TABLE "ChangeEvent" DROP CONSTRAINT "ChangeEvent_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CloudAccount" DROP CONSTRAINT "CloudAccount_userId_fkey";

-- DropForeignKey
ALTER TABLE "ComplianceViolation" DROP CONSTRAINT "ComplianceViolation_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostAnomaly" DROP CONSTRAINT "CostAnomaly_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostAnomaly" DROP CONSTRAINT "CostAnomaly_userId_fkey";

-- DropForeignKey
ALTER TABLE "CostData" DROP CONSTRAINT "CostData_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostForecast" DROP CONSTRAINT "CostForecast_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostOptimization" DROP CONSTRAINT "CostOptimization_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostRecommendation" DROP CONSTRAINT "CostRecommendation_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "CostRecommendation" DROP CONSTRAINT "CostRecommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "CustomReport" DROP CONSTRAINT "CustomReport_userId_fkey";

-- DropForeignKey
ALTER TABLE "ErrorDetection" DROP CONSTRAINT "ErrorDetection_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "GCPAuditLog" DROP CONSTRAINT "GCPAuditLog_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "HealthEvent" DROP CONSTRAINT "HealthEvent_userId_fkey";

-- DropForeignKey
ALTER TABLE "IdleResource" DROP CONSTRAINT "IdleResource_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Incident" DROP CONSTRAINT "Incident_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "NukeAccount" DROP CONSTRAINT "NukeAccount_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "NukeRun" DROP CONSTRAINT "NukeRun_nukeAccountId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceAlert" DROP CONSTRAINT "PerformanceAlert_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceMetric" DROP CONSTRAINT "PerformanceMetric_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Recommendation" DROP CONSTRAINT "Recommendation_userId_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "ReportSchedule" DROP CONSTRAINT "ReportSchedule_reportId_fkey";

-- DropForeignKey
ALTER TABLE "ResolutionStep" DROP CONSTRAINT "ResolutionStep_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceRetention" DROP CONSTRAINT "ResourceRetention_nukeAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceRetention" DROP CONSTRAINT "ResourceRetention_userId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceSchedule" DROP CONSTRAINT "ResourceSchedule_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ResourceUtilization" DROP CONSTRAINT "ResourceUtilization_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "RetentionPolicy" DROP CONSTRAINT "RetentionPolicy_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "RootCause" DROP CONSTRAINT "RootCause_incidentId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledDeletion" DROP CONSTRAINT "ScheduledDeletion_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledDeletion" DROP CONSTRAINT "ScheduledDeletion_userId_fkey";

-- DropForeignKey
ALTER TABLE "SecurityPostureHistory" DROP CONSTRAINT "SecurityPostureHistory_cloudAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "TeamCostAllocation" DROP CONSTRAINT "TeamCostAllocation_cloudAccountId_fkey";

-- DropTable
DROP TABLE "AIInsight";

-- DropTable
DROP TABLE "AIQuery";

-- DropTable
DROP TABLE "AWSConfigChange";

-- DropTable
DROP TABLE "ActivityLog";

-- DropTable
DROP TABLE "ApiKey";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "AzureActivityLog";

-- DropTable
DROP TABLE "Budget";

-- DropTable
DROP TABLE "BudgetAlert";

-- DropTable
DROP TABLE "BusinessMetric";

-- DropTable
DROP TABLE "ChangeEvent";

-- DropTable
DROP TABLE "CloudAccount";

-- DropTable
DROP TABLE "ComplianceViolation";

-- DropTable
DROP TABLE "CostAnomaly";

-- DropTable
DROP TABLE "CostData";

-- DropTable
DROP TABLE "CostForecast";

-- DropTable
DROP TABLE "CostOptimization";

-- DropTable
DROP TABLE "CostRecommendation";

-- DropTable
DROP TABLE "CustomReport";

-- DropTable
DROP TABLE "ErrorDetection";

-- DropTable
DROP TABLE "GCPAuditLog";

-- DropTable
DROP TABLE "HealthEvent";

-- DropTable
DROP TABLE "IdleResource";

-- DropTable
DROP TABLE "Incident";

-- DropTable
DROP TABLE "NukeAccount";

-- DropTable
DROP TABLE "NukeNotification";

-- DropTable
DROP TABLE "NukeRun";

-- DropTable
DROP TABLE "PerformanceAlert";

-- DropTable
DROP TABLE "PerformanceMetric";

-- DropTable
DROP TABLE "Recommendation";

-- DropTable
DROP TABLE "RefreshToken";

-- DropTable
DROP TABLE "ReportSchedule";

-- DropTable
DROP TABLE "ResolutionStep";

-- DropTable
DROP TABLE "ResourceRetention";

-- DropTable
DROP TABLE "ResourceSchedule";

-- DropTable
DROP TABLE "ResourceUtilization";

-- DropTable
DROP TABLE "RetentionPolicy";

-- DropTable
DROP TABLE "RootCause";

-- DropTable
DROP TABLE "ScheduledDeletion";

-- DropTable
DROP TABLE "SecurityPostureHistory";

-- DropTable
DROP TABLE "ServiceNowTicket";

-- DropTable
DROP TABLE "Session";

-- DropTable
DROP TABLE "TeamCostAllocation";

-- DropTable
DROP TABLE "User";

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cloud_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "region" TEXT,
    "credentials" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cloud_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "metadata" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "tags" TEXT,
    "costPerMonth" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resource_metrics" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metricName" TEXT NOT NULL,
    "metricValue" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "resource_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_data" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "service" TEXT NOT NULL,
    "cost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "usage" DOUBLE PRECISION,
    "usageUnit" TEXT,
    "region" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_findings" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "findingId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "region" TEXT,
    "status" "FindingStatus" NOT NULL DEFAULT 'ACTIVE',
    "remediationSteps" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "resourceId" TEXT,
    "category" "RecommendationCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" "Impact" NOT NULL,
    "savings" DOUBLE PRECISION,
    "effort" "Effort" NOT NULL,
    "status" "RecommendationStatus" NOT NULL DEFAULT 'OPEN',
    "implementationSteps" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nuke_configs" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "mode" "NukeMode" NOT NULL DEFAULT 'MANUAL',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" TEXT,
    "nextRunAt" TIMESTAMP(3),
    "notificationDays" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nuke_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nuke_retentions" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceName" TEXT NOT NULL,
    "resourceRegion" TEXT,
    "retentionType" "RetentionType" NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "retainDays" INTEGER,
    "reason" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "status" "RetentionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "nuke_retentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nuke_runs" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "runType" "RunType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'PENDING',
    "totalResources" INTEGER NOT NULL DEFAULT 0,
    "deletedResources" INTEGER NOT NULL DEFAULT 0,
    "retainedResources" INTEGER NOT NULL DEFAULT 0,
    "failedResources" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "executionLog" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nuke_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "actionUrl" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "changes" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_analyses" (
    "id" TEXT NOT NULL,
    "sourceAccountId" TEXT,
    "targetProvider" "CloudProvider" NOT NULL,
    "workloadType" TEXT NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "targetCost" DOUBLE PRECISION NOT NULL,
    "savingsPercent" DOUBLE PRECISION NOT NULL,
    "complexity" TEXT NOT NULL,
    "timeline" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "accountId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "period" "BudgetPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "notifyOnExceed" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "accountId" TEXT,
    "resourceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "cloud_accounts_userId_provider_accountId_key" ON "cloud_accounts"("userId", "provider", "accountId");

-- CreateIndex
CREATE INDEX "resources_accountId_resourceType_idx" ON "resources"("accountId", "resourceType");

-- CreateIndex
CREATE INDEX "resources_resourceType_idx" ON "resources"("resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "resources_accountId_resourceId_key" ON "resources"("accountId", "resourceId");

-- CreateIndex
CREATE INDEX "resource_metrics_resourceId_metricName_timestamp_idx" ON "resource_metrics"("resourceId", "metricName", "timestamp");

-- CreateIndex
CREATE INDEX "cost_data_accountId_date_idx" ON "cost_data"("accountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cost_data_accountId_date_service_region_key" ON "cost_data"("accountId", "date", "service", "region");

-- CreateIndex
CREATE INDEX "security_findings_accountId_severity_status_idx" ON "security_findings"("accountId", "severity", "status");

-- CreateIndex
CREATE UNIQUE INDEX "security_findings_accountId_findingId_key" ON "security_findings"("accountId", "findingId");

-- CreateIndex
CREATE INDEX "recommendations_accountId_status_impact_idx" ON "recommendations"("accountId", "status", "impact");

-- CreateIndex
CREATE UNIQUE INDEX "nuke_configs_accountId_key" ON "nuke_configs"("accountId");

-- CreateIndex
CREATE INDEX "nuke_retentions_accountId_status_idx" ON "nuke_retentions"("accountId", "status");

-- CreateIndex
CREATE INDEX "nuke_retentions_resourceId_idx" ON "nuke_retentions"("resourceId");

-- CreateIndex
CREATE INDEX "nuke_runs_configId_createdAt_idx" ON "nuke_runs"("configId", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_createdAt_idx" ON "notifications"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "budgets_accountId_idx" ON "budgets"("accountId");

-- CreateIndex
CREATE INDEX "tags_accountId_idx" ON "tags"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_accountId_key_value_key" ON "tags"("accountId", "key", "value");

-- AddForeignKey
ALTER TABLE "cloud_accounts" ADD CONSTRAINT "cloud_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resource_metrics" ADD CONSTRAINT "resource_metrics_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_data" ADD CONSTRAINT "cost_data_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_findings" ADD CONSTRAINT "security_findings_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_configs" ADD CONSTRAINT "nuke_configs_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_retentions" ADD CONSTRAINT "nuke_retentions_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_retentions" ADD CONSTRAINT "nuke_retentions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_retentions" ADD CONSTRAINT "nuke_retentions_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "resources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_runs" ADD CONSTRAINT "nuke_runs_configId_fkey" FOREIGN KEY ("configId") REFERENCES "nuke_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nuke_runs" ADD CONSTRAINT "nuke_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
