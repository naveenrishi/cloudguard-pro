-- CreateEnum
CREATE TYPE "VerificationTokenType" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'MFA_SETUP');

-- CreateEnum
CREATE TYPE "MigrationRecommendationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "BillingFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "BillingExportFormat" AS ENUM ('CSV', 'PDF');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('SUCCESS', 'FAILED', 'DRY_RUN', 'PENDING');

-- CreateEnum
CREATE TYPE "AnomalyType" AS ENUM ('SPIKE', 'FORECAST_OVERAGE', 'CONCENTRATION_RISK', 'UNUSED_RESOURCE', 'RESERVATION_EXPIRY');

-- CreateEnum
CREATE TYPE "AnomalySeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "AnomalyStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('OPEN', 'INVESTIGATING', 'MITIGATING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "ChangeEventType" AS ENUM ('RESOURCE_CREATED', 'RESOURCE_MODIFIED', 'RESOURCE_DELETED', 'CONFIG_CHANGE', 'SECURITY_POLICY_CHANGE', 'COST_BUDGET_CHANGE', 'ACCOUNT_CONNECTED', 'ACCOUNT_DISCONNECTED');

-- CreateEnum
CREATE TYPE "ServiceNowTicketType" AS ENUM ('INCIDENT', 'PROBLEM', 'CHANGE', 'REQUEST');

-- CreateEnum
CREATE TYPE "ServiceNowSeverity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "ServiceNowStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "refreshToken" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "VerificationTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mfa_backup_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_backup_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migration_recommendations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "provider" "CloudProvider" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "targetCloud" "CloudProvider" NOT NULL,
    "savings" DOUBLE PRECISION NOT NULL,
    "complexity" TEXT NOT NULL,
    "status" "MigrationRecommendationStatus" NOT NULL DEFAULT 'PENDING',
    "dismissedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "migration_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_schedules" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "BillingFrequency" NOT NULL,
    "format" "BillingExportFormat" NOT NULL,
    "recipients" TEXT NOT NULL,
    "sections" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSentAt" TIMESTAMP(3),
    "nextSendAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT,
    "provider" "CloudProvider" NOT NULL,
    "actionType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "region" TEXT,
    "dryRun" BOOLEAN NOT NULL DEFAULT false,
    "status" "AutomationStatus" NOT NULL,
    "output" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "automation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_anomalies" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "anomalyType" "AnomalyType" NOT NULL,
    "severity" "AnomalySeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "expectedCost" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION NOT NULL,
    "variance" DOUBLE PRECISION NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "status" "AnomalyStatus" NOT NULL DEFAULT 'OPEN',
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cost_anomalies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "resourceId" TEXT,
    "region" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "change_events" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "eventType" "ChangeEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceType" TEXT,
    "region" TEXT,
    "initiatedBy" TEXT,
    "metadata" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "change_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicenow_configs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instanceUrl" TEXT NOT NULL,
    "credentials" TEXT NOT NULL,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicenow_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicenow_tickets" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "sysId" TEXT,
    "type" "ServiceNowTicketType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ServiceNowSeverity" NOT NULL,
    "status" "ServiceNowStatus" NOT NULL,
    "assignee" TEXT,
    "cloudAccount" TEXT,
    "resourceId" TEXT,
    "region" TEXT,
    "category" TEXT,
    "externalUrl" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicenow_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshToken_key" ON "sessions"("refreshToken");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_token_idx" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "verification_tokens_userId_type_idx" ON "verification_tokens"("userId", "type");

-- CreateIndex
CREATE INDEX "verification_tokens_token_idx" ON "verification_tokens"("token");

-- CreateIndex
CREATE INDEX "mfa_backup_codes_userId_idx" ON "mfa_backup_codes"("userId");

-- CreateIndex
CREATE INDEX "migration_recommendations_userId_status_idx" ON "migration_recommendations"("userId", "status");

-- CreateIndex
CREATE INDEX "billing_schedules_userId_idx" ON "billing_schedules"("userId");

-- CreateIndex
CREATE INDEX "billing_schedules_active_nextSendAt_idx" ON "billing_schedules"("active", "nextSendAt");

-- CreateIndex
CREATE INDEX "automation_logs_userId_createdAt_idx" ON "automation_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "automation_logs_accountId_actionType_idx" ON "automation_logs"("accountId", "actionType");

-- CreateIndex
CREATE INDEX "cost_anomalies_accountId_status_detectedAt_idx" ON "cost_anomalies"("accountId", "status", "detectedAt");

-- CreateIndex
CREATE INDEX "cost_anomalies_severity_status_idx" ON "cost_anomalies"("severity", "status");

-- CreateIndex
CREATE INDEX "incidents_accountId_status_severity_idx" ON "incidents"("accountId", "status", "severity");

-- CreateIndex
CREATE INDEX "incidents_detectedAt_idx" ON "incidents"("detectedAt");

-- CreateIndex
CREATE INDEX "change_events_accountId_occurredAt_idx" ON "change_events"("accountId", "occurredAt");

-- CreateIndex
CREATE INDEX "change_events_eventType_idx" ON "change_events"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_configs_userId_key" ON "servicenow_configs"("userId");

-- CreateIndex
CREATE INDEX "servicenow_tickets_configId_status_idx" ON "servicenow_tickets"("configId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "servicenow_tickets_configId_ticketNumber_key" ON "servicenow_tickets"("configId", "ticketNumber");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verification_tokens" ADD CONSTRAINT "verification_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_backup_codes" ADD CONSTRAINT "mfa_backup_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "migration_recommendations" ADD CONSTRAINT "migration_recommendations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_schedules" ADD CONSTRAINT "billing_schedules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_logs" ADD CONSTRAINT "automation_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_anomalies" ADD CONSTRAINT "cost_anomalies_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_events" ADD CONSTRAINT "change_events_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "cloud_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicenow_configs" ADD CONSTRAINT "servicenow_configs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "servicenow_tickets" ADD CONSTRAINT "servicenow_tickets_configId_fkey" FOREIGN KEY ("configId") REFERENCES "servicenow_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
