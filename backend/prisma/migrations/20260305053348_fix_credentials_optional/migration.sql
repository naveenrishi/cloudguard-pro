/*
  Warnings:

  - You are about to drop the column `awsAccessKeyId` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `awsExternalId` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `awsRoleArn` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `awsSecretKey` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `azureClientId` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `azureClientSecret` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `azureSubscriptionId` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `azureTenantId` on the `cloud_accounts` table. All the data in the column will be lost.
  - You are about to drop the column `isConnected` on the `cloud_accounts` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "cloud_accounts" DROP COLUMN "awsAccessKeyId",
DROP COLUMN "awsExternalId",
DROP COLUMN "awsRoleArn",
DROP COLUMN "awsSecretKey",
DROP COLUMN "azureClientId",
DROP COLUMN "azureClientSecret",
DROP COLUMN "azureSubscriptionId",
DROP COLUMN "azureTenantId",
DROP COLUMN "isConnected";
