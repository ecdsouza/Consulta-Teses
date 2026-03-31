/**
 * CAPES Browser Session Manager
 *
 * Abre Chrome headless, faz login no gov.br e captura cookies de sessão.
 * Cache em memória de 25 minutos — o browser abre no máximo 1x a cada 25min.
 *
 * Variáveis de ambiente (Vercel → Settings → Environment Variables):
 *   CAPES_LOGIN  = CPF somente números (ex: 08303458680)
 *   CAPES_SENHA  = senha do gov.br
 */

const axios = require('axios');

// ── Cache em memória ──────────────────────────────────────────
let _cache = null;
let _cacheTs = 0;
const CACHE_TTL = 25 * 60 * 1000; // 25 min

function cacheValido() {
  return _cache && (Date.now() - _cacheTs) < CACHE_TTL;
}

// ── Abre browser ──────────────────────────────────────────────
async function abrirBrowser() {
  const chromium  = require('@sparticuz/chromium');
  const puppeteer = require('puppeteer-core');
  return puppeteer.launch({
    args           : chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath : await chromium.executablePath(),
    headless       : chromium.headless,
  });
}

// ── Espera por seletor com fallback ──────────────────────────
async function waitFor(page, sels, timeout = 10000) {
  for (const sel of sels) {
    try {
      await page.waitForSelector(sel, { timeout });
      const el = await page.$(sel);
      if (el) return el;
    } catch (_) {}
  }
  return null;
}

// ── Login principal ───────────────────────────────────────────
async function fazerLogin(page, login, senha) {
  const log = [];
  page.setDefaultNavigationTimeout(30000);

  // Bloqueia recursos pesados
  await page.setRequestInterception(true);
  page.on('request', req => {
    const rt = req.resourceType();
    ['image', 'stylesheet', 'font', 'media'].includes(rt)
      ? req.abort()
      : req.continue();
  });

  // 1. Acessa o site CAPES
  log.push('→ Acessando catalogodeteses.capes.gov.br');
  await page.goto(
    'https://catalogodeteses.capes.gov.br/catalogo-teses/',
    { waitUntil: 'domcontentloaded', timeout: 20000 }
  );
  log.push(`   URL: ${page.url().slice(0, 80)}`);

  // 2. Clica no botão de login — tenta vários seletores
  const loginSelectors = [
    'a[href*="login"]',
    'a[href*="#!/login"]',
    'a[routerlink*="login"]',
    'button.login',
    '.btn-login',
    '#btn-login',
    'a[class*="login"]',
    'a[class*="entrar"]',
    'button[class*="login"]',
    'li a[href*="login"]',
  ];

  let clicou = false;
  for (const sel of loginSelectors) {
    const el = await page.$(sel);
    if (el) {
      log.push(`→ Clicando login: ${sel}`);
      try {
        await Promise.all([
          page.waitForNavigation({ timeout: 12000, waitUntil: 'domcontentloaded' }),
          el.click(),
        ]);
        clicou = true;
        break;
      } catch (_) {}
    }
  }

  if (!clicou) {
    // Tenta navegar direto para a URL de login do SPA
    log.push('→ Botão não encontrado, navegando direto');
    try {
      await page.goto(
        'https://catalogodeteses.capes.gov.br/catalogo-teses/#!/login',
        { waitUntil: 'domcontentloaded', timeout: 10000 }
      );
    } catch (_) {}
  }

  log.push(`   URL após login click: ${page.url().slice(0, 80)}`);

  // 3. Preenche fluxo gov.br se redirecionou
  const url = page.url();
  const ehGovBr = url.includes('acesso.gov.br') || url.includes('sso.')
               || url.includes('login') || url.includes('oauth');

  if (ehGovBr) {
    log.push('→ Fluxo gov.br detectado — preenchendo CPF');

    // Campo CPF (vários nomes possíveis)
    const cpfInput = await waitFor(page, [
      'input[name="cpf"]',
      'input[id="cpf"]',
      'input[id="accountName"]',
      'input[autocomplete="username"]',
      'input[type="text"]',
    ]);

    if (!cpfInput) throw new Error('Campo CPF não encontrado na página gov.br');
    await cpfInput.click({ clickCount: 3 });
    await cpfInput.type(login, { delay: 40 });
    log.push('   CPF preenchido');

    // Botão próximo / continuar
    const proximoBtn = await waitFor(page, [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[id*="submit"]',
      'button[class*="continuar"]',
      'button[class*="proximo"]',
      '#submit-button',
    ]);
    if (proximoBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => {}),
        proximoBtn.click(),
      ]);
    }

    log.push(`   URL após CPF: ${page.url().slice(0, 80)}`);

    // Campo senha
    log.push('→ Preenchendo senha');
    const senhaInput = await waitFor(page, [
      'input[type="password"]',
      'input[name="senha"]',
      'input[id="senha"]',
      'input[name="password"]',
    ], 8000);

    if (!senhaInput) throw new Error('Campo de senha não encontrado');
    await senhaInput.click({ clickCount: 3 });
    await senhaInput.type(senha, { delay: 40 });
    log.push('   Senha preenchida');

    // Submit
    const submitBtn = await waitFor(page, [
      'button[type="submit"]',
      'input[type="submit"]',
      'button[id*="entrar"]',
      'button[class*="entrar"]',
      '#submit-button',
    ]);
    if (submitBtn) {
      await Promise.all([
        page.waitForNavigation({ timeout: 15000, waitUntil: 'domcontentloaded' }).catch(() => {}),
        submitBtn.click(),
      ]);
    }
  }

  // 4. Aguarda 2s e captura estado
  await new Promise(r => setTimeout(r, 2000));
  const urlFinal = page.url();
  const cookies  = await page.cookies();
  log.push(`→ URL final: ${urlFinal.slice(0, 80)}`);
  log.push(`→ Cookies capturados: ${cookies.length}`);

  // 5. Tenta capturar token do storage
  let token = null;
  try {
    token = await page.evaluate(() =>
      localStorage.getItem('token') ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('jwt') ||
      sessionStorage.getItem('token') ||
      null
    );
  } catch (_) {}

  const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
  return { cookieStr, token, cookieCount: cookies.length, urlFinal, log };
}

