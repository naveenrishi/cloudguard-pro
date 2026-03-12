/*
  Warnings:

  - The values [PENDING,REJECTED] on the enum `RetentionStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `actionType` on the `automation_logs` table. All the data in the column will be lost.
  - You are about to drop the column `output` on the `automation_logs` table. All the data in the column will be lost.
  - You are about to drop the column `schedule` on the `nuke_configs` table. All the data in the column will be lost.
  - You are about to drop the column `approvedAt` on the `nuke_retentions` table. All the data in the column will be lost.
  - You are about to drop the column `approvedBy` on the `nuke_retentions` table. All the data in the column will be lost.
  - You are about to drop the column `isApproved` on the `nuke_retentions` table. All the data in the column will be lost.
  - You are about to drop the column `resourceId` on the `nuke_retentions` table. All the data in the column will be lost.
  - You are about to drop the column `executionLog` on the `nuke_runs` table. All the data in the column will be lost.
  - Added the required column `action` to the `automation_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `cloudResourceId` to the `nuke_retentions` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RetentionStatus_new" AS ENUM ('ACTIVE', 'EXPIRED', 'REMOVED');
ALTER TABLE "nuke_retentions" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "nuke_retentions" ALTER COLUMN "status" TYPE "RetentionStatus_new" USING ("status"::text::"RetentionStatus_new");
ALTER TYPE "RetentionStatus" RENAME TO "RetentionStatus_old";
ALTER TYPE "RetentionStatus_new" RENAME TO "RetentionStatus";
DROP TYPE "RetentionStatus_old";
ALTER TABLE "nuke_retentions" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';
COMMIT;

-- DropForeignKey
ALTER TABLE "nuke_retentions" DROP CONSTRAINT "nuke_retentions_resourceId_fkey";

-- DropIndex
DROP INDEX "automation_logs_accountId_actionType_idx";

-- DropIndex
DROP INDEX "nuke_retentions_resourceId_idx";

-- AlterTable
ALTER TABLE "automation_logs" DROP COLUMN "actionType",
DROP COLUMN "output",
ADD COLUMN     "action" TEXT NOT NULL,
ADD COLUMN     "result" TEXT,
ALTER COLUMN "provider" DROP NOT NULL,
ALTER COLUMN "resourceId" DROP NOT NULL,
ALTER COLUMN "resourceType" DROP NOT NULL,
ALTER COLUMN "startedAt" DROP NOT NULL;

-- AlterTable
ALTER TABLE "migration_recommendations" ADD COLUMN     "cloudAccountId" TEXT,
ADD COLUMN     "metadata" TEXT,
ALTER COLUMN "resourceId" DROP NOT NULL,
ALTER COLUMN "provider" DROP NOT NULL,
ALTER COLUMN "targetCloud" DROP NOT NULL,
ALTER COLUMN "savings" DROP NOT NULL,
ALTER COLUMN "complexity" DROP NOT NULL;

-- AlterTable
ALTER TABLE "nuke_configs" DROP COLUMN "schedule",
ADD COLUMN     "notificationEmails" TEXT NOT NULL DEFAULT '[]',
ADD COLUMN     "nukeCode" TEXT,
ADD COLUMN     "scheduleLabel" TEXT,
ALTER COLUMN "mode" SET DEFAULT 'AUTOMATIC',
ALTER COLUMN "enabled" SET DEFAULT true,
ALTER COLUMN "notificationDays" SET DEFAULT 7;

-- AlterTable
ALTER TABLE "nuke_retentions" DROP COLUMN "approvedAt",
DROP COLUMN "approvedBy",
DROP COLUMN "isApproved",
DROP COLUMN "resourceId",
ADD COLUMN     "cloudResourceId" TEXT NOT NULL,
ADD COLUMN     "resourceMeta" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "nuke_runs" DROP COLUMN "executionLog",
ADD COLUMN     "dryRunReport" TEXT,
ADD COLUMN     "skippedDetails" TEXT,
ADD COLUMN     "skippedResources" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "triggeredBy" TEXT,
ADD COLUMN     "wouldDelete" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "duration" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "nuke_notifications" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "recipientEmails" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "daysUntilNuke" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nuke_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "nuke_notifications_configId_idx" ON "nuke_notifications"("configId");

-- CreateIndex
CREATE INDEX "automation_logs_accountId_action_idx" ON "automation_logs"("accountId", "action");

-- CreateIndex
CREATE INDEX "nuke_retentions_cloudResourceId_idx" ON "nuke_retentions"("cloudResourceId");

-- AddForeignKey
ALTER TABLE "nuke_notifications" ADD CONSTRAINT "nuke_notifications_configId_fkey" FOREIGN KEY ("configId") REFERENCES "nuke_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
