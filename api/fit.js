import { callClaude } from '../lib/anthropic.js';
import { FIT_RULES, RESUME_MD } from '../lib/resume.js';
import { clientIp, limited, originOk } from '../lib/guard.js';

const VERDICTS = ['strong', 'partial', 'weak'];

function strings(arr, max) {
  if (!Array.isArray(arr)) return [];
  return arr
    .filter((x) => typeof x === 'string' && x.trim())
    .slice(0, max)
    .map((x) => x.trim().slice(0, 300));
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  if (!originOk(req)) return res.status(403).json({ error: 'forbidden' });
  if (limited(clientIp(req), 'fit', 6, 10 * 60 * 1000)) {
    return res.status(429).json({ error: 'rate_limited' });
  }

  const body = req.body || {};
  const jd = typeof body.jd === 'string' ? body.jd.trim().slice(0, 6000) : '';
  if (jd.length < 40) return res.status(400).json({ error: 'bad_request' });
  const language = body.lang === 'ar' ? 'Arabic' : 'English';

  try {
    const raw = await callClaude({
      system:
        FIT_RULES +
        '\nWrite every text value in ' +
        language +
        '.\n\nFACTS ABOUT IBRAHIM:\n' +
        RESUME_MD,
      messages: [{ role: 'user', content: '<job_description>\n' + jd + '\n</job_description>' }],
      maxTokens: 900,
    });

    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start < 0 || end <= start) return res.status(502).json({ error: 'bad_output' });
    let parsed;
    try {
      parsed = JSON.parse(raw.slice(start, end + 1));
    } catch {
      return res.status(502).json({ error: 'bad_output' });
    }

    return res.status(200).json({
      verdict: VERDICTS.includes(parsed.verdict) ? parsed.verdict : 'partial',
      summary: typeof parsed.summary === 'string' ? parsed.summary.trim().slice(0, 700) : '',
      strengths: strings(parsed.strengths, 5),
      gaps: strings(parsed.gaps, 5),
    });
  } catch (err) {
    return res.status(err.status || 502).json({ error: err.message || 'upstream_error' });
  }
}
