/**
 * GET /api/capes-auth?q=termo
 * Testa a autenticação CAPES usando as credenciais das variáveis de ambiente.
 * Mostra qual endpoint de login funciona e quais campos a API retorna.
 *
 * Configure no Vercel:
 *   CAPES_LOGIN  = seu CPF ou e-mail
 *   CAPES_SENHA  = sua senha
 */
const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const login = process.env.CAPES_LOGIN;
  const senha = process.env.CAPES_SENHA;
  const q     = req.query.q || 'projeto alvorada';

  if (!login || !senha) {
    return res.status(200).json({
      status: 'sem_credenciais',
      instrucoes: [
        '1. Acesse vercel.com → seu projeto → Settings → Environment Variables',
        '2. Adicione: CAPES_LOGIN = seu CPF (sem pontos/traços)',
        '3. Adicione: CAPES_SENHA = sua senha',
        '4. Clique em Save e faça um novo deploy (Redeploy)',
        '5. Acesse /api/capes-auth?q=reincidencia+criminal',
      ]
    });
  }

  const BASE_URL = 'https://catalogodeteses.capes.gov.br';
  const H = {
    'User-Agent'  : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
    'Accept'      : 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    Origin        : BASE_URL,
    Referer       : `${BASE_URL}/catalogo-teses/`,
  };

  const resultados = [];

  // ── Tenta diferentes endpoints de autenticação ──────────────
  const loginEndpoints = [
    { label: 'REST/autenticar', url: `${BASE_URL}/catalogo-teses/rest/autenticar`,           body: { login, senha } },
    { label: 'REST/login',      url: `${BASE_URL}/catalogo-teses/rest/login`,                body: { login, senha } },
    { label: 'REST/auth',       url: `${BASE_URL}/catalogo-teses/rest/auth`,                 body: { login, senha } },
    { label: 'REST/usuario',    url: `${BASE_URL}/catalogo-teses/rest/usuario/autenticar`,   body: { login, senha } },
    { label: 'REST/cpf/senha',  url: `${BASE_URL}/catalogo-teses/rest/autenticar`,           body: { cpf: login, senha } },
    { label: 'REST/email/pass', url: `${BASE_URL}/catalogo-teses/rest/login`,                body: { email: login, password: senha } },
    { label: 'REST/username',   url: `${BASE_URL}/catalogo-teses/rest/autenticar`,           body: { username: login, password: senha } },
  ];

  let token = null;
  let cookieStr = '';

  for (const ep of loginEndpoints) {
    try {
      const r = await axios.post(ep.url, ep.body, {
        timeout: 10000, headers: H, validateStatus: () => true,
        maxRedirects: 5,
      });

      const preview = typeof r.data === 'string' ? r.data.slice(0, 200) : JSON.stringify(r.data).slice(0, 200);
      const setCookie = r.headers['set-cookie'];
      const authHeader = r.headers['authorization'] || r.headers['x-auth-token'];
      const bodyToken = r.data?.token || r.data?.access_token || r.data?.jwt || r.data?.sessionToken;

      resultados.push({
        endpoint: ep.label,
        status: r.status,
        tem_token: !!bodyToken,
        tem_cookie: !!(setCookie && setCookie.length),
        tem_auth_header: !!authHeader,
        preview: preview.slice(0, 150),
      });

      // Captura o primeiro token/cookie que funcionar
      if ((r.status === 200 || r.status === 201) && (bodyToken || setCookie || authHeader)) {
        token = bodyToken || authHeader;
        if (setCookie) cookieStr = setCookie.join('; ');
        console.log(`[CAPES/auth] ✓ ${ep.label} | status: ${r.status}`);
        break;
      }
    } catch (e) {
      resultados.push({ endpoint: ep.label, status: 0, erro: e.message.slice(0, 80) });
    }
  }

  // ── Se tem autenticação, tenta a busca ──────────────────────
  let buscaResult = null;
  if (token || cookieStr) {
    const authH = { ...H };
    if (token) authH['Authorization'] = `Bearer ${token}`;
    if (cookieStr) authH['Cookie'] = cookieStr;

    try {
      const r = await axios.post(
        `${BASE_URL}/catalogo-teses/rest/busca`,
        { filtros: [], pesquisa: q, pagina: 1, tamanho: 5 },
        { timeout: 15000, headers: authH, validateStatus: () => true }
      );
      const total = parseInt(r.data?.total || r.data?.totalItens || 0);
      const items = r.data?.tesesDissertacoes || r.data?.teses || [];
      buscaResult = {
        status: r.status,
        total,
        query_aplicada: total < 100000,
        campos_disponiveis: items[0] ? Object.keys(items[0]) : [],
        primeiro_titulo: items[0]?.titulo || items[0]?.title || null,
        topKeys: Object.keys(r.data || {}).join(', '),
      };
    } catch (e) {
      buscaResult = { erro: e.message };
    }
  }

  res.status(200).json({
    timestamp: new Date().toISOString(),
    autenticacao_testada: loginEndpoints.length,
    autenticado: !!(token || cookieStr),
    token_obtido: !!token,
    cookie_obtido: !!cookieStr,
    resultados_login: resultados,
    busca_autenticada: buscaResult,
    proximos_passos: !token && !cookieStr
      ? ['Nenhum endpoint de login funcionou. Compartilhe o resultado com o desenvolvedor para identificar o endpoint correto.']
      : ['Autenticação OK! Veja busca_autenticada para confirmar se a query funciona agora.'],
  });
};
