/**
 * REPOSITÓRIO ACADÊMICO v14
 * Correções:
 *  ✅ Filtro de tipo: normaliza acentos antes de comparar
 *  ✅ Região: fallback "AI + [descrição]" quando não encontrada
 *  ✅ CAPES: testa 8 formatos de payload + detecta resultado inválido
 *  ✅ Todos os campos mapeados corretamente
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
//  MAPA DE REGIÕES
// ════════════════════════════════════════════════════════
const REGIOES = {
  // Norte
  UFAM:'Norte',UFPA:'Norte',UNIR:'Norte',UFAC:'Norte',UFRR:'Norte',
  UFRA:'Norte',UNIFAP:'Norte',UEA:'Norte',UEAP:'Norte',
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
  UENF:'Sudeste',UEMG:'Sudeste',CEFETMG:'Sudeste',CEFET:'Sudeste',
  // Sul
  UFSC:'Sul',UFRGS:'Sul',UFPR:'Sul',FURG:'Sul',UFPEL:'Sul',
  UFSM:'Sul',UNIPAMPA:'Sul',UTFPR:'Sul',UFFS:'Sul',
  PUCRS:'Sul',PUCPR:'Sul',UNISINOS:'Sul',FURB:'Sul',UDESC:'Sul',
  UEL:'Sul',UEM:'Sul',UEPG:'Sul',UNIOESTE:'Sul',UENP:'Sul',UNESPAR:'Sul',
};

// Cidades/estados BR → região
const CIDADES = [
  [/santa catarina|florianópolis|blumenau|joinville|chapecó/i,         'Sul'],
  [/rio grande do sul|porto alegre|pelotas|caxias do sul|santa maria/i,'Sul'],
  [/paraná|curitiba|londrina|maringá|cascavel|ponta grossa/i,          'Sul'],
  [/são paulo|campinas|santos|sorocaba|ribeirão preto|são josé/i,      'Sudeste'],
  [/rio de janeiro|niterói|volta redonda|campos dos/i,                  'Sudeste'],
  [/minas gerais|belo horizonte|viçosa|uberlândia|juiz de fora/i,     'Sudeste'],
  [/espírito santo|vitória|cachoeiro/i,                                 'Sudeste'],
  [/bahia|salvador|feira de santana|ilhéus|jequié/i,                   'Nordeste'],
  [/pernambuco|recife|caruaru|petrolina/i,                             'Nordeste'],
  [/ceará|fortaleza|juazeiro do norte|sobral/i,                        'Nordeste'],
  [/maranhão|são luís|imperatriz/i,                                    'Nordeste'],
  [/piauí|teresina|parnaíba/i,                                         'Nordeste'],
  [/paraíba|joão pessoa|campina grande/i,                              'Nordeste'],
  [/rio grande do norte|natal|mossoró/i,                               'Nordeste'],
  [/sergipe|aracaju/i,                                                  'Nordeste'],
  [/alagoas|maceió/i,                                                   'Nordeste'],
  [/amazonas|manaus|parintins/i,                                       'Norte'],
  [/pará|belém|santarém|marabá/i,                                      'Norte'],
  [/rondônia|porto velho/i,                                             'Norte'],
  [/acre|rio branco/i,                                                  'Norte'],
  [/roraima|boa vista/i,                                                'Norte'],
  [/amapá|macapá/i,                                                     'Norte'],
  [/tocantins|palmas/i,                                                 'Norte'],
  [/goiás|goiânia|anápolis|rio verde/i,                                'Centro-Oeste'],
  [/mato grosso|cuiabá|rondonópolis|sinop/i,                           'Centro-Oeste'],
  [/mato grosso do sul|campo grande|dourados/i,                        'Centro-Oeste'],
  [/brasília|distrito federal|taguatinga|ceilândia/i,                  'Centro-Oeste'],
];

/**
 * Infere região de uma string (instituição, município, etc.)
 * Retorna string vazia se não encontrar.
 */
function inferirRegiao(texto) {
  if (!texto) return '';
  const u = texto.toUpperCase();
  // Tenta pela sigla da IES
  for (const [sig, reg] of Object.entries(REGIOES)) {
    if (u.includes(sig)) return reg;
  }
  // Tenta pelo nome da cidade/estado
  for (const [pattern, reg] of CIDADES) {
    if (pattern.test(texto)) return reg;
  }
  return '';
}

/**
 * Tenta inferir região a partir de múltiplas fontes do registro.
 * Se não encontrar, retorna "AI + [pista encontrada]" ou "AI + não identificado".
 */
