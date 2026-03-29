/**
 * REPOSITÓRIO ACADÊMICO v19
 *
 * CAPES: autenticação via variáveis de ambiente do Vercel:
 *   CAPES_LOGIN = CPF ou e-mail
 *   CAPES_SENHA = senha
 *
 * Fluxo:
 *   1. POST no endpoint de login → obtém token/cookie
 *   2. Usa token/cookie na busca → total < 100k = query funcionou
 *   3. Se auth falhar, tenta sem auth (pode não filtrar corretamente)
 *
 * Fontes: CAPES · BDTD · SciELO · Crossref · OpenAlex
 * Servidor retorna TODOS os registros — paginação no frontend.
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
const OA_UA     = 'RepositorioAcademico/19.0 (mailto:academico@repositorio.edu.br)';
const MAX_PAGES = 10;
const PER_REQ   = 50;

async function GET(url, extra = {}, timeout = 18000) {
  return axios.get(url, { timeout, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}
async function POST(url, data, extra = {}, timeout = 15000) {
  return axios.post(url, data, { timeout, headers: { ...H, ...extra }, validateStatus: s => s < 500 });
}

// ════════════════════════════════════════════════════════
//  CAPES — autenticação + busca
// ════════════════════════════════════════════════════════

// Cache de token em memória (dura enquanto a função Vercel estiver ativa)
let _capesToken = null;
let _capesCookie = '';
let _capesTokenTs = 0;
const TOKEN_TTL = 25 * 60 * 1000; // 25 minutos

async function getCAPESAuth() {
  // Usa cache se token ainda válido
  if (_capesToken && Date.now() - _capesTokenTs < TOKEN_TTL) {
    return { token: _capesToken, cookie: _capesCookie };
  }

  const login = process.env.CAPES_LOGIN;
  const senha = process.env.CAPES_SENHA;
  if (!login || !senha) {
    console.warn('[CAPES/auth] Sem credenciais (CAPES_LOGIN / CAPES_SENHA não definidas)');
    return null;
  }

  const BASE = 'https://catalogodeteses.capes.gov.br';
  const H_AUTH = {
    ...H,
    'Content-Type': 'application/json',
    Origin  : BASE,
    Referer : `${BASE}/catalogo-teses/`,
  };

  // Tenta os endpoints de login mais prováveis
  const endpoints = [
    { url: `${BASE}/catalogo-teses/rest/autenticar`,         body: { login, senha } },
    { url: `${BASE}/catalogo-teses/rest/autenticar`,         body: { cpf: login, senha } },
    { url: `${BASE}/catalogo-teses/rest/login`,              body: { login, senha } },
    { url: `${BASE}/catalogo-teses/rest/login`,              body: { email: login, password: senha } },
    { url: `${BASE}/catalogo-teses/rest/usuario/autenticar`, body: { login, senha } },
    { url: `${BASE}/catalogo-teses/rest/auth`,               body: { username: login, password: senha } },
  ];

  for (const ep of endpoints) {
    try {
      const r = await axios.post(ep.url, ep.body, {
        timeout: 12000, headers: H_AUTH, validateStatus: () => true, maxRedirects: 5,
      });

      if (r.status === 200 || r.status === 201) {
        const bodyToken   = r.data?.token || r.data?.access_token || r.data?.jwt || r.data?.sessionToken;
        const setCookies  = r.headers['set-cookie'];
        const authHeader  = r.headers['authorization'] || r.headers['x-auth-token'];
        const token       = bodyToken || authHeader;
        const cookieStr   = setCookies ? setCookies.join('; ') : '';

        if (token || cookieStr) {
          _capesToken  = token || null;
          _capesCookie = cookieStr;
          _capesTokenTs = Date.now();
          console.log(`[CAPES/auth] ✓ login em ${ep.url.split('/').pop()} | token:${!!token} cookie:${!!cookieStr}`);
          return { token, cookie: cookieStr };
        }
      }
    } catch (_) { /* tenta próximo */ }
  }

  console.warn('[CAPES/auth] Nenhum endpoint de login funcionou');
  return null;
}

