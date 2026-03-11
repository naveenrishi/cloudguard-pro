// backend/src/routes/billing.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import {
  getInvoices,
  getSpendTrend,
  exportInvoiceCSV,
  exportInvoiceHTML,
  customExport,
  getSchedules,
  createSchedule,
  toggleSchedule,
  deleteSchedule,
} from '../services/billing.service';

const router = Router();

// GET /api/billing/invoices/:userId
router.get('/invoices/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const invoices = await getInvoices(req.params.userId);
    res.json({ invoices });
  } catch (err: any) {
    console.error('[billing] getInvoices error:', err.message);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// GET /api/billing/trend/:userId
router.get('/trend/:userId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const trend = await getSpendTrend(req.params.userId);
    res.json({ trend });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch trend' });
  }
});

// GET /api/billing/invoices/:invoiceId/export?format=csv|pdf
// invoiceId format: inv-2026-03-<userId6>
router.get('/invoices/:invoiceId/export', authenticateToken, async (req: Request, res: Response) => {
  const format = (req.query.format as string) || 'csv';
  const invoiceId = req.params.invoiceId;

  try {
    // Parse userId from invoiceId suffix (last 6 chars after final dash)
    const parts = invoiceId.split('-');
    const userId = parts.length >= 4 ? parts.slice(3).join('-') : (req as any).user?.id;
    const invoices = await getInvoices(userId);
    const invoice  = invoices.find(i => i.id === invoiceId) || invoices[0];

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (format === 'csv') {
      const csv = exportInvoiceCSV(invoice);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="CloudGuard-Invoice-${invoice.periodKey}.csv"`);
      return res.send(csv);
    }

    if (format === 'pdf') {
      const html = exportInvoiceHTML(invoice);
      // Return as HTML — browser can print-to-PDF or the frontend can open in new tab
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="CloudGuard-Invoice-${invoice.periodKey}.html"`);
      return res.send(html);
    }

    res.status(400).json({ error: 'Unsupported format. Use csv or pdf.' });
  } catch (err: any) {
    console.error('[billing] export error:', err.message);
    res.status(500).json({ error: 'Export failed' });
  }
});

// POST /api/billing/export  (custom export)
router.post('/export', authenticateToken, async (req: Request, res: Response) => {
  const { userId, period, format, sections } = req.body;
  try {
    const result = await customExport(userId, period || 'last_month', format || 'csv', sections || {});
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (err: any) {
    console.error('[billing] customExport error:', err.message);
    res.status(500).json({ error: 'Custom export failed' });
  }
});

// GET /api/billing/schedules/:userId
router.get('/schedules/:userId', authenticateToken, async (req: Request, res: Response) => {
  const schedules = getSchedules(req.params.userId);
  res.json({ schedules });
});

// POST /api/billing/schedules
router.post('/schedules', authenticateToken, async (req: Request, res: Response) => {
  const { userId, name, frequency, format, email } = req.body;
  if (!userId || !name || !email) {
    return res.status(400).json({ error: 'userId, name, and email are required' });
  }
  const schedule = createSchedule(userId, { name, frequency, format, email });
  res.status(201).json({ schedule });
});

// POST /api/billing/schedules/:id/toggle
router.post('/schedules/:id/toggle', authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const result = toggleSchedule(userId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ schedule: result });
});

// DELETE /api/billing/schedules/:id
router.delete('/schedules/:id', authenticateToken, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const deleted = deleteSchedule(userId, req.params.id);
  res.json({ deleted });
});

export default router;