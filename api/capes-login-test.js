/**
 * GET /api/capes-login-test?q=termo
 * Testa login Puppeteer passo a passo.
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const q = req.query.q || 'reincidência criminal';
  const resultado = { timestamp: new Date().toISOString(), query: q, etapas: [], sucesso: false };

  const login = process.env.CAPES_LOGIN;
  const senha = process.env.CAPES_SENHA;

  resultado.etapas.push({
    etapa:'1 — Credenciais',
    login: login ? login.slice(0,3)+'****'+login.slice(-2):'❌ NÃO DEFINIDO',
    senha: senha ? '*'.repeat(senha.length):'❌ NÃO DEFINIDO',
    ok: !!(login && senha),
  });

  if (!login || !senha) {
    resultado.erro = 'Configure CAPES_LOGIN e CAPES_SENHA no Vercel';
    return res.status(200).json(resultado);
  }

  try {
    resultado.etapas.push({ etapa:'2 — Verificando puppeteer-core' });
    try {
      require('@sparticuz/chromium');
      require('puppeteer-core');
      resultado.etapas[1].ok = true;
    } catch(e) {
      resultado.etapas[1].ok = false;
      resultado.etapas[1].erro = e.message;
      resultado.etapas[1].dica = 'package.json precisa de puppeteer-core e @sparticuz/chromium — faça Redeploy';
      return res.status(200).json(resultado);
    }

    const { obterSessaoCAPES } = require('./capes-browser');
    const axios = require('axios');

    // Login
    resultado.etapas.push({ etapa:'3 — Login via browser' });
    const t0 = Date.now();
    let sessao;
    try {
      sessao = await obterSessaoCAPES();
      resultado.etapas[2] = {
        etapa:'3 — Login via browser',
        ok:true, ms:Date.now()-t0,
        cookies:sessao.cookieCount,
        tem_token:!!sessao.token,
        url_final:sessao.urlFinal?.slice(0,100),
        log:sessao.log,
      };
    } catch(e) {
      resultado.etapas[2] = { etapa:'3 — Login', ok:false, erro:e.message, ms:Date.now()-t0 };
      return res.status(200).json(resultado);
    }

    // Busca
    resultado.etapas.push({ etapa:'4 — Busca autenticada' });
    const t1 = Date.now();
    const H = {
      'Content-Type':'application/json',
      'Cookie':sessao.cookieStr,
      'Origin':'https://catalogodeteses.capes.gov.br',
      'Referer':'https://catalogodeteses.capes.gov.br/catalogo-teses/',
      'User-Agent':'Mozilla/5.0 Chrome/124.0',
    };
    if (sessao.token) H['Authorization'] = 'Bearer '+sessao.token;

    let buscaOk = false;
    const BASE = 'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca';
    for (const payload of [
      {filtros:[],pesquisa:q,pagina:1,tamanho:5},
      {filtros:[],assunto:q,pagina:1,tamanho:5},
      {filtros:[q],pagina:1,tamanho:5},
    ]) {
      try {
        const r = await axios.post(BASE, payload, { timeout:15000, headers:H, validateStatus:()=>true });
        const total = parseInt(r.data?.total||0);
        const items = r.data?.tesesDissertacoes||[];
        resultado.etapas[3] = {
          etapa:'4 — Busca autenticada', ok:total<100000&&total>0,
          ms:Date.now()-t1, status_http:r.status, total,
          query_aplicada:total<100000,
          payload:JSON.stringify(payload).slice(0,80),
          primeiro_titulo:items[0]?.titulo||null,
          primeira_ies:items[0]?.siglaIes||items[0]?.instituicao||null,
        };
        if (total>0&&total<100000){ buscaOk=true; break; }
      } catch(e) {
        resultado.etapas[3] = {etapa:'4 — Busca', ok:false, erro:e.message};
      }
    }

    resultado.sucesso = buscaOk;
    resultado.mensagem = buscaOk
      ? '✅ CAPES funcionando via browser session!'
      : '⚠️ Login ok mas busca retorna catálogo completo — sessão sem permissão textual.';

  } catch(e) {
    resultado.erro = e.message;
  }

  return res.status(200).json(resultado);
};