// ── Função pública: obtém sessão (com cache) ──────────────────
async function obterSessaoCAPES() {
  if (cacheValido()) {
    console.log('[CAPES/browser] usando cache de sessão');
    return _cache;
  }

  const login = process.env.CAPES_LOGIN;
  const senha = process.env.CAPES_SENHA;
  if (!login || !senha) {
    throw new Error('CAPES_LOGIN / CAPES_SENHA não configurados');
  }

  console.log('[CAPES/browser] abrindo browser para login...');
  const browser = await abrirBrowser();
  try {
    const page    = await browser.newPage();
    const sessao  = await fazerLogin(page, login, senha);
    sessao.log.forEach(l => console.log('[CAPES/browser]', l));

    if (!sessao.cookieStr) {
      throw new Error('Nenhum cookie capturado');
    }

    _cache   = sessao;
    _cacheTs = Date.now();
    console.log(`[CAPES/browser] ✓ sessão obtida — ${sessao.cookieCount} cookies`);
    return sessao;
  } finally {
    await browser.close();
  }
}

// ── Busca CAPES com sessão autenticada ────────────────────────
async function buscarCAPES(q, anoMin, anoMax, MAX_PAGES, PER_REQ, norm15, okAno, anoFrom, S, limparKW, POST) {
  const sessao = await obterSessaoCAPES();
  const { cookieStr, token } = sessao;

  const out = [];
  const anoAtual = new Date().getFullYear();
  const BASE = 'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca';
  const anoFiltro = anoMin ? [`anoDaDefesa:${anoMin}-${anoAtual}`] : [];

  const H = {
    'Content-Type': 'application/json',
    'Cookie'      : cookieStr,
    'Origin'      : 'https://catalogodeteses.capes.gov.br',
    'Referer'     : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
    'User-Agent'  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  };
  if (token) H['Authorization'] = `Bearer ${token}`;

  const payloads = [
    { filtros: anoFiltro, pesquisa: q,       pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, assunto: q,        pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoPesquisa: q,  pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, q],            pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, q,                pagina: 1, tamanho: 5 },
  ];

  let workingFmt = null, workingData = null;
  for (const fmt of payloads) {
    try {
      const { data, status } = await POST(BASE, fmt, H, 12000);
      if (status !== 200) continue;
      const total = parseInt(data?.total || 0);
      const items = data?.tesesDissertacoes || data?.teses || [];
      if (total > 0 && total < 100000 && items.length > 0) {
        workingFmt  = fmt;
        workingData = data;
        console.log(`[CAPES/browser] ✓ busca ok — total=${total}`);
        break;
      }
      if (total >= 100000) {
        console.warn('[CAPES/browser] query ainda ignorada com cookies — sessão pode não ter permissão');
      }
    } catch (_) {}
  }

  if (!workingFmt || !workingData) {
    // Invalida cache para forçar novo login na próxima tentativa
    _cache = null;
    throw new Error('Busca falhou mesmo com sessão autenticada');
  }

  const processItem = (it) => {
    const ano = anoFrom(S(it.anoDaDefesa || it.ano || it.anoProgramaDefesa || ''));
    if (!okAno(ano, anoMin, anoMax)) return;
    let autor = Array.isArray(it.autores)
      ? it.autores.map(x => typeof x === 'string' ? x.trim() : S(x.nome||x.name||x)).filter(Boolean).join('; ')
      : S(it.nmAutor||it.nomeAutor||it.autor||it.autores||'');
    const link = (it.idTese||it.id) ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese||it.id}` : '';
    const rec = norm15({
      repositorio:'CAPES', link_capes:link, link_scielo:'',
      titulo_do_periodico:S(it.titulo||it.title||it.nmTitulo||''),
      autor, ano_da_publicacao:ano,
      titulacao:S(it.grau||it.nivel||it.nmGrau||it.tipoProgramaAcademico||''),
      instituicao_programa:[S(it.siglaIes||it.nmIes||it.instituicao||''),S(it.nomePrograma||'')].filter(Boolean).join(' — '),
      municipio_programa:S(it.municipioPrograma||it.municipio||''),
      regiao:S(it.regiao||it.nmRegiao||''),
      resumo:S(it.resumo||it.abstract||it.dsResumo||''),
      palavras_chaves:Array.isArray(it.palavrasChave)?it.palavrasChave.join('; '):S(it.palavrasChave||''),
      revista:'', volume:'',
    });
    if (rec) out.push(rec);
  };

  (workingData.tesesDissertacoes||workingData.teses||[]).forEach(processItem);

  const totalDeclared = Math.min(parseInt(workingData.total||0), MAX_PAGES * PER_REQ);
  let page = 2;
  while (out.length < totalDeclared && page <= MAX_PAGES) {
    try {
      const { data, status } = await POST(BASE, { ...workingFmt, pagina:page, tamanho:PER_REQ }, H);
      if (status !== 200) break;
      const items = data?.tesesDissertacoes||data?.teses||[];
      if (!items.length) break;
      items.forEach(processItem);
      console.log(`[CAPES/browser] p${page}: +${items.length} → ${out.length}`);
      if (items.length < PER_REQ) break;
      page++;
    } catch (_) { break; }
  }

  console.log(`[CAPES/browser] ✓ ${out.length} registros`);
  return out;
}

module.exports = { obterSessaoCAPES, buscarCAPES };