async function searchCAPES(q, anoMin, anoMax, errors) {
  const out = [];
  const anoAtual = new Date().getFullYear();
  const BASE = 'https://catalogodeteses.capes.gov.br/catalogo-teses/rest/busca';
  const anoFiltro = anoMin ? [`anoDaDefesa:${anoMin}-${anoAtual}`] : [];

  // Monta headers com autenticação (se disponível)
  const auth = await getCAPESAuth();
  const H_CAPES = {
    'Content-Type': 'application/json',
    Origin  : 'https://catalogodeteses.capes.gov.br',
    Referer : 'https://catalogodeteses.capes.gov.br/catalogo-teses/',
  };
  if (auth?.token)  H_CAPES['Authorization'] = `Bearer ${auth.token}`;
  if (auth?.cookie) H_CAPES['Cookie']         = auth.cookie;

  // Formatos de payload a testar
  const formats = [
    { filtros: anoFiltro, pesquisa: q,      pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, assunto: q,       pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, titulo: q,        pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, textoPesquisa: q, pagina: 1, tamanho: 5 },
    { filtros: [...anoFiltro, q],           pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, q,               pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, search: q,        pagina: 1, tamanho: 5 },
    { filtros: anoFiltro, palavraChave: q,  pagina: 1, tamanho: 5 },
    { filtros: [`titulo:"${q}"`, ...anoFiltro], pagina: 1, tamanho: 5 },
    { filtros: [`assunto:"${q}"`, ...anoFiltro], pagina: 1, tamanho: 5 },
    { filtros: [`all:"${q}"`, ...anoFiltro], pagina: 1, tamanho: 5 },
  ];

  let workingFmt = null, workingData = null;

  for (const fmt of formats) {
    try {
      const { data, status } = await POST(BASE, fmt, H_CAPES, 12000);
      if (status !== 200) continue;
      const total = parseInt(data?.total || 0);
      const items = data?.tesesDissertacoes || data?.teses || data?.items || [];
      if (total > 0 && total < 100000 && items.length > 0) {
        workingFmt  = fmt;
        workingData = data;
        console.log(`[CAPES] ✓ total:${total} | auth:${!!auth} | fmt:${JSON.stringify(fmt).slice(0,60)}`);
        break;
      }
      if (total >= 100000) console.log(`[CAPES] total=${total} query ignorada | auth:${!!auth}`);
    } catch (_) { /* continua */ }
  }

  if (!workingFmt || !workingData) {
    const authMsg = auth ? 'autenticado mas query ignorada' : 'sem credenciais (defina CAPES_LOGIN e CAPES_SENHA no Vercel)';
    errors.push({ fonte: 'CAPES', erro: `API não filtrou a query — ${authMsg}. Acesse /api/capes-auth para diagnóstico.` });
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
    const link = (it.idTese || it.id) ? `https://catalogodeteses.capes.gov.br/catalogo-teses/#!/detalhes/${it.idTese||it.id}` : '';
    const instBase = S(it.siglaIes || it.nmIes || it.instituicao || it.nmInstituicao);
    const prog     = S(it.nomePrograma || '');
    const rec = norm15({
      repositorio: 'CAPES', link_capes: link,
      titulo_do_periodico: S(it.titulo || it.title || it.nmTitulo),
      autor, ano_da_publicacao: ano,
      titulacao: S(it.grau || it.nivel || it.nmGrau || it.tipoProgramaAcademico),
      instituicao_programa: [instBase, prog].filter(Boolean).join(' — '),
      municipio_programa: S(it.municipioPrograma || it.municipio || ''),
      regiao: S(it.regiao || it.nmRegiao || ''),
      resumo: S(it.resumo || it.abstract || it.dsResumo),
      palavras_chaves: Array.isArray(it.palavrasChave) ? it.palavrasChave.join('; ') : S(it.palavrasChave || ''),
      link_scielo: '', revista: '', volume: '',
    });
    if (rec) out.push(rec);
  };

  (workingData.tesesDissertacoes || workingData.teses || workingData.items || []).forEach(processItem);

  // Paginação com o formato que funcionou
  const totalDeclared = Math.min(parseInt(workingData.total || 0), MAX_PAGES * PER_REQ);
  let page = 2;
  while (out.length < totalDeclared && page <= MAX_PAGES) {
    try {
      const { data, status } = await POST(BASE, { ...workingFmt, pagina: page, tamanho: PER_REQ }, H_CAPES);
      if (status !== 200) break;
      const items = data?.tesesDissertacoes || data?.teses || data?.items || [];
      if (!items.length) break;
      items.forEach(processItem);
      console.log(`[CAPES] p${page}: +${items.length} → ${out.length}`);
      if (items.length < PER_REQ) break;
      page++;
    } catch (_) { break; }
  }

  console.log(`[CAPES] ✓ ${out.length} registros`);
  return out;
}