function resolverRegiao(regiaoDireta, inst, municipio, titulo) {
  // 1. Se veio direto da fonte
  if (regiaoDireta && regiaoDireta.trim()) {
    const r = inferirRegiao(regiaoDireta) || regiaoDireta.trim();
    return r;
  }
  // 2. Pela instituição
  if (inst) {
    const r = inferirRegiao(inst);
    if (r) return r;
  }
  // 3. Pelo município do programa
  if (municipio) {
    const r = inferirRegiao(municipio);
    if (r) return r;
    // Retorna AI com o município identificado
    return `AI + ${municipio}`;
  }
  // 4. Pelo título (busca nomes de estados)
  if (titulo) {
    const r = inferirRegiao(titulo);
    if (r) return r;
  }
  // 5. Pela instituição com AI hint
  if (inst) {
    // Pega sigla ou primeiro token relevante da instituição
    const hint = inst.split(/[,\-—]/)[0].trim().slice(0, 40);
    return `AI + ${hint}`;
  }
  return 'AI + não identificado';
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

/** Remove acentos e converte para lowercase — para comparação de filtros */
function norm(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normTit(raw) {
  const s = norm(raw);
  if (!s) return '';
  if (s === 'masterthesis'   || /\bmestrado\b/.test(s) || /\bmaster\b/.test(s))            return 'Dissertação de Mestrado';
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

/** Monta registro final com 15 colunas */
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
//  CAPES — payload auto-detection
// ════════════════════════════════════════════════════════
async function searchCAPES(q, anoMin, anoMax, errors) {
  const out = [];
  const anoAtual = new Date().getFullYear();
  const URL  = 'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca';
  const HDR  = {
    'Content-Type': 'application/json',
    Origin  : 'https://catalogodeteses.capes.gov.br',
    Referer : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
  };

  // Filtro de ano para incluir nos payloads
  const anoFiltro = anoMin ? [`anoDaDefesa:${anoMin}-${anoAtual}`] : [];

  // 8 formatos diferentes — testados até o total ser razoável (< 100k)
  const formats = [
    // Formatos observados via inspeção do Network do Chrome no site CAPES
    { filtros: anoFiltro, pesquisa: q,               pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoPesquisa: q,           pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoBusca: q,              pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, termo: q,                   pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, q],                     pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, busca: q,                   pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, q,                          pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, `keyword:${q}`],        pagina: 1, tamanho: 5 },
  ];

  let workingFmt  = null;
  let workingData = null;

  for (const fmt of formats) {
    try {
      const { data, status } = await POST(URL, fmt, HDR);
      if (status !== 200) continue;
      const total = parseInt(data.total || data.totalItens || 0);
      const items = data.tesesDissertacoes || data.teses || data.items || [];
      // Total < 100k = a busca foi filtrada (não retornou tudo)
      if (total > 0 && total < 100000 && items.length > 0) {
        workingFmt  = fmt;
        workingData = data;
        console.log(`[CAPES] ✓ formato: ${JSON.stringify(fmt).slice(0,70)} | total: ${total}`);
        break;
      }
      console.log(`[CAPES probe] total=${total} (query provavelmente ignorada)`);
    } catch (e) { console.warn('[CAPES probe]', e.message); }
  }

  if (!workingFmt || !workingData) {
    errors.push({ fonte: 'CAPES', erro: 'Nenhum formato de payload funcionou (query pode estar sendo ignorada pela API)' });
    return out;
  }

  // Processa primeira página
  const normalizeItems = (items) => {
    for (const it of items) {
      const ano = anoFrom(S(it.anoDaDefesa || it.ano || it.anoProgramaDefesa));
      if (!okAno(ano, anoMin, anoMax)) continue;

      let autor = '';
      if (Array.isArray(it.autores)) {
        autor = it.autores.map(x => typeof x === 'string' ? x.trim() : S(x.nome || x.name || x)).filter(Boolean).join('; ');
      } else {
        autor = S(it.nmAutor || it.nomeAutor || it.autor || it.autores);
      }

      const link = it.idTese
        ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese}`
        : (it.id ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.id}` : '');

      const inst = [
        S(it.siglaIes || it.nmIes || it.instituicao || it.nmInstituicao),
        S(it.nomePrograma || ''),
      ].filter(Boolean).join(' — ');

      out.push(norm15({
        repositorio: 'CAPES', link_capes: link,
        titulo_do_periodico: S(it.titulo || it.title || it.nmTitulo),
        autor,
        ano_da_publicacao: ano,
        titulacao: S(it.grau || it.nivel || it.nmGrau || it.tipoProgramaAcademico),
        instituicao_programa: inst,
        municipio_programa: S(it.municipioPrograma || it.municipio || ''),
        regiao: S(it.regiao || it.nmRegiao || ''),
        resumo: S(it.resumo || it.abstract || it.dsResumo),
        palavras_chaves: Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || ''),
        link_scielo: '', revista: '', volume: '',
      }));
    }
  };

  normalizeItems(workingData.tesesDissertacoes || workingData.teses || workingData.items || []);

  // Busca páginas adicionais
  const totalDeclared = Math.min(parseInt(workingData.total || 0), MAX_PAGES * PER_REQ);
  let page = 2;

  while (out.length < totalDeclared && page <= MAX_PAGES) {
    try {
      const nextFmt = { ...workingFmt, pagina: page, tamanho: PER_REQ };
      const { data, status } = await POST(URL, nextFmt, HDR);
      if (status !== 200) break;
      const moreItems = data.tesesDissertacoes || data.teses || data.items || [];
      if (!moreItems.length) break;
      normalizeItems(moreItems);
      console.log(`[CAPES] p${page}: +${moreItems.length} → total: ${out.length}`);
      if (moreItems.length < PER_REQ) break;
      page++;
    } catch (e) { break; }
  }

  console.log(`[CAPES] ✓ ${out.length} registros`);
  return out;
}

