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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'AI service not configured' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model:      'gpt-4o',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt || 'You are CloudGuard AI, a helpful cloud management assistant.' },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error('[chat] OpenAI error:', err);
      return res.status(response.status).json({ error: err.error?.message || 'AI request failed' });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.json({ success: true, message: text });
  } catch (err: any) {
    console.error('[chat] error:', err.message);
    return res.status(500).json({ error: 'Chat service error' });
  }
});

export default router;