/**
 * REPOSITÓRIO ACADÊMICO v11
 * ──────────────────────────────────────────────────────────────────
 * Correções baseadas no diagnóstico real do Vercel:
 *
 *  BDTD   → remove OAI (404), usa VuFind REST (OK ✅)
 *  CAPES  → muda GET→POST (GET retornava 405)
 *  CAPES  → CKAN endpoint v2 com resource_id verificado
 *  SciELO → remove meta (404), usa só search (OK ✅)
 *  OpenAlex → nova fonte, gratuita, sem restrições (OK ✅)
 *  Crossref → mantém (OK ✅)
 *
 * Paginação: ?pagina=N&por_pagina=20
 * Cada fonte busca 50 registros por página
 */

const axios  = require('axios');

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

const OA_UA = 'RepositorioAcademico/11.0 (mailto:academico@repositorio.edu.br)';

async function GET(url, extra = {}) {
  return axios.get(url, { timeout: 16000, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}
async function POST(url, data, extra = {}) {
  return axios.post(url, data, { timeout: 16000, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}

// ═══════════════════════════════════════════════════════
//  MAPA DE REGIÕES
// ═══════════════════════════════════════════════════════
const REGIOES_MAP = {
  // Norte
  UFAM:'Norte',UFPA:'Norte',UNIR:'Norte',UFAC:'Norte',UFRR:'Norte',
  UFRA:'Norte',UNIFAP:'Norte',UEA:'Norte',
  // Nordeste
  UFC:'Nordeste',UFBA:'Nordeste',UFPE:'Nordeste',UFRN:'Nordeste',
  UFPB:'Nordeste',UFMA:'Nordeste',UFPI:'Nordeste',UFS:'Nordeste',
  UFAL:'Nordeste',UFERSA:'Nordeste',UFRPE:'Nordeste',UNEB:'Nordeste',
  UESC:'Nordeste',UEFS:'Nordeste',UESB:'Nordeste',UNIVASF:'Nordeste',
  UFRB:'Nordeste',UFCA:'Nordeste',UFOB:'Nordeste',
  // Centro-Oeste
  UnB:'Centro-Oeste',UFG:'Centro-Oeste',UFMT:'Centro-Oeste',
  UFMS:'Centro-Oeste',UEG:'Centro-Oeste',UNEMAT:'Centro-Oeste',
  // Sudeste
  USP:'Sudeste',UNICAMP:'Sudeste',UNESP:'Sudeste',UNIFESP:'Sudeste',
  UFRJ:'Sudeste',UFF:'Sudeste',UERJ:'Sudeste',UFJF:'Sudeste',
  UFMG:'Sudeste',UFV:'Sudeste',UFOP:'Sudeste',UFSJ:'Sudeste',
  UFU:'Sudeste',UFTM:'Sudeste',UFLA:'Sudeste',UFVJM:'Sudeste',
  UNIRIO:'Sudeste',UFES:'Sudeste',IFSP:'Sudeste',IFMG:'Sudeste',
  IFRJ:'Sudeste',IFES:'Sudeste',UFSCar:'Sudeste',
  PUCSP:'Sudeste',PUCRJ:'Sudeste',PUCMG:'Sudeste',
  UENF:'Sudeste',UEMG:'Sudeste',
  // Sul
  UFSC:'Sul',UFRGS:'Sul',UFPR:'Sul',FURG:'Sul',UFPEL:'Sul',
  UFSM:'Sul',UNIPAMPA:'Sul',UTFPR:'Sul',UFFS:'Sul',
  PUCRS:'Sul',PUCPR:'Sul',UNISINOS:'Sul',FURB:'Sul',
  UDESC:'Sul',UEL:'Sul',UEM:'Sul',UEPG:'Sul',UNIOESTE:'Sul',
  UENP:'Sul',UNESPAR:'Sul',
};

function inferirRegiao(inst) {
  if (!inst) return '';
  const u = inst.toUpperCase();
  for (const [sig, reg] of Object.entries(REGIOES_MAP)) {
    if (u.includes(sig)) return reg;
  }
  if (/paraná|curitiba|londrina|maringá|cascavel/i.test(inst))          return 'Sul';
  if (/santa catarina|florianópolis|blumenau|joinville/i.test(inst))     return 'Sul';
  if (/rio grande do sul|porto alegre|pelotas|caxias/i.test(inst))       return 'Sul';
  if (/são paulo|campinas|santos|sorocaba|ribeirão preto/i.test(inst))   return 'Sudeste';
  if (/rio de janeiro|niterói|volta redonda/i.test(inst))                return 'Sudeste';
  if (/minas gerais|belo horizonte|viçosa|uberlândia/i.test(inst))       return 'Sudeste';
  if (/espírito santo|vitória|cachoeiro/i.test(inst))                    return 'Sudeste';
  if (/bahia|salvador|feira de santana|ilhéus/i.test(inst))              return 'Nordeste';
  if (/pernambuco|recife|caruaru/i.test(inst))                           return 'Nordeste';
  if (/ceará|fortaleza|juazeiro/i.test(inst))                            return 'Nordeste';
  if (/maranhão|são luís/i.test(inst))                                   return 'Nordeste';
  if (/piauí|teresina/i.test(inst))                                      return 'Nordeste';
  if (/paraíba|joão pessoa|campina grande/i.test(inst))                  return 'Nordeste';
  if (/rio grande do norte|natal|mossoró/i.test(inst))                   return 'Nordeste';
  if (/amazonas|manaus/i.test(inst))                                     return 'Norte';
  if (/pará|belém|santarém/i.test(inst))                                 return 'Norte';
  if (/goiás|goiânia|anápolis/i.test(inst))                              return 'Centro-Oeste';
  if (/mato grosso|cuiabá|rondonópolis/i.test(inst))                     return 'Centro-Oeste';
  if (/brasília|distrito federal/i.test(inst))                           return 'Centro-Oeste';
  return '';
}

// ═══════════════════════════════════════════════════════
//  UTILITÁRIOS
// ═══════════════════════════════════════════════════════

function S(v) {
  try {
    if (v === null || v === undefined) return '';
    if (typeof v === 'string')  return v.trim();
    if (typeof v === 'number')  return String(v);
    if (Array.isArray(v))       return v.map(S).filter(Boolean).join('; ');
    if (typeof v === 'object') {
      if (typeof v._ === 'string') return v._.trim();
      for (const k of ['name','nome','full_name','label','value','text','title','content','display_name']) {
        if (typeof v[k] === 'string' && v[k].trim()) return v[k].trim();
      }
      const prims = Object.values(v).filter(x => typeof x === 'string' || typeof x === 'number');
      if (prims.length) return prims.map(String).join(' ').trim();
      return Object.values(v).map(S).filter(Boolean).join(' ').trim();
    }
    return String(v).trim();
  } catch (_) { return ''; }
}

function normTitulacao(raw) {
  const s = S(raw).toLowerCase().trim();
  if (!s) return '';
  if (s === 'masterthesis'    || /\bmestrado\b/i.test(s) || /\bmaster\b/i.test(s))             return 'Dissertação de Mestrado';
  if (s === 'doctoralthesis'  || /\bdoutorado\b/i.test(s)|| /\bdoctor\b/i.test(s)||/\bphd\b/i.test(s)) return 'Tese de Doutorado';
  if (/artigo|article|journal/i.test(s))  return 'Artigo Científico';
  if (/\btese\b/i.test(s))                return 'Tese de Doutorado';
  if (/dissertação|dissertacao/i.test(s)) return 'Dissertação de Mestrado';
  if (/monografia/i.test(s))              return 'Monografia';
  return S(raw).charAt(0).toUpperCase() + S(raw).slice(1);
}

function limparKW(raw, max = 8) {
  if (!raw) return '';
  return [...new Set(
    raw.split(/[;,|]+/)
      .map(p => p.trim())
      .filter(p => p.length > 2 && p.length < 120 && !/^\d+$/.test(p))
  )].slice(0, max).join('; ');
}

function seletor(kw) {
  if (!kw) return '';
  return kw.split('; ').filter(p => p.length > 3).slice(0, 3).join('; ');
}

/**
 * Extrai autores — lida com formato real BDTD VuFind:
 *   { primary: {"Silva, Kátia Oliveira": []}, secondary: [], corporate: [] }
 */
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
        if (typeof a.display_name === 'string') return a.display_name.trim();
        return S(a);
      }).filter(Boolean).join('; ');
    }
    if (typeof raw === 'object') {
      const nomes = [];
      // Formato real BDTD: { primary: {"Nome":[]} , secondary: [], corporate: [] }
      if (raw.primary && typeof raw.primary === 'object' && !Array.isArray(raw.primary)) {
        nomes.push(...Object.keys(raw.primary));
      }
      if (raw.secondary && typeof raw.secondary === 'object' && !Array.isArray(raw.secondary)) {
        Object.keys(raw.secondary).forEach(k => { if (!nomes.includes(k)) nomes.push(k); });
      }
      if (nomes.length) return nomes.join('; ');
      const keys = Object.keys(raw).filter(k => !['_','$','role','type','corporate'].includes(k));
      if (keys.length) return keys.join('; ');
      return S(raw);
    }
    return S(raw);
  } catch (_) { return ''; }
}

