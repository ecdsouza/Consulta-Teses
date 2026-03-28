/**
 * GET /api/debug
 * Testa cada fonte e retorna o status detalhado.
 * Use para diagnosticar quais APIs estão acessíveis do Vercel.
 */
const axios = require('axios');

const H = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept'         : 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};

async function probe(name, url, extraH = {}) {
  const t0 = Date.now();
  try {
    const r = await axios.get(url, {
      timeout: 12000,
      headers: { ...H, ...extraH },
      validateStatus: () => true,
    });
    const ms = Date.now() - t0;
    const ct = r.headers['content-type'] || '';
    let preview = '';
    try {
      const body = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
      preview = body.slice(0, 200);
    } catch (_) {}
    return { name, url, status: r.status, ms, contentType: ct, preview, ok: r.status === 200 };
  } catch (e) {
    return { name, url, status: 0, ms: Date.now() - t0, error: e.message, ok: false };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  const q = encodeURIComponent(req.query.q || 'educação');

  const resultados = await Promise.all([
    probe('BDTD/OAI',
      `https://bdtd.ibict.br/vufind/OAI/Server?verb=Search&query=${q}&queryType=AllFields&limit=3`),
    probe('BDTD/VuFind',
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${q}&type=AllFields&limit=3`),
    probe('CAPES/api',
      `https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca?q=${q}&filtros=&pagina=1&tamanho=3`,
      { Referer: 'https://catalogodeteses.capes.gov.br/catalogo-teses/', Origin: 'https://catalogodeteses.capes.gov.br' }),
    probe('CAPES/CKAN',
      `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=b7003093-4fab-4b88-b0fa-b7d8df0bcb77&q=${q}&limit=3`),
    probe('SciELO/search',
      `https://search.scielo.org/?q=${q}&lang=pt&count=3&from=0&output=json`),
    probe('SciELO/meta',
      `http://articlemeta.scielo.org/api/v1/article/?q=${q}&collection=scl&count=3`),
    probe('Crossref',
      `https://api.crossref.org/works?query=${q}&rows=3`,
      { 'User-Agent': 'RepositorioAcademico/8.0 (mailto:academico@repositorio.edu.br)' }),
  ]);

  const resumo = resultados.map(r => ({
    fonte   : r.name,
    ok      : r.ok,
    status  : r.status,
    ms      : r.ms,
    erro    : r.error || null,
    preview : r.preview ? r.preview.slice(0, 120) : null,
  }));

  res.status(200).json({
    timestamp: new Date().toISOString(),
    query    : req.query.q || 'educação',
    fontes   : resumo,
    ok_count : resumo.filter(r => r.ok).length,
  });
};
