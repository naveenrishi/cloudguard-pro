-- CreateTable
CREATE TABLE "NukeAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "cloudAccountId" TEXT NOT NULL,
    "nukeType" TEXT NOT NULL,
    "scheduleDay" INTEGER NOT NULL DEFAULT 1,
    "notificationDays" INTEGER NOT NULL DEFAULT 5,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NukeAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NukeRun" (
    "id" TEXT NOT NULL,
    "nukeAccountId" TEXT NOT NULL,
    "runType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalResources" INTEGER NOT NULL DEFAULT 0,
    "retainedResources" INTEGER NOT NULL DEFAULT 0,
    "deletedResources" INTEGER NOT NULL DEFAULT 0,
    "failedResources" INTEGER NOT NULL DEFAULT 0,
    "resourcesScanned" JSONB DEFAULT '{}',
    "resourcesDeleted" JSONB DEFAULT '{}',
    "errors" JSONB DEFAULT '{}',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NukeRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResourceRetention" (
    "id" TEXT NOT NULL,
    "nukeAccountId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "resourceName" TEXT,
    "resourceArn" TEXT,
    "resourceTags" JSONB DEFAULT '{}',
    "resourceRegion" TEXT,
    "retentionType" TEXT NOT NULL,
    "retainUntil" TIMESTAMP(3),
    "retainDays" INTEGER,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "ResourceRetention_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NukeNotification" (
    "id" TEXT NOT NULL,
    "nukeRunId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "notificationType" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailSubject" TEXT NOT NULL,
    "emailBody" TEXT NOT NULL,

    CONSTRAINT "NukeNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NukeAccount_enabled_nextRunAt_idx" ON "NukeAccount"("enabled", "nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "NukeAccount_cloudAccountId_accountName_key" ON "NukeAccount"("cloudAccountId", "accountName");

-- CreateIndex
CREATE INDEX "NukeRun_nukeAccountId_status_idx" ON "NukeRun"("nukeAccountId", "status");

-- CreateIndex
CREATE INDEX "NukeRun_scheduledFor_idx" ON "NukeRun"("scheduledFor");

-- CreateIndex
CREATE INDEX "ResourceRetention_nukeAccountId_status_idx" ON "ResourceRetention"("nukeAccountId", "status");

-- CreateIndex
CREATE INDEX "ResourceRetention_expiresAt_idx" ON "ResourceRetention"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceRetention_nukeAccountId_resourceId_key" ON "ResourceRetention"("nukeAccountId", "resourceId");

-- CreateIndex
CREATE INDEX "NukeNotification_sentAt_idx" ON "NukeNotification"("sentAt");

-- AddForeignKey
ALTER TABLE "NukeAccount" ADD CONSTRAINT "NukeAccount_cloudAccountId_fkey" FOREIGN KEY ("cloudAccountId") REFERENCES "CloudAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NukeRun" ADD CONSTRAINT "NukeRun_nukeAccountId_fkey" FOREIGN KEY ("nukeAccountId") REFERENCES "NukeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRetention" ADD CONSTRAINT "ResourceRetention_nukeAccountId_fkey" FOREIGN KEY ("nukeAccountId") REFERENCES "NukeAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceRetention" ADD CONSTRAINT "ResourceRetention_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
