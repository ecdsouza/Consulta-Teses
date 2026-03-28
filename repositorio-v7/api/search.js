/**
 * REPOSITÓRIO ACADÊMICO v6 — search.js
 *
 * Colunas retornadas (15):
 * repositorio | link_capes | link_scielo | revista | classificacao |
 * ano_da_publicacao | volume | titulo_do_periodico | resumo |
 * palavras_chaves | seletor_palavras_chaves | autor | titulacao |
 * instituicao_programa | regiao
 */

const axios  = require('axios');
const xml2js = require('xml2js');

// ─── CORS ──────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ══════════════════════════════════════════════════════════════

/** Converte QUALQUER valor para string sem falhar nunca */
function S(v) {
  try {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string')  return v.trim();
    if (typeof v === 'number')  return String(v);
    if (Array.isArray(v))       return v.map(S).filter(Boolean).join('; ');
    if (typeof v === 'object') {
      // xml2js: { _: "texto", $: {...} }
      if (typeof v._ === 'string') return v._.trim();
      // campos de texto comuns
      for (const k of ['name','nome','full_name','label','value','text','title','content','string']) {
        if (typeof v[k] === 'string' && v[k].trim()) return v[k].trim();
      }
      // primitivos do objeto
      const prims = Object.values(v).filter(x => typeof x === 'string' || typeof x === 'number');
      if (prims.length) return prims.map(String).join(' ').trim();
      // recursão
      return Object.values(v).map(S).filter(Boolean).join(' ').trim();
    }
    return String(v).trim();
  } catch (_) { return ''; }
}

/**
 * Extrai autores garantido — lida com TODOS os formatos conhecidos:
 *
 * 1. String: "Silva, Kátia"
 * 2. Array de strings: ["Silva, Kátia", "Eggert, Edla"]
 * 3. Array de objetos SciELO: [{given_names:"Kátia", surname:"Silva"}, ...]
 * 4. Array de objetos Crossref: [{given:"K.", family:"Silva"}, ...]
 * 5. Array de objetos VuFind simples: [{name:"Silva, Kátia"}, ...]
 * 6. Objeto VuFind BDTD: {primary:{"Silva, Kátia":{role:[...]}}, secondary:{...}}
 */
function extrairAutores(raw) {
  try {
    if (!raw) return '';
    if (typeof raw === 'string') return raw.trim();

    // Array
    if (Array.isArray(raw)) {
      const nomes = raw.map(a => {
        if (!a) return '';
        if (typeof a === 'string') return a.trim();
        // SciELO format
        if (a.given_names || a.surname) {
          return [a.given_names || '', a.surname || ''].filter(Boolean).join(' ').trim();
        }
        // Crossref format
        if (a.given || a.family) {
          return [a.given || '', a.family || ''].filter(Boolean).join(' ').trim();
        }
        // VuFind simples
        if (typeof a.name === 'string') return a.name.trim();
        // Qualquer objeto
        return S(a);
      });
      return nomes.filter(Boolean).join('; ');
    }

    // Objeto VuFind BDTD: { primary: {"Nome Autor": {role:[...]}}, secondary: {...} }
    if (typeof raw === 'object') {
      const nomes = [];
      // Extrai nomes das chaves de primary e secondary
      if (raw.primary && typeof raw.primary === 'object' && !Array.isArray(raw.primary)) {
        nomes.push(...Object.keys(raw.primary));
      }
      if (raw.secondary && typeof raw.secondary === 'object' && !Array.isArray(raw.secondary)) {
        Object.keys(raw.secondary).forEach(k => {
          if (!nomes.includes(k)) nomes.push(k);
        });
      }
      if (nomes.length > 0) return nomes.join('; ');
      // Fallback: todas as chaves do objeto que não são _ ou $
      const keys = Object.keys(raw).filter(k => !['_','$','role','type'].includes(k));
      if (keys.length) return keys.join('; ');
      return S(raw);
    }
    return S(raw);
  } catch (_) { return ''; }
}

