# 🚀 Guia de Deploy no Vercel

## ✅ Passo 1: GitHub Push Concluído

Suas mudanças foram enviadas para GitHub:
```
commit: 4c6fb72
branch: main
repositório: https://github.com/ecdsouza/Consulta-Teses
```

---

## 📋 Passo 2: Deploy no Vercel (3 opções)

### **Opção A: Web UI (Mais Fácil - Recomendado)**

1. Acesse: https://vercel.com/dashboard
2. Clique em **"Add New..."** → **"Project"**
3. Selecione seu repositório `ecdsouza/Consulta-Teses`
4. Vercel detectará automaticamente:
   - Framework: Next.js / Node.js
   - Build command: `npm install`
   - Output directory: `/`

5. **IMPORTANTE:** Antes de clicar "Deploy", configure Environment Variables:
   - Clique em **"Environment Variables"**
   - Adicione:
     ```
     CAPES_LOGIN = seu_cpf_ou_email
     CAPES_SENHA = sua_senha_gov_br
     CORS_ORIGIN = seu-dominio.vercel.app
     ```
   - Clique **"Deploy"**

6. Vercel iniciará o deploy automaticamente 🎉

---

### **Opção B: Vercel CLI (Mais Controle)**

```bash
# 1. Instalar Vercel CLI
npm install -g vercel

# 2. Fazer login
vercel login

# 3. Fazer deploy
cd "c:\RepositoriosGitHub\Consulta Teses\Consulta-Teses"
vercel

# 4. Responder às perguntas:
# - Set up and deploy "~/path/to/project"? → Y
# - Which scope? → Selecionar sua conta
# - Link to existing project? → N (primeira vez)
# - What's your project's name? → Consulta-Teses
# - In which directory is your code? → . (current)
# - Want to modify vercel.json? → N

# 5. Configurar environment variables no dashboard depois
```

---

### **Opção C: GitHub Integration (Automático)**

1. Acesse: https://vercel.com/dashboard
2. Clique em **"New Project"**
3. Selecione **"Import Git Repository"**
4. Busque por `Consulta-Teses`
5. Configure Environment Variables
6. Clique **"Deploy"**
7. **Cada commit em `main` fará deploy automático!**

---

## 🔐 Passo 3: Configurar Environment Variables no Vercel

### Via Dashboard:
1. Vá para projeto → **Settings** → **Environment Variables**
2. Adicione as 3 variáveis:

| Key | Value | Visibility |
|-----|-------|-----------|
| `CAPES_LOGIN` | seu_cpf (números) ou email gov.br | Production, Preview |
| `CAPES_SENHA` | sua_senha_gov_br | Production (oculto) |
| `CORS_ORIGIN` | https://seu-dominio.vercel.app | Production |

3. Clique **"Save"** após cada variável

### Via Vercel CLI:
```bash
vercel env pull
# Cria arquivo .env.local

# Edit e adicione:
# CAPES_LOGIN=seu_cpf
# CAPES_SENHA=sua_senha
# CORS_ORIGIN=https://seu-dominio.vercel.app

vercel env push
# Envia para Vercel
```

---

## ✨ Passo 4: Redeploy Após Configurar Env Vars

1. Acesse: https://vercel.com/projects
2. Selecione **Consulta-Teses**
3. Vá para **Deployments**
4. Clique no último deploy (status ✅)
5. Clique no menu **⋮** → **"Redeploy"**
6. Confirme
7. Aguarde o novo deploy com as env vars

---

## 🧪 Passo 5: Testar Deployment

### Health Check:
```bash
# Substitua por seu domínio Vercel
curl https://consulta-teses.vercel.app/api/status

# Esperado:
# {"status":"ok","versao":"8.0.0","fontes":["CAPES","SciELO","BDTD","Crossref"]}
```

### Teste no Navegador:
1. Acesse: `https://seu-dominio.vercel.app`
2. Deveria ver a interface de busca
3. Tente buscar: "educação"
4. Verifique se retorna resultados

### Teste de CORS:
```bash
curl -H "Origin: https://seu-dominio.com" \
     -H "Access-Control-Request-Method: GET" \
     https://seu-dominio.vercel.app/api/status

# Deve retornar header:
# Access-Control-Allow-Origin: https://seu-dominio.com
```

---

## 📊 Checklist de Deploy

- [x] Código commitado e pushed no GitHub
- [ ] Projeto criado no Vercel
- [ ] Environment Variables configuradas:
  - [ ] `CAPES_LOGIN`
  - [ ] `CAPES_SENHA`
  - [ ] `CORS_ORIGIN`
- [ ] Redeploy executado com env vars
- [ ] `/api/status` respondendo com JSON
- [ ] `/` carregando interface HTML
- [ ] Busca funcionando (ex: ?q=educacao)

---

## 🔗 Links Úteis

- **Vercel Dashboard:** https://vercel.com/dashboard
- **Seu Repositório:** https://github.com/ecdsouza/Consulta-Teses
- **Seu Deploy:** https://consulta-teses.vercel.app (depois de criado)

---

## 🚨 Problemas Comuns

### "API retorna 404"
- [ ] Verificar se `index.html` existe
- [ ] Redeploy o projeto

### "Erro de timeout (504)"
- [ ] Aumentou timeouts em `vercel.json` para 120s? ✓
- [ ] CAPES_LOGIN e CAPES_SENHA configuradas?
- [ ] Aguarde o redeploy completar

### "Erro CORS"
- [ ] `CORS_ORIGIN` definida corretamente?
- [ ] Redeploy executado após configurar?

### "CAPES não autentica"
- [ ] Verificar credenciais (CPF/senha)
- [ ] Testar em `/api/capes-auth?q=teste`
- [ ] Consultar gov.br se credenciais funcionam

---

## 💡 Dicas

1. **Use Deploy Preview para Testar**
   - Crie branch de teste
   - Vercel cria preview URL automático
   - Teste antes de fazer merge em `main`

2. **Monitorar Logs em Tempo Real**
   ```bash
   vercel logs
   ```

3. **Rollback se Necessário**
   - Dashboard → Deployments
   - Selecione deploy anterior
   - Clique **"Promote to Production"**

4. **Usar Custom Domain**
   - Settings → Domains
   - Adicione seu domínio (ex: consulta-teses.com)
   - Atualize `CORS_ORIGIN` em env vars

---

**Versão:** 23.1.0  
**Data:** 2026-05-16  
**Status:** Pronto para Deploy 🚀
