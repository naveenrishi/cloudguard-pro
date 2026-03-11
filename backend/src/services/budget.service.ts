// backend/src/services/budget.service.ts
// Derives cost recommendations from real cloud account data.
// No new DB models required — uses existing CloudAccount + cost APIs.

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();
const SELF   = process.env.SELF_URL || 'http://localhost:3000';

function decrypt(text: string): string {
  try {
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'fallback-key-32-chars-minimum-xx';
    const ENC_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();
    const [ivHex, encryptedHex] = text.split(':');
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENC_KEY, Buffer.from(ivHex, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]).toString('utf8');
  } catch { return '{}'; }
}

// ─────────────────────────────────────────────────────────────────────────────
// generateRecommendations — builds real recommendations from cost + resource data
// ─────────────────────────────────────────────────────────────────────────────
export async function generateRecommendations(userId: string) {
  const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
  const recommendations: any[] = [];

  for (const account of accounts) {
    try {
      // Fetch costs for this account
      const costRes = await fetch(`${SELF}/api/cloud/accounts/${account.id}/costs`);
      const costData: any = costRes.ok ? await costRes.json() : null;

      // Fetch resources for this account
      const resRes = await fetch(`${SELF}/api/cloud/accounts/${account.id}/resources`);
      const resData: any = resRes.ok ? await resRes.json() : null;

      const provider = account.provider?.toUpperCase() || 'AWS';
      const services: any[] = costData?.services || [];
      const resources: any[] = resData?.resources || resData || [];

      // ── 1. High-cost service rightsizing ──────────────────────────────────
      const topServices = services.filter((s: any) => s.cost > 50).slice(0, 3);
      topServices.forEach((svc: any, i: number) => {
        recommendations.push({
          id: `rec-${account.id}-svc-${i}`,
          title: `Optimize ${svc.name} Spend`,
          description: `${svc.name} is your ${i === 0 ? 'top' : i === 1 ? '2nd' : '3rd'} cost driver at $${svc.cost.toFixed(2)}/mo on ${account.accountName}`,
          category: svc.name.includes('EC2') ? 'EC2' : svc.name.includes('RDS') ? 'RDS' : svc.name.includes('S3') ? 'S3' : svc.name.includes('Lambda') ? 'Lambda' : 'Cloud',
          priority: svc.cost > 200 ? 'high' : svc.cost > 80 ? 'medium' : 'low',
          savings: `$${Math.round(svc.cost * 0.25).toLocaleString()}/mo`,
          savingsAmount: Math.round(svc.cost * 0.25),
          resourceCount: Math.max(1, Math.round(svc.cost / 20)),
          complexity: 'medium',
          estimatedTime: '1-2 hours',
          impact: `Applying rightsizing and reserved pricing to ${svc.name} can reduce costs by ~25%`,
          resources: [],
          implementationSteps: [
            `Review ${svc.name} usage in the ${provider} console`,
            'Identify underutilized resources using CloudWatch / Azure Monitor metrics',
            'Rightsize instances or storage tiers based on actual utilization',
            'Consider reserved/committed use discounts for steady-state workloads',
            'Set up cost alerts to monitor spend going forward',
          ],
        });
      });

      // ── 2. Stopped EC2 instances ──────────────────────────────────────────
      const stoppedEC2 = resources.filter((r: any) =>
        r.type?.toLowerCase().includes('ec2') || r.type?.toLowerCase().includes('instance')
      ).filter((r: any) => r.state === 'stopped' || r.status === 'stopped');

      if (stoppedEC2.length > 0) {
        recommendations.push({
          id: `rec-${account.id}-stopped-ec2`,
          title: 'Terminate or Snapshot Stopped EC2 Instances',
          description: `${stoppedEC2.length} stopped EC2 instance${stoppedEC2.length > 1 ? 's' : ''} on ${account.accountName} are still incurring EBS storage costs`,
          category: 'EC2',
          priority: stoppedEC2.length >= 5 ? 'high' : 'medium',
          savings: `$${Math.round(stoppedEC2.length * 8)}/mo`,
          savingsAmount: stoppedEC2.length * 8,
          resourceCount: stoppedEC2.length,
          complexity: 'easy',
          estimatedTime: '20 minutes',
          impact: 'Eliminate EBS storage costs for instances no longer in use',
          resources: stoppedEC2.slice(0, 5).map((r: any) => r.id || r.resourceId || r.name),
          implementationSteps: [
            'Go to EC2 → Instances and filter by "stopped" state',
            'Verify each instance is no longer needed',
            'Create an AMI snapshot as backup if data is needed',
            'Terminate the instance to stop all associated charges',
            'Optionally set up Instance Scheduler to auto-stop dev instances nightly',
          ],
        });
      }

      // ── 3. S3 cost optimisation ───────────────────────────────────────────
      const s3Cost = services.find((s: any) => s.name?.includes('S3'))?.cost || 0;
      if (s3Cost > 20) {
        recommendations.push({
          id: `rec-${account.id}-s3-tiering`,
          title: 'Enable S3 Intelligent-Tiering',
          description: `S3 storage is costing $${s3Cost.toFixed(2)}/mo on ${account.accountName}. Intelligent-Tiering can reduce this by up to 40%`,
          category: 'S3',
          priority: s3Cost > 100 ? 'high' : 'medium',
          savings: `$${Math.round(s3Cost * 0.35)}/mo`,
          savingsAmount: Math.round(s3Cost * 0.35),
          resourceCount: resources.filter((r: any) => r.type?.toLowerCase().includes('s3')).length || 1,
          complexity: 'easy',
          estimatedTime: '15 minutes',
          impact: 'Automatically moves infrequently accessed objects to cheaper storage tiers',
          resources: [],
          implementationSteps: [
            'Open S3 console and select the largest buckets',
            'Go to Management → Lifecycle rules → Create rule',
            'Select "Transition to Intelligent-Tiering" at 0 days',
            'Apply to all objects in the bucket',
            'Repeat for other high-cost buckets',
          ],
        });
      }

      // ── 4. Reserved instances for high on-demand spend ────────────────────
      const ec2Cost = services.find((s: any) => s.name?.includes('EC2') && !s.name?.includes('Other'))?.cost || 0;
      if (ec2Cost > 100) {
        recommendations.push({
          id: `rec-${account.id}-reserved`,
          title: 'Purchase Reserved Instances',
          description: `EC2 on-demand spend is $${ec2Cost.toFixed(2)}/mo on ${account.accountName}. Reserved Instances can save up to 72%`,
          category: 'EC2',
          priority: ec2Cost > 500 ? 'high' : 'medium',
          savings: `$${Math.round(ec2Cost * 0.45)}/mo`,
          savingsAmount: Math.round(ec2Cost * 0.45),
          resourceCount: resources.filter((r: any) => r.state === 'running' || r.status === 'running').length || 1,
          complexity: 'medium',
          estimatedTime: '1 hour',
          impact: 'Commit to 1 or 3-year Reserved Instances for steady-state workloads',
          resources: [],
          implementationSteps: [
            'Open Cost Explorer and identify instances running 24/7 for 3+ months',
            'Go to EC2 → Reserved Instances → Purchase Reserved Instances',
            'Match instance type and region to your on-demand instances',
            'Choose 1-year term, Partial Upfront for best balance of savings and flexibility',
            'Monitor RI utilization in Cost Explorer after purchase',
          ],
        });
      }

    } catch (e: any) {
      console.error(`generateRecommendations error for ${account.id}:`, e.message);
    }
  }

  // Sort by savings descending
  recommendations.sort((a, b) => b.savingsAmount - a.savingsAmount);
  return { recommendations };
}