/** Extrai campo OAI-DC com explicitArray:true */
function DC(meta, key) {
  try {
    const v = meta[key];
    if (!v) return '';
    if (Array.isArray(v)) return v.map(S).filter(Boolean).join('; ');
    return S(v);
  } catch (_) { return ''; }
}

/** Pega o texto mais longo de um array */
function maisCurto(arr) {
  try {
    if (!arr || !arr.length) return '';
    return arr.map(S).filter(Boolean).sort((a, b) => b.length - a.length)[0] || '';
  } catch (_) { return ''; }
}

/** Extrai ano YYYY */
function ano(v) {
  try {
    const s = S(v);
    const m = s.match(/\b(19|20)\d{2}\b/);
    return m ? m[0] : (s.length >= 4 ? s.slice(0, 4) : s);
  } catch (_) { return S(v).slice(0, 4); }
}

/** 3 primeiras palavras-chave */
function seletor(kw) {
  if (!kw) return '';
  return kw.split(/[;,|]+/).map(p => p.trim()).filter(p => p.length > 3).slice(0, 3).join('; ');
}

/** Monta objeto final com 15 colunas */
function norm(o) {
  const kw = S(o.palavras_chaves);
  return {
    repositorio            : S(o.repositorio),
    link_capes             : S(o.link_capes),
    link_scielo            : S(o.link_scielo),
    revista                : S(o.revista),
    classificacao          : S(o.classificacao),
    ano_da_publicacao      : S(o.ano_da_publicacao),
    volume                 : S(o.volume),
    titulo_do_periodico    : S(o.titulo_do_periodico),
    resumo                 : S(o.resumo),
    palavras_chaves        : kw,
    seletor_palavras_chaves: seletor(kw),
    autor                  : S(o.autor),
    titulacao              : S(o.titulacao),
    instituicao_programa   : S(o.instituicao_programa),
    regiao                 : S(o.regiao),
  };
}

async function GET(url, extra = {}) {
  return axios.get(url, {
    timeout      : 15000,
    headers      : { ...H, ...extra },
    validateStatus: s => s < 500,
  });
}

