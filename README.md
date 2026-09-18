# Intake Forms

Gestão do funil de demandas de TI — intake, triagem, avaliação técnica,
decisão por área e priorização por capacidade. Power Apps Code App
(React 19 + TypeScript + Mantine) sobre Dataverse. LIT Digitall.

## Testar localmente

Precisa de **Node 20+**.

```bash
git clone https://github.com/litdigitall/demand-hub.git
cd demand-hub
git checkout redesign/clean-client-ready   # versão nova — enquanto o PR #1 não entra na main
npm install
npm run dev
```

Abra **http://localhost:5173** e clique numa persona para entrar. Local, o app
roda em **modo demo**: dados de exemplo no navegador, sem Dataverse e sem login
de verdade.

| Persona na tela | Papel | O que vê |
|---|---|---|
| **IT Admin** | todos | tudo, inclusive Settings |
| **Paula Nakamura** | PMO | triagem, ranking, Overview e Capacity |
| **Daniela Bastos** | Technical Team | avaliação: time, horas e score |
| **Sambini** · **Gabriela** · **AI Decisor** | Area Decisor | só as decisões da própria frente (Infra · Apps · AI) |
| **Ana Ribeiro** | Requester | só as próprias demandas |

### Ver as telas com volume real

Com 5 demandas qualquer layout parece bom. Para ver com 48 — SLA estourado,
"parada há N dias", capacidade no limite:

1. entre no app
2. **F12 → Console**
3. cole o conteúdo de [`scripts/carregar-volume.js`](scripts/carregar-volume.js) e dê Enter

Para voltar ao original: `localStorage.removeItem("demand-system.demands.v4"); location.reload();`

### O que testar

- **Inbox** — o que precisa de você agora, com a próxima ação em cada linha
- **Requests** — tabela, quadro e ranking; filtros por status, área e urgência
- **Detalhe** — abrir uma demanda e levá-la adiante pelo motor (triagem →
  avaliação → decisão → priorização → execução)
- **Overview** — onde a fila trava e o que está parado há mais tempo
- **Capacity** — horas comprometidas por time contra a capacidade do mês
- **Settings → People** — cadastro de quem é PMO, time técnico e decisor
- **New request** — o formulário de entrada, com a prioridade calculada na hora

### Checagens automáticas

```bash
npx tsc -b                        # tipos
npm run lint                      # lint
npx tsx scripts/test-workflow.ts  # motor de ciclo de vida e papéis
npm run build                     # build de produção
```

## Documentação

- [`docs/GO-LIVE.md`](docs/GO-LIVE.md) — publicar no ambiente do cliente, automações e checklist
- [`docs/ALM-SOLUTION.md`](docs/ALM-SOLUTION.md) — Solution do Power Platform e caminho DEV → TEST → PROD
- [`docs/CANVAS-INTAKE-FORM-PROMPT.md`](docs/CANVAS-INTAKE-FORM-PROMPT.md) — formulário de entrada externo (Canvas)
