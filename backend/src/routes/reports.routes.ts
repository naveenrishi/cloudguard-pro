/**
 * CloudGuard Pro — Report Generation Route
 * POST /api/reports/generate?accountId=xxx&provider=aws|azure|gcp
 *
 * Place this file at: backend/src/routes/reports.routes.ts
 * Register in server.ts: app.use('/api/reports', reportsRouter);
 */
import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const router = Router();

// ── Paths (relative to compiled output: backend/dist/routes/) ──────────────
const GENERATOR_SCRIPT = path.resolve(process.cwd(), 'src/scripts/generate_report.py');
const PYTHON_BIN       = path.resolve(process.cwd(), 'venv/bin/python3');

router.post('/generate', async (req: Request, res: Response) => {
  const { accountId, provider, format = 'pdf' } = req.query as Record<string, string>;

  if (!accountId || !provider) {
    return res.status(400).json({ error: 'accountId and provider are required' });
  }

  const allowedProviders = ['aws', 'azure', 'gcp'];
  if (!allowedProviders.includes(provider.toLowerCase())) {
    return res.status(400).json({ error: 'provider must be aws, azure, or gcp' });
  }

  // Sanitise accountId — alphanumeric, dashes, underscores only
  if (!/^[a-zA-Z0-9\-_]+$/.test(accountId)) {
    return res.status(400).json({ error: 'Invalid accountId format' });
  }

  const date    = new Date().toISOString().slice(0, 10);
  const outFile = path.join(os.tmpdir(), `cloudguard_${provider}_${accountId}_${date}_${Date.now()}.pdf`);

  const cmd = [
    PYTHON_BIN,
    GENERATOR_SCRIPT,
    '--provider',   provider.toLowerCase(),
    '--account-id', accountId,
    '--output',     outFile,
  ].join(' ');

  exec(cmd, { timeout: 60_000 }, (err, stdout, stderr) => {
    if (err) {
      console.error('[Report] Generation failed:', stderr);
      return res.status(500).json({ error: 'Report generation failed', details: stderr });
    }

    if (!fs.existsSync(outFile)) {
      return res.status(500).json({ error: 'Output file not found after generation' });
    }

    const filename = `CloudGuard_${provider.toUpperCase()}_${accountId}_${date}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache');

    const stream = fs.createReadStream(outFile);
    stream.pipe(res);
    stream.on('end', () => {
      try { fs.unlinkSync(outFile); } catch (_) {}
    });
    stream.on('error', (streamErr) => {
      console.error('[Report] Stream error:', streamErr);
      try { fs.unlinkSync(outFile); } catch (_) {}
    });
  });
});

export default router;