// ─────────────────────────────────────────────────────────────────────────────
// createBudget — stub (no Budget model in schema yet)
// ─────────────────────────────────────────────────────────────────────────────
export async function createBudget(data: any) {
  // TODO: add Budget model to Prisma schema
  return { id: `budget-${Date.now()}`, ...data, createdAt: new Date() };
}

// ─────────────────────────────────────────────────────────────────────────────
// getUserBudgets — stub
// ─────────────────────────────────────────────────────────────────────────────
export async function getUserBudgets(userId: string) {
  return [];
}

// ─────────────────────────────────────────────────────────────────────────────
// detectCostAnomalies — derives anomalies from real monthly trend
// ─────────────────────────────────────────────────────────────────────────────
export async function detectCostAnomalies(userId: string) {
  const accounts = await prisma.cloudAccount.findMany({ where: { userId } });
  const anomalies: any[] = [];

  for (const account of accounts) {
    try {
      const res = await fetch(`${SELF}/api/cloud/accounts/${account.id}/costs`);
      if (!res.ok) continue;
      const data: any = await res.json();
      const monthly: any[] = data.monthlyData || [];
      if (monthly.length < 3) continue;

      // Calculate average of all but last month
      const history = monthly.slice(0, -1);
      const avg = history.reduce((s: number, m: any) => s + m.total, 0) / history.length;
      const last = monthly[monthly.length - 1];
      const pctChange = avg > 0 ? ((last.total - avg) / avg) * 100 : 0;

      if (Math.abs(pctChange) > 20) {
        anomalies.push({
          id: `anomaly-${account.id}`,
          accountName: account.accountName,
          provider: account.provider,
          month: last.month,
          amount: last.total,
          average: avg,
          pctChange: pctChange.toFixed(1),
          direction: pctChange > 0 ? 'spike' : 'drop',
          severity: Math.abs(pctChange) > 50 ? 'high' : 'medium',
        });
      }
    } catch { continue; }
  }

  return anomalies;
}