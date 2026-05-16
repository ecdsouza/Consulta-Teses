/**
 * GET /api/chromium-test
 *
 * Teste mínimo de Chromium na Vercel.
 * Faz APENAS:
 *   1. Resolver o executablePath (baixa o pack na primeira execução)
 *   2. Lançar o browser
 *   3. Pegar a versão
 *   4. Fechar
 *
 * Nada de navegação, login ou rede além do download do pack.
 * Use isso para isolar se o problema é só "abrir o Chromium".
 */

module.exports.config = { maxDuration: 60 };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  const log = [];
  const t0 = Date.now();
  const stamp = (msg) => log.push(`[${String(Date.now() - t0).padStart(5, ' ')}ms] ${msg}`);

  // Timeout interno: aborta antes da Vercel matar a função no escuro,
  // assim o cliente sempre recebe o log parcial pra diagnosticar a etapa.
  const INTERNAL_TIMEOUT_MS = 50000;
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`timeout interno após ${INTERNAL_TIMEOUT_MS}ms — provavelmente download do Chromium não finalizou`)),
      INTERNAL_TIMEOUT_MS)
  );

  const runFlow = async () => {
    stamp('require @sparticuz/chromium-min');
    const chromium = require('@sparticuz/chromium-min');

    stamp('require puppeteer-core');
    const puppeteer = require('puppeteer-core');

    const PACK = process.env.CHROMIUM_PACK_URL
      || 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.x64.tar';
    stamp(`chromium.executablePath() — pack: ${PACK.replace(/\/[^\/]*$/, '/…')}`);
    const execPath = await chromium.executablePath(PACK);
    stamp(`exec path resolvido: ${execPath}`);

    stamp('puppeteer.launch(...)');
    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: execPath,
      headless: chromium.headless,
    });
    stamp('browser lançado');

    const version = await browser.version();
    stamp(`version: ${version}`);

    await browser.close();
    stamp('browser fechado');

    return { version, execPath };
  };

  try {
    const result = await Promise.race([runFlow(), timeoutPromise]);
    return res.status(200).json({
      ok: true,
      ms: Date.now() - t0,
      ...result,
      log,
    });
  } catch (e) {
    return res.status(500).json({
      ok: false,
      ms: Date.now() - t0,
      error: e.message,
      stack: e.stack ? e.stack.split('\n').slice(0, 8).join('\n') : null,
      log,
    });
  }
};
