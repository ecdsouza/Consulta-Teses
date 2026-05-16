/**
 * GET /api/ping
 * Endpoint mais simples possível — só responde JSON. Sem deps, sem nada.
 * Se isso travar, é problema de deploy ou plano da Vercel.
 */

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    ts: new Date().toISOString(),
    node: process.version,
    region: process.env.VERCEL_REGION || null,
    msg: 'pong',
  });
};
