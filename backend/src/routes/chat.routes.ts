// backend/src/routes/chat.routes.ts
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
router.use(authenticateToken);

// POST /api/chat/message
router.post('/message', async (req: Request, res: Response) => {
  try {
    const { messages, systemPrompt } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001', // fast + cheap
        max_tokens: 1024,
        system:     systemPrompt || 'You are CloudGuard AI, an expert cloud cost management and security assistant. Help users understand their cloud infrastructure, costs, security findings, and optimization opportunities. Be concise and actionable.',
        messages:   messages.map((m: any) => ({ role: m.role, content: m.content })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[chat] Anthropic error:', err);
      return res.status(response.status).json({ error: (err as any).error?.message || 'AI request failed' });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || '';
    return res.json({ success: true, message: text });

  } catch (err: any) {
    console.error('[chat] error:', err.message);
    return res.status(500).json({ error: 'Chat service error' });
  }
});

export default router;