function anoFrom(v) {
  const s = S(v);
  const m = s.match(/\b(19|20)\d{2}\b/);
  return m ? m[0] : (s.length >= 4 ? s.slice(0, 4) : s);
}

/**
 * Reconstrói abstract do OpenAlex (inverted index → texto)
 */
function reconstructAbstract(inv) {
  if (!inv || typeof inv !== 'object') return '';
  try {
    const positions = {};
    for (const [word, pos] of Object.entries(inv)) {
      for (const p of pos) positions[p] = word;
    }
    const maxPos = Math.max(...Object.keys(positions).map(Number));
    const words  = [];
    for (let i = 0; i <= maxPos; i++) {
      words.push(positions[i] || '');
    }
    return words.join(' ').trim();
  } catch (_) { return ''; }
}

function norm(o) {
  const kw    = limparKW(S(o.palavras_chaves));
  const tit   = normTitulacao(o.titulacao);
  const inst  = S(o.instituicao_programa);
  const regiao = S(o.regiao) || inferirRegiao(inst);
  return {
    repositorio            : S(o.repositorio),
    link_capes             : S(o.link_capes),
    link_scielo            : S(o.link_scielo),
    revista                : S(o.revista),
    classificacao          : tit || S(o.classificacao),
    ano_da_publicacao      : S(o.ano_da_publicacao),
    volume                 : S(o.volume),
    titulo_do_periodico    : S(o.titulo_do_periodico),
    resumo                 : S(o.resumo),
    palavras_chaves        : kw,
    seletor_palavras_chaves: seletor(kw),
    autor                  : S(o.autor),
    titulacao              : tit,
    instituicao_programa   : inst,
    regiao,
  };
}

