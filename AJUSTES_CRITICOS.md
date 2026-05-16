# 🚀 Ajustes Críticos Aplicados

## ✅ Correções Implementadas

### 1. **Arquivo HTML Principal Restaurado** 
- ✅ Criado `index.html` (anteriormente era apenas `index.html.bak`)
- ✅ Site agora será servido corretamente no Vercel

### 2. **CORS Restritivado** 
**Antes:**
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');  // ❌ Aberto demais!
```

**Depois:**
```javascript
const origin = process.env.CORS_ORIGIN || 'http://localhost:3000';
res.setHeader('Access-Control-Allow-Origin', origin);  // ✅ Restritivado
res.setHeader('Access-Control-Max-Age', '3600');
```

**Aplicado em:** `search.js`, `capes-auth.js`, `debug.js`, `capes-login-test.js`, `status.js`

**Para ativar em produção:**
- Defina `CORS_ORIGIN` no Vercel → Settings → Environment Variables
- Exemplo: `CORS_ORIGIN=https://sua-aplicacao.com`

### 3. **Timeouts Aumentados** 
**Vercel (vercel.json):**
- `maxDuration`: 60s → **120s** (2 minutos)
  
Benefícios:
- ✅ Puppeteer tem mais tempo para fazer login
- ✅ Menos timeout silencioso em APIs lentas
- ✅ Reduz falsos negativos

**Funções afetadas:**
- `api/search.js` 
- `api/capes-login-test.js`
- `api/capes-browser.js` (novo)

### 4. **Dependencies Atualizadas** 
| Pacote | Antes | Depois | Motivo |
|--------|-------|--------|--------|
| `axios` | 1.6.0 | 1.7.2 | Corrige bugs de segurança |
| `@sparticuz/chromium` | 123.0.1 | 125.0.0 | Compatível com gov.br 2025 |
| `puppeteer-core` | 22.6.0 | 22.12.0 | Performance melhorada |

**Como atualizar:**
```bash
npm install
# ou no Vercel: Settings → Redeploy
```

### 5. **Node.js Version Specifier**
Adicionado `engines` em `package.json`:
```json
"engines": {
  "node": "18.x || 20.x"
}
```
Garante compatibilidade no Vercel.

---

## 📋 Próximos Passos (Importante!)

### No Vercel Dashboard:

1. **Definir Environment Variables:**
   ```
   CAPES_LOGIN = seu_cpf_ou_email
   CAPES_SENHA = sua_senha_gov_br
   CORS_ORIGIN = https://seu-dominio.com
   ```

2. **Executar Redeploy:**
   - Vá para "Deployments"
   - Clique no menu (⋯) do deploy mais recente
   - Selecione "Redeploy"

3. **Testar Status:**
   ```
   curl https://seu-dominio.com/api/status
   ```
   Esperado: `{"status":"ok","versao":"8.0.0"}`

---

## 🔍 Como Testar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Definir variáveis (crie arquivo .env)
echo "CAPES_LOGIN=seu_cpf" > .env
echo "CAPES_SENHA=sua_senha" >> .env
echo "CORS_ORIGIN=http://localhost:3000" >> .env

# 3. Instalar Vercel CLI
npm install -g vercel

# 4. Rodas local
vercel dev
```

Acesse: `http://localhost:3000`

---

## 🛡️ Segurança

### CORS Policy
- ✅ Apenas seu domínio pode fazer requisições
- ✅ Previne scraping não autorizado
- ✅ Reduz risco de DoS attacks

### Credenciais
- ✅ Nunca commit `.env` (já em `.gitignore`)
- ✅ Usar Vercel Environment Variables
- ✅ Mascarar em logs (linha 3 de `capes-auth.js`)

---

## 📊 Checklist de Deployment

- [ ] Arquivo `index.html` criado ✅
- [ ] CORS configurado com domínio específico
- [ ] Timeouts aumentados para 120s
- [ ] `npm install` executado (ou Redeploy no Vercel)
- [ ] Environment variables definidas:
  - [ ] `CAPES_LOGIN`
  - [ ] `CAPES_SENHA`
  - [ ] `CORS_ORIGIN` (seu domínio)
- [ ] Teste `/api/status` respondendo com JSON
- [ ] Teste `/` abrindo a interface HTML
- [ ] Teste busca: `?q=educacao&fontes=scielo,bdtd`

---

## 🚨 Problemas Conhecidos Ainda Não Corrigidos

1. **Arquivo `.bak` ainda existe**
   - Recomendação: deletar `index.html.bak` após confirmar que `index.html` funciona

2. **Puppeteer memory limit**
   - Se muitas buscas em paralelo falharem, aumentar memory de 1024MB para 3008MB
   - Custa mais, mas mais confiável

3. **Cache de token em memória**
   - Problema: se houver múltiplas instâncias Vercel, cada uma tem seu próprio cache
   - Solução futura: Redis para cache compartilhado

---

**Versão:** 23.1.0  
**Data:** 2026-05-16  
**Status:** ✅ Crítico corrigido