// ════════════════════════════════════════════════════════
//  REGIÕES
// ════════════════════════════════════════════════════════
const SIGLAS_IES = {
  UFAM:'Norte',UFPA:'Norte',UNIR:'Norte',UFAC:'Norte',UFRR:'Norte',UFRA:'Norte',UNIFAP:'Norte',UEA:'Norte',UEAP:'Norte',
  UFC:'Nordeste',UFBA:'Nordeste',UFPE:'Nordeste',UFRN:'Nordeste',UFPB:'Nordeste',UFMA:'Nordeste',UFPI:'Nordeste',UFS:'Nordeste',
  UFAL:'Nordeste',UFERSA:'Nordeste',UFRPE:'Nordeste',UNEB:'Nordeste',UESC:'Nordeste',UEFS:'Nordeste',UESB:'Nordeste',
  UNIVASF:'Nordeste',UFRB:'Nordeste',UFCA:'Nordeste',UFOB:'Nordeste',
  UnB:'Centro-Oeste',UFG:'Centro-Oeste',UFMT:'Centro-Oeste',UFMS:'Centro-Oeste',UEG:'Centro-Oeste',UNEMAT:'Centro-Oeste',
  USP:'Sudeste',UNICAMP:'Sudeste',UNESP:'Sudeste',UNIFESP:'Sudeste',UFRJ:'Sudeste',UFF:'Sudeste',UERJ:'Sudeste',UFJF:'Sudeste',
  UFMG:'Sudeste',UFV:'Sudeste',UFOP:'Sudeste',UFSJ:'Sudeste',UFU:'Sudeste',UFTM:'Sudeste',UFLA:'Sudeste',UFVJM:'Sudeste',
  UNIRIO:'Sudeste',UFES:'Sudeste',IFSP:'Sudeste',IFMG:'Sudeste',IFRJ:'Sudeste',IFES:'Sudeste',UFSCar:'Sudeste',
  PUCSP:'Sudeste',PUCRJ:'Sudeste',PUCMG:'Sudeste',UENF:'Sudeste',UEMG:'Sudeste',CEFETMG:'Sudeste',
  UFSC:'Sul',UFRGS:'Sul',UFPR:'Sul',FURG:'Sul',UFPEL:'Sul',UFSM:'Sul',UNIPAMPA:'Sul',UTFPR:'Sul',UFFS:'Sul',
  PUCRS:'Sul',PUCPR:'Sul',UNISINOS:'Sul',FURB:'Sul',UDESC:'Sul',UEL:'Sul',UEM:'Sul',UEPG:'Sul',UNIOESTE:'Sul',UENP:'Sul',UNESPAR:'Sul',
};
const PADROES_NOME = [
  [/universidade federal do paran[aá]/i,'Sul'],[/santa catarina|florianópolis|blumenau/i,'Sul'],
  [/rio grande do sul|porto alegre|pelotas|caxias do sul/i,'Sul'],[/paraná|curitiba|londrina|maring[aá]/i,'Sul'],
  [/universidade de s[aã]o paulo\b/i,'Sudeste'],[/universidade estadual.*campinas|unicamp/i,'Sudeste'],
  [/s[aã]o paulo|campinas|santos|ribeir[aã]o/i,'Sudeste'],[/rio de janeiro|niter[oó]i/i,'Sudeste'],
  [/minas gerais|belo horizonte|vi[cç]osa|uberl[aâ]ndia/i,'Sudeste'],[/esp[ií]rito santo|vit[oó]ria/i,'Sudeste'],
  [/bahia|salvador|feira de santana/i,'Nordeste'],[/pernambuco|recife|caruaru/i,'Nordeste'],
  [/cear[aáà]|fortaleza/i,'Nordeste'],[/maranh[aã]o|s[aã]o lu[ií]s/i,'Nordeste'],
  [/piau[ií]|teresina/i,'Nordeste'],[/para[ií]ba|jo[aã]o pessoa|campina grande/i,'Nordeste'],
  [/rio grande do norte|natal|mossor[oó]/i,'Nordeste'],[/sergipe|aracaju/i,'Nordeste'],[/alagoas|macei[oó]/i,'Nordeste'],
  [/instituto nacional de pesquisas da amaz[oô]nia|inpa\b/i,'Norte'],
  [/universidade federal do amazonas\b/i,'Norte'],[/universidade federal do par[aáà]/i,'Norte'],
  [/universidade do estado do amazonas/i,'Norte'],[/amaz[oô]nia|manaus|bel[eé]m|santar[eé]m/i,'Norte'],
  [/rondônia|acre|rio branco|roraima|amap[aá]|tocantins/i,'Norte'],
  [/universidade de bras[ií]lia\b/i,'Centro-Oeste'],[/universidade federal de goi[aáà]s\b/i,'Centro-Oeste'],
  [/goiás|goias|goiânia|anápolis/i,'Centro-Oeste'],[/mato grosso do sul|campo grande/i,'Centro-Oeste'],
  [/mato grosso|cuiab[aá]/i,'Centro-Oeste'],[/bras[ií]lia|distrito federal/i,'Centro-Oeste'],
];

