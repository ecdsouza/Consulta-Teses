/**
 * REPOSITÓRIO ACADÊMICO v12
 * ──────────────────────────────────────────────────────────────────
 * Estratégia: busca TODAS as páginas de cada fonte internamente,
 * combina tudo, deduplica, e pagina o resultado final.
 *
 * Correções v12 (baseadas no diagnóstico real):
 *  ✅ CAPES POST: campo correto é `tesesDissertacoes` (não `teses`)
 *  ✅ CAPES CKAN: removido (timeout)
 *  ✅ BDTD: busca todas as páginas até esgotar (87 → todos retornados)
 *  ✅ Sem limite artificial de 100 resultados
 *  ✅ OpenAlex BR: busca focada em instituições brasileiras
 *  ✅ SciELO: busca todas as páginas disponíveis
 *  ✅ Crossref: todas as páginas disponíveis
 */

const axios = require('axios');

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
const OA_UA = 'RepositorioAcademico/12.0 (mailto:academico@repositorio.edu.br)';

// Máximo de páginas a buscar por fonte (evita loops infinitos)
const MAX_PAGES_PER_SOURCE = 10;
// Itens por requisição a cada fonte
const ITEMS_PER_REQ = 50;

async function GET(url, extra = {}, timeout = 18000) {
  return axios.get(url, { timeout, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}
async function POST(url, data, extra = {}) {
  return axios.post(url, data, { timeout: 18000, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}

// ═══════════════════════════════════════════════════════
//  MAPA DE REGIÕES
// ═══════════════════════════════════════════════════════
const REGIOES = {
  UFAM:'Norte',UFPA:'Norte',UNIR:'Norte',UFAC:'Norte',UFRR:'Norte',UFRA:'Norte',UNIFAP:'Norte',UEA:'Norte',
  UFC:'Nordeste',UFBA:'Nordeste',UFPE:'Nordeste',UFRN:'Nordeste',UFPB:'Nordeste',UFMA:'Nordeste',
  UFPI:'Nordeste',UFS:'Nordeste',UFAL:'Nordeste',UFERSA:'Nordeste',UFRPE:'Nordeste',UNEB:'Nordeste',
  UESC:'Nordeste',UEFS:'Nordeste',UESB:'Nordeste',UNIVASF:'Nordeste',UFRB:'Nordeste',UFCA:'Nordeste',
  UnB:'Centro-Oeste',UFG:'Centro-Oeste',UFMT:'Centro-Oeste',UFMS:'Centro-Oeste',UEG:'Centro-Oeste',
  USP:'Sudeste',UNICAMP:'Sudeste',UNESP:'Sudeste',UNIFESP:'Sudeste',UFRJ:'Sudeste',UFF:'Sudeste',
  UERJ:'Sudeste',UFJF:'Sudeste',UFMG:'Sudeste',UFV:'Sudeste',UFOP:'Sudeste',UFSJ:'Sudeste',
  UFU:'Sudeste',UFTM:'Sudeste',UFLA:'Sudeste',UFVJM:'Sudeste',UNIRIO:'Sudeste',UFES:'Sudeste',
  IFSP:'Sudeste',IFMG:'Sudeste',IFRJ:'Sudeste',IFES:'Sudeste',UFSCar:'Sudeste',
  PUCSP:'Sudeste',PUCRJ:'Sudeste',PUCMG:'Sudeste',UENF:'Sudeste',UEMG:'Sudeste',
  UFSC:'Sul',UFRGS:'Sul',UFPR:'Sul',FURG:'Sul',UFPEL:'Sul',UFSM:'Sul',UNIPAMPA:'Sul',
  UTFPR:'Sul',UFFS:'Sul',PUCRS:'Sul',PUCPR:'Sul',UNISINOS:'Sul',FURB:'Sul',UDESC:'Sul',
  UEL:'Sul',UEM:'Sul',UEPG:'Sul',UNIOESTE:'Sul',UENP:'Sul',UNESPAR:'Sul',
};

function inferirRegiao(inst) {
  if (!inst) return '';
  const u = inst.toUpperCase();
  for (const [sig, reg] of Object.entries(REGIOES)) { if (u.includes(sig)) return reg; }
  if (/santa catarina|florianópolis|blumenau/i.test(inst))          return 'Sul';
  if (/rio grande do sul|porto alegre|pelotas|caxias do sul/i.test(inst)) return 'Sul';
  if (/paraná|curitiba|londrina|maringá|cascavel/i.test(inst))       return 'Sul';
  if (/são paulo|campinas|santos|sorocaba|ribeirão/i.test(inst))     return 'Sudeste';
  if (/rio de janeiro|niterói|volta redonda/i.test(inst))            return 'Sudeste';
  if (/minas gerais|belo horizonte|viçosa|uberlândia/i.test(inst))  return 'Sudeste';
  if (/espírito santo|vitória/i.test(inst))                         return 'Sudeste';
  if (/bahia|salvador|feira de santana/i.test(inst))                 return 'Nordeste';
  if (/pernambuco|recife|caruaru/i.test(inst))                       return 'Nordeste';
  if (/ceará|fortaleza|juazeiro/i.test(inst))                        return 'Nordeste';
  if (/maranhão|são luís/i.test(inst))                               return 'Nordeste';
  if (/piauí|teresina/i.test(inst))                                  return 'Nordeste';
  if (/paraíba|joão pessoa|campina grande/i.test(inst))              return 'Nordeste';
  if (/rio grande do norte|natal|mossoró/i.test(inst))               return 'Nordeste';
  if (/amazonas|manaus/i.test(inst))                                 return 'Norte';
  if (/pará|belém|santarém/i.test(inst))                             return 'Norte';
  if (/goiás|goiânia|anápolis/i.test(inst))                         return 'Centro-Oeste';
  if (/mato grosso|cuiabá|rondonópolis/i.test(inst))                 return 'Centro-Oeste';
  if (/brasília|distrito federal/i.test(inst))                       return 'Centro-Oeste';
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
  if (/book.chapter/i.test(s))            return 'Capítulo de Livro';
  if (/^book$/i.test(s))                  return 'Livro';
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
      // Formato BDTD: { primary: {"Nome":[]}, secondary: [], corporate: [] }
      if (raw.primary && typeof raw.primary === 'object' && !Array.isArray(raw.primary)) {
        nomes.push(...Object.keys(raw.primary));
      }
      if (raw.secondary && typeof raw.secondary === 'object' && !Array.isArray(raw.secondary)) {
        Object.keys(raw.secondary).forEach(k => { if (!nomes.includes(k)) nomes.push(k); });
      }
      if (nomes.length) return nomes.join('; ');
      const keys = Object.keys(raw).filter(k => !['_','$','role','type','corporate','secondary'].includes(k));
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

function reconstructAbstract(inv) {
  if (!inv || typeof inv !== 'object') return '';
  try {
    const pos = {};
    for (const [word, positions] of Object.entries(inv)) {
      for (const p of positions) pos[p] = word;
    }
    const max = Math.max(...Object.keys(pos).map(Number));
    const words = [];
    for (let i = 0; i <= max; i++) words.push(pos[i] || '');
    return words.join(' ').replace(/\s+/g, ' ').trim();
  } catch (_) { return ''; }
}

function norm(o) {
  const kw     = limparKW(S(o.palavras_chaves));
  const tit    = normTitulacao(o.titulacao);
  const inst   = S(o.instituicao_programa);
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

function okAno(anoStr, anoMin, anoMax) {
  const a = parseInt(anoStr);
  if (isNaN(a)) return true;
  if (anoMin && a < anoMin) return false;
  if (anoMax && a > anoMax) return false;
  return true;
}

// ═══════════════════════════════════════════════════════
//  BDTD — VuFind REST, TODAS as páginas
// ═══════════════════════════════════════════════════════
async function searchBDTD(q, anoMin, anoMax, errors) {
  const out = [];
  let page  = 1;
  let total = Infinity;

  while (out.length < total && page <= MAX_PAGES_PER_SOURCE) {
    try {
      const { data, status } = await GET(
        `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=${page}&limit=${ITEMS_PER_REQ}`
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      const records = data?.records || [];
      if (page === 1) {
        total = parseInt(data?.resultCount || data?.result_count || 0) || records.length;
        console.log(`[BDTD] total declarado: ${total}`);
      }
      if (!records.length) break;

      for (const r of records) {
        const titulo = S(r.title || r.cleanTitle || r.shortTitle);
        if (!titulo) continue;

        const ano = anoFrom(S(
          (Array.isArray(r.publicationDates) ? r.publicationDates[0] : r.publicationDate) || r.year || ''
        ));
        if (!okAno(ano, anoMin, anoMax)) continue;

        const kwRaw = Array.isArray(r.subjects)
          ? r.subjects.flat().map(S).filter(Boolean).join('; ')
          : S(r.subjects || '');

        const link = Array.isArray(r.urls) && r.urls.length
          ? (r.urls[0].url || S(r.urls[0])) : (r.url || '');

        const inst = S(
          (Array.isArray(r.institutions) ? r.institutions[0] : '') ||
          (Array.isArray(r.publishers)   ? r.publishers[0]   : '') || ''
        );

        out.push(norm({
          repositorio: 'BDTD', link_capes: link,
          titulo_do_periodico: titulo,
          autor: parseAutores(r.authors),
          ano_da_publicacao: ano,
          resumo: S(Array.isArray(r.summary) ? r.summary[0] : r.summary),
          palavras_chaves: kwRaw,
          titulacao: S(Array.isArray(r.formats) ? r.formats[0] : r.formats),
          instituicao_programa: inst,
          link_scielo: '', revista: '', volume: '', regiao: '',
        }));
      }

      console.log(`[BDTD] p${page}: ${records.length} → total coletado: ${out.length}/${total}`);
      if (records.length < ITEMS_PER_REQ) break; // última página
      page++;
    } catch (e) {
      errors.push({ fonte: 'BDTD', erro: e.message });
      console.warn('[BDTD]', e.message);
      break;
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════
//  CAPES — POST, campo correto `tesesDissertacoes`, TODAS as páginas
// ═══════════════════════════════════════════════════════
async function searchCAPES(q, anoMin, anoMax, errors) {
  const out = [];
  let page  = 1;
  let total = Infinity;
  const anoAtual = new Date().getFullYear();

  // Monta filtro de ano
  const filtros = [];
  if (anoMin) filtros.push(`anoDaDefesa:${anoMin}-${anoAtual}`);

  while (out.length < total && page <= MAX_PAGES_PER_SOURCE) {
    try {
      const { data, status } = await POST(
        'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca',
        { query: q, filtros, pagina: page, tamanho: ITEMS_PER_REQ },
        {
          'Content-Type': 'application/json',
          Origin  : 'https://catalogodeteses.capes.gov.br',
          Referer : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
        }
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      // ✅ Campo correto: tesesDissertacoes (diagnóstico confirmou isso)
      const items = data.tesesDissertacoes || data.teses || data.items || data.results || [];

      if (page === 1) {
        total = parseInt(data.total || data.totalItens || data.totalRegistros || 0) || items.length;
        // Cap razoável para não sobrecarregar
        total = Math.min(total, MAX_PAGES_PER_SOURCE * ITEMS_PER_REQ);
        console.log(`[CAPES] total declarado: ${data.total || '?'} | cap: ${total}`);
      }
      if (!items.length) break;

      for (const it of items) {
        const ano = anoFrom(S(it.anoDaDefesa || it.ano || it.anoProgramaDefesa));
        if (!okAno(ano, anoMin, anoMax)) continue;

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
          : (it.id ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.id}` : '');
        const tit  = S(it.grau || it.nivel || it.nmGrau || it.tipoProgramaAcademico);
        const inst = S(it.nmIes || it.siglaIes || it.instituicao || it.nmInstituicao);
        const reg  = S(it.regiao || it.nmRegiao);

        out.push(norm({
          repositorio: 'CAPES', link_capes: link,
          titulo_do_periodico: S(it.titulo || it.title || it.nmTitulo),
          autor, ano_da_publicacao: ano, titulacao: tit,
          instituicao_programa: inst, regiao: reg,
          resumo: S(it.resumo || it.abstract || it.dsResumo),
          palavras_chaves: kw, classificacao: tit,
          link_scielo: '', revista: '', volume: '',
        }));
      }

      console.log(`[CAPES] p${page}: ${items.length} → total coletado: ${out.length}/${total}`);
      if (items.length < ITEMS_PER_REQ) break;
      page++;
    } catch (e) {
      errors.push({ fonte: 'CAPES', erro: e.message });
      console.warn('[CAPES]', e.message);
      break;
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════
//  SciELO — TODAS as páginas disponíveis
// ═══════════════════════════════════════════════════════
async function searchSciELO(q, anoMin, anoMax, errors) {
  const out = [];
  let from  = 0;
  let total = Infinity;
  let page  = 1;

  while (out.length < total && page <= MAX_PAGES_PER_SOURCE) {
    try {
      const { data, status } = await GET(
        `https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=${ITEMS_PER_REQ}&from=${from}&output=json`
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      const hits = data?.hits?.hits || [];
      if (page === 1) {
        total = parseInt(data?.hits?.total || 0) || hits.length;
        total = Math.min(total, MAX_PAGES_PER_SOURCE * ITEMS_PER_REQ);
        console.log(`[SciELO] total declarado: ${data?.hits?.total || '?'} | cap: ${total}`);
      }
      if (!hits.length) break;

      for (const h of hits) {
        const src    = h._source || {};
        const titulo = src.ti_pt || src.ti_en || src.ti_es || S(src.ti);
        if (!titulo) continue;
        const ano = anoFrom(S(src.da || src.year || src.dp));
        if (!okAno(ano, anoMin, anoMax)) continue;

        const kw = [
          ...(Array.isArray(src.wok_subject_categories) ? src.wok_subject_categories : []),
          ...(Array.isArray(src.mh)      ? src.mh      : []),
          ...(Array.isArray(src.keyword) ? src.keyword  : []),
          ...(Array.isArray(src.de)      ? src.de       : []),
        ].filter(Boolean).join('; ');

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
          titulacao: 'Artigo Científico', instituicao_programa: aff,
          link_capes: '', regiao: '',
        }));
      }

      console.log(`[SciELO] p${page}: ${hits.length} → total coletado: ${out.length}/${total}`);
      if (hits.length < ITEMS_PER_REQ) break;
      from += ITEMS_PER_REQ;
      page++;
    } catch (e) {
      errors.push({ fonte: 'SciELO', erro: e.message });
      console.warn('[SciELO]', e.message);
      break;
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════
//  CROSSREF — TODAS as páginas
// ═══════════════════════════════════════════════════════
async function searchCrossref(q, anoMin, anoMax, errors) {
  const out = [];
  let offset = 0;
  let total  = Infinity;
  let page   = 1;
  const filtroAno = anoMin ? `&filter=from-pub-date:${anoMin}` : '';

  while (out.length < total && page <= MAX_PAGES_PER_SOURCE) {
    try {
      const { data, status } = await GET(
        `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${ITEMS_PER_REQ}&offset=${offset}${filtroAno}`,
        { 'User-Agent': OA_UA }
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      const items = data?.message?.items || [];
      if (page === 1) {
        total = parseInt(data?.message?.['total-results'] || 0) || items.length;
        total = Math.min(total, MAX_PAGES_PER_SOURCE * ITEMS_PER_REQ);
        console.log(`[Crossref] total: ${data?.message?.['total-results'] || '?'} | cap: ${total}`);
      }
      if (!items.length) break;

      for (const it of items) {
        const titulo = Array.isArray(it.title) ? it.title[0] : S(it.title);
        if (!titulo) continue;
        const ano = String(
          it.published?.['date-parts']?.[0]?.[0] ||
          it['published-print']?.['date-parts']?.[0]?.[0] ||
          it['published-online']?.['date-parts']?.[0]?.[0] || ''
        );
        if (!okAno(ano, anoMin, anoMax)) continue;

        const autor  = (it.author || []).map(x => [x.given, x.family].filter(Boolean).join(' ')).join('; ');
        const inst   = (it.author || []).flatMap(x => (x.affiliation || []).map(af => S(af.name))).filter(Boolean).join('; ');
        const resumo = S(it.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        const kw     = Array.isArray(it.subject) ? it.subject.join('; ') : '';
        const revista = Array.isArray(it['container-title']) ? it['container-title'][0] : S(it['container-title']);

        out.push(norm({
          repositorio: 'Crossref',
          link_scielo: it.DOI ? `https://doi.org/${it.DOI}` : '',
          titulo_do_periodico: titulo, revista, autor, ano_da_publicacao: ano,
          volume: S(it.volume), resumo, palavras_chaves: kw,
          titulacao: 'Artigo Científico', classificacao: it.type === 'journal-article' ? 'Artigo Científico' : S(it.type),
          instituicao_programa: inst, link_capes: '', regiao: '',
        }));
      }

      console.log(`[Crossref] p${page}: ${items.length} → total coletado: ${out.length}/${total}`);
      if (items.length < ITEMS_PER_REQ) break;
      offset += ITEMS_PER_REQ;
      page++;
    } catch (e) {
      errors.push({ fonte: 'Crossref', erro: e.message });
      console.warn('[Crossref]', e.message);
      break;
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════
//  OPENALEX — focado em BR, TODAS as páginas
// ═══════════════════════════════════════════════════════
async function searchOpenAlex(q, anoMin, anoMax, errors) {
  const out = [];
  let page  = 1;
  let total = Infinity;

  // Filtros: país BR + ano
  const filtros = ['institutions.country_code:BR'];
  if (anoMin) filtros.push(`publication_year:>${anoMin - 1}`);
  if (anoMax) filtros.push(`publication_year:<${anoMax + 1}`);

  const filterStr = filtros.length ? `&filter=${filtros.join(',')}` : '';

  while (out.length < total && page <= MAX_PAGES_PER_SOURCE) {
    try {
      const { data, status } = await GET(
        `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${ITEMS_PER_REQ}&page=${page}&sort=relevance_score:desc${filterStr}`,
        { 'User-Agent': OA_UA },
        20000
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);

      const items = data?.results || [];
      if (page === 1) {
        total = parseInt(data?.meta?.count || 0) || items.length;
        total = Math.min(total, MAX_PAGES_PER_SOURCE * ITEMS_PER_REQ);
        console.log(`[OpenAlex/BR] total: ${data?.meta?.count || '?'} | cap: ${total}`);
      }
      if (!items.length) break;

      for (const it of items) {
        if (!it.title) continue;
        const ano = S(it.publication_year);
        if (!okAno(ano, anoMin, anoMax)) continue;

        const autorArr = (it.authorships || []).map(a => S(a.author?.display_name || ''));
        const autor    = autorArr.filter(Boolean).join('; ');
        const instArr  = (it.authorships || [])
          .flatMap(a => (a.institutions || []).map(i => S(i.display_name || '')))
          .filter(Boolean);
        const inst = [...new Set(instArr)].slice(0, 3).join('; ');

        const resumo = reconstructAbstract(it.abstract_inverted_index);
        const doi    = it.doi ? it.doi.replace('https://doi.org/', '') : '';
        const link   = doi ? `https://doi.org/${doi}`
          : (it.best_oa_location?.pdf_url || it.best_oa_location?.landing_page_url || '');
        const revista = S(it.primary_location?.source?.display_name || '');
        const kw      = (it.keywords || []).map(k => S(k.display_name || k)).filter(Boolean).join('; ');
        const tipo    = it.type === 'article'     ? 'Artigo Científico'
                      : it.type === 'dissertation'? 'Dissertação de Mestrado'
                      : it.type === 'thesis'      ? 'Tese de Doutorado'
                      : it.type === 'book-chapter'? 'Capítulo de Livro'
                      : it.type === 'book'        ? 'Livro'
                      : S(it.type) || 'Publicação Acadêmica';

        out.push(norm({
          repositorio: 'OpenAlex', link_scielo: link,
          titulo_do_periodico: S(it.title), revista, autor,
          ano_da_publicacao: ano, resumo, palavras_chaves: kw,
          titulacao: tipo, classificacao: tipo,
          instituicao_programa: inst, link_capes: '', volume: '', regiao: '',
        }));
      }

      console.log(`[OpenAlex/BR] p${page}: ${items.length} → total coletado: ${out.length}/${total}`);
      if (items.length < ITEMS_PER_REQ) break;
      page++;
    } catch (e) {
      errors.push({ fonte: 'OpenAlex', erro: e.message });
      console.warn('[OpenAlex]', e.message);
      break;
    }
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

  const anoMinInt  = parseInt(anoMin) || 2015;
  const anoMaxInt  = anoMax ? parseInt(anoMax) : null;
  const paginaInt  = Math.max(1, parseInt(pagina)    || 1);
  const porPagina  = Math.min(100, Math.max(5, parseInt(por_pagina) || 20));
  const errors     = [];

  console.log(`\n🔍 v12 | "${q}" | anoMin:${anoMinInt} | fontes:${fontes}`);

  const lista   = fontes.toLowerCase().split(',').map(f => f.trim());
  const tarefas = [];
  if (lista.includes('bdtd'))     tarefas.push(searchBDTD(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('capes'))    tarefas.push(searchCAPES(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('scielo'))   tarefas.push(searchSciELO(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('crossref')) tarefas.push(searchCrossref(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('openalex')) tarefas.push(searchOpenAlex(q, anoMinInt, anoMaxInt, errors));

  // Busca todas as fontes em paralelo
  const settled = await Promise.allSettled(tarefas);
  const todos   = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  // Deduplica por título normalizado
  const seen = new Set();
  const unicos = todos.filter(r => {
    const k = r.titulo_do_periodico
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  // Ordena: mais recente primeiro
  unicos.sort((a, b) => (parseInt(b.ano_da_publicacao)||0) - (parseInt(a.ano_da_publicacao)||0));

  // Contagem por fonte
  const porFonte = {};
  unicos.forEach(r => { porFonte[r.repositorio] = (porFonte[r.repositorio] || 0) + 1; });

  // Paginação
  const totalUnicos  = unicos.length;
  const totalPaginas = Math.ceil(totalUnicos / porPagina) || 1;
  const inicio       = (paginaInt - 1) * porPagina;
  const resultados   = unicos.slice(inicio, inicio + porPagina);

  console.log(`✅ v12 | bruto:${todos.length} | únicos:${totalUnicos} | p${paginaInt}/${totalPaginas} | fontes:`, porFonte);
  if (errors.length) console.log('⚠️ Erros:', errors);

  res.status(200).json({
    versao        : '12.0.0',
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
