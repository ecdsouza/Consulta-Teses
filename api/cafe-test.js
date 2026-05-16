/**
 * GET /api/cafe-test
 * Testa o fluxo completo de login CAFe → CEFET-MG → Periódicos.
 * Retorna o log passo a passo + estado final da sessão.
 *
 * Use /api/cafe-test?force=1 pra ignorar o cache de sessão e fazer login do zero.
 */

module.exports.config = { maxDuration: 60 };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const force = req.query.force === '1';
  const t0 = Date.now();

  // Timeout interno: garante resposta antes da Vercel matar a função.
  const INTERNAL_TIMEOUT_MS = 55000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout interno após ${INTERNAL_TIMEOUT_MS}ms`)),
      INTERNAL_TIMEOUT_MS)
  );

  try {
    const { obterSessaoCAFe } = require('./cafe-session');
    const sess = await Promise.race([obterSessaoCAFe(force), timeoutPromise]);
    res.status(200).json({
      ok: sess.isLoggedIn,
      ms: Date.now() - t0,
      fromCache: !!sess.fromCache,
      urlFinal: sess.urlFinal,
      cookies: sess.cookies.length,
      cookieNames: sess.cookies.map(c => c.name).slice(0, 30),
      isLoggedIn: sess.isLoggedIn,
      totalMs: sess.totalMs,
      log: sess.log,
    });
  } catch (e) {
    res.status(500).json({
      ok: false,
      ms: Date.now() - t0,
      error: e.message,
      stack: e.stack ? e.stack.split('\n').slice(0, 6).join('\n') : null,
      hint: 'Tenta primeiro /api/chromium-test pra isolar se o problema é o Chromium em si',
    });
  }
};