function inferirRegiao(texto) {
  if (!texto) return '';
  for (const [sig,reg] of Object.entries(SIGLAS_IES)) { if (new RegExp('\\b'+sig+'\\b','i').test(texto)) return reg; }
  for (const [pat,reg] of PADROES_NOME) { if (pat.test(texto)) return reg; }
  return '';
}
function resolverRegiao(d, inst, mun, tit) {
  if (d && d.trim()) { const m={'NORTE':'Norte','NORDESTE':'Nordeste','CENTRO-OESTE':'Centro-Oeste','SUDESTE':'Sudeste','SUL':'Sul'}; return m[d.trim().toUpperCase()]||d.trim(); }
  if (inst) { const r=inferirRegiao(inst); if(r) return `AI - ${r}`; }
  if (mun)  { const r=inferirRegiao(mun);  if(r) return `AI - ${r}`; }
  if (tit)  { const r=inferirRegiao(tit);  if(r) return `AI - ${r}`; }
  return '';
}

// ════════════════════════════════════════════════════════
//  UTILITÁRIOS
// ════════════════════════════════════════════════════════
function S(v) {
  try {
    if (v==null) return '';
    if (typeof v==='string') return v.trim();
    if (typeof v==='number') return String(v);
    if (Array.isArray(v))    return v.map(S).filter(Boolean).join('; ');
    if (typeof v==='object') {
      if (typeof v._==='string') return v._.trim();
      for (const k of ['name','nome','full_name','label','value','text','title','content','display_name']) { if(typeof v[k]==='string'&&v[k].trim()) return v[k].trim(); }
      const p=Object.values(v).filter(x=>typeof x==='string'||typeof x==='number');
      if(p.length) return p.map(String).join(' ').trim();
      return Object.values(v).map(S).filter(Boolean).join(' ').trim();
    }
    return String(v).trim();
  } catch(_){return '';}
}
function normStr(s){return String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function normTit(raw){
  const s=normStr(raw);
  if(s&&/\bbook\b|book.chapter|\blivro\b|monografia|paratext|peer.review|erratum|retraction|editorial/.test(s)) return null;
  if(s==='masterthesis'||/\bmestrado\b/.test(s)||/\bmaster\b/.test(s))    return 'Dissertação de Mestrado';
  if(s==='doctoralthesis'||/\bdoutorado\b/.test(s)||/\bdoctor\b/.test(s)||/\bphd\b/.test(s)) return 'Tese de Doutorado';
  if(/artigo|article|journal/.test(s)) return 'Artigo Científico';
  if(/\btese\b/.test(s))               return 'Tese de Doutorado';
  if(/dissertacao/.test(s))            return 'Dissertação de Mestrado';
  if(!s) return '';
  return S(raw).charAt(0).toUpperCase()+S(raw).slice(1);
}
function limparKW(raw){
  if(!raw)return'';
  return[...new Set(raw.split(/[;,|]+/).map(p=>p.trim()).filter(p=>p.length>2&&p.length<120&&!/^\d+$/.test(p)))].slice(0,8).join('; ');
}
function seletor(kw){if(!kw)return'';return kw.split('; ').filter(p=>p.length>3).slice(0,3).join('; ');}
function parseAutores(raw){
  try{
    if(!raw)return'';
    if(typeof raw==='string')return raw.trim();
    if(Array.isArray(raw))return raw.map(a=>{if(!a)return'';if(typeof a==='string')return a.trim();if(a.given_names||a.surname)return[a.given_names||'',a.surname||''].filter(Boolean).join(' ');if(a.given||a.family)return[a.given||'',a.family||''].filter(Boolean).join(' ');if(typeof a.name==='string')return a.name.trim();if(typeof a.display_name==='string')return a.display_name.trim();return S(a);}).filter(Boolean).join('; ');
    if(typeof raw==='object'){const n=[];if(raw.primary&&typeof raw.primary==='object'&&!Array.isArray(raw.primary))n.push(...Object.keys(raw.primary));if(raw.secondary&&typeof raw.secondary==='object'&&!Array.isArray(raw.secondary))Object.keys(raw.secondary).forEach(k=>{if(!n.includes(k))n.push(k);});if(n.length)return n.join('; ');const k=Object.keys(raw).filter(k=>!['_','$','role','type','corporate','secondary'].includes(k));if(k.length)return k.join('; ');}
    return'';
  }catch(_){return'';}
}
function anoFrom(v){const s=S(v);const m=s.match(/\b(19|20)\d{2}\b/);return m?m[0]:(s.length>=4?s.slice(0,4):s);}
function reconstructAbstract(inv){
  if(!inv||typeof inv!=='object')return'';
  try{const p={};for(const[w,ps]of Object.entries(inv))for(const x of ps)p[x]=w;const m=Math.max(...Object.keys(p).map(Number));const words=[];for(let i=0;i<=m;i++)words.push(p[i]||'');return words.join(' ').replace(/\s+/g,' ').trim();}catch(_){return'';}
}
function norm15(o){
  const tit=normTit(o.titulacao||o.classificacao);
  if(tit===null)return null;
  const kw=limparKW(S(o.palavras_chaves));
  const inst=S(o.instituicao_programa);
  const regiao=resolverRegiao(S(o.regiao),inst,S(o.municipio_programa),S(o.titulo_do_periodico));
  return{
    repositorio:S(o.repositorio),link_capes:S(o.link_capes),link_scielo:S(o.link_scielo),
    revista:S(o.revista),classificacao:tit||S(o.classificacao),ano_da_publicacao:S(o.ano_da_publicacao),
    volume:S(o.volume),titulo_do_periodico:S(o.titulo_do_periodico),resumo:S(o.resumo),
    palavras_chaves:kw,seletor_palavras_chaves:seletor(kw),autor:S(o.autor),titulacao:tit,
    instituicao_programa:inst,regiao,
  };
}
function okAno(a,min,max){const n=parseInt(a);if(isNaN(n))return true;if(min&&n<min)return false;if(max&&n>max)return false;return true;}

// ════════════════════════════════════════════════════════
//  BDTD
// ════════════════════════════════════════════════════════
async function searchBDTD(q,anoMin,anoMax,errors){
  const out=[];let page=1,total=Infinity;
  while(out.length<total&&page<=MAX_PAGES){
    try{
      const{data,status}=await GET(`https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=${page}&limit=${PER_REQ}`);
      if(status!==200)throw new Error(`HTTP ${status}`);
      const records=data?.records||[];
      if(page===1){total=Math.min(parseInt(data?.resultCount||0),MAX_PAGES*PER_REQ);console.log(`[BDTD] total:${data?.resultCount}`);}
      if(!records.length)break;
      for(const r of records){
        const titulo=S(r.title||r.cleanTitle||r.shortTitle);if(!titulo)continue;
        const ano=anoFrom(S((Array.isArray(r.publicationDates)?r.publicationDates[0]:r.publicationDate)||r.year||''));
        if(!okAno(ano,anoMin,anoMax))continue;
        const formats=Array.isArray(r.formats)?r.formats:(r.formats?[r.formats]:[]);
        const titRaw=formats.find(f=>f&&typeof f==='string')||'';
        const rec=norm15({repositorio:'BDTD',link_capes:Array.isArray(r.urls)&&r.urls.length?(r.urls[0].url||S(r.urls[0])):'',titulo_do_periodico:titulo,autor:parseAutores(r.authors),ano_da_publicacao:ano,resumo:S(Array.isArray(r.summary)?r.summary[0]:r.summary),palavras_chaves:Array.isArray(r.subjects)?r.subjects.flat().map(S).filter(Boolean).join('; '):'',titulacao:titRaw,instituicao_programa:S((Array.isArray(r.institutions)?r.institutions[0]:'')|| (Array.isArray(r.publishers)?r.publishers[0]:'')||''),link_scielo:'',revista:'',volume:'',regiao:'',});
        if(rec)out.push(rec);
      }
      console.log(`[BDTD] p${page}:${records.length}→${out.length}/${total}`);
      if(records.length<PER_REQ)break;page++;
    }catch(e){errors.push({fonte:'BDTD',erro:e.message});break;}
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  SciELO
// ════════════════════════════════════════════════════════
async function searchSciELO(q,anoMin,anoMax,errors){
  const out=[];let from=0,total=Infinity,page=1;
  while(out.length<total&&page<=MAX_PAGES){
    try{
      const{data,status}=await GET(`https://search.scielo.org/?q=${encodeURIComponent(q)}&lang=pt&count=${PER_REQ}&from=${from}&output=json`);
      if(status!==200)throw new Error(`HTTP ${status}`);
      const hits=data?.hits?.hits||[];
      if(page===1){total=Math.min(parseInt(data?.hits?.total||0),MAX_PAGES*PER_REQ);console.log(`[SciELO] total:${data?.hits?.total}`);}
      if(!hits.length)break;
      for(const h of hits){
        const src=h._source||{};const titulo=src.ti_pt||src.ti_en||src.ti_es||S(src.ti);if(!titulo)continue;
        const ano=anoFrom(S(src.da||src.year||src.dp));if(!okAno(ano,anoMin,anoMax))continue;
        const kw=[...(Array.isArray(src.wok_subject_categories)?src.wok_subject_categories:[]),...(Array.isArray(src.mh)?src.mh:[]),...(Array.isArray(src.keyword)?src.keyword:[])].filter(Boolean).join('; ');
        const rec=norm15({repositorio:'SciELO',link_scielo:src.doi?`https://doi.org/${src.doi}`:(Array.isArray(src.ur)?src.ur[0]:S(src.ur)),titulo_do_periodico:titulo,revista:S(src.ta||src.so||src.source),autor:Array.isArray(src.au)?src.au.join('; '):S(src.au),ano_da_publicacao:ano,volume:S(src.vi||src.volume),resumo:S(src.ab_pt||src.ab_en||src.ab_es||src.ab),palavras_chaves:kw,titulacao:'Artigo Científico',instituicao_programa:Array.isArray(src.aff)?src.aff.filter(Boolean).join('; '):S(src.aff||''),link_capes:'',regiao:'',});
        if(rec)out.push(rec);
      }
      console.log(`[SciELO] p${page}:${hits.length}→${out.length}/${total}`);
      if(hits.length<PER_REQ)break;from+=PER_REQ;page++;
    }catch(e){errors.push({fonte:'SciELO',erro:e.message});break;}
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  CROSSREF
// ════════════════════════════════════════════════════════
async function searchCrossref(q,anoMin,anoMax,errors){
  const out=[];let offset=0,total=Infinity,page=1;
  const filtroAno=anoMin?`&filter=from-pub-date:${anoMin},type:journal-article`:'&filter=type:journal-article';
  while(out.length<total&&page<=MAX_PAGES){
    try{
      const{data,status}=await GET(`https://api.crossref.org/works?query=${encodeURIComponent(q)}&rows=${PER_REQ}&offset=${offset}${filtroAno}`,{'User-Agent':OA_UA});
      if(status!==200)throw new Error(`HTTP ${status}`);
      const items=data?.message?.items||[];
      if(page===1){total=Math.min(parseInt(data?.message?.['total-results']||0),MAX_PAGES*PER_REQ);console.log(`[Crossref] total:${data?.message?.['total-results']}`);}
      if(!items.length)break;
      for(const it of items){
        const titulo=Array.isArray(it.title)?it.title[0]:S(it.title);if(!titulo)continue;
        const ano=String(it.published?.['date-parts']?.[0]?.[0]||it['published-print']?.['date-parts']?.[0]?.[0]||'');
        if(!okAno(ano,anoMin,anoMax))continue;
        const rec=norm15({repositorio:'Crossref',link_scielo:it.DOI?`https://doi.org/${it.DOI}`:'',titulo_do_periodico:titulo,revista:Array.isArray(it['container-title'])?it['container-title'][0]:S(it['container-title']),autor:(it.author||[]).map(x=>[x.given,x.family].filter(Boolean).join(' ')).join('; '),ano_da_publicacao:ano,volume:S(it.volume),resumo:S(it.abstract||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(),palavras_chaves:Array.isArray(it.subject)?it.subject.join('; '):'',titulacao:'Artigo Científico',instituicao_programa:(it.author||[]).flatMap(x=>(x.affiliation||[]).map(af=>S(af.name))).filter(Boolean).join('; '),link_capes:'',regiao:'',});
        if(rec)out.push(rec);
      }
      console.log(`[Crossref] p${page}:${items.length}→${out.length}/${total}`);
      if(items.length<PER_REQ)break;offset+=PER_REQ;page++;
    }catch(e){errors.push({fonte:'Crossref',erro:e.message});break;}
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  OPENALEX
// ════════════════════════════════════════════════════════
async function searchOA(q,anoMin,anoMax,extraFiltros,label,errors){
  const out=[];let page=1,total=Infinity;
  const filtros=['institutions.country_code:BR',...extraFiltros];
  if(anoMin)filtros.push(`publication_year:>${anoMin-1}`);
  if(anoMax)filtros.push(`publication_year:<${anoMax+1}`);
  while(out.length<total&&page<=MAX_PAGES){
    try{
      const{data,status}=await GET(`https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=${PER_REQ}&page=${page}&sort=relevance_score:desc&filter=${filtros.join(',')}`,{'User-Agent':OA_UA},20000);
      if(status!==200)throw new Error(`HTTP ${status}`);
      const items=data?.results||[];
      if(page===1){total=Math.min(parseInt(data?.meta?.count||0),MAX_PAGES*PER_REQ);console.log(`[${label}] total:${data?.meta?.count}`);}
      if(!items.length)break;
      for(const it of items){
        if(!it.title)continue;const ano=S(it.publication_year);if(!okAno(ano,anoMin,anoMax))continue;
        const autorArr=(it.authorships||[]).map(a=>S(a.author?.display_name||''));
        const instArr=(it.authorships||[]).flatMap(a=>(a.institutions||[]).map(i=>S(i.display_name||''))).filter(Boolean);
        const inst=[...new Set(instArr)].slice(0,3).join('; ');
        const doi=it.doi?it.doi.replace('https://doi.org/',''):'';
        const link=doi?`https://doi.org/${doi}`:(it.best_oa_location?.pdf_url||'');
        const kw=(it.keywords||[]).map(k=>S(k.display_name||k)).filter(Boolean).join('; ');
        const tipoMap={'dissertation':'Dissertação de Mestrado','thesis':'Tese de Doutorado','article':'Artigo Científico'};
        const rec=norm15({repositorio:'OpenAlex',link_scielo:link,titulo_do_periodico:S(it.title),revista:S(it.primary_location?.source?.display_name||''),autor:autorArr.filter(Boolean).join('; '),ano_da_publicacao:ano,resumo:reconstructAbstract(it.abstract_inverted_index),palavras_chaves:kw,titulacao:tipoMap[it.type]||it.type||'',classificacao:tipoMap[it.type]||it.type||'',instituicao_programa:inst,link_capes:'',volume:'',regiao:'',});
        if(rec)out.push(rec);
      }
      console.log(`[${label}] p${page}:${items.length}→${out.length}/${total}`);
      if(items.length<PER_REQ)break;page++;
    }catch(e){errors.push({fonte:label,erro:e.message});break;}
  }
  return out;
}

// ════════════════════════════════════════════════════════
//  HANDLER
// ════════════════════════════════════════════════════════
module.exports = async (req, res) => {
  setCORS(res);
  if (req.method==='OPTIONS'){res.status(200).end();return;}
  if (req.method!=='GET'){res.status(405).json({erro:'Método não permitido.'});return;}

  const{q='',fontes='capes,scielo,bdtd,crossref,openalex',anoMin='2016',anoMax=''}=req.query;
  if(!q||q.trim().length<2){res.status(400).json({erro:'Informe ao menos 2 caracteres.'});return;}

  const anoMinInt=parseInt(anoMin)||2016;
  const anoMaxInt=anoMax?parseInt(anoMax):null;
  const errors=[];

  console.log(`\n🔍 v19 | "${q}" | anoMin:${anoMinInt} | fontes:${fontes}`);

  const lista=fontes.toLowerCase().split(',').map(f=>f.trim());
  const tarefas=[];
  if(lista.includes('capes'))    tarefas.push(searchCAPES(q,anoMinInt,anoMaxInt,errors));
  if(lista.includes('bdtd'))     tarefas.push(searchBDTD(q,anoMinInt,anoMaxInt,errors));
  if(lista.includes('scielo'))   tarefas.push(searchSciELO(q,anoMinInt,anoMaxInt,errors));
  if(lista.includes('crossref')) tarefas.push(searchCrossref(q,anoMinInt,anoMaxInt,errors));
  if(lista.includes('openalex')){
    tarefas.push(searchOA(q,anoMinInt,anoMaxInt,['type:dissertation|thesis'],'OA/Teses',errors));
    tarefas.push(searchOA(q,anoMinInt,anoMaxInt,['type:article'],'OA/Artigos',errors));
  }

  const settled=await Promise.allSettled(tarefas);
  const todos=settled.filter(r=>r.status==='fulfilled').flatMap(r=>r.value).filter(Boolean);

  const seen=new Set();
  const resultados=todos.filter(r=>{
    const k=r.titulo_do_periodico.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9\s]/g,'').replace(/\s+/g,' ').trim().slice(0,80);
    if(!k||seen.has(k))return false;seen.add(k);return true;
  });

  resultados.sort((a,b)=>(parseInt(b.ano_da_publicacao)||0)-(parseInt(a.ano_da_publicacao)||0));

  const porFonte={},porTipo={};
  resultados.forEach(r=>{
    porFonte[r.repositorio]=(porFonte[r.repositorio]||0)+1;
    const t=r.titulacao||'Outro';porTipo[t]=(porTipo[t]||0)+1;
  });

  console.log(`✅ v19 | total:${resultados.length}`,porTipo,'|',porFonte);

  res.status(200).json({
    versao:'19.0.0',query:q,anoMin:anoMinInt,
    total:resultados.length,por_fonte:porFonte,por_tipo:porTipo,
    source_errors:errors,
    capes_autenticado:!!(_capesToken||_capesCookie),
    resultados,
  });
};
