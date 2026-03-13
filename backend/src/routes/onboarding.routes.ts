import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { STSClient, AssumeRoleCommand, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const prisma = new PrismaClient();

// ─── YOUR CloudGuard AWS Account ID (the account that assumes roles) ──────────
// Set this in your .env as CLOUDGUARD_AWS_ACCOUNT_ID
const CG_ACCOUNT_ID = process.env.CLOUDGUARD_AWS_ACCOUNT_ID || '123456789012';
const CG_EXTERNAL_ID = process.env.CLOUDGUARD_EXTERNAL_ID || 'cloudguard-secure-2024';

// ─── GET /api/onboarding/template/aws ─────────────────────────────────────────
// Returns a CloudFormation YAML template for download
router.get('/template/aws', authenticateToken, (req: Request, res: Response) => {
  const template = `AWSTemplateFormatVersion: '2010-09-09'
Description: >
  CloudGuard Pro - Read-only access role for cloud cost management and security monitoring.
  This template creates an IAM role that CloudGuard Pro uses to analyze your AWS account.

Parameters:
  ExternalId:
    Type: String
    Default: "${CG_EXTERNAL_ID}"
    Description: External ID for secure cross-account access (do not change)

Resources:
  CloudGuardRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: CloudGuardProReadOnly
      Description: Read-only role for CloudGuard Pro cost and security monitoring
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: "arn:aws:iam::${CG_ACCOUNT_ID}:root"
            Action: sts:AssumeRole
            Condition:
              StringEquals:
                sts:ExternalId: !Ref ExternalId
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/ReadOnlyAccess
        - arn:aws:iam::aws:policy/SecurityAudit
      Tags:
        - Key: CreatedBy
          Value: CloudGuardPro
        - Key: Purpose
          Value: CostAndSecurityMonitoring

Outputs:
  RoleArn:
    Description: "Paste this Role ARN into CloudGuard Pro to complete setup"
    Value: !GetAtt CloudGuardRole.Arn
    Export:
      Name: CloudGuardProRoleArn
  ExternalId:
    Description: "External ID (already configured in CloudGuard Pro)"
    Value: !Ref ExternalId
`;

  res.setHeader('Content-Type', 'application/x-yaml');
  res.setHeader('Content-Disposition', 'attachment; filename="cloudguard-pro-aws.yaml"');
  res.send(template);
});

// ─── GET /api/onboarding/template/azure ───────────────────────────────────────
// Returns an Azure CLI script for download
router.get('/template/azure', authenticateToken, (req: Request, res: Response) => {
  const script = `#!/bin/bash
# CloudGuard Pro - Azure Onboarding Script
# Run this in Azure Cloud Shell or local Azure CLI
# Requirements: az login must be completed first

set -e

echo "🔵 CloudGuard Pro - Azure Account Setup"
echo "========================================"

# Get current subscription
SUBSCRIPTION_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)
ACCOUNT_NAME=$(az account show --query name -o tsv)

echo "📋 Subscription: $ACCOUNT_NAME ($SUBSCRIPTION_ID)"
echo "📋 Tenant: $TENANT_ID"

# Create service principal with Reader role
echo ""
echo "🔧 Creating CloudGuard Pro service principal..."

SP_OUTPUT=$(az ad sp create-for-rbac \\
  --name "CloudGuardPro-ReadOnly" \\
  --role "Reader" \\
  --scopes "/subscriptions/$SUBSCRIPTION_ID" \\
  --output json)

CLIENT_ID=$(echo $SP_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['appId'])")
CLIENT_SECRET=$(echo $SP_OUTPUT | python3 -c "import sys,json; print(json.load(sys.stdin)['password'])")

# Also assign Security Reader role
az role assignment create \\
  --assignee $CLIENT_ID \\
  --role "Security Reader" \\
  --scope "/subscriptions/$SUBSCRIPTION_ID" \\
  --output none 2>/dev/null || true

echo ""
echo "✅ Setup complete! Copy these values into CloudGuard Pro:"
echo "========================================"
echo "Tenant ID:       $TENANT_ID"
echo "Subscription ID: $SUBSCRIPTION_ID"
echo "Client ID:       $CLIENT_ID"
echo "Client Secret:   $CLIENT_SECRET"
echo "========================================"
echo ""
echo "⚠️  Save the Client Secret now - it won't be shown again!"
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="cloudguard-pro-azure.sh"');
  res.send(script);
});

// ─── GET /api/onboarding/template/gcp ─────────────────────────────────────────
// Returns a GCP shell script for download
router.get('/template/gcp', authenticateToken, (req: Request, res: Response) => {
  const script = `#!/bin/bash
# CloudGuard Pro - GCP Onboarding Script
# Run this in Google Cloud Shell or local gcloud CLI
# Requirements: gcloud auth login must be completed first

set -e

echo "🟢 CloudGuard Pro - GCP Project Setup"
echo "========================================"

# Get current project
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NAME=$(gcloud projects describe $PROJECT_ID --format="value(name)")

echo "📋 Project: $PROJECT_NAME ($PROJECT_ID)"

# Create service account
SA_NAME="cloudguard-pro-readonly"
SA_EMAIL="$SA_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo ""
echo "🔧 Creating CloudGuard Pro service account..."

# Create service account (ignore if exists)
gcloud iam service-accounts create $SA_NAME \\
  --display-name="CloudGuard Pro Read-Only" \\
  --description="Read-only access for CloudGuard Pro cost and security monitoring" \\
  2>/dev/null || echo "Service account already exists, updating roles..."

# Assign required roles
ROLES=(
  "roles/viewer"
  "roles/cloudasset.viewer"
  "roles/billing.viewer"
  "roles/monitoring.viewer"
  "roles/securitycenter.adminViewer"
  "roles/iam.securityReviewer"
)

for ROLE in "\${ROLES[@]}"; do
  echo "  Adding $ROLE..."
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="serviceAccount:$SA_EMAIL" \\
    --role="$ROLE" \\
    --quiet
done

# Enable required APIs
echo ""
echo "🔧 Enabling required APIs..."
gcloud services enable \\
  cloudresourcemanager.googleapis.com \\
  cloudasset.googleapis.com \\
  monitoring.googleapis.com \\
  securitycenter.googleapis.com \\
  recommender.googleapis.com \\
  --quiet

# Create and download key
KEY_FILE="cloudguard-pro-$PROJECT_ID-key.json"
gcloud iam service-accounts keys create $KEY_FILE \\
  --iam-account=$SA_EMAIL

echo ""
echo "✅ Setup complete!"
echo "========================================"
echo "Project ID:      $PROJECT_ID"
echo "Service Account: $SA_EMAIL"
echo "Key File:        $KEY_FILE (in current directory)"
echo "========================================"
echo ""
echo "📄 Upload the key file ($KEY_FILE) to CloudGuard Pro to complete setup."
`;

  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="cloudguard-pro-gcp.sh"');
  res.send(script);
});

// ─── POST /api/onboarding/verify/aws ──────────────────────────────────────────
// Verifies the Role ARN works and saves the account
router.post('/verify/aws', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { roleArn, accountName, region = 'us-east-1' } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id || 'default-user';

    if (!roleArn || !roleArn.startsWith('arn:aws:iam::')) {
      return res.status(400).json({ error: 'Invalid Role ARN format. Should start with arn:aws:iam::' });
    }

    // Extract AWS account number from ARN
    const awsAccountId = roleArn.split(':')[4];

    // Try to assume the role
    const sts = new STSClient({ region });
    let identity: any;
    try {
      const assumeResult = await sts.send(new AssumeRoleCommand({
        RoleArn: roleArn,
        RoleSessionName: 'CloudGuardProVerification',
        ExternalId: CG_EXTERNAL_ID,
        DurationSeconds: 900,
      }));

      // Verify the assumed role works
      const verifyClient = new STSClient({
        region,
        credentials: {
          accessKeyId: assumeResult.Credentials!.AccessKeyId!,
          secretAccessKey: assumeResult.Credentials!.SecretAccessKey!,
          sessionToken: assumeResult.Credentials!.SessionToken!,
        },
      });
      identity = await verifyClient.send(new GetCallerIdentityCommand({}));
    } catch (stsError: any) {
      return res.status(400).json({
        error: 'Could not assume role. Please ensure the CloudFormation template was deployed successfully.',
        details: stsError.message,
      });
    }

    // Save account to DB
    const accountId = `aws-${Date.now()}`;
    const account = await prisma.cloudAccount.upsert({
      where: {
        userId_provider_accountId: {
          userId,
          provider: 'AWS',
          accountId: awsAccountId,
        },
      },
      update: {
        accountName: accountName || `AWS Account ${awsAccountId}`,
        credentials: JSON.stringify({ roleArn, externalId: CG_EXTERNAL_ID, region }),
        status: 'ACTIVE',
        region,
      },
      create: {
        id: accountId,
        userId,
        provider: 'AWS',
        accountName: accountName || `AWS Account ${awsAccountId}`,
        accountId: awsAccountId,
        region,
        credentials: JSON.stringify({ roleArn, externalId: CG_EXTERNAL_ID, region }),
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      account: {
        id: account.id,
        accountName: account.accountName,
        accountId: awsAccountId,
        provider: 'AWS',
        region,
      },
      message: 'AWS account connected successfully via IAM Role',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/onboarding/verify/azure ────────────────────────────────────────
router.post('/verify/azure', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, subscriptionId, clientId, clientSecret, accountName } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id || 'default-user';

    if (!tenantId || !subscriptionId || !clientId || !clientSecret) {
      return res.status(400).json({ error: 'Missing required fields: tenantId, subscriptionId, clientId, clientSecret' });
    }

    // Verify credentials by getting an access token
    try {
      const tokenRes = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
            scope: 'https://management.azure.com/.default',
          }),
        }
      );
      const tokenData = await tokenRes.json() as any;
      if (tokenData.error) {
        return res.status(400).json({
          error: 'Invalid Azure credentials. Please run the setup script and try again.',
          details: tokenData.error_description,
        });
      }
    } catch (azureError: any) {
      return res.status(400).json({ error: 'Could not verify Azure credentials', details: azureError.message });
    }

    // Save account
    const accountId = `azure-${Date.now()}`;
    const account = await prisma.cloudAccount.upsert({
      where: {
        userId_provider_accountId: {
          userId,
          provider: 'AZURE',
          accountId: subscriptionId,
        },
      },
      update: {
        accountName: accountName || `Azure Subscription ${subscriptionId.slice(0, 8)}`,
        credentials: JSON.stringify({ tenantId, subscriptionId, clientId, clientSecret }),
        status: 'ACTIVE',
      },
      create: {
        id: accountId,
        userId,
        provider: 'AZURE',
        accountName: accountName || `Azure Subscription ${subscriptionId.slice(0, 8)}`,
        accountId: subscriptionId,
        region: 'global',
        credentials: JSON.stringify({ tenantId, subscriptionId, clientId, clientSecret }),
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      account: { id: account.id, accountName: account.accountName, provider: 'AZURE' },
      message: 'Azure subscription connected successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/onboarding/verify/gcp ──────────────────────────────────────────
router.post('/verify/gcp', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { projectId, serviceAccountKey, accountName } = req.body;
    const userId = (req as any).user?.userId || (req as any).user?.id || 'default-user';

    if (!projectId || !serviceAccountKey) {
      return res.status(400).json({ error: 'Missing required fields: projectId, serviceAccountKey (JSON)' });
    }

    let keyJson: any;
    try {
      keyJson = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
    } catch {
      return res.status(400).json({ error: 'Invalid service account key JSON' });
    }

    if (!keyJson.client_email || !keyJson.private_key) {
      return res.status(400).json({ error: 'Service account key missing required fields' });
    }

    // Save account
    const accountId = `gcp-${Date.now()}`;
    const account = await prisma.cloudAccount.upsert({
      where: {
        userId_provider_accountId: {
          userId,
          provider: 'GCP',
          accountId: projectId,
        },
      },
      update: {
        accountName: accountName || `GCP Project ${projectId}`,
        credentials: JSON.stringify(keyJson),
        status: 'ACTIVE',
      },
      create: {
        id: accountId,
        userId,
        provider: 'GCP',
        accountName: accountName || `GCP Project ${projectId}`,
        accountId: projectId,
        region: 'global',
        credentials: JSON.stringify(keyJson),
        status: 'ACTIVE',
      },
    });

    res.json({
      success: true,
      account: { id: account.id, accountName: account.accountName, provider: 'GCP' },
      message: 'GCP project connected successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;