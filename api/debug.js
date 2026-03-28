const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const q = req.query.q || 'projeto alvorada';

  const out = {};

  // BDTD VuFind — mostra TODOS os campos do primeiro registro
  try {
    const { data } = await axios.get(
      `https://bdtd.ibict.br/vufind/api/v1/search?lookfor=${encodeURIComponent(q)}&type=AllFields&sort=relevance&page=1&limit=2`,
      { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }
    );
    out.bdtd_vufind_status = 'ok';
    out.bdtd_total = data?.resultCount || 0;
    out.bdtd_record_0 = data?.records?.[0] || null;
    out.bdtd_record_keys = data?.records?.[0] ? Object.keys(data.records[0]) : [];
  } catch (e) {
    out.bdtd_vufind_error = e.message;
  }

  // BDTD OAI — primeiros 500 chars
  try {
    const { data } = await axios.get(
      `https://bdtd.ibict.br/vufind/OAI/Server?verb=Search&query=${encodeURIComponent(q)}&queryType=AllFields&limit=1`,
      { timeout: 15000, headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    out.bdtd_oai_status = 'ok';
    out.bdtd_oai_preview = data.slice(0, 1000);
  } catch (e) {
    out.bdtd_oai_error = e.message;
  }

  res.json(out);
};
