// Small request guards shared by the API routes.

const buckets = new Map();

// Best-effort rate limit kept in memory. On Vercel each warm function instance has its own
// counter, so this slows casual abuse but is not a hard limit. For a hard limit, add Vercel
// Firewall rate limiting (see README).
export function limited(ip, name, max, windowMs) {
  const now = Date.now();
  const key = name + ':' + ip;
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now > v.reset) buckets.delete(k);
    }
    return false;
  }
  b.count += 1;
  return b.count > max;
}

export function clientIp(req) {
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return fwd || (req.socket && req.socket.remoteAddress) || 'unknown';
}

// Browsers always send Origin on a cross-origin POST. Allow the site itself and any origin
// listed in ALLOWED_ORIGINS (comma separated, for example a custom domain).
export function originOk(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let host;
  try {
    host = new URL(origin).host;
  } catch {
    return false;
  }
  if (host === req.headers.host) return true;
  const extra = String(process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

// Turns the browser's conversation into a clean list the Messages API accepts.
export function cleanMessages(input) {
  if (!Array.isArray(input) || input.length === 0 || input.length > 12) return null;
  const out = [];
  for (const m of input) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') continue;
    const content = m.content.trim().slice(0, 1200);
    if (!content) continue;
    const last = out[out.length - 1];
    if (last && last.role === m.role) last.content += '\n' + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}
