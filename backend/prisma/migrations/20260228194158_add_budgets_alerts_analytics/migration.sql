/*
  Warnings:

  - You are about to drop the column `alertThresholds` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `cloudProvider` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `currentSpend` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `emailNotifications` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `lastCheckedAt` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `service` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `slackWebhook` on the `Budget` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginDevice` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginIP` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lockedUntil` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetExpiry` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `resetToken` on the `User` table. All the data in the column will be lost.
  - The `mfaBackupCodes` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `passwordHistory` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- DropIndex
DROP INDEX "User_resetToken_idx";

-- DropIndex
DROP INDEX "User_resetToken_key";

-- DropIndex
DROP INDEX "User_verificationToken_idx";

-- DropIndex
DROP INDEX "User_verificationToken_key";

-- AlterTable
ALTER TABLE "Budget" DROP COLUMN "alertThresholds",
DROP COLUMN "cloudProvider",
DROP COLUMN "currency",
DROP COLUMN "currentSpend",
DROP COLUMN "emailNotifications",
DROP COLUMN "lastCheckedAt",
DROP COLUMN "service",
DROP COLUMN "slackWebhook",
ADD COLUMN     "alertThreshold" DOUBLE PRECISION NOT NULL DEFAULT 80,
ADD COLUMN     "cloudAccountId" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "provider" TEXT,
ALTER COLUMN "period" SET DEFAULT 'monthly';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "lastLoginDevice",
DROP COLUMN "lastLoginIP",
DROP COLUMN "lockedUntil",
DROP COLUMN "resetExpiry",
DROP COLUMN "resetToken",
ADD COLUMN     "emailVerificationExpires" TIMESTAMP(3),
ADD COLUMN     "emailVerificationToken" TEXT,
DROP COLUMN "mfaBackupCodes",
ADD COLUMN     "mfaBackupCodes" JSONB,
DROP COLUMN "passwordHistory",
ADD COLUMN     "passwordHistory" JSONB;

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetAlert" (
    "id" TEXT NOT NULL,
    "budgetId" TEXT NOT NULL,
    "alertType" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "message" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BudgetAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostAnomaly" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cloudAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "expectedCost" DOUBLE PRECISION NOT NULL,
    "actualCost" DOUBLE PRECISION NOT NULL,
    "deviation" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "isReviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CostAnomaly_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cloudAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostRecommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cloudAccountId" TEXT,
    "provider" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "resourceName" TEXT,
    "recommendationType" TEXT NOT NULL,
    "currentCost" DOUBLE PRECISION NOT NULL,
    "estimatedSavings" DOUBLE PRECISION NOT NULL,
    "savingsPercent" DOUBLE PRECISION NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT NOT NULL,
    "actionSteps" JSONB,
    "implementedAt" TIMESTAMP(3),
    "implementedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostRecommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_token_idx" ON "RefreshToken"("token");

-- CreateIndex
CREATE INDEX "BudgetAlert_budgetId_idx" ON "BudgetAlert"("budgetId");

-- CreateIndex
CREATE INDEX "BudgetAlert_sentAt_idx" ON "BudgetAlert"("sentAt");

-- CreateIndex
CREATE INDEX "CostAnomaly_userId_idx" ON "CostAnomaly"("userId");

-- CreateIndex
CREATE INDEX "CostAnomaly_date_idx" ON "CostAnomaly"("date");

-- CreateIndex
CREATE INDEX "CostAnomaly_severity_idx" ON "CostAnomaly"("severity");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_timestamp_idx" ON "ActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ActivityLog_eventType_idx" ON "ActivityLog"("eventType");

-- CreateIndex
CREATE INDEX "ActivityLog_isRead_idx" ON "ActivityLog"("isRead");

-- CreateIndex
CREATE INDEX "CostRecommendation_userId_idx" ON "CostRecommendation"("userId");

-- CreateIndex
CREATE INDEX "CostRecommendation_status_idx" ON "CostRecommendation"("status");

-- CreateIndex
CREATE INDEX "CostRecommendation_priority_idx" ON "CostRecommendation"("priority");

-- CreateIndex
CREATE INDEX "Budget_cloudAccountId_idx" ON "Budget"("cloudAccountId");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BudgetAlert" ADD CONSTRAINT "BudgetAlert_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "Budget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAnomaly" ADD CONSTRAINT "CostAnomaly_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostAnomaly" ADD CONSTRAINT "CostAnomaly_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostRecommendation" ADD CONSTRAINT "CostRecommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostRecommendation" ADD CONSTRAINT "CostRecommendation_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
