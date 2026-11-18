import { callClaude } from '../lib/anthropic.js';
import { CHAT_RULES, RESUME_MD } from '../lib/resume.js';
import { cleanMessages, clientIp, limited, originOk } from '../lib/guard.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!originOk(req)) return res.status(403).json({ error: 'forbidden' });
  if (limited(clientIp(req), 'chat', 20, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const messages = cleanMessages(req.body && req.body.messages);
  if (!messages) return res.status(400).json({ error: 'bad_request' });

  try {
    const text = await callClaude({
      system: CHAT_RULES + '\n\nFACTS ABOUT IBRAHIM:\n' + RESUME_MD,
      messages,
      maxTokens: 600,
    });
    return res.status(200).json({ text: text || '...' });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message || 'upstream_error' });
  }
}
