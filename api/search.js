/**
 * REPOSITÓRIO ACADÊMICO v14
 *
 * Região:
 *  - Dado direto da fonte → "Sudeste"        (confirmado)
 *  - Inferido do documento → "AI - Sudeste"  (sinalizado)
 *  - Não encontrado → ""                     (exibe — no frontend)
 *
 * Exportação: ?exportar=1 retorna TODOS os registros sem paginação.
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
const OA_UA     = 'RepositorioAcademico/14.0 (mailto:academico@repositorio.edu.br)';
const MAX_PAGES = 10;
const PER_REQ   = 50;

async function GET(url, extra = {}, timeout = 18000) {
  return axios.get(url, { timeout, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}
async function POST(url, data, extra = {}) {
  return axios.post(url, data, { timeout: 20000, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}

// ════════════════════════════════════════════════════════
//  REGIÕES — siglas de IES (sem ambiguidade)
// ════════════════════════════════════════════════════════
const SIGLAS_IES = {
  // Norte
  UFAM:'Norte', UFPA:'Norte', UNIR:'Norte', UFAC:'Norte', UFRR:'Norte',
  UFRA:'Norte', UNIFAP:'Norte', UEA:'Norte', UEAP:'Norte',
  // Nordeste
  UFC:'Nordeste', UFBA:'Nordeste', UFPE:'Nordeste', UFRN:'Nordeste',
  UFPB:'Nordeste', UFMA:'Nordeste', UFPI:'Nordeste', UFS:'Nordeste',
  UFAL:'Nordeste', UFERSA:'Nordeste', UFRPE:'Nordeste', UNEB:'Nordeste',
  UESC:'Nordeste', UEFS:'Nordeste', UESB:'Nordeste', UNIVASF:'Nordeste',
  UFRB:'Nordeste', UFCA:'Nordeste', UFOB:'Nordeste',
  // Centro-Oeste
  'UnB':'Centro-Oeste', UFG:'Centro-Oeste', UFMT:'Centro-Oeste',
  UFMS:'Centro-Oeste', UEG:'Centro-Oeste', UNEMAT:'Centro-Oeste',
  // Sudeste
  USP:'Sudeste', UNICAMP:'Sudeste', UNESP:'Sudeste', UNIFESP:'Sudeste',
  UFRJ:'Sudeste', UFF:'Sudeste', UERJ:'Sudeste', UFJF:'Sudeste',
  UFMG:'Sudeste', UFV:'Sudeste', UFOP:'Sudeste', UFSJ:'Sudeste',
  UFU:'Sudeste', UFTM:'Sudeste', UFLA:'Sudeste', UFVJM:'Sudeste',
  UNIRIO:'Sudeste', UFES:'Sudeste', IFSP:'Sudeste', IFMG:'Sudeste',
  IFRJ:'Sudeste', IFES:'Sudeste', UFSCar:'Sudeste',
  PUCSP:'Sudeste', PUCRJ:'Sudeste', PUCMG:'Sudeste',
  UENF:'Sudeste', UEMG:'Sudeste', CEFETMG:'Sudeste',
  // Sul
  UFSC:'Sul', UFRGS:'Sul', UFPR:'Sul', FURG:'Sul', UFPEL:'Sul',
  UFSM:'Sul', UNIPAMPA:'Sul', UTFPR:'Sul', UFFS:'Sul',
  PUCRS:'Sul', PUCPR:'Sul', UNISINOS:'Sul', FURB:'Sul', UDESC:'Sul',
  UEL:'Sul', UEM:'Sul', UEPG:'Sul', UNIOESTE:'Sul', UENP:'Sul', UNESPAR:'Sul',
};

// Padrões de nome completo — SEM abreviações de estado (causam falsos positivos)
const PADROES_NOME = [
  // Sul
  [/universidade federal do paran[aá]/i, 'Sul'],
  [/universidade estadual.*paran[aá]/i,  'Sul'],
  [/universidade.*curitiba|puc.*paran[aá]|pontificia.*paran[aá]/i, 'Sul'],
  [/santa catarina|florianópolis|blumenau|joinville|chapec[oó]/i,  'Sul'],
  [/rio grande do sul|porto alegre|pelotas|caxias do sul|santa maria/i, 'Sul'],
  [/paraná|curitiba|londrina|maring[aá]|cascavel|ponta grossa/i,   'Sul'],
  // Sudeste
  [/universidade federal de s[aã]o paulo|unifesp/i,                'Sudeste'],
  [/universidade federal fluminense|uff\b/i,                       'Sudeste'],
  [/universidade federal do rio de janeiro|ufrj\b/i,               'Sudeste'],
  [/universidade federal de minas gerais|ufmg\b/i,                 'Sudeste'],
  [/universidade federal do esp[ií]rito santo|ufes\b/i,            'Sudeste'],
  [/universidade de s[aã]o paulo|usp\b/i,                         'Sudeste'],
  [/universidade estadual.*campinas|unicamp/i,                     'Sudeste'],
  [/s[aã]o paulo|campinas|santos|sorocaba|ribeir[aã]o preto/i,    'Sudeste'],
  [/rio de janeiro|niter[oó]i|volta redonda/i,                     'Sudeste'],
  [/minas gerais|belo horizonte|vi[cç]osa|uberl[aâ]ndia|juiz de fora/i, 'Sudeste'],
  [/esp[ií]rito santo|vit[oó]ria|cachoeiro/i,                     'Sudeste'],
  // Nordeste
  [/universidade federal da bahia|ufba\b/i,                        'Nordeste'],
  [/universidade federal de pernambuco|ufpe\b/i,                   'Nordeste'],
  [/universidade federal do cear[aá]|ufc\b/i,                     'Nordeste'],
  [/universidade federal do maranh[aã]o|ufma\b/i,                 'Nordeste'],
  [/universidade federal do piau[ií]|ufpi\b/i,                    'Nordeste'],
  [/universidade federal da para[ií]ba|ufpb\b/i,                  'Nordeste'],
  [/universidade federal do rio grande do norte|ufrn\b/i,          'Nordeste'],
  [/bahia|salvador|feira de santana|il[hé][eé]us/i,               'Nordeste'],
  [/pernambuco|recife|caruaru|petrolina/i,                         'Nordeste'],
  [/cear[aá]|fortaleza|juazeiro do norte|sobral/i,                'Nordeste'],
  [/maranh[aã]o|s[aã]o lu[ií]s|imperatriz/i,                    'Nordeste'],
  [/piau[ií]|teresina|parnai[bv]a/i,                              'Nordeste'],
  [/para[ií]ba|jo[aã]o pessoa|campina grande/i,                   'Nordeste'],
  [/rio grande do norte|natal|mossor[oó]/i,                        'Nordeste'],
  [/sergipe|aracaju/i,                                             'Nordeste'],
  [/alagoas|macei[oó]/i,                                           'Nordeste'],
  // Norte
  [/universidade federal do amazonas|ufam\b/i,                     'Norte'],
  [/universidade federal do par[aá]|ufpa\b/i,                     'Norte'],
  [/instituto nacional de pesquisas da amaz[oô]nia|inpa/i,        'Norte'],
  [/amaz[oô]nia|manaus|bel[eé]m|santar[eé]m|porto velho/i,       'Norte'],
  [/rondônia|acre|rio branco|roraima|boa vista|amap[aá]|macap[aá]|tocantins|palmas/i, 'Norte'],
  // Centro-Oeste
  [/universidade de bras[ií]lia|unb\b/i,                          'Centro-Oeste'],
  [/universidade federal de goi[aá]s|ufg\b/i,                     'Centro-Oeste'],
  [/universidade federal de mato grosso/i,                         'Centro-Oeste'],
  [/goi[aá]s|goi[aâ]nia|an[aá]polis|rio verde/i,                 'Centro-Oeste'],
  [/mato grosso do sul|campo grande|dourados/i,                    'Centro-Oeste'],
  [/mato grosso|cuiab[aá]|rondon[oó]polis|sinop/i,                'Centro-Oeste'],
  [/bras[ií]lia|distrito federal/i,                                'Centro-Oeste'],
];

/**
 * Infere região a partir de um texto (instituição, município, etc.)
 * Usa siglas de IES primeiro (sem ambiguidade), depois padrões de nome completo.
 */
