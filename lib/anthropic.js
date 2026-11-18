// Minimal Anthropic Messages API client. No SDK, so the project has no dependencies.
// The API key stays on the server. It is never sent to the browser.

const API_URL = process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages';
const MODEL = process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5';

export async function callClaude({ system, messages, maxTokens = 600 }) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    const err = new Error('not_configured');
    err.status = 503;
    throw err;
  }

  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages }),
      signal: AbortSignal.timeout(25000),
    });
  } catch {
    const err = new Error('upstream_unreachable');
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    // Do not forward the upstream body: it can contain details the visitor should not see.
    const err = new Error(res.status === 429 ? 'rate_limited' : 'upstream_error');
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const data = await res.json();
  return (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
