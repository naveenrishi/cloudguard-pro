-- AlterTable
ALTER TABLE "cloud_accounts" ADD COLUMN     "awsAccessKeyId" TEXT,
ADD COLUMN     "awsExternalId" TEXT,
ADD COLUMN     "awsRoleArn" TEXT,
ADD COLUMN     "awsSecretKey" TEXT,
ADD COLUMN     "azureClientId" TEXT,
ADD COLUMN     "azureClientSecret" TEXT,
ADD COLUMN     "azureSubscriptionId" TEXT,
ADD COLUMN     "azureTenantId" TEXT,
ADD COLUMN     "isConnected" BOOLEAN NOT NULL DEFAULT true,
ALTER COLUMN "credentials" DROP NOT NULL;