function inferirRegiao(texto) {
  if (!texto || !texto.trim()) return '';

  // 1. Siglas de IES — busca com word boundaries para evitar falsos positivos
  //    (ex: UFMA não deve bater em "INFORMAÇÃO", UFS não em "UNIVERSIDADE")
  for (const [sig, reg] of Object.entries(SIGLAS_IES)) {
    const pattern = new RegExp('\\b' + sig + '\\b', 'i');
    if (pattern.test(texto)) return reg;
  }

  // 2. Padrões de nome completo de estado/cidade/instituição
  for (const [pat, reg] of PADROES_NOME) {
    if (pat.test(texto)) return reg;
  }

  return '';
}

/**
 * Resolve região com prioridade e sinalização:
 *  - Fonte informa direto  → "Sudeste"        (sem prefixo)
 *  - Inferida do documento → "AI - Sudeste"   (sinalizado)
 *  - Não encontrada        → ""               (frontend exibe —)
 */
function resolverRegiao(regiaoDireta, inst, municipio, titulo) {
  // 1. Dado direto da fonte
  if (regiaoDireta && regiaoDireta.trim()) {
    // Normaliza nomes de região (ex: "SUDESTE" → "Sudeste")
    const norm = regiaoDireta.trim();
    const mapa = {
      'NORTE':'Norte','NORDESTE':'Nordeste','CENTRO-OESTE':'Centro-Oeste',
      'SUDESTE':'Sudeste','SUL':'Sul','CO':'Centro-Oeste','NE':'Nordeste','N':'Norte','SE':'Sudeste','S':'Sul'
    };
    return mapa[norm.toUpperCase()] || norm;
  }

  // 2. Inferência pela instituição
  if (inst) {
    const r = inferirRegiao(inst);
    if (r) return `AI - ${r}`;
  }

  // 3. Inferência pelo município do programa (CAPES)
  if (municipio) {
    const r = inferirRegiao(municipio);
    if (r) return `AI - ${r}`;
  }

  // 4. Inferência pelo título
  if (titulo) {
    const r = inferirRegiao(titulo);
    if (r) return `AI - ${r}`;
  }

  // 5. Não encontrado
  return '';
}

