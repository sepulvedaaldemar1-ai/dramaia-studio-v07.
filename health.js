module.exports = function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); res.statusCode = 405; return res.end(JSON.stringify({ ok: false, error: 'Usa GET.' })); }
  res.statusCode = 200;
  res.end(JSON.stringify({ ok: true, service: 'DramaIA Studio API', storyboard: true, providerKeyConfigured: Boolean(process.env.GEMINI_API_KEY), model: process.env.GEMINI_MODEL || 'gemini-2.5-flash' }));
};
