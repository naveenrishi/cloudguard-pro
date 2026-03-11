import { Router, Request, Response } from 'express';
import PDFDocument from 'pdfkit';
import prisma from '../config/database';

const router = Router();

router.get('/generate', async (req: Request, res: Response) => {
  await generateReport(req, res);
});

router.post('/generate', async (req: Request, res: Response) => {
  await generateReport(req, res);
});

async function generateReport(req: Request, res: Response) {
  const { accountId, provider, format = 'pdf' } = req.query as Record<string, string>;

  if (!accountId || !provider) {
    return res.status(400).json({ error: 'accountId and provider are required' });
  }

  const allowedProviders = ['aws', 'azure', 'gcp'];
  if (!allowedProviders.includes(provider.toLowerCase())) {
    return res.status(400).json({ error: 'provider must be aws, azure, or gcp' });
  }

  if (!/^[a-zA-Z0-9\-_]+$/.test(accountId)) {
    return res.status(400).json({ error: 'Invalid accountId format' });
  }

  try {
    // Fetch account data from DB
    let account: any = null;
    try {
      account = await prisma.cloudAccount.findFirst({
        where: { accountId },
      });
    } catch (e) {
      // continue without DB data
    }

    const date = new Date().toISOString().slice(0, 10);
    const filename = `CloudGuard_${provider.toUpperCase()}_${accountId}_${date}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ── Header ──────────────────────────────────────────────
    doc
      .fillColor('#1e40af')
      .fontSize(28)
      .font('Helvetica-Bold')
      .text('CloudGuard Pro', 50, 50);

    doc
      .fillColor('#6b7280')
      .fontSize(12)
      .font('Helvetica')
      .text('Cloud Cost Management & Security Report', 50, 85);

    doc
      .moveTo(50, 110)
      .lineTo(545, 110)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    // ── Report Metadata ──────────────────────────────────────
    doc.moveDown(1);
    doc
      .fillColor('#111827')
      .fontSize(10)
      .font('Helvetica')
      .text(`Generated: ${new Date().toLocaleString()}`, 50, 125)
      .text(`Provider: ${provider.toUpperCase()}`, 50, 140)
      .text(`Account ID: ${accountId}`, 50, 155)
      .text(`Account Name: ${account?.accountName || 'N/A'}`, 50, 170)
      .text(`Region: ${account?.region || 'N/A'}`, 50, 185)
      .text(`Status: ${account?.status || 'N/A'}`, 50, 200);

    doc
      .moveTo(50, 220)
      .lineTo(545, 220)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    // ── Executive Summary ────────────────────────────────────
    doc.y = 235;
    doc
      .fillColor('#1e40af')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Executive Summary', 50);

    doc.moveDown(0.5);
    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text(
        `This report provides a comprehensive overview of your ${provider.toUpperCase()} cloud infrastructure ` +
        `managed through CloudGuard Pro. It includes cost analysis, security posture, ` +
        `resource utilization, and actionable recommendations.`,
        50,
        doc.y,
        { width: 495 }
      );

    // ── Cost Summary ─────────────────────────────────────────
    doc.moveDown(1.5);
    doc
      .fillColor('#1e40af')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Cost Summary', 50);

    doc.moveDown(0.5);

    // Cost table
    const costY = doc.y;
    const cols = [50, 200, 350, 450];

    // Table header
    doc
      .fillColor('#1e40af')
      .rect(50, costY, 495, 25)
      .fill();

    doc
      .fillColor('#ffffff')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Period', cols[0] + 5, costY + 7)
      .text('Amount', cols[1] + 5, costY + 7)
      .text('Change', cols[2] + 5, costY + 7)
      .text('Status', cols[3] + 5, costY + 7);

    // Table rows
    const costRows = [
      ['Current Month (MTD)', '$0.00', 'N/A', 'Active'],
      ['Last Month', '$0.00', 'N/A', 'Closed'],
      ['Forecast (EOM)', '$0.00', 'N/A', 'Projected'],
    ];

    costRows.forEach((row, i) => {
      const rowY = costY + 25 + i * 22;
      doc
        .fillColor(i % 2 === 0 ? '#f9fafb' : '#ffffff')
        .rect(50, rowY, 495, 22)
        .fill();

      doc
        .fillColor('#374151')
        .fontSize(9)
        .font('Helvetica')
        .text(row[0], cols[0] + 5, rowY + 6)
        .text(row[1], cols[1] + 5, rowY + 6)
        .text(row[2], cols[2] + 5, rowY + 6)
        .text(row[3], cols[3] + 5, rowY + 6);
    });

    doc
      .rect(50, costY, 495, 25 + costRows.length * 22)
      .strokeColor('#e5e7eb')
      .lineWidth(0.5)
      .stroke();

    // ── Security Summary ─────────────────────────────────────
    doc.y = costY + 25 + costRows.length * 22 + 20;
    doc.moveDown(1);
    doc
      .fillColor('#1e40af')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Security Posture', 50);

    doc.moveDown(0.5);
    doc
      .fillColor('#374151')
      .fontSize(10)
      .font('Helvetica')
      .text('Security Score: ', 50, doc.y, { continued: true })
      .fillColor('#dc2626')
      .text('Requires Review')
      .fillColor('#374151')
      .text('• Review IAM policies and access controls', 65, doc.y + 5)
      .text('• Enable MFA for all privileged accounts', 65, doc.y + 5)
      .text('• Audit security group rules and network access', 65, doc.y + 5)
      .text('• Enable CloudTrail / audit logging', 65, doc.y + 5);

    // ── Recommendations ──────────────────────────────────────
    doc.moveDown(1.5);
    doc
      .fillColor('#1e40af')
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Top Recommendations', 50);

    doc.moveDown(0.5);

    const recommendations = [
      { priority: 'HIGH', title: 'Right-size underutilized instances', savings: 'Est. 20-30% cost reduction' },
      { priority: 'HIGH', title: 'Delete unattached storage volumes', savings: 'Est. $50-200/month savings' },
      { priority: 'MEDIUM', title: 'Purchase Reserved Instances for stable workloads', savings: 'Est. 40% discount vs On-Demand' },
      { priority: 'MEDIUM', title: 'Enable auto-scaling for variable workloads', savings: 'Improved cost efficiency' },
      { priority: 'LOW', title: 'Archive infrequently accessed data to cold storage', savings: 'Est. 60-80% storage cost reduction' },
    ];

    recommendations.forEach((rec, i) => {
      const recY = doc.y;
      const color = rec.priority === 'HIGH' ? '#dc2626' : rec.priority === 'MEDIUM' ? '#d97706' : '#059669';

      doc
        .fillColor(color)
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(`[${rec.priority}]`, 50, recY, { continued: true })
        .fillColor('#111827')
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`  ${rec.title}`)
        .fillColor('#6b7280')
        .fontSize(8)
        .font('Helvetica')
        .text(`       ${rec.savings}`)
        .moveDown(0.3);
    });

    // ── Footer ───────────────────────────────────────────────
    const pageHeight = doc.page.height;
    doc
      .moveTo(50, pageHeight - 60)
      .lineTo(545, pageHeight - 60)
      .strokeColor('#e5e7eb')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#9ca3af')
      .fontSize(8)
      .font('Helvetica')
      .text(
        `CloudGuard Pro | Confidential | Generated ${new Date().toLocaleString()} | Account: ${accountId}`,
        50,
        pageHeight - 45,
        { align: 'center', width: 495 }
      );

    doc.end();

  } catch (error: any) {
    console.error('[Report] Generation failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Report generation failed', details: error.message });
    }
  }
}

export default router;