/**
 * GET /api/debug?q=termo
 * Testa cada endpoint e mostra campos reais da resposta.
 */
const axios = require('axios');
const H = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept'         : 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
};
const OA_UA = 'RepositorioAcademico/12.0 (mailto:academico@repositorio.edu.br)';

async function probe(name, method, url, body, extraH = {}) {
  const t0 = Date.now();
  try {
    const cfg = { timeout: 15000, headers: { ...H, ...extraH }, validateStatus: () => true };
    const r   = method === 'POST' ? await axios.post(url, body, cfg) : await axios.get(url, cfg);
    const ms  = Date.now() - t0;
    let preview = '', topKeys = '';
    try {
      const d = r.data;
      const txt = typeof d === 'string' ? d : JSON.stringify(d);
      preview = txt.slice(0, 300);
      if (typeof d === 'object' && d !== null) topKeys = Object.keys(d).join(', ');
    } catch (_) {}
    return { name, url, method, status: r.status, ms, preview, topKeys, ok: r.status === 200 };
  } catch (e) {
    return { name, url, method, status: 0, ms: Date.now() - t0, error: e.message, ok: false };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query.q || 'educação';
  const qe = encodeURIComponent(q);

  const tests = await Promise.all([
    probe('BDTD/VuFind', 'GET',
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${qe}&type=AllFields&limit=5&page=1`),
    probe('CAPES/POST', 'POST',
      'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca',
      { query: q, filtros: [], pagina: 1, tamanho: 5 },
      { 'Content-Type':'application/json', Origin:'https://catalogodeteses.capes.gov.br', Referer:'https://catalogodeteses.capes.gov.br/catalogo-teses/' }),
    probe('SciELO/search', 'GET',
      `https://search.scielo.org/?q=${qe}&lang=pt&count=5&from=0&output=json`),
    probe('Crossref', 'GET',
      `https://api.crossref.org/works?query=${qe}&rows=5&filter=from-pub-date:2015`,
      null, { 'User-Agent': OA_UA }),
    probe('OpenAlex', 'GET',
      `https://api.openalex.org/works?search=${qe}&per-page=5&page=1`,
      null, { 'User-Agent': OA_UA }),
    probe('OpenAlex/BR', 'GET',
      `https://api.openalex.org/works?search=${qe}&filter=institutions.country_code:BR&per-page=5&page=1`,
      null, { 'User-Agent': OA_UA }),
  ]);

  res.status(200).json({
    timestamp: new Date().toISOString(), query: q,
    ok_count: tests.filter(t => t.ok).length,
    fontes: tests.map(t => ({
      fonte: t.name, method: t.method, ok: t.ok,
      status: t.status, ms: t.ms, erro: t.error || null,
      topKeys: t.topKeys || null,
      preview: t.preview ? t.preview.slice(0, 250) : null,
    })),
  });
};
