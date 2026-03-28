/**
 * GET /api/debug?q=termo
 * Testa cada endpoint e retorna status detalhado.
 */
const axios = require('axios');

const H = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept'         : 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

async function probe(name, method, url, body, extraH = {}) {
  const t0 = Date.now();
  try {
    const cfg = { timeout: 12000, headers: { ...H, ...extraH }, validateStatus: () => true };
    const r   = method === 'POST'
      ? await axios.post(url, body, cfg)
      : await axios.get(url, cfg);
    const ms  = Date.now() - t0;
    let preview = '';
    try {
      const txt = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      preview = txt.slice(0, 200);
    } catch (_) {}
    return { name, url, method, status: r.status, ms, preview, ok: r.status === 200 };
  } catch (e) {
    return { name, url, method, status: 0, ms: Date.now() - t0, error: e.message, ok: false };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const q = req.query.q || 'educação';
  const qe = encodeURIComponent(q);

  const testes = await Promise.all([
    // BDTD — apenas VuFind (OAI está down)
    probe('BDTD/VuFind', 'GET',
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${qe}&type=AllFields&limit=5`),

    // CAPES — tenta POST (GET retorna 405)
    probe('CAPES/api-POST', 'POST',
      'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca',
      { query: q, filtros: [], pagina: 1, tamanho: 10 },
      { 'Content-Type':'application/json', Origin:'https://catalogodeteses.capes.gov.br', Referer:'https://catalogodeteses.capes.gov.br/catalogo-teses/' }),

    // CAPES — CKAN resource_id correto
    probe('CAPES/CKAN-v2', 'GET',
      `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=b7003093-4fab-4b88-b0fa-b7d8df0bcb77&q=${qe}&limit=5`),

    // CAPES — CKAN via package_search para achar resource_id válido
    probe('CAPES/CKAN-pkg', 'GET',
      `https://dadosabertos.capes.gov.br/api/3/action/package_search?q=teses+dissertacoes&rows=3`),

    // SciELO Search (funciona)
    probe('SciELO/search', 'GET',
      `https://search.scielo.org/?q=${qe}&lang=pt&count=5&from=0&output=json`),

    // Crossref (funciona)
    probe('Crossref', 'GET',
      `https://api.crossref.org/works?query=${qe}&rows=5&filter=from-pub-date:2015`,
      null, { 'User-Agent':'RepositorioAcademico/11.0 (mailto:academico@repo.edu.br)' }),

    // OpenAlex — nova fonte
    probe('OpenAlex', 'GET',
      `https://api.openalex.org/works?search=${qe}&per-page=5`,
      null, { 'User-Agent':'RepositorioAcademico/11.0 (mailto:academico@repo.edu.br)' }),

    // OpenAlex filtrado por Brasil
    probe('OpenAlex/BR', 'GET',
      `https://api.openalex.org/works?search=${qe}&filter=institutions.country_code:BR&per-page=5`,
      null, { 'User-Agent':'RepositorioAcademico/11.0 (mailto:academico@repo.edu.br)' }),
  ]);

  res.status(200).json({
    timestamp : new Date().toISOString(),
    query     : q,
    ok_count  : testes.filter(t => t.ok).length,
    fontes    : testes.map(t => ({
      fonte   : t.name,
      method  : t.method,
      ok      : t.ok,
      status  : t.status,
      ms      : t.ms,
      erro    : t.error || null,
      preview : t.preview ? t.preview.slice(0, 150) : null,
    })),
  });
};