// ════════════════════════════════════════════════════════
//  BDTD — VuFind REST, todas as páginas
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
        console.log(`[BDTD] total: ${data?.resultCount} | cap: ${total}`);
      }
      if (!records.length) break;

      for (const r of records) {
        const titulo = S(r.title || r.cleanTitle || r.shortTitle);
        if (!titulo) continue;
        const ano = anoFrom(S(
          (Array.isArray(r.publicationDates) ? r.publicationDates[0] : r.publicationDate) || r.year || ''
        ));
        if (!okAno(ano, anoMin, anoMax)) continue;

        const kwRaw = Array.isArray(r.subjects) ? r.subjects.flat().map(S).filter(Boolean).join('; ') : '';
        const link  = Array.isArray(r.urls) && r.urls.length ? (r.urls[0].url || S(r.urls[0])) : '';
        const inst  = S((Array.isArray(r.institutions) ? r.institutions[0] : '') || (Array.isArray(r.publishers) ? r.publishers[0] : '') || '');

        out.push(norm15({
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
      console.log(`[BDTD] p${page}: ${records.length} → coletado: ${out.length}/${total}`);
      if (records.length < PER_REQ) break;
      page++;
    } catch (e) {
      errors.push({ fonte: 'BDTD', erro: e.message });
      break;
    }
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
        console.log(`[SciELO] total: ${data?.hits?.total} | cap: ${total}`);
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
        ].filter(Boolean).join('; ');

        const aff = Array.isArray(src.aff) ? src.aff.filter(Boolean).join('; ') : S(src.aff || '');

        out.push(norm15({
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
      console.log(`[SciELO] p${page}: ${hits.length} → coletado: ${out.length}/${total}`);
      if (hits.length < PER_REQ) break;
      from += PER_REQ; page++;
    } catch (e) {
      errors.push({ fonte: 'SciELO', erro: e.message });
      break;
    }
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
        total = Math.min(parseInt(data?.message?.['total-results'] || 0), MAX_PAGES * PER_REQ);
        console.log(`[Crossref] total: ${data?.message?.['total-results']} | cap: ${total}`);
      }
      if (!items.length) break;

      for (const it of items) {
        const titulo = Array.isArray(it.title) ? it.title[0] : S(it.title);
        if (!titulo) continue;
        const ano = String(it.published?.['date-parts']?.[0]?.[0] || it['published-print']?.['date-parts']?.[0]?.[0] || '');
        if (!okAno(ano, anoMin, anoMax)) continue;

        const autor  = (it.author || []).map(x => [x.given, x.family].filter(Boolean).join(' ')).join('; ');
        const inst   = (it.author || []).flatMap(x => (x.affiliation || []).map(af => S(af.name))).filter(Boolean).join('; ');
        const resumo = S(it.abstract || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        out.push(norm15({
          repositorio: 'Crossref',
          link_scielo: it.DOI ? `https://doi.org/${it.DOI}` : '',
          titulo_do_periodico: titulo,
          revista: Array.isArray(it['container-title']) ? it['container-title'][0] : S(it['container-title']),
          autor, ano_da_publicacao: ano, volume: S(it.volume),
          resumo, palavras_chaves: Array.isArray(it.subject) ? it.subject.join('; ') : '',
          titulacao: 'Artigo Científico',
          classificacao: it.type === 'journal-article' ? 'Artigo Científico' : S(it.type),
          instituicao_programa: inst, link_capes: '', regiao: '',
        }));
      }
      console.log(`[Crossref] p${page}: ${items.length} → coletado: ${out.length}/${total}`);
      if (items.length < PER_REQ) break;
      offset += PER_REQ; page++;
    } catch (e) {
      errors.push({ fonte: 'Crossref', erro: e.message });
      break;
    }
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  OPENALEX — foco Brasil
// ════════════════════════════════════════════════════════
async function searchOpenAlex(q, anoMin, anoMax, errors) {
  const out = [];
  let page = 1, total = Infinity;

  const filtros = ['institutions.country_code:BR'];
  if (anoMin) filtros.push(`publication_year:>${anoMin - 1}`);
  if (anoMax) filtros.push(`publication_year:<${anoMax + 1}`);

  while (out.length < total && page <= MAX_PAGES) {
    try {
      const { data, status } = await GET(
        `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${PER_REQ}&page=${page}&sort=relevance_score:desc&filter=${filtros.join(',')}`,
        { 'User-Agent': OA_UA }, 20000
      );
      if (status !== 200) throw new Error(`HTTP ${status}`);
      const items = data?.results || [];
      if (page === 1) {
        total = Math.min(parseInt(data?.meta?.count || 0), MAX_PAGES * PER_REQ);
        console.log(`[OpenAlex/BR] total: ${data?.meta?.count} | cap: ${total}`);
      }
      if (!items.length) break;

      for (const it of items) {
        if (!it.title) continue;
        const ano = S(it.publication_year);
        if (!okAno(ano, anoMin, anoMax)) continue;

        const autorArr = (it.authorships || []).map(a => S(a.author?.display_name || ''));
        const instArr  = (it.authorships || []).flatMap(a => (a.institutions || []).map(i => S(i.display_name || ''))).filter(Boolean);
        const inst     = [...new Set(instArr)].slice(0, 3).join('; ');
        const resumo   = reconstructAbstract(it.abstract_inverted_index);
        const doi      = it.doi ? it.doi.replace('https://doi.org/', '') : '';
        const link     = doi ? `https://doi.org/${doi}` : (it.best_oa_location?.pdf_url || '');
        const kw       = (it.keywords || []).map(k => S(k.display_name || k)).filter(Boolean).join('; ');
        const tipo     = it.type === 'article'     ? 'Artigo Científico'
                       : it.type === 'dissertation'? 'Dissertação de Mestrado'
                       : it.type === 'thesis'      ? 'Tese de Doutorado'
                       : it.type === 'book-chapter'? 'Capítulo de Livro'
                       : it.type === 'book'        ? 'Livro'
                       : S(it.type) || 'Publicação Acadêmica';

        out.push(norm15({
          repositorio: 'OpenAlex', link_scielo: link,
          titulo_do_periodico: S(it.title),
          revista: S(it.primary_location?.source?.display_name || ''),
          autor: autorArr.filter(Boolean).join('; '),
          ano_da_publicacao: ano, resumo, palavras_chaves: kw,
          titulacao: tipo, classificacao: tipo,
          instituicao_programa: inst, link_capes: '', volume: '', regiao: '',
        }));
      }
      console.log(`[OpenAlex/BR] p${page}: ${items.length} → coletado: ${out.length}/${total}`);
      if (items.length < PER_REQ) break;
      page++;
    } catch (e) {
      errors.push({ fonte: 'OpenAlex', erro: e.message });
      break;
    }
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
  } = req.query;

  if (!q || q.trim().length < 2) {
    res.status(400).json({ erro: 'Informe ao menos 2 caracteres.' });
    return;
  }

  const anoMinInt = parseInt(anoMin) || 2016;
  const anoMaxInt = anoMax ? parseInt(anoMax) : null;
  const paginaInt = Math.max(1, parseInt(pagina) || 1);
  const porPagina = Math.min(100, Math.max(5, parseInt(por_pagina) || 20));
  const errors    = [];

  console.log(`\n🔍 v14 | "${q}" | anoMin:${anoMinInt} | fontes:${fontes}`);

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
      .replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim().slice(0, 80);
    if (!k || seen.has(k)) return false;
    seen.add(k); return true;
  });

  unicos.sort((a, b) => (parseInt(b.ano_da_publicacao)||0) - (parseInt(a.ano_da_publicacao)||0));

  const porFonte = {};
  unicos.forEach(r => { porFonte[r.repositorio] = (porFonte[r.repositorio] || 0) + 1; });

  const totalUnicos  = unicos.length;
  const totalPaginas = Math.ceil(totalUnicos / porPagina) || 1;
  const inicio       = (paginaInt - 1) * porPagina;
  const resultados   = unicos.slice(inicio, inicio + porPagina);

  console.log(`✅ v14 | bruto:${todos.length} | únicos:${totalUnicos} | p${paginaInt}/${totalPaginas}`, porFonte);
  if (errors.length) console.log('⚠️', errors);

  res.status(200).json({
    versao: '14.0.0', query: q, anoMin: anoMinInt,
    pagina: paginaInt, por_pagina: porPagina,
    total_unicos: totalUnicos, total_paginas: totalPaginas,
    por_fonte: porFonte, source_errors: errors, resultados,
  });
};
