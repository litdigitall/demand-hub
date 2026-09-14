# Intake Forms — Go-live no ambiente do cliente

Documento operacional. Cada passo tem **como fazer** e **como conferir que funcionou**.
O que depende do cliente está marcado com **[CLIENTE]**.

---

## 0. O que este app é (e o que ele não é)

**É** a ferramenta de **gestão** do funil de demandas de TI: triagem, avaliação,
decisão por área e priorização por capacidade.

**Não é** o formulário de entrada. A abertura de demanda é feita no **Canvas App
"IT Request Form"** (spec em `docs/CANVAS-INTAKE-FORM-PROMPT.md`), que grava na mesma
tabela. O app de gestão aponta para ele por um link.

**Não faz** (e por isso não aparece na tela): não envia e-mail por si só, não integra
com ServiceNow, não armazena o conteúdo de anexos. As notificações são feitas por
**Power Automate** sobre a tabela do Dataverse — ver §4.

---

## 1. Pré-requisitos [CLIENTE]

| Item | Para quê | Quem provê |
|---|---|---|
| Ambiente Power Platform com Dataverse | hospedar app + tabela | Cliente |
| Licença Power Apps Premium para os usuários do app | Code App usa Dataverse | Cliente |
| Conta de serviço (ex.: `it-intake@abbott.com`) com Send As | enviar as notificações | Cliente |
| Liberação de DLP para Dataverse + Outlook (+ Teams se usar Approvals) | os flows | Cliente |
| UPNs reais dos decisores de cada frente (Infra / AI / Apps) | roteamento do gate | Cliente |
| Power Platform CLI (`pac`) na máquina de quem publica | build e push | LIT |

---

## 2. Provisionar a tabela

```powershell
pac auth create --environment <ENVIRONMENT_ID_DO_CLIENTE>
pwsh dataverse/Setup-DemandaTable.ps1     # cria/atualiza a tabela ardx_demanda
```

O script já contempla o que faltava e **quebrava o app em produção**:

- Option set `ardx_Status` **completo** — antes tinha 6 dos 9 estados; faltavam
  `Em aprovacao` (506970007) e `Devolvida` (506970008), que são justamente o eixo do
  fluxo. Sem eles, "enviar para aprovação" e "devolver" falhavam na gravação.
- Colunas novas: `ardx_impactoabrangencia`, `ardx_clasificacion`, `ardx_rce`,
  `ardx_appid`, `ardx_statusdesde`, `ardx_requerenteupn`, `ardx_decisorupn`.
  Sem `clasificacion`, o gate era roteado pelo fallback do tipo — ou seja, **para o
  decisor errado**.

Depois de criar a tabela, regenere o modelo tipado:

```powershell
pac code add-data-source -a dataverse -t ardx_demanda
```

**Conferir:** em `src/generated/models/Ardx_demandasModel.ts` devem existir
`ardx_clasificacion` e `ardx_statusdesde`. Enquanto não existirem, o app funciona
(o acesso está isolado em `fromDv`), mas sem tipagem forte nessas colunas.

---

## 3. Publicar o app

> **Entrega como Solution:** o caminho recomendado para o ambiente do cliente é
> importar a Solution (`docs/ALM-SOLUTION.md`), não dar `pac code push` direto.
> A Solution leva as variáveis de ambiente — UPN dos decisores, conta remetente,
> URL do formulário, metas de SLA — preenchidas no import, e abre o caminho
> DEV → TEST → PROD. Os passos abaixo continuam valendo para publicar o app
> dentro do ambiente de DEV.

```powershell
npm install
npm run build          # tsc -b && vite build  → ./dist  (build REAL, com Dataverse)
pac code push
```

Antes do push, ajuste `power.config.json`:

| Campo | Valor |
|---|---|
| `appDisplayName` | `Intake Forms` (já corrigido — antes estava "Demand Hub") |
| `environmentId` | **[CLIENTE]** trocar para o ambiente do cliente |
| `appId` | deixe vazio na primeira vez: `pac code init` preenche |

> `npm run build:demo` é o build só-mock do GitHub Pages. **Não** use para o cliente.

**Conferir:** abrir o app publicado, criar uma demanda pelo Canvas e verificar na
linha do Dataverse que `ardx_scorebusinessimpact/urgency/revenue` **não** são 1 e que
`ardx_clasificacion` está preenchida.

---

## 4. Automações (Power Automate) [CLIENTE + LIT]

Todas as notificações nascem de **mudança de linha na tabela `ardx_demanda`** — nunca
do app. Motivo: rodam com o app fechado, saem da conta de serviço, e têm histórico de
execução e retry. Os campos que tornam isso simples já existem na tabela:
`ardx_statusdesde` (relógio de SLA) e `ardx_requerenteupn` / `ardx_decisorupn`
(destinatário direto, sem join).

| # | Flow | Gatilho | Quem recebe | Conteúdo mínimo |
|---|---|---|---|---|
| N1 | Nova demanda | linha criada | PMO + confirmação ao solicitante | nº, título, área, score, link |
| N2 | Aceita na triagem | `ardx_status` → 506970001 | Time técnico | nº, título, prazo desejado |
| N3 | Enviada para aprovação | `ardx_status` → 506970007 | Decisor da área (`ardx_decisorupn`) | nº, título, score, horas, time |
| N4 | Decidida | `ardx_status` → 506970002 ou 506970005 | Solicitante + PMO | decisão + justificativa |
| N5 | SLA estourando | agendado (diário) | Quem está com a bola | itens com `ardx_statusdesde` > X dias |