// ════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════════════════════
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

function normTit(raw) {
  const s = String(raw || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  if (!s) return '';
  if (s === 'masterthesis'   || /\bmestrado\b/.test(s) || /\bmaster\b/.test(s))             return 'Dissertação de Mestrado';
  if (s === 'doctoralthesis' || /\bdoutorado\b/.test(s)|| /\bdoctor\b/.test(s)||/\bphd\b/.test(s)) return 'Tese de Doutorado';
  if (/artigo|article|journal/.test(s))  return 'Artigo Científico';
  if (/\btese\b/.test(s))                return 'Tese de Doutorado';
  if (/dissertacao|dissertação/.test(s)) return 'Dissertação de Mestrado';
  if (/monografia/.test(s))              return 'Monografia';
  if (/book.chapter|capitulo/.test(s))   return 'Capítulo de Livro';
  if (/^book$/.test(s))                  return 'Livro';
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
    for (const [w, ps] of Object.entries(inv)) for (const p of ps) pos[p] = w;
    const max = Math.max(...Object.keys(pos).map(Number));
    const words = [];
    for (let i = 0; i <= max; i++) words.push(pos[i] || '');
    return words.join(' ').replace(/\s+/g, ' ').trim();
  } catch (_) { return ''; }
}

function norm15(o) {
  const kw     = limparKW(S(o.palavras_chaves));
  const tit    = normTit(o.titulacao);
  const inst   = S(o.instituicao_programa);
  const regiao = resolverRegiao(
    S(o.regiao), inst, S(o.municipio_programa), S(o.titulo_do_periodico)
  );
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

// ════════════════════════════════════════════════════════
//  CAPES — auto-detect payload
// ════════════════════════════════════════════════════════
async function searchCAPES(q, anoMin, anoMax, errors) {
  const out = [];
  const anoAtual = new Date().getFullYear();
  const URL = 'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca';
  const HDR = {
    'Content-Type': 'application/json',
    Origin  : 'https://catalogodeteses.capes.gov.br',
    Referer : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
  };
  const anoFiltro = anoMin ? [`anoDaDefesa:${anoMin}-${anoAtual}`] : [];

  const formats = [
    { filtros: anoFiltro, pesquisa: q,       pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoPesquisa: q,  pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoBusca: q,     pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, termo: q,          pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, q],            pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, busca: q,          pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, q,                 pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, `keyword:${q}`], pagina: 1, tamanho: 5 },
  ];

  let workingFmt = null, workingData = null;
  for (const fmt of formats) {
    try {
      const { data, status } = await POST(URL, fmt, HDR);
      if (status !== 200) continue;
      const total = parseInt(data.total || 0);
      const items = data.tesesDissertacoes || data.teses || data.items || [];
      if (total > 0 && total < 100000 && items.length > 0) {
        workingFmt = fmt; workingData = data;
        console.log(`[CAPES] ✓ formato encontrado | total: ${total}`);
        break;
      }
      console.log(`[CAPES probe] total=${total} — query ignorada`);
    } catch (e) { console.warn('[CAPES probe]', e.message); }
  }

  if (!workingFmt || !workingData) {
    errors.push({ fonte: 'CAPES', erro: 'Nenhum formato de payload funcionou' });
    return out;
  }

  const processItem = (it) => {
    const ano = anoFrom(S(it.anoDaDefesa || it.ano || it.anoProgramaDefesa));
    if (!okAno(ano, anoMin, anoMax)) return;
    let autor = '';
    if (Array.isArray(it.autores)) {
      autor = it.autores.map(x => typeof x === 'string' ? x.trim() : S(x.nome || x.name || x)).filter(Boolean).join('; ');
    } else {
      autor = S(it.nmAutor || it.nomeAutor || it.autor || it.autores);
    }
    const link = it.idTese
      ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese}`
      : (it.id ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.id}` : '');
    const instBase = S(it.siglaIes || it.nmIes || it.instituicao || it.nmInstituicao);
    const prog     = S(it.nomePrograma || '');
    const inst     = [instBase, prog].filter(Boolean).join(' — ');

    out.push(norm15({
      repositorio: 'CAPES', link_capes: link,
      titulo_do_periodico: S(it.titulo || it.title || it.nmTitulo),
      autor, ano_da_publicacao: ano,
      titulacao: S(it.grau || it.nivel || it.nmGrau || it.tipoProgramaAcademico),
      instituicao_programa: inst,
      municipio_programa: S(it.municipioPrograma || it.municipio || ''),
      regiao: S(it.regiao || it.nmRegiao || ''),
      resumo: S(it.resumo || it.abstract || it.dsResumo),
      palavras_chaves: Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || ''),
      link_scielo: '', revista: '', volume: '',
    }));
  };

  (workingData.tesesDissertacoes || workingData.teses || workingData.items || []).forEach(processItem);

  const totalDeclared = Math.min(parseInt(workingData.total || 0), MAX_PAGES * PER_REQ);
  let page = 2;
  while (out.length < totalDeclared && page <= MAX_PAGES) {
    try {
      const { data, status } = await POST(URL, { ...workingFmt, pagina: page, tamanho: PER_REQ }, HDR);
      if (status !== 200) break;
      const items = data.tesesDissertacoes || data.teses || data.items || [];
      if (!items.length) break;
      items.forEach(processItem);
      console.log(`[CAPES] p${page}: +${items.length} → ${out.length}`);
      if (items.length < PER_REQ) break;
      page++;
    } catch (e) { break; }
  }
  console.log(`[CAPES] ✓ ${out.length} registros`);
  return out;
}

