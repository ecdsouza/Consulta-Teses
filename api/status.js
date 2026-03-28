module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ status: 'ok', versao: '8.0.0', fontes: ['CAPES','SciELO','BDTD','Crossref'] });
};
