# Publicar Pulse no GitHub Pages

O Pulse pode rodar em **modo demo** (mock + localStorage, sem Power Apps SDK).
Ideal pra apresentar à liderança sem precisar do tenant Power Platform.

---

## O que está pronto no projeto

| Arquivo | Função |
|---|---|
| `src/data/demandService.demo.ts` | Alias do mock pro modo demo (Vite substitui no build) |
| `vite.config.ts` | Detecta `VITE_DEMO_MODE=true` → ativa base relativa, desliga plugin Power Apps, aplica alias |
| `package.json` → `build:demo` | `cross-env VITE_DEMO_MODE=true vite build --outDir dist-demo` |
| `src/auth/AuthContext.tsx` | Login mockado: usuário **sambini** / senha **LIt@2020** |
| `src/pages/LoginPage.tsx` | Tela de login com tema Abbott |
| `.github/workflows/deploy.yml` | CI/CD: build + publica no GitHub Pages automaticamente em push pra `main` |

---

## Passo a passo

### 1. Criar o repositório no GitHub

```bash
cd "c:/ARDX Finaneiro/Demand System"
git init
git add .
git commit -m "Initial commit — Pulse"
gh repo create pulse-demand-hub --public --source=. --remote=origin --push
```

Ou pela UI do GitHub:
1. github.com → New repository → nome (ex: `pulse-demand-hub`) → Public → Create
2. Local:
   ```bash
   git init
   git remote add origin https://github.com/<seu-usuario>/pulse-demand-hub.git
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git push -u origin main
   ```

### 2. Habilitar o GitHub Pages

1. No repo: **Settings → Pages**
2. **Source**: selecione **GitHub Actions** (NÃO "Deploy from a branch")
3. Salvar

### 3. Disparar o primeiro deploy

O workflow roda automaticamente a cada push em `main`.
Você também pode disparar manualmente:

1. **Actions** → "Deploy Pulse to GitHub Pages" → **Run workflow**

Acompanhe a build (1-2 min). Quando terminar, a URL aparece em:
**Settings → Pages → "Your site is live at https://<usuario>.github.io/pulse-demand-hub/"**

---

## Acessar a demo

1. Abra a URL do GitHub Pages
2. Login:
   - **Usuário:** `sambini`
   - **Senha:** `LIt@2020`
3. As 18 demandas fictícias aparecem automaticamente (criadas no localStorage)

> **Reset do demo:** no app, vá em **Administração → Reset local** para limpar e
> recarregar os dados originais.

---

## O que muda entre os modos

| | `npm run dev` (local) | `build` (Power Apps) | `build:demo` (GitHub Pages) |
|---|---|---|---|
| Dados | Mock + localStorage | Dataverse | Mock + localStorage |
| Auth | Sem login | Tenant Abbott | Login mockado |
| URL base | `/` | `/` (Power Apps host) | `./` (relativa) |
| Power Apps SDK | Desligado | Ligado | Desligado |
| Plugin Vite Power Apps | Ligado | Ligado | Desligado |
| Push CLI | `pac code push` | `pac code push` | `git push` |

---

## Testar o build demo localmente

```bash
npm run build:demo       # gera dist-demo/
npm run preview:demo     # serve em http://localhost:4173
```

---

## Atualizar a demo após mudanças

Cada `git push origin main` redeploya automaticamente via GitHub Actions.
A propagação pode levar ~1 minuto após a build terminar.