// ════════════════════════════════════════════════════════
//  BDTD
// ════════════════════════════════════════════════════════
async function searchBDTD(q, anoMin, anoMax, errors) {
  const out = [];
  let page = 1, total = Infinity;
  while (out.length < total && page <= MAX_PAGES) {
    try {
      const { data, status } = await GET(
        `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=${page}&limit=${PER_REQ}`
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const records = data?.records || [];
      if (page === 1) {
        total = Math.min(parseInt(data?.resultCount || 0), MAX_PAGES * PER_REQ);
        console.log(`[BDTD] total: ${data?.resultCount}`);
      }
      if (!records.length) break;
      for (const r of records) {
        const titulo = S(r.title || r.cleanTitle || r.shortTitle);
        if (!titulo) continue;
        const ano = anoFrom(S((Array.isArray(r.publicationDates) ? r.publicationDates[0] : r.publicationDate) || r.year || ''));
        if (!okAno(ano, anoMin, anoMax)) continue;
        const kwRaw = Array.isArray(r.subjects) ? r.subjects.flat().map(S).filter(Boolean).join('; ') : '';
        const link  = Array.isArray(r.urls) && r.urls.length ? (r.urls[0].url || S(r.urls[0])) : '';
        const inst  = S((Array.isArray(r.institutions) ? r.institutions[0] : '') || (Array.isArray(r.publishers) ? r.publishers[0] : '') || '');
        out.push(norm15({
          repositorio: 'BDTD', link_capes: link,
          titulo_do_periodico: titulo,
          autor: parseAutores(r.authors), ano_da_publicacao: ano,
          resumo: S(Array.isArray(r.summary) ? r.summary[0] : r.summary),
          palavras_chaves: kwRaw, titulacao: S(Array.isArray(r.formats) ? r.formats[0] : r.formats),
          instituicao_programa: inst, link_scielo: '', revista: '', volume: '', regiao: '',
        }));
      }
      console.log(`[BDTD] p${page}: ${records.length} → ${out.length}/${total}`);
      if (records.length < PER_REQ) break;
      page++;
    } catch (e) { errors.push({ fonte: 'BDTD', erro: e.message }); break; }
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  SciELO
// ════════════════════════════════════════════════════════
async function searchSciELO(q, anoMin, anoMax, errors) {
  const out = [];
  let from = 0, total = Infinity, page = 1;
  while (out.length < total && page <= MAX_PAGES) {
    try {
      const { data, status } = await GET(
        `https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=${PER_REQ}&from=${from}&output=json`
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const hits = data?.hits?.hits || [];
      if (page === 1) {
        total = Math.min(parseInt(data?.hits?.total || 0), MAX_PAGES * PER_REQ);
        console.log(`[SciELO] total: ${data?.hits?.total}`);
      }
      if (!hits.length) break;
      for (const h of hits) {
        const src = h._source || {};
        const titulo = src.ti_pt || src.ti_en || src.ti_es || S(src.ti);
        if (!titulo) continue;
        const ano = anoFrom(S(src.da || src.year || src.dp));
        if (!okAno(ano, anoMin, anoMax)) continue;
        const kw = [...(Array.isArray(src.wok_subject_categories)?src.wok_subject_categories:[]),
                    ...(Array.isArray(src.mh)?src.mh:[]),
                    ...(Array.isArray(src.keyword)?src.keyword:[])].filter(Boolean).join('; ');
        const aff = Array.isArray(src.aff) ? src.aff.filter(Boolean).join('; ') : S(src.aff||'');
        out.push(norm15({
          repositorio: 'SciELO',
          link_scielo: src.doi?`https://doi.org/${src.doi}`:(Array.isArray(src.ur)?src.ur[0]:S(src.ur)),
          titulo_do_periodico: titulo, revista: S(src.ta||src.so||src.source),
          autor: Array.isArray(src.au)?src.au.join('; '):S(src.au),
          ano_da_publicacao: ano, volume: S(src.vi||src.volume),
          resumo: S(src.ab_pt||src.ab_en||src.ab_es||src.ab),
          palavras_chaves: kw, classificacao: 'Artigo Científico',
          titulacao: 'Artigo Científico', instituicao_programa: aff, link_capes: '', regiao: '',
        }));
      }
      console.log(`[SciELO] p${page}: ${hits.length} → ${out.length}/${total}`);
      if (hits.length < PER_REQ) break;
      from += PER_REQ; page++;
    } catch (e) { errors.push({ fonte: 'SciELO', erro: e.message }); break; }
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  CROSSREF
// ════════════════════════════════════════════════════════
async function searchCrossref(q, anoMin, anoMax, errors) {
  const out = [];
  let offset = 0, total = Infinity, page = 1;
  const filtroAno = anoMin ? `&filter=from-pub-date:${anoMin}` : '';
  while (out.length < total && page <= MAX_PAGES) {
    try {
      const { data, status } = await GET(
        `https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${PER_REQ}&offset=${offset}${filtroAno}`,
        { 'User-Agent': OA_UA }
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const items = data?.message?.items || [];
      if (page === 1) {
        total = Math.min(parseInt(data?.message?.['total-results']||0), MAX_PAGES * PER_REQ);
        console.log(`[Crossref] total: ${data?.message?.['total-results']}`);
      }
      if (!items.length) break;
      for (const it of items) {
        const titulo = Array.isArray(it.title)?it.title[0]:S(it.title);
        if (!titulo) continue;
        const ano = String(it.published?.['date-parts']?.[0]?.[0]||it['published-print']?.['date-parts']?.[0]?.[0]||'');
        if (!okAno(ano,anoMin,anoMax)) continue;
        const autor  = (it.author||[]).map(x=>[x.given,x.family].filter(Boolean).join(' ')).join('; ');
        const inst   = (it.author||[]).flatMap(x=>(x.affiliation||[]).map(af=>S(af.name))).filter(Boolean).join('; ');
        const resumo = S(it.abstract||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
        out.push(norm15({
          repositorio:'Crossref',
          link_scielo:it.DOI?`https://doi.org/${it.DOI}`:'',
          titulo_do_periodico:titulo,
          revista:Array.isArray(it['container-title'])?it['container-title'][0]:S(it['container-title']),
          autor,ano_da_publicacao:ano,volume:S(it.volume),resumo,
          palavras_chaves:Array.isArray(it.subject)?it.subject.join('; '):'',
          titulacao:'Artigo Científico',
          classificacao:it.type==='journal-article'?'Artigo Científico':S(it.type),
          instituicao_programa:inst,link_capes:'',regiao:'',
        }));
      }
      console.log(`[Crossref] p${page}: ${items.length} → ${out.length}/${total}`);
      if (items.length < PER_REQ) break;
      offset += PER_REQ; page++;
    } catch (e) { errors.push({ fonte: 'Crossref', erro: e.message }); break; }
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  OPENALEX
// ════════════════════════════════════════════════════════
async function searchOpenAlex(q, anoMin, anoMax, errors) {
  const out = [];
  let page = 1, total = Infinity;
  const filtros = ['institutions.country_code:BR'];
  if (anoMin) filtros.push(`publication_year:>${anoMin-1}`);
  if (anoMax) filtros.push(`publication_year:<${anoMax+1}`);
  while (out.length < total && page <= MAX_PAGES) {
    try {
      const { data, status } = await GET(
        `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${PER_REQ}&page=${page}&sort=relevance_score:desc&filter=${filtros.join(',')}`,
        { 'User-Agent': OA_UA }, 20000
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const items = data?.results || [];
      if (page === 1) {
        total = Math.min(parseInt(data?.meta?.count||0), MAX_PAGES * PER_REQ);
        console.log(`[OpenAlex/BR] total: ${data?.meta?.count}`);
      }
      if (!items.length) break;
      for (const it of items) {
        if (!it.title) continue;
        const ano = S(it.publication_year);
        if (!okAno(ano,anoMin,anoMax)) continue;
        const autorArr = (it.authorships||[]).map(a=>S(a.author?.display_name||''));
        const instArr  = (it.authorships||[]).flatMap(a=>(a.institutions||[]).map(i=>S(i.display_name||''))).filter(Boolean);
        const inst = [...new Set(instArr)].slice(0,3).join('; ');
        const resumo = reconstructAbstract(it.abstract_inverted_index);
        const doi  = it.doi?it.doi.replace('https://doi.org/',''):'';
        const link = doi?`https://doi.org/${doi}`:(it.best_oa_location?.pdf_url||'');
        const kw   = (it.keywords||[]).map(k=>S(k.display_name||k)).filter(Boolean).join('; ');
        const tipo = it.type==='article'?'Artigo Científico':it.type==='dissertation'?'Dissertação de Mestrado':it.type==='thesis'?'Tese de Doutorado':it.type==='book-chapter'?'Capítulo de Livro':it.type==='book'?'Livro':S(it.type)||'Publicação Acadêmica';
        out.push(norm15({
          repositorio:'OpenAlex',link_scielo:link,titulo_do_periodico:S(it.title),
          revista:S(it.primary_location?.source?.display_name||''),
          autor:autorArr.filter(Boolean).join('; '),ano_da_publicacao:ano,resumo,palavras_chaves:kw,
          titulacao:tipo,classificacao:tipo,instituicao_programa:inst,link_capes:'',volume:'',regiao:'',
        }));
      }
      console.log(`[OpenAlex/BR] p${page}: ${items.length} → ${out.length}/${total}`);
      if (items.length < PER_REQ) break;
      page++;
    } catch (e) { errors.push({ fonte: 'OpenAlex', erro: e.message }); break; }
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  if (req.method !== 'GET')     { res.status(405).json({ erro: 'Método não permitido.' }); return; }

  const {
    q          = '',
    fontes     = 'capes,scielo,bdtd,crossref,openalex',
    anoMin     = '2016',
    anoMax     = '',
    pagina     = '1',
    por_pagina = '20',
    exportar   = '0',   // exportar=1 → retorna TODOS sem paginação
  } = req.query;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ erro: 'Informe ao menos 2 caracteres.' });
    return;
  }

  const anoMinInt  = parseInt(anoMin) || 2016;
  const anoMaxInt  = anoMax ? parseInt(anoMax) : null;
  const paginaInt  = Math.max(1, parseInt(pagina) || 1);
  const porPagina  = Math.min(100, Math.max(5, parseInt(por_pagina) || 20));
  const isExport   = exportar === '1';
  const errors     = [];

  console.log(`\n🔍 v14 | "${q}" | anoMin:${anoMinInt} | exportar:${isExport}`);

  const lista   = fontes.toLowerCase().split(',').map(f => f.trim());
  const tarefas = [];
  if (lista.includes('bdtd'))     tarefas.push(searchBDTD(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('capes'))    tarefas.push(searchCAPES(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('scielo'))   tarefas.push(searchSciELO(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('crossref')) tarefas.push(searchCrossref(q, anoMinInt, anoMaxInt, errors));
  if (lista.includes('openalex')) tarefas.push(searchOpenAlex(q, anoMinInt, anoMaxInt, errors));

  const settled = await Promise.allSettled(tarefas);
  const todos   = settled.filter(r => r.status === 'fulfilled').flatMap(r => r.value);

  const seen = new Set();
  const unicos = todos.filter(r => {
    const k = r.titulo_do_periodico
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim().slice(0,80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  unicos.sort((a, b) => (parseInt(b.ano_da_publicacao)||0) - (parseInt(a.ano_da_publicacao)||0));

  const porFonte = {};
  unicos.forEach(r => { porFonte[r.repositorio] = (porFonte[r.repositorio]||0) + 1; });

  const totalUnicos  = unicos.length;
  const totalPaginas = Math.ceil(totalUnicos / porPagina) || 1;

  // Exportação → retorna TODOS os registros
  const resultados = isExport
    ? unicos
    : unicos.slice((paginaInt - 1) * porPagina, paginaInt * porPagina);

  console.log(`✅ v14 | únicos:${totalUnicos} | export:${isExport} | entregando:${resultados.length}`, porFonte);

  res.status(200).json({
    versao: '14.0.0', query: q, anoMin: anoMinInt,
    pagina: paginaInt, por_pagina: porPagina,
    total_unicos: totalUnicos, total_paginas: totalPaginas,
    por_fonte: porFonte, source_errors: errors,
    exportando: isExport,
    resultados,
  });
};