// ══════════════════════════════════════════════════════════════
//  BDTD — OAI-PMH primeiro (dc: campos completos e limpos)
// ══════════════════════════════════════════════════════════════
async function searchBDTD(q) {
  const out = [];

  // Tentativa 1: OAI-PMH
  try {
    const { data, status } = await GET(
      `https://bdtd.ibict.br/vufind/OAI/Server?verb=Search&query=${encodeURIComponent(q)}&queryType=AllFields&limit=20`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const parsed  = await new xml2js.Parser({ explicitArray: true, trim: true }).parseStringPromise(data);
    const records = parsed?.['OAI-PMH']?.[0]?.ListRecords?.[0]?.record || [];
    console.log('[BDTD/OAI]', records.length, 'registros');

    for (const rec of records) {
      const dc = rec?.metadata?.[0]?.['oai_dc:dc']?.[0] || {};

      const titulo = DC(dc, 'dc:title');
      if (!titulo) continue;

      // dc:creator → autores (nomes separados por "; " pelo DC())
      const autor = DC(dc, 'dc:creator');

      // dc:description → resumo mais longo
      const resumo = maisCurto(dc['dc:description'] || []);

      // dc:subject → palavras-chave
      const kw = DC(dc, 'dc:subject');

      // dc:type → titulação
      const tipos = (dc['dc:type'] || []).map(S).filter(Boolean);
      const tit   = tipos.find(t => /disserta|tese|master|doctor|phd/i.test(t)) || tipos[0] || 'Tese/Dissertação';

      // dc:publisher → instituição
      const inst = DC(dc, 'dc:publisher');

      // dc:date → ano
      const datas = (dc['dc:date'] || []).map(S).filter(Boolean);
      const a     = ano(datas.find(d => /\d{4}/.test(d)) || datas[0] || '');

      // dc:identifier → link http
      const ids  = (dc['dc:identifier'] || []).map(S).filter(Boolean);
      const link = ids.find(u => /^https?:\/\//.test(u)) || '';

      out.push(norm({
        repositorio: 'BDTD', link_capes: link,
        titulo_do_periodico: titulo, autor,
        ano_da_publicacao: a, resumo, palavras_chaves: kw,
        titulacao: tit, instituicao_programa: inst, classificacao: tit,
        link_scielo: '', revista: '', volume: '', regiao: '',
      }));
    }

    if (out.length) {
      console.log('[BDTD/OAI] ✓', out.length, 'ok');
      return out;
    }
  } catch (e) { console.warn('[BDTD/OAI]', e.message); }

  // Tentativa 2: VuFind REST
  try {
    const { data, status } = await GET(
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=1&limit=20`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const records = data?.records || [];
    console.log('[BDTD/VuFind]', records.length, 'registros');
    if (records[0]) console.log('[BDTD/VuFind] authors sample:', JSON.stringify(records[0].authors).slice(0, 300));

    for (const r of records) {
      const titulo = S(r.title || r.cleanTitle || r.shortTitle);
      if (!titulo) continue;

      // ⚠️  USA extrairAutores() que lida com o objeto VuFind
      const autor = extrairAutores(r.authors);

      const kw     = Array.isArray(r.subjects) ? r.subjects.flat().map(S).filter(Boolean).join('; ') : '';
      const link   = Array.isArray(r.urls) && r.urls[0] ? (r.urls[0].url || S(r.urls[0])) : '';
      const inst   = S((Array.isArray(r.institutions) && r.institutions[0]) || (Array.isArray(r.publishers) && r.publishers[0]) || '');
      const tit    = S((Array.isArray(r.formats)      && r.formats[0])      || '') || 'Tese/Dissertação';
      const resumo = S((Array.isArray(r.summary)      && r.summary[0])      || '');
      const a      = ano(S((Array.isArray(r.publicationDates) && r.publicationDates[0]) || r.year || ''));

      out.push(norm({
        repositorio: 'BDTD', link_capes: link,
        titulo_do_periodico: titulo, autor,
        ano_da_publicacao: a, resumo, palavras_chaves: kw,
        titulacao: tit, instituicao_programa: inst, classificacao: tit,
        link_scielo: '', revista: '', volume: '', regiao: '',
      }));
    }
    console.log('[BDTD/VuFind] ✓', out.length, 'ok');
  } catch (e) { console.warn('[BDTD/VuFind]', e.message); }

  return out;
}

// ══════════════════════════════════════════════════════════════
//  CAPES
// ══════════════════════════════════════════════════════════════
async function searchCAPES(q) {
  const out = [];

  // Tentativa 1: API interna
  try {
    const { data, status } = await GET(
      `https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca?q=${encodeURIComponent(q)}&filtros=&pagina=1&tamanho=20`,
      { Referer: 'https://catalogodeteses.capes.gov.br/catalogo-teses/', Origin: 'https://catalogodeteses.capes.gov.br' }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const items = data.teses || data.items || data.results || [];
    console.log('[CAPES/api]', items.length, 'itens');
    if (items[0]) console.log('[CAPES/api] keys:', Object.keys(items[0]).join(', '));

    for (const it of items) {
      // autores: pode vir como string, array de strings, ou array de {nome}
      let autor = '';
      if (typeof it.autores === 'string') {
        autor = it.autores.trim();
      } else if (Array.isArray(it.autores)) {
        autor = it.autores
          .map(a => typeof a === 'string' ? a.trim() : S(a.nome || a.name || a))
          .filter(Boolean).join('; ');
      } else if (it.autor) {
        autor = S(it.autor);
      } else if (it.nmAutor) {
        autor = S(it.nmAutor);
      }

      const kw   = Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || it.palavraschave || '');
      const link = it.idTese ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese}` : '';

      out.push(norm({
        repositorio         : 'CAPES',
        link_capes          : link,
        titulo_do_periodico : S(it.titulo || it.title || it.nmTitulo),
        autor,
        ano_da_publicacao   : ano(S(it.anoDaDefesa || it.ano || it.anDefesa)),
        titulacao           : S(it.grau    || it.nivel   || it.nmGrau  || it.nmNivel),
        instituicao_programa: S(it.siglaIes || it.nmIes  || it.instituicao || it.nmInstituicao),
        regiao              : S(it.regiao  || it.nmRegiao),
        resumo              : S(it.resumo  || it.abstract || it.dsResumo),
        palavras_chaves     : kw,
        classificacao       : S(it.grau   || it.nivel || 'Tese/Dissertação'),
        link_scielo: '', revista: '', volume: '',
      }));
    }
    if (out.length) return out;
  } catch (e) { console.warn('[CAPES/api]', e.message); }

  // Tentativa 2: Dados Abertos CKAN
  try {
    const { data, status } = await GET(
      `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=b7003093-4fab-4b88-b0fa-b7d8df0bcb77&q=${encodeURIComponent(q)}&limit=20`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const records = data?.result?.records || [];
    console.log('[CAPES/CKAN]', records.length, 'registros');

    for (const r of records) {
      out.push(norm({
        repositorio         : 'CAPES',
        titulo_do_periodico : S(r.NM_TITULO || r.DS_TITULO),
        autor               : S(r.NM_AUTOR),
        ano_da_publicacao   : ano(S(r.AN_BASE || r.AN_DEFESA)),
        titulacao           : S(r.NM_GRAU_ACADEMICO),
        instituicao_programa: [r.SG_IES, r.NM_IES].filter(Boolean).join(' — '),
        regiao              : S(r.NM_REGIAO),
        resumo              : S(r.DS_RESUMO),
        palavras_chaves     : S(r.DS_PALAVRA_CHAVE),
        classificacao       : S(r.NM_GRAU_ACADEMICO || 'Tese/Dissertação'),
        link_scielo: '', link_capes: '', revista: '', volume: '',
      }));
    }
  } catch (e) { console.warn('[CAPES/CKAN]', e.message); }

  return out;
}

// ══════════════════════════════════════════════════════════════
//  SciELO
// ══════════════════════════════════════════════════════════════
async function searchSciELO(q) {
  const out = [];

  try {
    const { data, status } = await GET(
      `https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=20&from=0&output=json`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const hits = data?.hits?.hits || [];
    console.log('[SciELO/search]', hits.length, 'hits');

    for (const h of hits) {
      const src    = h._source || {};
      const titulo = src.ti_pt || src.ti_en || src.ti_es || S(src.ti);
      if (!titulo) continue;

      out.push(norm({
        repositorio         : 'SciELO',
        link_scielo         : src.doi ? `https://doi.org/${src.doi}` : (Array.isArray(src.ur) ? src.ur[0] : S(src.ur)),
        titulo_do_periodico : titulo,
        revista             : S(src.ta || src.so || src.source || ''),
        autor               : Array.isArray(src.au) ? src.au.join('; ') : S(src.au),
        ano_da_publicacao   : ano(S(src.da || src.year || src.dp)),
        volume              : S(src.vi || src.volume),
        resumo              : S(src.ab_pt || src.ab_en || src.ab_es || src.ab || ''),
        palavras_chaves     : [
          ...(Array.isArray(src.wok_subject_categories) ? src.wok_subject_categories : []),
          ...(Array.isArray(src.mh)      ? src.mh      : []),
          ...(Array.isArray(src.keyword) ? src.keyword  : []),
        ].filter(Boolean).join('; '),
        classificacao       : 'Artigo Científico',
        titulacao           : 'Artigo Científico',
        link_capes: '', instituicao_programa: '', regiao: '',
      }));
    }
    if (out.length) return out;
  } catch (e) { console.warn('[SciELO/search]', e.message); }

  // Fallback: Article Meta
  try {
    const { data, status } = await GET(
      `http://articlemeta.scielo.org/api/v1/article/?q=${encodeURIComponent(q)}&collection=scl&count=20&offset=0`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const items = data.objects || [];
    console.log('[SciELO/meta]', items.length, 'itens');

    for (const it of items) {
      const t   = it.titles || {};
      const ab  = it.abstracts || {};
      const tit = t.pt || t.en || t.es || Object.values(t)[0] || '';
      if (!tit) continue;

      out.push(norm({
        repositorio         : 'SciELO',
        link_scielo         : it.doi ? `https://doi.org/${it.doi}` : '',
        titulo_do_periodico : tit,
        revista             : S(it.journal_title || it.source),
        autor               : (it.authors || []).map(a => [a.given_names, a.surname].filter(Boolean).join(' ')).join('; '),
        ano_da_publicacao   : ano(S(it.publication_date || it.year)),
        volume              : S(it.volume),
        resumo              : ab.pt || ab.en || ab.es || '',
        palavras_chaves     : Object.values(it.keywords || {}).flat().map(S).join('; '),
        classificacao       : 'Artigo Científico',
        titulacao           : 'Artigo Científico',
        link_capes: '', instituicao_programa: '', regiao: '',
      }));
    }
  } catch (e) { console.warn('[SciELO/meta]', e.message); }

  return out;
}

// ══════════════════════════════════════════════════════════════
//  CROSSREF
// ══════════════════════════════════════════════════════════════
async function searchCrossref(q) {
  const out = [];
  try {
    const { data, status } = await GET(
      `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=20&select=DOI,title,author,published,container-title,abstract,subject,volume,type`,
      { 'User-Agent': 'RepositorioAcademico/6.0 (mailto:academico@repositorio.edu.br)' }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const items = data?.message?.items || [];
    console.log('[Crossref]', items.length, 'itens');

    for (const it of items) {
      const titulo = Array.isArray(it.title) ? it.title[0] : S(it.title);
      if (!titulo) continue;

      out.push(norm({
        repositorio         : 'Crossref',
        link_scielo         : it.DOI ? `https://doi.org/${it.DOI}` : '',
        titulo_do_periodico : titulo,
        revista             : Array.isArray(it['container-title']) ? it['container-title'][0] : '',
        autor               : (it.author || []).map(a => [a.given, a.family].filter(Boolean).join(' ')).join('; '),
        ano_da_publicacao   : String(it.published?.['date-parts']?.[0]?.[0] || it['published-print']?.['date-parts']?.[0]?.[0] || ''),
        volume              : S(it.volume),
        resumo              : S(it.abstract || '').replace(/<[^>]+>/g, '').trim(),
        palavras_chaves     : Array.isArray(it.subject) ? it.subject.join('; ') : '',
        classificacao       : it.type === 'journal-article' ? 'Artigo Científico' : S(it.type),
        titulacao           : it.type === 'journal-article' ? 'Artigo Científico' : S(it.type),
        instituicao_programa: (it.author || []).flatMap(a => (a.affiliation || []).map(af => S(af.name))).filter(Boolean)[0] || '',
        link_capes: '', regiao: '',
      }));
    }
  } catch (e) { console.warn('[Crossref]', e.message); }
  return out;
}

// ══════════════════════════════════════════════════════════════
//  HANDLER
// ══════════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ erro: 'Método não permitido.' }); return; }

  const { q = '', fontes = 'capes,scielo,bdtd,crossref' } = req.query;
  if (!q || q.trim().length < 2) { res.status(400).json({ erro: 'Informe ao menos 2 caracteres.' }); return; }

  console.log(`\n🔍 v6 | "${q}" | fontes: ${fontes}`);

  const lista   = fontes.toLowerCase().split(',').map(f => f.trim());
  const tarefas = [];
  if (lista.includes('bdtd'))     tarefas.push(searchBDTD(q));
  if (lista.includes('capes'))    tarefas.push(searchCAPES(q));
  if (lista.includes('scielo'))   tarefas.push(searchSciELO(q));
  if (lista.includes('crossref')) tarefas.push(searchCrossref(q));

  const settled = await Promise.allSettled(tarefas);
  const todos   = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  // Remove duplicatas por título normalizado
  const seen = new Set();
  const resultados = todos.filter(r => {
    const k = r.titulo_do_periodico.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  console.log(`✅ v6 | ${resultados.length} únicos de ${todos.length}\n`);
  res.status(200).json({ versao: '6.0.0', query: q, total: resultados.length, resultados });
};