function okAno(anoStr, anoMin) {
  if (!anoMin || !anoStr) return true;
  const a = parseInt(anoStr);
  return !isNaN(a) && a >= anoMin;
}

// ═══════════════════════════════════════════════════════
//  BDTD — apenas VuFind REST (OAI está down)
// ═══════════════════════════════════════════════════════
async function searchBDTD(q, anoMin, pagina, errors) {
  const out = [];
  try {
    const { data, status } = await GET(
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=${pagina}&limit=50`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const records = data?.records || [];
    console.log('[BDTD/VuFind] p'+pagina+':', records.length, '| total:', data?.resultCount);

    for (const r of records) {
      const titulo = S(r.title || r.cleanTitle || r.shortTitle);
      if (!titulo) continue;

      const ano = anoFrom(S(
        (Array.isArray(r.publicationDates) && r.publicationDates[0]) ||
        r.publicationDate || r.year || ''
      ));
      if (!okAno(ano, anoMin)) continue;

      // Autores: formato real { primary: {"Nome":[]}, secondary: [], corporate: [] }
      const autor = parseAutores(r.authors);

      // Subjects: pode ser array de arrays ou array de strings
      const kwRaw = Array.isArray(r.subjects)
        ? r.subjects.flat().map(S).filter(Boolean).join('; ')
        : S(r.subjects || '');

      // URL
      const link = Array.isArray(r.urls) && r.urls.length
        ? (r.urls[0].url || S(r.urls[0]))
        : (r.url || '');

      // Instituição
      const inst = S(
        (Array.isArray(r.institutions) && r.institutions[0]) ||
        (Array.isArray(r.publishers)   && r.publishers[0])   || ''
      );

      // Titulação
      const tit = S((Array.isArray(r.formats) && r.formats[0]) || '');

      // Resumo
      const resumo = S((Array.isArray(r.summary) && r.summary[0]) || r.summary || '');

      out.push(norm({
        repositorio: 'BDTD', link_capes: link,
        titulo_do_periodico: titulo, autor, ano_da_publicacao: ano,
        resumo, palavras_chaves: kwRaw, titulacao: tit,
        instituicao_programa: inst, classificacao: tit,
        link_scielo: '', revista: '', volume: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'BDTD', erro: e.message });
    console.warn('[BDTD/VuFind]', e.message);
  }
  return out;
}

// ═══════════════════════════════════════════════════════
//  CAPES — POST (GET retorna 405) + CKAN fallback
// ═══════════════════════════════════════════════════════
async function searchCAPES(q, anoMin, pagina, errors) {
  const out = [];
  const anoAtual = new Date().getFullYear();

  // ── POST na API interna do catálogo ──────────────────
  try {
    const { data, status } = await POST(
      'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca',
      {
        query   : q,
        filtros : anoMin ? [`anoDaDefesa:${anoMin}-${anoAtual}`] : [],
        pagina,
        tamanho : 50,
      },
      {
        'Content-Type': 'application/json',
        Origin  : 'https://catalogodeteses.capes.gov.br',
        Referer : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
      }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const items = data.teses || data.items || data.results || [];
    console.log('[CAPES/POST] p'+pagina+':', items.length, '| total:', data.total || data.totalItens || '?');

    for (const it of items) {
      const ano = anoFrom(S(it.anoDaDefesa || it.ano));
      if (!okAno(ano, anoMin)) continue;

      let autor = '';
      if (Array.isArray(it.autores)) {
        autor = it.autores
          .map(x => typeof x === 'string' ? x.trim() : S(x.nome || x.name || x))
          .filter(Boolean).join('; ');
      } else {
        autor = S(it.nmAutor || it.autor || it.autores);
      }

      const kw   = Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || '');
      const link = it.idTese
        ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese}`
        : '';
      const tit  = S(it.grau || it.nivel || it.nmGrau);
      const inst = S(it.nmIes || it.siglaIes || it.instituicao || it.nmInstituicao);

      out.push(norm({
        repositorio: 'CAPES', link_capes: link,
        titulo_do_periodico: S(it.titulo || it.title || it.nmTitulo),
        autor, ano_da_publicacao: ano, titulacao: tit,
        instituicao_programa: inst,
        regiao: S(it.regiao || it.nmRegiao),
        resumo: S(it.resumo || it.abstract || it.dsResumo),
        palavras_chaves: kw, classificacao: tit,
        link_scielo: '', revista: '', volume: '',
      }));
    }
    if (out.length) return out;
  } catch (e) {
    errors.push({ fonte: 'CAPES/POST', erro: e.message });
    console.warn('[CAPES/POST]', e.message);
  }

  // ── CKAN Dados Abertos CAPES (fallback) ──────────────
  // Resource IDs conhecidos para teses/dissertações
  const resourceIds = [
    'b7003093-4fab-4b88-b0fa-b7d8df0bcb77',  // original (pode ter mudado)
    '2ead2a90-26e9-4c38-bb14-9e01d89c1fe4',  // alternativo
  ];

  for (const rid of resourceIds) {
    try {
      const offset = (pagina - 1) * 50;
      const { data, status } = await GET(
        `https://dadosabertos.capes.gov.br/api/3/action/datastore_search?resource_id=${rid}&q=${encodeURIComponent(q)}&limit=50&offset=${offset}`
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      if (data?.success === false) throw new Error(data?.error?.message || 'Resource not found');

      const records = data?.result?.records || [];
      console.log('[CAPES/CKAN] rid='+rid.slice(0,8)+' p'+pagina+':', records.length);

      for (const r of records) {
        const ano = anoFrom(S(r.AN_BASE || r.AN_DEFESA || r.ANO_BASE));
        if (!okAno(ano, anoMin)) continue;
        const inst = [r.SG_IES, r.NM_IES].filter(Boolean).join(' — ');
        out.push(norm({
          repositorio: 'CAPES',
          titulo_do_periodico: S(r.NM_TITULO || r.DS_TITULO || r.TITULO),
          autor: S(r.NM_AUTOR || r.AUTOR),
          ano_da_publicacao: ano,
          titulacao: S(r.NM_GRAU_ACADEMICO || r.GRAU),
          instituicao_programa: inst,
          regiao: S(r.NM_REGIAO || r.REGIAO),
          resumo: S(r.DS_RESUMO || r.RESUMO),
          palavras_chaves: S(r.DS_PALAVRA_CHAVE || r.PALAVRAS_CHAVE),
          classificacao: S(r.NM_GRAU_ACADEMICO || r.GRAU),
          link_scielo: '', link_capes: '', revista: '', volume: '',
        }));
      }
      if (out.length) return out;
    } catch (e) {
      console.warn('[CAPES/CKAN rid='+rid.slice(0,8)+']', e.message);
    }
  }

  if (!out.length) errors.push({ fonte: 'CAPES', erro: 'Todos os endpoints falharam' });
  return out;
}

// ═══════════════════════════════════════════════════════
//  SciELO — apenas Search (Meta retorna 404)
// ═══════════════════════════════════════════════════════
async function searchSciELO(q, anoMin, pagina, errors) {
  const out = [];
  const from = (pagina - 1) * 50;

  try {
    const { data, status } = await GET(
      `https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=50&from=${from}&output=json`
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const hits = data?.hits?.hits || [];
    console.log('[SciELO/search] p'+pagina+':', hits.length, '| total:', data?.hits?.total);

    for (const h of hits) {
      const src    = h._source || {};
      const titulo = src.ti_pt || src.ti_en || src.ti_es || S(src.ti);
      if (!titulo) continue;

      const ano = anoFrom(S(src.da || src.year || src.dp));
      if (!okAno(ano, anoMin)) continue;

      const kw = [
        ...(Array.isArray(src.wok_subject_categories) ? src.wok_subject_categories : []),
        ...(Array.isArray(src.mh)      ? src.mh      : []),
        ...(Array.isArray(src.keyword) ? src.keyword  : []),
        ...(Array.isArray(src.de)      ? src.de       : []),
      ].filter(Boolean).join('; ');

      // Afiliação / instituição
      const aff = Array.isArray(src.aff)
        ? src.aff.filter(Boolean).join('; ')
        : S(src.aff || '');

      out.push(norm({
        repositorio: 'SciELO',
        link_scielo: src.doi ? `https://doi.org/${src.doi}` : (Array.isArray(src.ur) ? src.ur[0] : S(src.ur)),
        titulo_do_periodico: titulo,
        revista: S(src.ta || src.so || src.source),
        autor: Array.isArray(src.au) ? src.au.join('; ') : S(src.au),
        ano_da_publicacao: ano, volume: S(src.vi || src.volume),
        resumo: S(src.ab_pt || src.ab_en || src.ab_es || src.ab),
        palavras_chaves: kw, classificacao: 'Artigo Científico',
        titulacao: 'Artigo Científico',
        instituicao_programa: aff,
        link_capes: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'SciELO', erro: e.message });
    console.warn('[SciELO/search]', e.message);
  }
  return out;
}

// ═══════════════════════════════════════════════════════
//  CROSSREF
// ═══════════════════════════════════════════════════════
async function searchCrossref(q, anoMin, pagina, errors) {
  const out = [];
  try {
    const offset    = (pagina - 1) * 50;
    const filtroAno = anoMin ? `&filter=from-pub-date:${anoMin}` : '';
    const { data, status } = await GET(
      `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=50&offset=${offset}${filtroAno}`,
      { 'User-Agent': OA_UA }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);
    const items = data?.message?.items || [];
    console.log('[Crossref] p'+pagina+':', items.length, '| total:', data?.message?.['total-results']);

    for (const it of items) {
      const titulo = Array.isArray(it.title) ? it.title[0] : S(it.title);
      if (!titulo) continue;
      const ano = String(
        it.published?.['date-parts']?.[0]?.[0] ||
        it['published-print']?.['date-parts']?.[0]?.[0] ||
        it['published-online']?.['date-parts']?.[0]?.[0] || ''
      );
      if (!okAno(ano, anoMin)) continue;

      const autor  = (it.author || []).map(x => [x.given, x.family].filter(Boolean).join(' ')).join('; ');
      const inst   = (it.author || [])
        .flatMap(x => (x.affiliation || []).map(af => S(af.name)))
        .filter(Boolean).join('; ');
      const resumo = S(it.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const kw     = Array.isArray(it.subject) ? it.subject.join('; ') : '';
      const revista = Array.isArray(it['container-title']) ? it['container-title'][0] : S(it['container-title']);

      out.push(norm({
        repositorio: 'Crossref',
        link_scielo: it.DOI ? `https://doi.org/${it.DOI}` : '',
        titulo_do_periodico: titulo,
        revista, autor, ano_da_publicacao: ano,
        volume: S(it.volume), resumo, palavras_chaves: kw,
        titulacao: 'Artigo Científico',
        classificacao: it.type === 'journal-article' ? 'Artigo Científico' : S(it.type),
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

// ═══════════════════════════════════════════════════════
//  OPENALEX — nova fonte, gratuita, sem restrições
//  Cobre: artigos, teses, dissertações, preprints
//  https://docs.openalex.org/api-entities/works
// ═══════════════════════════════════════════════════════
async function searchOpenAlex(q, anoMin, pagina, errors) {
  const out = [];
  try {
    // Busca focada em instituições brasileiras + query geral
    const filtros = anoMin ? `&filter=publication_year:>${anoMin - 1}` : '';
    const { data, status } = await GET(
      `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=50&page=${pagina}&sort=relevance_score:desc${filtros}&select=id,title,authorships,publication_year,doi,primary_location,abstract_inverted_index,keywords,type,open_access,best_oa_location`,
      { 'User-Agent': OA_UA }
    );
    if (status !== 200) throw new Error(`HTTP ${status}`);

    const items = data?.results || [];
    console.log('[OpenAlex] p'+pagina+':', items.length, '| total:', data?.meta?.count);

    for (const it of items) {
      if (!it.title) continue;

      const ano = S(it.publication_year);
      if (!okAno(ano, anoMin)) continue;

      // Autores e instituições
      const autorArr = (it.authorships || []).map(a => S(a.author?.display_name || ''));
      const autor    = autorArr.filter(Boolean).join('; ');
      const instArr  = (it.authorships || [])
        .flatMap(a => (a.institutions || []).map(i => S(i.display_name || '')))
        .filter(Boolean);
      const inst = [...new Set(instArr)].slice(0, 3).join('; ');

      // Resumo (precisa de reconstrução do inverted index)
      const resumo = reconstructAbstract(it.abstract_inverted_index);

      // DOI / link
      const doi    = it.doi ? it.doi.replace('https://doi.org/', '') : '';
      const link   = doi ? `https://doi.org/${doi}` : (it.best_oa_location?.pdf_url || it.best_oa_location?.landing_page_url || '');
      const oa_url = it.open_access?.oa_url || '';

      // Revista
      const revista = S(it.primary_location?.source?.display_name || '');

      // Palavras-chave
      const kw = (it.keywords || []).map(k => S(k.display_name || k)).filter(Boolean).join('; ');

      // Tipo
      const tipo = it.type === 'article'        ? 'Artigo Científico'
                 : it.type === 'dissertation'   ? 'Dissertação de Mestrado'
                 : it.type === 'thesis'         ? 'Tese de Doutorado'
                 : it.type === 'book-chapter'   ? 'Capítulo de Livro'
                 : it.type === 'book'           ? 'Livro'
                 : S(it.type) || 'Publicação Acadêmica';

      out.push(norm({
        repositorio: 'OpenAlex',
        link_scielo: link || oa_url,
        titulo_do_periodico: S(it.title),
        revista, autor, ano_da_publicacao: ano,
        resumo, palavras_chaves: kw,
        titulacao: tipo, classificacao: tipo,
        instituicao_programa: inst,
        link_capes: '', volume: '', regiao: '',
      }));
    }
  } catch (e) {
    errors.push({ fonte: 'OpenAlex', erro: e.message });
    console.warn('[OpenAlex]', e.message);
  }
  return out;
}

// ═══════════════════════════════════════════════════════
//  HANDLER
// ═══════════════════════════════════════════════════════
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ erro: 'Método não permitido.' }); return; }

  const {
    q          = '',
    fontes     = 'capes,scielo,bdtd,crossref,openalex',
    anoMin     = '2015',
    anoMax     = '',
    pagina     = '1',
    por_pagina = '20',
  } = req.query;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ erro: 'Informe ao menos 2 caracteres.' });
    return;
  }

  const anoMinInt = parseInt(anoMin) || 2015;
  const paginaInt = Math.max(1, parseInt(pagina) || 1);
  const porPagina = Math.min(100, Math.max(10, parseInt(por_pagina) || 20));
  const errors    = [];

  console.log(`\n🔍 v11 | "${q}" | p${paginaInt} | fontes: ${fontes} | anoMin: ${anoMinInt}`);

  const lista   = fontes.toLowerCase().split(',').map(f => f.trim());
  const tarefas = [];
  if (lista.includes('bdtd'))      tarefas.push(searchBDTD(q, anoMinInt, paginaInt, errors));
  if (lista.includes('capes'))     tarefas.push(searchCAPES(q, anoMinInt, paginaInt, errors));
  if (lista.includes('scielo'))    tarefas.push(searchSciELO(q, anoMinInt, paginaInt, errors));
  if (lista.includes('crossref'))  tarefas.push(searchCrossref(q, anoMinInt, paginaInt, errors));
  if (lista.includes('openalex'))  tarefas.push(searchOpenAlex(q, anoMinInt, paginaInt, errors));

  const settled = await Promise.allSettled(tarefas);
  let todos = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  if (anoMax) {
    const mx = parseInt(anoMax);
    todos = todos.filter(r => !r.ano_da_publicacao || parseInt(r.ano_da_publicacao) <= mx);
  }

  // Deduplica por título
  const seen = new Set();
  const unicos = todos.filter(r => {
    const k = r.titulo_do_periodico.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  unicos.sort((a, b) => (parseInt(b.ano_da_publicacao)||0) - (parseInt(a.ano_da_publicacao)||0));

  const porFonte = {};
  unicos.forEach(r => { porFonte[r.repositorio] = (porFonte[r.repositorio] || 0) + 1; });

  const totalUnicos  = unicos.length;
  const totalPaginas = Math.ceil(totalUnicos / porPagina);
  const inicio       = (paginaInt - 1) * porPagina;
  const resultados   = unicos.slice(inicio, inicio + porPagina);

  console.log(`✅ v11 | total: ${totalUnicos} | p${paginaInt}/${totalPaginas} | fontes:`, porFonte);

  res.status(200).json({
    versao        : '11.0.0',
    query         : q,
    anoMin        : anoMinInt,
    pagina        : paginaInt,
    por_pagina    : porPagina,
    total_unicos  : totalUnicos,
    total_paginas : totalPaginas,
    por_fonte     : porFonte,
    source_errors : errors,
    resultados,
  });
};
