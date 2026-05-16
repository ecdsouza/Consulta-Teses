/**
 * scripts/upload-chromium-pack.js
 *
 * Baixa o pack do Chromium do GitHub Releases e sobe pra Vercel Blob.
 * Resultado: uma URL pública (do Blob) que o cafe-session/chromium-test
 * vão usar via env var CHROMIUM_PACK_URL — download em ~3-5s em vez de
 * estourar timeout.
 *
 * Como usar:
 *   1. npm install                            (instala @vercel/blob como devDep)
 *   2. Cria .env.local na raiz com:
 *        BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxx
 *      (pega no painel Vercel → Storage → seu Blob → .env.local Tab)
 *   3. npm run upload:chromium
 *   4. Copia a URL impressa
 *   5. Vercel → Settings → Environment Variables:
 *        CHROMIUM_PACK_URL = <URL>
 *   6. Redeploy
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// Lê .env.local manualmente (sem dotenv dep)
const envFile = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.+?)\s*$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  });
}

const VERSION = '131.0.1';
const FILENAME = `chromium-v${VERSION}-pack.x64.tar`;
const GITHUB_URL = `https://github.com/Sparticuz/chromium/releases/download/v${VERSION}/${FILENAME}`;
const LOCAL_DIR = path.join(__dirname, '..', '.tmp');
const LOCAL_PATH = path.join(LOCAL_DIR, FILENAME);

function fetchFollow(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlinkSync(dest);
        return fetchFollow(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} ao baixar ${url}`));
      }
      let downloaded = 0;
      const total = parseInt(res.headers['content-length']) || 0;
      let lastPct = -1;
      res.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total) {
          const pct = Math.floor((downloaded / total) * 100);
          if (pct > lastPct && pct % 5 === 0) {
            process.stdout.write(`  ${pct}% (${(downloaded/1024/1024).toFixed(1)} MB / ${(total/1024/1024).toFixed(1)} MB)\r`);
            lastPct = pct;
          }
        }
      });
      res.pipe(file);
      file.on('finish', () => { file.close(); console.log(''); resolve(); });
      file.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function downloadFromGitHub() {
  if (fs.existsSync(LOCAL_PATH)) {
    const size = (fs.statSync(LOCAL_PATH).size / 1024 / 1024).toFixed(1);
    console.log(`✓ Já existe localmente: ${LOCAL_PATH} (${size} MB) — pulando download.`);
    return;
  }
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  console.log(`→ Baixando ${GITHUB_URL}`);
  await fetchFollow(GITHUB_URL, LOCAL_PATH);
  const size = (fs.statSync(LOCAL_PATH).size / 1024 / 1024).toFixed(1);
  console.log(`✓ Baixado: ${LOCAL_PATH} (${size} MB)`);
}

async function uploadToBlob() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('');
    console.error('❌ BLOB_READ_WRITE_TOKEN não definido.');
    console.error('');
    console.error('Como obter:');
    console.error('  1. https://vercel.com/dashboard → consulta-teses → Storage');
    console.error('  2. Create Database → Blob → Create');
    console.error('  3. Aba ".env.local" → copia BLOB_READ_WRITE_TOKEN=vercel_blob_rw_…');
    console.error('  4. Cria .env.local na raiz deste projeto com essa linha');
    console.error('  5. Roda de novo: npm run upload:chromium');
    process.exit(1);
  }

  let put;
  try {
    ({ put } = require('@vercel/blob'));
  } catch (_) {
    console.error('@vercel/blob não instalado. Rode: npm install');
    process.exit(1);
  }

  console.log(`→ Subindo pra Vercel Blob...`);
  const data = fs.readFileSync(LOCAL_PATH);
  const blob = await put(FILENAME, data, {
    access: 'public',
    contentType: 'application/x-tar',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ Upload concluído!');
  console.log('');
  console.log(`URL pública: ${blob.url}`);
  console.log('');
  console.log('PRÓXIMOS PASSOS:');
  console.log('  1. Copia a URL acima');
  console.log('  2. Vai em vercel.com → consulta-teses → Settings → Environment Variables');
  console.log('  3. Add New → Name: CHROMIUM_PACK_URL  Value: <a URL acima>');
  console.log('  4. Apply to: Production (e Preview se quiser)');
  console.log('  5. Trigger um redeploy (Deployments → Redeploy ou git push vazio)');
  console.log('  6. Testa /api/chromium-test no site');
  console.log('═══════════════════════════════════════════════════════════');
}

(async () => {
  try {
    await downloadFromGitHub();
    await uploadToBlob();
  } catch (e) {
    console.error('\n❌ Falhou:', e.message);
    process.exit(1);
  }
})();
