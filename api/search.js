/**
 * REPOSITÓRIO ACADÊMICO v9
 * ─────────────────────────────────────────────────────────────────
 * Correções v9:
 *  ✅ BDTD: masterThesis → Dissertação de Mestrado
 *  ✅ BDTD: doctoralThesis → Tese de Doutorado
 *  ✅ BDTD: palavras-chave limitadas e limpas (sem duplicatas)
 *  ✅ BDTD: resumo usa o mais longo e limpo
 *  ✅ Todas as fontes: dados normalizados e limpos
 *  ✅ source_errors para diagnóstico
 */

const axios  = require('axios');
const xml2js = require('xml2js');

function setCORS(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const H = {
  'User-Agent'     : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Accept'         : 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Cache-Control'  : 'no-cache',
};

async function GET(url, extra = {}) {
  return axios.get(url, {
    timeout      : 15000,
    headers      : { ...H, ...extra },
    validateStatus: s => s < 500,
  });
}

// ════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════════════════════════

function S(v) {
  try {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string')  return v.trim();
    if (typeof v === 'number')  return String(v);
    if (Array.isArray(v))       return v.map(S).filter(Boolean).join('; ');
    if (typeof v === 'object') {
      if (typeof v._ === 'string') return v._.trim();
      for (const k of ['name','nome','full_name','label','value','text','title','content']) {
        if (typeof v[k] === 'string' && v[k].trim()) return v[k].trim();
      }
      const prims = Object.values(v).filter(x => typeof x === 'string' || typeof x === 'number');
      if (prims.length) return prims.map(String).join(' ').trim();
      return Object.values(v).map(S).filter(Boolean).join(' ').trim();
    }
    return String(v).trim();
  } catch (_) { return ''; }
}

// Normaliza titulação — converte valores raw das APIs para texto legível
function normTitulacao(raw) {
  const s = S(raw).toLowerCase().trim();
  if (!s) return '';
  if (s === 'masterthesis'    || s.includes('mestrado') || s.includes('master')) return 'Dissertação de Mestrado';
  if (s === 'doctoralthesis'  || s.includes('doutorado') || s.includes('doctor') || s.includes('phd')) return 'Tese de Doutorado';
  if (s === 'bachelorthesisss'|| s.includes('graduação') || s.includes('monografia')) return 'Monografia de Graduação';
  if (s.includes('artigo')    || s.includes('article') || s === 'journal-article') return 'Artigo Científico';
  if (s.includes('tese'))     return 'Tese de Doutorado';
  if (s.includes('disserta'))  return 'Dissertação de Mestrado';
  // Capitaliza primeira letra e retorna
  return S(raw).charAt(0).toUpperCase() + S(raw).slice(1);
}

// Normaliza classificação baseada na titulação
function normClassificacao(tit) {
  const s = tit.toLowerCase();
  if (s.includes('doutorado') || s.includes('doctor')) return 'Tese de Doutorado';
  if (s.includes('mestrado')  || s.includes('master'))  return 'Dissertação de Mestrado';
  if (s.includes('artigo')    || s.includes('article'))  return 'Artigo Científico';
  if (s.includes('monografia'))                          return 'Monografia de Graduação';
  return tit || 'Trabalho Acadêmico';
}

// Limpa e deduplica palavras-chave
function limparKW(raw, maxItems = 8) {
  if (!raw) return '';
  return [...new Set(
    raw.split(/[;,|]+/)
      .map(p => p.trim())
      .filter(p => p.length > 2 && p.length < 100)
      .filter(p => !/^\d+$/.test(p))  // remove apenas números
  )].slice(0, maxItems).join('; ');
}

function seletor(kw) {
  if (!kw) return '';
  return kw.split(';').map(p => p.trim()).filter(p => p.length > 3).slice(0, 3).join('; ');
}

function parseAutores(raw) {
  try {
    if (!raw) return '';
    if (typeof raw === 'string') return raw.trim();
    if (Array.isArray(raw)) {
      return raw.map(a => {
        if (!a) return '';
        if (typeof a === 'string') return a.trim();
        if (a.given_names || a.surname) return [a.given_names||'', a.surname||''].filter(Boolean).join(' ');
        if (a.given || a.family)        return [a.given||'', a.family||''].filter(Boolean).join(' ');
        if (typeof a.name === 'string') return a.name.trim();
        return S(a);
      }).filter(Boolean).join('; ');
    }
    if (typeof raw === 'object') {
      const nomes = [];
      if (raw.primary   && typeof raw.primary   === 'object') nomes.push(...Object.keys(raw.primary));
      if (raw.secondary && typeof raw.secondary === 'object') {
        Object.keys(raw.secondary).forEach(k => { if (!nomes.includes(k)) nomes.push(k); });
      }
      if (nomes.length) return nomes.join('; ');
      const keys = Object.keys(raw).filter(k => !['_','$','role','type'].includes(k));
      if (keys.length) return keys.join('; ');
      return S(raw);
    }
    return S(raw);
  } catch (_) { return ''; }
}

function DC(meta, key) {
  try {
    const v = meta[key];
    if (!v) return '';
    return Array.isArray(v) ? v.map(S).filter(Boolean).join('; ') : S(v);
  } catch (_) { return ''; }
}

function longestText(arr) {
  try {
    if (!arr || !arr.length) return '';
    return arr.map(S).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
  } catch (_) { return ''; }
}

function anoFrom(v) {
  try {
    const s = S(v);
    const m = s.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : (s.length >= 4 ? s.slice(0, 4) : s);
  } catch (_) { return ''; }
}

function norm(o) {
  const kw  = limparKW(S(o.palavras_chaves));
  const tit = normTitulacao(o.titulacao);
  return {
    repositorio            : S(o.repositorio),
    link_capes             : S(o.link_capes),
    link_scielo            : S(o.link_scielo),
    revista                : S(o.revista),
    classificacao          : normClassificacao(tit || S(o.classificacao)),
    ano_da_publicacao      : S(o.ano_da_publicacao),
    volume                 : S(o.volume),
    titulo_do_periodico    : S(o.titulo_do_periodico),
    resumo                 : S(o.resumo),
    palavras_chaves        : kw,
    seletor_palavras_chaves: seletor(kw),
    autor                  : S(o.autor),
    titulacao              : tit,
    instituicao_programa   : S(o.instituicao_programa),
    regiao                 : S(o.regiao),
  };
}

function okAno(anoStr, anoMin) {
  if (!anoMin || !anoStr) return true;
  const a = parseInt(anoStr);
  return !isNaN(a) && a >= anoMin;
}

// ════════════════════════════════════════════════════════════
//  BDTD
// ════════════════════════════════════════════════════════════
async function searchBDTD(q, anoMin, errors) {
  const out = [];

  // OAI-PMH (campos DC completos)
  try {
    const { data, status } = await GET(
      `https://bdtd.ibict.br/vufind/OAI/Server?verb=Search&query=${encodeURIComponent(q)}&queryType=AllFields&limit=25`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const parsed  = await new xml2js.Parser({ explicitArray: true, trim: true }).parseStringPromise(data);
    const records = parsed?.['OAI-PMH']?.[0]?.ListRecords?.[0]?.record || [];
    console.log('[BDTD/OAI]', records.length);

    for (const rec of records) {
      const dc     = rec?.metadata?.[0]?.['oai_dc:dc']?.[0] || {};
      const titulo = DC(dc, 'dc:title');
      if (!titulo) continue;

      const datas = (dc['dc:date'] || []).map(S).filter(Boolean);
      const a     = anoFrom(datas.find(d => /\d{4}/.test(d)) || datas[0] || '');
      if (!okAno(a, anoMin)) continue;

      // Titulação: normaliza masterThesis, doctoralThesis, etc.
      const tipos = (dc['dc:type'] || []).map(S).filter(Boolean);
      const titRaw = tipos.find(t => /thesis|tese|disserta|mestrado|doutorado/i.test(t)) || tipos[0] || '';

      // Palavras-chave: limpa e deduplica
      const kwRaw = (dc['dc:subject'] || []).map(S).filter(Boolean).join('; ');
      const kw    = limparKW(kwRaw, 7);

      // Resumo: pega o mais longo (dc:description pode ter múltiplos)
      const descs  = (dc['dc:description'] || []).map(S).filter(Boolean);
      const resumo = descs.sort((a, b) => b.length - a.length)[0] || '';

      // Instituição: dc:publisher
      const inst = DC(dc, 'dc:publisher');

      // Link: primeiro identifier com http
      const ids  = (dc['dc:identifier'] || []).map(S).filter(Boolean);
      const link = ids.find(u => /^https?:\/\//.test(u)) || '';

      out.push(norm({
        repositorio: 'BDTD', link_capes: link,
        titulo_do_periodico: titulo,
        autor               : DC(dc, 'dc:creator'),
        ano_da_publicacao   : a,
        resumo, palavras_chaves: kw,
        titulacao           : titRaw,
        instituicao_programa: inst,
        classificacao       : titRaw,
        link_scielo: '', revista: '', volume: '', regiao: '',
      }));
    }

    if (out.length) return out;
  } catch (e) {
    errors.push({ fonte: 'BDTD/OAI', erro: e.message });
    console.warn('[BDTD/OAI]', e.message);
  }

  // VuFind REST (fallback)
  try {
    const { data, status } = await GET(
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=1&limit=25`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const records = data?.records || [];
    console.log('[BDTD/VuFind]', records.length);

    for (const r of records) {
      const titulo = S(r.title || r.cleanTitle || r.shortTitle);
      if (!titulo) continue;
      const a = anoFrom(S((Array.isArray(r.publicationDates) && r.publicationDates[0]) || r.year || ''));
      if (!okAno(a, anoMin)) continue;

      // Limita subjects — VuFind pode retornar muitos
      const kwRaw = Array.isArray(r.subjects) ? r.subjects.flat().map(S).filter(Boolean).join('; ') : '';
      const kw    = limparKW(kwRaw, 7);

      const tit    = S((Array.isArray(r.formats) && r.formats[0]) || '') || '';
      const link   = (Array.isArray(r.urls) && r.urls[0]) ? (r.urls[0].url || S(r.urls[0])) : '';
      const inst   = S((Array.isArray(r.institutions) && r.institutions[0]) || (Array.isArray(r.publishers) && r.publishers[0]) || '');
      const resumo = S((Array.isArray(r.summary) && r.summary[0]) || '');

      out.push(norm({
        repositorio: 'BDTD', link_capes: link,
        titulo_do_periodico: titulo,
        autor               : parseAutores(r.authors),
        ano_da_publicacao   : a, resumo,
        palavras_chaves     : kw, titulacao: tit,
        instituicao_programa: inst, classificacao: tit,
        link_scielo: '', revista: '', volume: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'BDTD/VuFind', erro: e.message });
    console.warn('[BDTD/VuFind]', e.message);
  }

  return out;
}

// ════════════════════════════════════════════════════════════
//  CAPES
// ════════════════════════════════════════════════════════════
async function searchCAPES(q, anoMin, errors) {
  const out = [];
  const anoAtual = new Date().getFullYear();

  try {
    const { data, status } = await GET(
      `https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca?q=${encodeURIComponent(q)}&filtros=${encodeURIComponent('anoDaDefesa:' + anoMin + '-' + anoAtual)}&pagina=1&tamanho=20`,
      { Referer: 'https://catalogodeteses.capes.gov.br/catalogo-teses/', Origin: 'https://catalogodeteses.capes.gov.br' }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const items = data.teses || data.items || data.results || [];
    console.log('[CAPES/api]', items.length);

    for (const it of items) {
      const a = anoFrom(S(it.anoDaDefesa || it.ano));
      if (!okAno(a, anoMin)) continue;

      let autor = '';
      if (Array.isArray(it.autores)) {
        autor = it.autores.map(x => typeof x === 'string' ? x.trim() : S(x.nome || x.name || x)).filter(Boolean).join('; ');
      } else {
        autor = S(it.nmAutor || it.autor || it.autores);
      }

      const kw   = limparKW(Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || ''));
      const link = it.idTese ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese}` : '';
      const tit  = S(it.grau || it.nivel || it.nmGrau);

      out.push(norm({
        repositorio         : 'CAPES', link_capes: link,
        titulo_do_periodico : S(it.titulo || it.title || it.nmTitulo),
        autor, ano_da_publicacao: a, titulacao: tit,
        instituicao_programa: S(it.siglaIes || it.nmIes || it.instituicao || it.nmInstituicao),
        regiao              : S(it.regiao  || it.nmRegiao),
        resumo              : S(it.resumo  || it.abstract || it.dsResumo),
        palavras_chaves     : kw, classificacao: tit,
        link_scielo: '', revista: '', volume: '',
      }));
    }
    if (out.length) return out;
  } catch (e) {
    errors.push({ fonte: 'CAPES/api', erro: e.message });
    console.warn('[CAPES/api]', e.message);
  }

  try {
    const { data, status } = await GET(
      `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=b7003093-4fab-4b88-b0fa-b7d8df0bcb77&q=${encodeURIComponent(q)}&limit=20`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const records = data?.result?.records || [];
    console.log('[CAPES/CKAN]', records.length);

    for (const r of records) {
      const a = anoFrom(S(r.AN_BASE || r.AN_DEFESA));
      if (!okAno(a, anoMin)) continue;
      out.push(norm({
        repositorio         : 'CAPES',
        titulo_do_periodico : S(r.NM_TITULO || r.DS_TITULO),
        autor               : S(r.NM_AUTOR),
        ano_da_publicacao   : a, titulacao: S(r.NM_GRAU_ACADEMICO),
        instituicao_programa: [r.SG_IES, r.NM_IES].filter(Boolean).join(' — '),
        regiao              : S(r.NM_REGIAO),
        resumo              : S(r.DS_RESUMO),
        palavras_chaves     : limparKW(S(r.DS_PALAVRA_CHAVE)),
        classificacao       : S(r.NM_GRAU_ACADEMICO),
        link_scielo: '', link_capes: '', revista: '', volume: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'CAPES/CKAN', erro: e.message });
    console.warn('[CAPES/CKAN]', e.message);
  }

  return out;
}

// ════════════════════════════════════════════════════════════
//  SciELO
// ════════════════════════════════════════════════════════════
async function searchSciELO(q, anoMin, errors) {
  const out = [];

  try {
    const { data, status } = await GET(
      `https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=20&from=0&output=json`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const hits = data?.hits?.hits || [];
    console.log('[SciELO/search]', hits.length);

    for (const h of hits) {
      const src    = h._source || {};
      const titulo = src.ti_pt || src.ti_en || src.ti_es || S(src.ti);
      if (!titulo) continue;
      const a = anoFrom(S(src.da || src.year || src.dp));
      if (!okAno(a, anoMin)) continue;

      const kw = limparKW([
        ...(Array.isArray(src.wok_subject_categories) ? src.wok_subject_categories : []),
        ...(Array.isArray(src.mh)      ? src.mh      : []),
        ...(Array.isArray(src.keyword) ? src.keyword  : []),
      ].filter(Boolean).join('; '));

      out.push(norm({
        repositorio         : 'SciELO',
        link_scielo         : src.doi ? `https://doi.org/${src.doi}` : (Array.isArray(src.ur) ? src.ur[0] : S(src.ur)),
        titulo_do_periodico : titulo,
        revista             : S(src.ta || src.so || src.source),
        autor               : Array.isArray(src.au) ? src.au.join('; ') : S(src.au),
        ano_da_publicacao   : a, volume: S(src.vi || src.volume),
        resumo              : S(src.ab_pt || src.ab_en || src.ab_es || src.ab),
        palavras_chaves     : kw, classificacao: 'Artigo Científico',
        titulacao           : 'Artigo Científico',
        link_capes: '', instituicao_programa: '', regiao: '',
      }));
    }
    if (out.length) return out;
  } catch (e) {
    errors.push({ fonte: 'SciELO/search', erro: e.message });
    console.warn('[SciELO/search]', e.message);
  }

  try {
    const { data, status } = await GET(
      `http://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(q)}&collection=scl&count=20&offset=0`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const items = data.objects || [];
    console.log('[SciELO/meta]', items.length);

    for (const it of items) {
      const t   = it.titles    || {};
      const ab  = it.abstracts || {};
      const tit = t.pt || t.en || t.es || Object.values(t)[0] || '';
      if (!tit) continue;
      const a = anoFrom(S(it.publication_date || it.year));
      if (!okAno(a, anoMin)) continue;

      out.push(norm({
        repositorio         : 'SciELO',
        link_scielo         : it.doi ? `https://doi.org/${it.doi}` : '',
        titulo_do_periodico : tit,
        revista             : S(it.journal_title || it.source),
        autor               : (it.authors || []).map(x => [x.given_names, x.surname].filter(Boolean).join(' ')).join('; '),
        ano_da_publicacao   : a, volume: S(it.volume),
        resumo              : ab.pt || ab.en || ab.es || '',
        palavras_chaves     : limparKW(Object.values(it.keywords || {}).flat().map(S).join('; ')),
        classificacao: 'Artigo Científico', titulacao: 'Artigo Científico',
        link_capes: '', instituicao_programa: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'SciELO/meta', erro: e.message });
    console.warn('[SciELO/meta]', e.message);
  }

  return out;
}

// ════════════════════════════════════════════════════════════
//  CROSSREF
// ════════════════════════════════════════════════════════════
async function searchCrossref(q, anoMin, errors) {
  const out = [];
  try {
    const filtroAno = anoMin ? `&filter=from-pub-date:${anoMin}` : '';
    const { data, status } = await GET(
      `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=20${filtroAno}`,
      { 'User-Agent': 'RepositorioAcademico/9.0 (mailto:academico@repositorio.edu.br)' }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const items = data?.message?.items || [];
    console.log('[Crossref]', items.length);

    for (const it of items) {
      const titulo = Array.isArray(it.title) ? it.title[0] : S(it.title);
      if (!titulo) continue;
      const a = String(
        it.published?.['date-parts']?.[0]?.[0] ||
        it['published-print']?.['date-parts']?.[0]?.[0] ||
        it['published-online']?.['date-parts']?.[0]?.[0] || ''
      );
      if (!okAno(a, anoMin)) continue;

      const autor  = (it.author || []).map(x => [x.given, x.family].filter(Boolean).join(' ')).join('; ');
      const inst   = (it.author || []).flatMap(x => (x.affiliation || []).map(af => S(af.name))).filter(Boolean)[0] || '';
      const resumo = S(it.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const kw     = limparKW(Array.isArray(it.subject) ? it.subject.join('; ') : '');
      const revista = Array.isArray(it['container-title']) ? it['container-title'][0] : S(it['container-title']);

      out.push(norm({
        repositorio         : 'Crossref',
        link_scielo         : it.DOI ? `https://doi.org/${it.DOI}` : '',
        titulo_do_periodico : titulo,
        revista, autor, ano_da_publicacao: a,
        volume              : S(it.volume),
        resumo, palavras_chaves: kw,
        titulacao           : 'Artigo Científico',
        classificacao       : 'Artigo Científico',
        instituicao_programa: inst,
        link_capes: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'Crossref', erro: e.message });
    console.warn('[Crossref]', e.message);
  }
  return out;
}

// ════════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ erro: 'Método não permitido.' }); return; }

  const {
    q      = '',
    fontes = 'capes,scielo,bdtd,crossref',
    anoMin = '2015',
    anoMax = '',
  } = req.query;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ erro: 'Informe ao menos 2 caracteres.' });
    return;
  }

  const anoMinInt = parseInt(anoMin) || 2015;
  const errors    = [];
  console.log(`\n🔍 v9 | "${q}" | fontes: ${fontes} | anoMin: ${anoMinInt}`);

  const lista   = fontes.toLowerCase().split(',').map(f => f.trim());
  const tarefas = [];
  if (lista.includes('bdtd'))     tarefas.push(searchBDTD(q, anoMinInt, errors));
  if (lista.includes('capes'))    tarefas.push(searchCAPES(q, anoMinInt, errors));
  if (lista.includes('scielo'))   tarefas.push(searchSciELO(q, anoMinInt, errors));
  if (lista.includes('crossref')) tarefas.push(searchCrossref(q, anoMinInt, errors));

  const settled = await Promise.allSettled(tarefas);
  let todos = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  if (anoMax) {
    const mx = parseInt(anoMax);
    todos = todos.filter(r => !r.ano_da_publicacao || parseInt(r.ano_da_publicacao) <= mx);
  }

  const seen = new Set();
  const resultados = todos.filter(r => {
    const k = r.titulo_do_periodico.toLowerCase().replace(/\s+/g,' ').trim().slice(0, 80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  resultados.sort((a, b) => (parseInt(b.ano_da_publicacao)||0) - (parseInt(a.ano_da_publicacao)||0));

  const porFonte = {};
  resultados.forEach(r => { porFonte[r.repositorio] = (porFonte[r.repositorio] || 0) + 1; });

  console.log(`✅ v9 | ${resultados.length} únicos | por fonte:`, porFonte);
  if (errors.length) console.log('⚠️ Erros:', errors);

  res.status(200).json({
    versao: '9.0.0', query: q, anoMin: anoMinInt,
    total: resultados.length, por_fonte: porFonte,
    source_errors: errors, resultados,
  });
};
