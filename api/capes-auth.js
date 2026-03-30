/**
 * GET /api/capes-auth?q=termo
 *
 * Diagnóstico completo de autenticação CAPES:
 * 1. Testa variáveis de ambiente (CAPES_LOGIN / CAPES_SENHA)
 * 2. Testa endpoint de login gov.br + CAPES
 * 3. Testa endpoint alternativo -backend/rest/busca
 * 4. Testa Dados Abertos CAPES (CKAN) com resource IDs reais
 * 5. Retorna instruções claras sobre próximos passos
 *
 * CONFIGURE NO VERCEL:
 *   CAPES_LOGIN = seu CPF (somente números) ou e-mail gov.br
 *   CAPES_SENHA = sua senha gov.br / CAPES
 */
const axios = require('axios');

const BASE      = 'https://catalogodeteses.capes.gov.br';
const DADOS_AB  = 'https://dadosabertos.capes.gov.br';
const H = {
  'User-Agent'  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept'      : 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9',
  'Content-Type': 'application/json',
  Origin        : BASE,
  Referer       : `${BASE}/catalogo-teses/`,
};

async function tryPost(url, body, extraH = {}, timeout = 10000) {
  try {
    const r = await axios.post(url, body, {
      timeout, headers: { ...H, ...extraH },
      validateStatus: () => true, maxRedirects: 5,
    });
    return r;
  } catch (e) {
    return { status: 0, data: null, headers: {}, _err: e.message };
  }
}
async function tryGet(url, extraH = {}, timeout = 10000) {
  try {
    const r = await axios.get(url, {
      timeout, headers: { 'User-Agent': H['User-Agent'], 'Accept': H.Accept, ...extraH },
      validateStatus: () => true, maxRedirects: 5,
    });
    return r;
  } catch (e) {
    return { status: 0, data: null, headers: {}, _err: e.message };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const q     = req.query.q || 'reincidência criminal';
  const login = process.env.CAPES_LOGIN || '';
  const senha = process.env.CAPES_SENHA || '';
  const temCred = !!(login && senha);

  const resultado = {
    timestamp       : new Date().toISOString(),
    query           : q,
    credenciais_ok  : temCred,
    login_mascarado : temCred ? login.slice(0, 3) + '****' + login.slice(-2) : '(não definido)',
    etapas          : [],
    autenticado     : false,
    token           : null,
    cookie          : null,
    busca_funcionou : false,
    total_encontrado: 0,
    registros_amostra: [],
    instrucoes      : [],
  };

  // ── Etapa 1: verifica env vars ──────────────────────────────
  resultado.etapas.push({
    etapa    : '1 — Variáveis de ambiente',
    CAPES_LOGIN: login ? `${login.slice(0,3)}****${login.slice(-2)} (${login.length} chars)` : '❌ NÃO DEFINIDA',
    CAPES_SENHA: senha ? `${'*'.repeat(senha.length)} (${senha.length} chars)` : '❌ NÃO DEFINIDA',
  });

  if (!temCred) {
    resultado.instrucoes = [
      '1. Acesse: vercel.com → seu projeto → Settings → Environment Variables',
      '2. Adicione: CAPES_LOGIN = CPF (só números, ex: 08303458680)',
      '3. Adicione: CAPES_SENHA = senha do gov.br ou conta CAPES',
      '4. Clique Save → Deployments → Redeploy',
      '5. Acesse /api/capes-auth?q=reincidência+criminal novamente',
    ];
    return res.status(200).json(resultado);
  }

  // ── Etapa 2: testa todos os endpoints de login ──────────────
  const loginEndpoints = [
    // Formatos mais prováveis para o CAPES
    { label: 'autenticar {login,senha}',    url: `${BASE}/catalogo-teses/rest/autenticar`,            body: { login, senha } },
    { label: 'autenticar {cpf,senha}',      url: `${BASE}/catalogo-teses/rest/autenticar`,            body: { cpf: login, senha } },
    { label: 'autenticar {cpf,password}',   url: `${BASE}/catalogo-teses/rest/autenticar`,            body: { cpf: login, password: senha } },
    { label: 'login {login,senha}',         url: `${BASE}/catalogo-teses/rest/login`,                 body: { login, senha } },
    { label: 'login {email,password}',      url: `${BASE}/catalogo-teses/rest/login`,                 body: { email: login, password: senha } },
    { label: 'usuario/autenticar',          url: `${BASE}/catalogo-teses/rest/usuario/autenticar`,    body: { login, senha } },
    { label: 'auth {username,password}',    url: `${BASE}/catalogo-teses/rest/auth`,                  body: { username: login, password: senha } },
    { label: 'backend/autenticar',          url: `${BASE}/catalogo-teses-backend/rest/autenticar`,    body: { login, senha } },
    { label: 'backend/login',              url: `${BASE}/catalogo-teses-backend/rest/login`,          body: { login, senha } },
  ];

  const loginResults = [];
  let authToken = null, authCookie = '';

  for (const ep of loginEndpoints) {
    const r = await tryPost(ep.url, ep.body, {}, 8000);
    const setCookies = r.headers?.['set-cookie'] || [];
    const bodyToken  = r.data?.token || r.data?.access_token || r.data?.jwt || r.data?.sessionToken;
    const headToken  = r.headers?.['authorization'] || r.headers?.['x-auth-token'];
    const token      = bodyToken || headToken;
    const cookie     = setCookies.join('; ');
    const preview    = typeof r.data === 'object' ? JSON.stringify(r.data).slice(0, 120) : String(r.data || '').slice(0, 120);

    loginResults.push({
      endpoint  : ep.label,
      status    : r.status,
      tem_token : !!token,
      tem_cookie: !!cookie,
      preview   : r._err ? `ERRO: ${r._err}` : preview,
    });

    if ((r.status === 200 || r.status === 201) && (token || cookie)) {
      authToken  = token || null;
      authCookie = cookie;
      resultado.autenticado = true;
      resultado.token  = token ? token.slice(0, 30) + '…' : null;
      resultado.cookie = cookie ? cookie.slice(0, 60) + '…' : null;
      console.log(`[CAPES/auth] ✓ ${ep.label}`);
      break;
    }
  }

  resultado.etapas.push({
    etapa  : '2 — Tentativas de login',
    tentativas: loginResults,
    resultado: resultado.autenticado ? '✅ Autenticado' : '❌ Nenhum endpoint aceitou as credenciais',
  });

  // ── Etapa 3: testa busca com auth (se autenticado) ──────────
  if (resultado.autenticado) {
    const authH = {};
    if (authToken)  authH['Authorization'] = `Bearer ${authToken}`;
    if (authCookie) authH['Cookie']         = authCookie;

    const buscaPayloads = [
      { filtros: [], pesquisa: q,      pagina: 1, tamanho: 5 },
      { filtros: [], assunto: q,       pagina: 1, tamanho: 5 },
      { filtros: [], textoPesquisa: q, pagina: 1, tamanho: 5 },
    ];

    for (const payload of buscaPayloads) {
      const r = await tryPost(`${BASE}/catalogo-teses/rest/busca`, payload, authH, 15000);
      const total = parseInt(r.data?.total || 0);
      const items = r.data?.tesesDissertacoes || r.data?.teses || [];

      if (total > 0 && total < 100000 && items.length > 0) {
        resultado.busca_funcionou = true;
        resultado.total_encontrado = total;
        resultado.registros_amostra = items.slice(0, 3).map(it => ({
          titulo: it.titulo || it.title,
          ano   : it.anoDaDefesa || it.ano,
          ies   : it.siglaIes || it.instituicao,
        }));
        resultado.etapas.push({
          etapa: '3 — Busca autenticada',
          status: r.status, total, query_aplicada: true,
          payload_usado: JSON.stringify(payload).slice(0, 80),
          amostra: resultado.registros_amostra,
        });
        break;
      } else {
        resultado.etapas.push({
          etapa: '3 — Busca autenticada',
          status: r.status, total,
          query_aplicada: total < 100000,
          obs: total >= 100000 ? 'query ignorada (total = catálogo completo)' : 'zero resultados',
        });
      }
    }
  }

  // ── Etapa 4: Dados Abertos CAPES (independente de auth) ─────
  // Resource IDs conhecidos do catálogo de teses
  const dadosAbertosResources = [
    { id: 'b7003093-4fab-4b88-b0fa-b7d8df0bcb77', label: 'Catálogo Teses 2017-2020' },
    { id: '2ead2a90-26e9-4c38-bb14-9e01d89c1fe4', label: 'Catálogo Teses 2013-2016' },
    { id: 'dc2568b4-4f95-4f88-9914-e3b23e2e0e61', label: 'Catálogo Teses (alternativo)' },
    { id: '5502e8f6-db7c-4234-b3b6-b93b7bede4f7', label: 'Teses e Dissertações BR' },
  ];

  const dadosResults = [];
  for (const res_item of dadosAbertosResources) {
    const url = `${DADOS_AB}/api/3/action/datastore_search?resource_id=${res_item.id}&q=${encodeURIComponent(q)}&limit=3`;
    const r = await tryGet(url, {}, 10000);
    const total   = r.data?.result?.total;
    const records = r.data?.result?.records || [];
    const campos  = records[0] ? Object.keys(records[0]).join(', ') : null;
    dadosResults.push({
      resource: res_item.label,
      id      : res_item.id,
      status  : r.status,
      total   : total ?? (r._err ? `ERRO: ${r._err}` : 'N/A'),
      registros: records.length,
      campos  : campos,
      amostra : records[0]?.NM_TITULO || records[0]?.DS_TITULO || records[0]?.TITULO || null,
    });
  }
  resultado.etapas.push({ etapa: '4 — Dados Abertos CAPES (CKAN)', resultados: dadosResults });

  // ── Instruções finais ────────────────────────────────────────
  if (resultado.busca_funcionou) {
    resultado.instrucoes = [
      '✅ CAPES funcionando com autenticação!',
      `Total encontrado para "${q}": ${resultado.total_encontrado}`,
      'O portal já está usando as credenciais automaticamente.',
    ];
  } else if (resultado.autenticado) {
    resultado.instrucoes = [
      '⚠️ Login funcionou mas a busca ainda ignora a query.',
      'Isso significa que a API REST pública não suporta busca textual mesmo com auth.',
      'Próximo passo: verificar se os Dados Abertos CAPES retornaram resultados (Etapa 4).',
      'Se sim, o código será adaptado para usar o CKAN em vez do endpoint REST.',
    ];
  } else {
    resultado.instrucoes = [
      '❌ Autenticação falhou. Verifique:',
      `1. CAPES_LOGIN correto: "${resultado.login_mascarado}"`,
      '2. A senha é a mesma usada em catalogodeteses.capes.gov.br',
      '3. Tente fazer login manual no site e confirme que a senha está correta',
      '4. Se usa gov.br para entrar no CAPES, a API REST pode não suportar esse fluxo',
      '5. Compartilhe o resultado desta página com o desenvolvedor',
    ];
  }

  return res.status(200).json(resultado);
};
