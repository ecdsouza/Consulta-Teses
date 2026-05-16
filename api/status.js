module.exports = (req, res) => {
  const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Max-Age', '3600');
  res.json({ status: 'ok', versao: '8.0.0', fontes: ['CAPES','SciELO','BDTD','Crossref'] });
};