Sugestão para o N5: 3 dias úteis em triagem, 5 em avaliação, 3 na decisão.

**Conferir cada flow:** criar uma demanda de teste e percorrer o fluxo inteiro; cada
transição deve gerar exatamente um e-mail, para a pessoa certa, com o link abrindo a
demanda correta.

---

## 5. Configuração por ambiente (3 pontos, todos no código)

Não há tela de administração para nada disso: é configuração de deploy, revisada em
code review, e não algo que alguém muda por engano numa tarde.

### 5.1 Quem é quem — `src/auth/papeis.ts` **[CLIENTE fornece os e-mails]**

Mapa explícito de e-mail → papéis. Quem não estiver na lista entra como **Requester**
e enxerga apenas as próprias demandas.

```ts
export const PAPEIS_POR_EMAIL: Record<string, Role[]> = {
  "pmo.ti@abbott.com": [Role.PMO],
  "sambini@abbott.com": [Role.Decisor],   // + DECISOR_POR_EMAIL abaixo
  ...
};
export const DECISOR_POR_EMAIL: Record<string, Categoria[]> = {
  "sambini@abbott.com": ["infra"],
  "gabriela@abbott.com": ["app"],
  "ai.decisor@abbott.com": ["ia"],
};
```

**Conferir:** entrar com um usuário comum e checar que ele vê só as demandas dele, sem
os menus Overview / Capacity / Settings.

### 5.2 Link do formulário — `VITE_INTAKE_FORM_URL`

O botão **New request** aponta para o Canvas "IT Request Form". Defina a variável no
build:

```powershell
$env:VITE_INTAKE_FORM_URL = "https://apps.powerapps.com/play/e/<env>/a/<appid>"
npm run build
```

Sem a variável o app usa o formulário interno em `/solicitar` (mesmas perguntas, mesma
gravação) — nunca fica sem porta de entrada.

### 5.3 Roteamento e capacidade — `src/data/types.ts`

`CATEGORIA_RESPONSAVEL` (frente → decisor), `AREA_STAKEHOLDER` (área → sponsor) e
`CAPACIDADE_PADRAO_HORAS` (horas/mês por time). Aparecem em **Settings → Routing** como
leitura, exatamente como estão no código.

> **Settings → Catalogs** fica somente leitura em produção de propósito: a lista de
> áreas hoje mora no navegador (localStorage), então editar ali só valeria para quem
> clicou. Vira editável quando existirem as tabelas de catálogo no Dataverse.

---

## 6. Papéis e acesso

Os papéis do app (Requester · PMO · Technical Team · Area Decisor · Admin) hoje são
resolvidos por persona no build de demonstração e pela identidade do host do Power
Apps no build de produção (`src/auth/identity.ts`).

**[CLIENTE]** Para o gating valer de verdade em produção é preciso, além disso,
configurar os **security roles do Dataverse** na tabela `ardx_demanda` (leitura para
todos, escrita conforme o papel) — a guarda de rota do app protege a navegação, mas
quem protege o dado é o Dataverse.

---

## 6.1 Avaliar as telas com volume (opcional, só em dev/demo)

As 5 demandas-semente não exercitam nada do que depende de volume: SLA, "parada
há N dias", cabeçalho fixo, capacidade estourada. Para ver as telas como o
cliente vai ver depois de um mês de uso:

1. abra o app e faça login
2. F12 → Console
3. cole o conteúdo de `scripts/carregar-volume.js` e dê Enter

Carrega 48 demandas clonadas das próprias sementes (forma real do objeto, nada
inventado), espalhadas por todos os estados e com idades de 0 a 34 dias. Para
voltar: `localStorage.removeItem("demand-system.demands.v4"); location.reload();`

> É ferramenta de inspeção, fora do bundle: o app não tem — e não deve ter —
> botão de "carregar dados de exemplo".

---

## 7. Checklist final antes de liberar aos usuários

- [ ] Tabela criada com o option set completo (9 estados)
- [ ] `pac code add-data-source` rodado e modelo regenerado
- [ ] `power.config.json` apontando para o ambiente do cliente
- [ ] Canvas "IT Request Form" publicado e o link configurado no app
- [ ] Uma demanda de ponta a ponta: intake → triagem → avaliação → decisão →
      priorização → execução → conclusão, com e-mail em cada passo
- [ ] Decisores confirmados por frente (Infra / AI / Apps) com UPN correto
- [ ] `src/auth/papeis.ts` preenchido com os e-mails reais (§5.1)
- [ ] `VITE_INTAKE_FORM_URL` apontando para o Canvas publicado (§5.2)
- [ ] Security roles aplicados
- [ ] `npx tsx scripts/test-workflow.ts` verde (regressão do motor)
- [ ] Solution empacotada e importada — checklist próprio em `docs/ALM-SOLUTION.md` §6
- [ ] `SLA_DIAS` (src/domain/sla.ts) igual às variáveis de SLA da Solution
