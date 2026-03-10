// ─────────────────────────────────────────────────────────────────────────────
// ADD THIS TO YOUR EXISTING BACKEND
// File: routes/chatbot.ts  (or paste into your main routes file)
// ─────────────────────────────────────────────────────────────────────────────
//
// SETUP STEPS:
//   1. npm install openai                   (in your backend folder)
//   2. Add OPENAI_API_KEY=sk-...  to your .env file
//   3. Register this route in your main server file (see bottom of this file)
//
// ─────────────────────────────────────────────────────────────────────────────

import express, { Request, Response } from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Initialize OpenAI client — reads OPENAI_API_KEY from .env automatically
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── POST /api/chat ───────────────────────────────────────────────────────────
// Body: { messages: [{role, content}], system: string }
// Response: { content: string }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, system } = req.body;

    // Basic validation
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Call OpenAI
    const response = await openai.chat.completions.create({
      model:      'gpt-4o',
      max_tokens: 1000,
      messages: [
        { role: 'system', content: system || 'You are a helpful cloud assistant.' },
        ...messages,
      ],
    });

    const text = response.choices[0]?.message?.content || '';

    res.json({ content: text });

  } catch (error: any) {
    console.error('[ChatBot] Anthropic API error:', error?.message || error);

    // Return a helpful error so the frontend fallback kicks in
    res.status(500).json({
      error: error?.message || 'Failed to call Anthropic API',
    });
  }
});

export default router;

