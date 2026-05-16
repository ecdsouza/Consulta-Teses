/**
 * CAFe Session Manager — Portal de Periódicos CAPES via CEFET-MG
 *
 * Fluxo (extraído da .exe Selenium "Buscar Artigos"):
 *   1. periodicos.capes.gov.br
 *   2. Clica //a[@href='/index.php/acesso-cafe.html']
 *   3. Seleciona //label[@for='CEFET/MG']
 *   4. Submete a escolha de instituição (CAFe WAYF)
 *   5. CEFET-MG Shibboleth IdP: usuário + senha
 *   6. Redirect SAML → www-periodicos-capes-gov-br.ez107.periodicos.capes.gov.br
 *
 * Variáveis de ambiente (Vercel):
 *   CAPES_LOGIN  = login institucional CEFET-MG (CPF ou usuário)
 *   CAPES_SENHA  = senha
 *
 * Cache de sessão: 25 min em memória. Renova automaticamente.
 */

let _session = null;
let _sessionTs = 0;
const CACHE_TTL = 25 * 60 * 1000;

const INSTITUICAO = 'CEFET/MG';
const PERIODICOS_URL = 'https://www.periodicos.capes.gov.br/';
const EZPROXY_HOST_FRAGMENT = 'ez107';

async function obterSessaoCAFe(force = false) {
  if (!force && _session && (Date.now() - _sessionTs) < CACHE_TTL) {
    return { ..._session, fromCache: true };
  }

  const login = process.env.CAPES_LOGIN;
  const senha = process.env.CAPES_SENHA;
  if (!login || !senha) {
    throw new Error('CAPES_LOGIN / CAPES_SENHA não configurados na Vercel');
  }

  const chromium  = require('@sparticuz/chromium-min');
  const puppeteer = require('puppeteer-core');
  const log = [];
  const t0 = Date.now();
  const stamp = (msg) => log.push(`[${String(Date.now() - t0).padStart(5, ' ')}ms] ${msg}`);

  // chromium-min baixa o pack na primeira execução. Como o download direto
  // do GitHub Releases é lento da rede da Vercel, preferimos uma URL hospedada
  // em Vercel Blob (via env var CHROMIUM_PACK_URL). Fallback no GitHub.
  const PACK_URL = process.env.CHROMIUM_PACK_URL
    || 'https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.x64.tar';

  stamp(`Carregando Chromium (fonte: ${PACK_URL.includes('vercel-storage') || PACK_URL.includes('blob.vercel') ? 'Vercel Blob' : 'GitHub'})`);
  const execPath = await chromium.executablePath(PACK_URL);
  stamp(`Chromium pronto: ${execPath}`);

  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: execPath,
    headless: chromium.headless,
  });
  stamp('Browser lançado');

  try {
    const page = await browser.newPage();
    page.setDefaultNavigationTimeout(20000);
    page.setDefaultTimeout(10000);

    // Bloqueia recursos pesados pra economizar tempo
    await page.setRequestInterception(true);
    page.on('request', req => {
      const rt = req.resourceType();
      if (['image', 'stylesheet', 'font', 'media'].includes(rt)) req.abort();
      else req.continue();
    });

    // ── 1. Periódicos CAPES ──────────────────────────────────────
    stamp(`GET ${PERIODICOS_URL}`);
    await page.goto(PERIODICOS_URL, { waitUntil: 'domcontentloaded', timeout: 18000 });
    stamp(`URL atual: ${page.url().slice(0, 100)}`);

    // ── 2. Clica "Acesso CAFe" ───────────────────────────────────
    stamp('Procurando link "Acesso CAFe"');
    const cafeLink = await page.evaluateHandle(() => {
      const r = document.evaluate(
        "//a[@href='/index.php/acesso-cafe.html' or contains(@href,'acesso-cafe')]",
        document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
      );
      return r.singleNodeValue;
    });
    const cafeEl = cafeLink.asElement();
    if (!cafeEl) throw new Error('Link "Acesso CAFe" não encontrado na home do Periódicos');
    stamp('Clicando "Acesso CAFe"');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
      cafeEl.click(),
    ]);
    stamp(`URL pós-clique CAFe: ${page.url().slice(0, 100)}`);

    // ── 3. Seleciona CEFET-MG na lista de instituições ───────────
    stamp(`Procurando instituição "${INSTITUICAO}"`);
    // O .exe usa: //label[@for='CEFET/MG']
    const instHandle = await page.evaluateHandle((nome) => {
      const xpath = `//label[@for='${nome}']`;
      const r = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
      return r.singleNodeValue;
    }, INSTITUICAO);
    let instEl = instHandle.asElement();

    // Fallback: lista pode estar paginada ou em select. Tenta buscar pelo texto.
    if (!instEl) {
      stamp('Label exato não encontrado, buscando por texto');
      const byText = await page.evaluateHandle((nome) => {
        const r = document.evaluate(
          `//*[contains(text(), '${nome}')]`,
          document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null
        );
        return r.singleNodeValue;
      }, INSTITUICAO);
      instEl = byText.asElement();
    }
    if (!instEl) throw new Error(`Instituição "${INSTITUICAO}" não encontrada na página WAYF`);

    stamp(`Clicando em "${INSTITUICAO}"`);
    await instEl.click();

    // Pode haver um botão de submit/enviar depois de selecionar
    stamp('Procurando botão de submit');
    const submitBtn = await page.$('button[type="submit"], input[type="submit"], button.btn-primary');
    if (submitBtn) {
      stamp('Clicando submit da escolha de instituição');
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 18000 }).catch(() => {}),
        submitBtn.click(),
      ]);
    } else {
      // Selecionar a instituição pode auto-redirecionar
      stamp('Sem botão visível — aguardando navegação automática');
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
    }
    stamp(`URL pós-WAYF: ${page.url().slice(0, 100)}`);

    // ── 4. CEFET-MG Shibboleth IdP ──────────────────────────────
    stamp('Procurando campo de usuário no IdP CEFET-MG');
    const userSelectors = [
      'input[name="j_username"]',
      'input[id="username"]',
      'input[name="username"]',
      'input[name="cpf"]',
      'input[id="cpf"]',
      'input[type="text"][name*="user" i]',
      'input[autocomplete="username"]',
      'input[type="text"]:not([type="hidden"])',
    ];
    let userField = null;
    for (const sel of userSelectors) {
      try {
        await page.waitForSelector(sel, { timeout: 3000 });
        userField = await page.$(sel);
        if (userField) { stamp(`Campo usuário: ${sel}`); break; }
      } catch (_) {}
    }
    if (!userField) throw new Error('Campo de usuário não encontrado no IdP CEFET-MG');

    await userField.click({ clickCount: 3 });
    await userField.type(login, { delay: 25 });
    stamp('Usuário digitado');

    const pwdSelectors = [
      'input[name="j_password"]',
      'input[type="password"]',
      'input[name="password"]',
      'input[id="password"]',
    ];
    let pwdField = null;
    for (const sel of pwdSelectors) {
      try {
        pwdField = await page.$(sel);
        if (pwdField) { stamp(`Campo senha: ${sel}`); break; }
      } catch (_) {}
    }
    if (!pwdField) throw new Error('Campo de senha não encontrado no IdP CEFET-MG');

    await pwdField.click({ clickCount: 3 });
    await pwdField.type(senha, { delay: 25 });
    stamp('Senha digitada');

    stamp('Submetendo login do IdP');
    const idpSubmit = await page.$('button[type="submit"], input[type="submit"], button[name="_eventId_proceed"]');
    if (!idpSubmit) throw new Error('Botão submit do IdP não encontrado');

    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 22000 }).catch(() => {}),
      idpSubmit.click(),
    ]);
    stamp(`URL pós-login IdP: ${page.url().slice(0, 100)}`);

    // ── 5. SAML pode fazer múltiplos redirects automáticos ──────
    // Aguarda estabilizar
    await new Promise(r => setTimeout(r, 2500));
    stamp(`URL final: ${page.url().slice(0, 100)}`);

    const cookies = await page.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const urlFinal = page.url();
    const isLoggedIn = urlFinal.includes(EZPROXY_HOST_FRAGMENT)
                    || urlFinal.includes('periodicos-capes-gov-br')
                    || cookies.some(c => c.name.toLowerCase().includes('ezproxy'));

    stamp(`Cookies: ${cookies.length} | EZproxy detectado: ${isLoggedIn}`);

    _session = {
      cookieStr, cookies, urlFinal, isLoggedIn,
      log, totalMs: Date.now() - t0,
    };
    _sessionTs = Date.now();
    return _session;
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

module.exports = { obterSessaoCAFe };
