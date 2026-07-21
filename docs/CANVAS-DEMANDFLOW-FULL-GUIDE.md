# Guia Completo de Implementação — Abbott DemandFlow em Power Apps Canvas
### O app inteiro (intake → triagem → avaliação → aprovação DMC → priorização → execução) · Canvas + SharePoint + Power Automate

**O que este guia constrói:** a reimplementação 1:1 do protótipo validado (litdigitall.github.io/demand-hub) como Canvas app corporativo — 12 telas, 6 papéis, motor de ciclo de vida com gates por papel, score ponderado com validação por estação, roteamento Abbott Project Type, capacity vs. score e telas executivas.
**Backend:** listas SharePoint (conectores standard → sem licença premium por usuário; o guia indica onde trocar por Dataverse depois, conforme o plano executivo).
**Complementos:** este app **gerencia**; a **entrada** continua pelos canais já especificados (Canvas de intake — `CANVAS-INTAKE-IMPLEMENTATION-GUIDE.md` — e agente Copilot — `COPILOT-INTAKE-AGENT-PROMPT.md`), todos gravando nas mesmas listas.

---

## 0. Mapa do app (o que existe no protótipo → o que vira tela)

| Protótipo | Tela Canvas | Papéis que veem |
|---|---|---|
| Login por papel | `scrEntry` (resolve papel via lista) | todos |
| Home (KPIs acionáveis + gráficos) | `scrHome` | todos |
| My inbox (fila por papel + próxima ação) | `scrInbox` | todos |
| All requests (filtros + vistas Infra/IA/Apps) | `scrRequests` | todos |
| Request detail (stepper ciclo + aprovação + score + comentários + anexos) | `scrDetail` | todos (ações gated) |
| New request (wizard 3 passos + review) | `scrNew` (ou app de intake separado) | Requester/Admin |
| Board (Kanban) | `scrBoard` | todos |
| Score Board (compacto + detalhe expansível + posição) | `scrScore` | Sponsor/PMO/Director/Admin |
| Approvers Status (métricas por gate) | `scrApprovers` | Sponsor/PMO/Director/Admin |
| Capacity (utilização + sync ServiceNow) | `scrCapacity` | TechLead/PMO/Admin |
| Monthly report | `scrReport` | Admin |
| Administration (catálogos + seed) | `scrAdmin` | Admin |

**Ciclo de vida (idêntico ao motor `workflow.ts` do protótipo):**
`New (In triage)` → `In evaluation` → `In approval` → `Prioritized` → `In execution` → `Completed`, com laterais `Returned` (volta ao solicitante) e `Rejected` (terminal).
**Gates de aprovação:** Sponsor → Tech Lead → Director (DMC), sequenciais; recusa em qualquer gate = `Rejected`; 3 aprovações = `Prioritized`. Ao **entrar** em aprovação, os 3 gates são recriados como *Pending* (regra anti-beco-sem-saída do protótipo).

---

## 1. Pré-requisitos

1. Site SharePoint `IT Demand Hub` (o mesmo do intake).
2. Grupos de permissão:
   - `DemandFlow Staff` (PMO, Tech Leads, Sponsors, Directors, Admin) → **Read/Contribute em TUDO** nas listas.
   - Membros comuns → lista de demandas com *item-level*: **ler/editar só os próprios** (já configurado no guia de intake). O Staff enxerga tudo por pertencer ao grupo com permissão plena — configure as listas de workflow (Approvals, Validations, Comments) visíveis **apenas** ao Staff.
3. Solution no ambiente DEV (ALM: DEV → TEST → PROD).
4. Imagens da marca (`abbott-logo.png`, `lit-mark.png`).
5. Fluxos F1–F7 do plano executivo serão plugados nas mesmas listas (referências na §10).

## 2. Modelo de dados (6 listas)

### 2.1 `Demand Requests` (a mesma do intake — ESTENDER com as colunas de gestão)
Já existentes (guia de intake): Title, Description, RequesterEmail, RequesterName, Area, Category, Classification, ClassificationOther, ImpactScope, ImpactScore, ImpactTypes, Urgency, Consequence, ValueRange, Deadline, AppId, RCE, Status, HubNumber.

**Adicionar:**

| Coluna | Tipo | Uso |
|---|---|---|
| `ScoreBusinessImpact` | Número (1–5) | preenchido = `ImpactScore` (automático) |
| `ScoreRisk`, `ScoreTech`, `ScoreRevenue`, `ScoreStrategic`, `ScoreStakeholder`, `ScoreUrgency` | Número (1–5, default 1) | critérios restantes |
| `FinalPriority` | Número | posição no ranking (PMO) |
| `Team` | Choice: Internal Delivery, External Delivery, Support | capacity |
| `EstimatedHours` | Número | capacity (Tech Lead) |
| `AbbottProjectType` | Choice: Minor Enhancement, Rapid, Phase 0, Operations, Project | derivado |
| `ProjectStage` | Choice: Discovery *(default)*, Build, UAT, Go-Live, Done, On-Hold | |
| `ServiceNowId`, `ProjectId` | Texto | preenchidos no aceite/execução |
| `DmcApproved` | Sim/Não (default vazio) | resultado do comitê |
| `ReturnReason` | Multilinha | quando Returned/Rejected |

> Anexos: usar os **attachments nativos** do item (limite 10 MB validado no app).

### 2.2 `Demand Approvals` (1 linha por gate) — visível só ao Staff
`DemandID` (Número) · `Level` (Choice: Sponsor, Tech Lead, Director) · `LevelOrder` (Número 1–3) · `Approver` (Texto) · `Status` (Choice: Pending *(default)*, Approved, Rejected) · `Comment` (Multilinha) · `ActionAt` (Data/hora)

### 2.3 `Score Validations` (1 linha por critério validado) — Staff
`DemandID` · `Criterion` (Choice: BusinessImpact, Risk, Tech, Revenue, Strategic, Stakeholder, Urgency) · `Station` (Choice: Business, Technical, PMO) · `ValidatedBy` · `ValidatedAt` · `Comment`

### 2.4 `Demand Comments` — Staff (+ autor)
`DemandID` · `Author` · `Body` (multilinha)

### 2.5 `User Roles` (RBAC) — Staff administra
`UserEmail` (Texto, minúsculo) · `Role` (Choice: Requester, Sponsor, TechLead, PMO, Director, Admin) — **uma linha por papel** (usuário pode ter vários). É o equivalente do login-por-papel do protótipo; quem não está na lista = Requester.

### 2.6 `Support Catalogs` (ou 4 listas pequenas)
- `Areas`: Title + `Stakeholder` (Texto) → stakeholder automático por área (Facilities → Sambini etc.)
- `Sponsors`: Title
- `Evaluators`: Title + `Station` (Business/Technical/PMO)
- `Team Capacity`: `Team` (Choice) · `MonthlyHours` (Número: 640/960/480) · `CommittedHours` (Número — escrito pelo F6/ServiceNow) · `FTE` (Número) · `SyncedAt` (Data/hora)
- `App Registry`: `AppCode` (Title) + `AppName`

## 3. Setup do app + fundação

Criar **DemandFlow Hub** (Tablet, responsivo — mesmas Settings do guia de intake §3). Adicionar dados: as 6+ listas, Office 365 Users.

### 3.1 App.Formulas — tokens, papéis e motor (o coração)

```powerfx
// ==== BRAND (idênticos ao guia de intake §3.1 — copiar) ====
// BrandBg, BrandSurface, BrandInk, BrandHeading, BrandMuted, BrandLine,
// BrandBlue, BrandNavy, BrandBlueSoft, BrandAmber, BrandOk, BrandDanger, fxStatusColor...

Me = Office365Users.MyProfileV2();
MyEmail = Lower(Me.mail);

// ==== PAPÉIS (RBAC) ====
MyRoles = ShowColumns(Filter('User Roles', UserEmail = MyEmail), "Role");
IsAdmin    = "Admin"    in MyRoles.Role.Value;
IsPMO      = IsAdmin || "PMO"      in MyRoles.Role.Value;
IsTechLead = IsAdmin || "TechLead" in MyRoles.Role.Value;
IsSponsor  = IsAdmin || "Sponsor"  in MyRoles.Role.Value;
IsDirector = IsAdmin || "Director" in MyRoles.Role.Value;
IsRequester= true; // todos podem solicitar

// ==== SCORE PONDERADO (pesos oficiais: 25/15/10/20/15/10/5) ====
fxWeightedScore(d: 'Demand Requests'): Number =
  Round(
    Coalesce(d.ScoreBusinessImpact,1)*0.25 +
    Coalesce(d.ScoreRisk,1)*0.15 +
    Coalesce(d.ScoreTech,1)*0.10 +
    Coalesce(d.ScoreRevenue,1)*0.20 +
    Coalesce(d.ScoreStrategic,1)*0.15 +
    Coalesce(d.ScoreStakeholder,1)*0.10 +
    Coalesce(d.ScoreUrgency,1)*0.05, 2);

// ==== ROTEAMENTO ABBOTT PROJECT TYPE (<80h ME · <500k Rapid · >500k Phase 0) ====
fxProjectType(hours: Number, valueRange: Text): Text =
  If(hours > 0 && hours < 80, "Minor Enhancement",
     valueRange = ">500k", "Phase 0",
     "Rapid");

// ==== CRITICALITY (derivada da urgência) ====
fxCriticality(urg: Text): Text =
  Switch(urg, "Critical","Critical", "High","High", "Medium","Medium", "Low");

// ==== "PRECISA DE MIM?" — fila por papel (espelha precisaDeMim do protótipo) ====
fxNeedsMe(st: Text, reqEmail: Text, nextGate: Text): Boolean =
  Switch(st,
    "New",           IsPMO,
    "In evaluation", IsPMO || IsTechLead,
    "In approval",   Switch(nextGate, "Sponsor",IsSponsor, "Tech Lead",IsTechLead, "Director",IsDirector, false),
    "Prioritized",   IsPMO || IsTechLead,
    "In execution",  IsPMO || IsTechLead,
    "Returned",      reqEmail = MyEmail,
    false);
```

### 3.2 App.OnStart — caches (performance)

```powerfx
Concurrent(
  ClearCollect(colAreas, Areas),
  ClearCollect(colSponsors, Sponsors),
  ClearCollect(colEvaluators, Evaluators),
  ClearCollect(colCapacity, 'Team Capacity'),
  ClearCollect(colApps, 'App Registry')
);
Set(varStatusFilter, Blank()); Set(varUrgFilter, Blank()); Set(varOverdueOnly, false);
Set(varView, "All"); // All | Infrastructure | Artificial Intelligence | Applications
```

> **Delegação:** `Demand Requests` crescerá. Filtros nas galerias usam só igualdades/comparações delegáveis (Status.Value, RequesterEmail, números). NÃO trazer a lista inteira pra coleção.

## 4. O motor de ações (equivalente do `ACOES_POR_ESTADO`)

Cada ação é um botão em `scrDetail`/`scrInbox` com `Visible` (papel+estado) e `OnSelect` (Patch). `varD` = demanda selecionada.

### 4.1 Helpers de contexto (Formulas)
```powerfx
// gate pendente da demanda (ordenado)
fxNextGate(demandId: Number): Text =
  First(SortByColumns(
    Filter('Demand Approvals', DemandID = demandId, Status.Value = "Pending"),
    "LevelOrder", SortOrder.Ascending)).Level.Value;

// capacity definido?
fxHasCapacity(d: 'Demand Requests'): Boolean =
  !IsBlank(d.Team) && Coalesce(d.EstimatedHours,0) > 0;
```

### 4.2 Ações — Visible + OnSelect (copiar por botão)

**Accept & start evaluation** — Visible `varD.Status.Value="New" && IsPMO`
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"In evaluation"}});
Notify("Evaluation started.", NotificationType.Success)
```

**Return to requester** — Visible `varD.Status.Value in ["New","In evaluation"] && IsPMO` (modal exige motivo `txtReason`)
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"Returned"}, ReturnReason:txtReason.Text})
```

**Reject request** — Visible idem PMO (com motivo)
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"Rejected"}, ReturnReason:txtReason.Text})
```

**Resend to triage** — Visible `varD.Status.Value="Returned" && varD.RequesterEmail=MyEmail`
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"New"}, ReturnReason:""})
```

**Define team & hours (capacity)** — Visible `varD.Status.Value="In evaluation" && IsTechLead` (modal: `ddTeam`, `numHours`)
```powerfx
Patch('Demand Requests', varD, {
  Team: ddTeam.Selected, EstimatedHours: numHours.Value,
  AbbottProjectType: {Value: fxProjectType(numHours.Value, varD.ValueRange.Value)}
});
Notify("Capacity set — project type: " & fxProjectType(numHours.Value, varD.ValueRange.Value))
```

**Complete evaluation → send to approval** — Visible `varD.Status.Value="In evaluation" && (IsPMO||IsTechLead)`
DisplayMode: `If(fxHasCapacity(varD), DisplayMode.Edit, DisplayMode.Disabled)` (tooltip: "Define team & hours first")
```powerfx
// recria os 3 gates como Pending (regra do protótipo — nunca fica sem gate)
RemoveIf('Demand Approvals', DemandID = varD.ID);
Patch('Demand Approvals', Defaults('Demand Approvals'),
  {DemandID:varD.ID, Level:{Value:"Sponsor"},   LevelOrder:1, Approver:LookUp(colAreas, Title=varD.Area.Value).Stakeholder},
  {DemandID:varD.ID, Level:{Value:"Tech Lead"}, LevelOrder:2, Approver:"Daniela Bastos"},
  {DemandID:varD.ID, Level:{Value:"Director"},  LevelOrder:3, Approver:"Marcelo Tavares"});
Patch('Demand Requests', varD, {Status:{Value:"In approval"}})
```

**Approve (my gate)** — Visible `varD.Status.Value="In approval" && fxNeedsMe("In approval", varD.RequesterEmail, fxNextGate(varD.ID))`
```powerfx
With({g: First(SortByColumns(Filter('Demand Approvals', DemandID=varD.ID, Status.Value="Pending"),"LevelOrder"))},
  Patch('Demand Approvals', g, {Status:{Value:"Approved"}, Comment:txtGateComment.Text, ActionAt:Now(), Approver:Me.displayName});
  // Director era o último? então DMC aprovou → Prioritized (+ ServiceNow/RCE informativos)
  If(CountRows(Filter('Demand Approvals', DemandID=varD.ID, Status.Value="Pending")) = 0,
     Patch('Demand Requests', varD, {Status:{Value:"Prioritized"}, DmcApproved:true,
       ServiceNowId:txtSnowId.Text, ProjectId:txtProjId.Text});
     Notify("DMC approved — request prioritized!", NotificationType.Success)))
```

**Reject (my gate)** — mesma visibilidade, exige comentário
```powerfx
With({g: First(SortByColumns(Filter('Demand Approvals', DemandID=varD.ID, Status.Value="Pending"),"LevelOrder"))},
  Patch('Demand Approvals', g, {Status:{Value:"Rejected"}, Comment:txtGateComment.Text, ActionAt:Now(), Approver:Me.displayName});
  Patch('Demand Requests', varD, {Status:{Value:"Rejected"}, DmcApproved:false, ReturnReason:txtGateComment.Text}))
```

**Set ranking priority** — Visible `varD.Status.Value="Prioritized" && IsPMO` → `Patch('Demand Requests', varD, {FinalPriority:numPriority.Value})`

**Start execution** — Visible `varD.Status.Value="Prioritized" && (IsPMO||IsTechLead)` · DisplayMode exige `FinalPriority>0 && fxHasCapacity(varD)`
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"In execution"}, ProjectStage:{Value:"Build"}})
```

**Complete request** — Visible `varD.Status.Value="In execution" && (IsPMO||IsTechLead)`
```powerfx
Patch('Demand Requests', varD, {Status:{Value:"Completed"}, ProjectStage:{Value:"Done"}, ProjectId:txtProjId.Text})
```

## 5. Telas

Header comum em todas (marca + navegação): copiar `conHeader` do guia de intake; itens de menu com **Visible por papel** (ex.: Score Board `IsSponsor||IsPMO||IsDirector`, Capacity `IsTechLead||IsPMO`, Report/Admin `IsAdmin`) — menu agrupado **Demands / Tracking / Administration** como no protótipo.

### 5.1 `scrHome` — KPIs acionáveis + gráficos
KPIs (cards clicáveis — o urgente primeiro, análise UX):
```powerfx
// Critical (destaque vermelho quando >0)
CountRows(Filter('Demand Requests', Urgency.Value="Critical",
  Status.Value<>"Completed", Status.Value<>"Rejected"))
// Overdue
CountRows(Filter('Demand Requests', Deadline < Today(),
  Status.Value<>"Completed", Status.Value<>"Rejected"))
// New/In evaluation · In execution · Total — análogos
```
OnSelect de cada card: `Set(varUrgFilter,"Critical"); Navigate(scrRequests)` (etc.).
Gráficos: **Column chart** horizontal por tipo (Items = `AddColumns(GroupBy(...), "n", CountRows(ThisGroup))`) e linha de entradas por mês. Top 5 por `fxWeightedScore`.

### 5.2 `scrInbox` — "o que precisa de mim"
```powerfx
// Items da galeria (traz colunas do gate pendente junto)
SortByColumns(
  Filter(
    AddColumns('Demand Requests', "nextGate", fxNextGate(ID)),
    fxNeedsMe(Status.Value, RequesterEmail, nextGate)),
  "Modified", SortOrder.Descending)
```
Cada card mostra (análise UX): Deadline (vermelho se < hoje), `ScoreBusinessImpact&"/5"`, EstimatedHours, ValueRange, badge Criticality — e os **botões de ação da §4** (mesmos Visible/OnSelect, com `varD = ThisItem`).

### 5.3 `scrRequests` — lista + vistas + filtros por URL/vars
SegmentedControl (3 vistas): `varView` ∈ All / Infrastructure·Sambini / Artificial Intelligence / Applications·Gabriela → filtro `Classification.Value = varView`.
Galeria Items (delegável):
```powerfx
Filter('Demand Requests',
  (IsBlank(varStatusFilter) || Status.Value = varStatusFilter),
  (IsBlank(varUrgFilter)    || Urgency.Value = varUrgFilter),
  (!varOverdueOnly || (Deadline < Today() && Status.Value<>"Completed" && Status.Value<>"Rejected")),
  (varView = "All" || Classification.Value = varView),
  (IsBlank(txtSearch.Text) || StartsWith(Title, txtSearch.Text)))
```
Colunas: Title, Area, Classification (badge), Type, Urgency, Score (`fxWeightedScore(ThisItem)`), Status badge, Created. Linha → `Set(varD, ThisItem); Navigate(scrDetail)`.

### 5.4 `scrDetail` — o centro do app
1. **Cabeçalho**: HubNumber/ID, Title, badges (Status, Category, Classification, Criticality, AbbottProjectType, Urgency).
2. **NextAction card**: os botões da §4 (só os visíveis aparecem) + badge "Waiting on …" = `fxNextGate(varD.ID)` quando em aprovação.
3. **Stepper do ciclo** (7 etapas): galeria horizontal fixa com estados `done/current/future` comparando índice da etapa vs. índice do status atual (tabela estática `colPipeline` com Order).
4. **Stepper de aprovação**: galeria de `Filter('Demand Approvals', DemandID=varD.ID)` ordenada por LevelOrder — círculo verde ✓ / vermelho ✗ / nº pendente, nome do approver, comentário.
5. **Score panel**: 7 linhas (critério, peso, slider 1–5 gated por estação: Business→`IsSponsor`, Technical→`IsTechLead`, PMO→`IsPMO`; BusinessImpact bloqueado = automático). Slider OnChange → `Patch('Demand Requests', varD, {ScoreRisk: sldRisk.Value})` etc. Botão "Validate" → cria linha em `Score Validations`. Anel/label do total = `fxWeightedScore(varD) & " / 5.00"`.
6. **Comentários**: galeria de `Filter('Demand Comments', DemandID=varD.ID)` + input → Patch.
7. **Attachments**: DisplayForm/AttachmentControl do item; validar 10 MB: no OnAddFile → `If(First(Self.Attachments).Size > 10*1024*1024, Notify("Max 10 MB", Error))`.

### 5.5 `scrNew` — wizard (reusar §4 do guia de intake integralmente)
Mesmo wizard de 3 passos + review; única diferença: ao final o Patch já entra como `New` nesta mesma lista (o app de intake standalone continua válido para quem não usa o hub).

### 5.6 `scrBoard` — Kanban
Galeria horizontal `galCols` com Items = tabela estática dos 8 status; dentro, galeria vertical `galCards` Items = `Filter('Demand Requests', Status.Value = ThisItem.Value)`. Sem drag-drop nativo: cada card tem botões ◀ ▶ que fazem Patch para o status vizinho **somente** se a ação equivalente do motor estiver liberada (reusar os Visible da §4 — não permitir pular etapas).

### 5.7 `scrScore` — Score Board (análise UX: 5 colunas + detalhe)
Galeria ordenada:
```powerfx
SortByColumns(
  AddColumns('Demand Requests', "w", fxWeightedScore(ThisRecord)),
  "FinalPriority", SortOrder.Ascending, "w", SortOrder.Descending)
```
Colunas: # (FinalPriority + botões ↑↓ que trocam prioridades via 2 Patches), Demand, Type, Priority(urgency), Score (badge), Position (TextInput numérico → Patch). Botão "View score detail" expande (varExpanded ∋ ID) mostrando os 7 critérios × peso e validações (`CountRows(Filter('Score Validations', DemandID=ThisItem.ID)) & "/7"`). Toggle "Top score (≥4.5)".

### 5.8 `scrApprovers` — métricas executivas
4 cards: Pending approvals = `CountRows(Filter('Demand Requests', Status.Value="In approval"))`; Waiting on Sponsor/Tech Lead/Director = mesmo filtro + `fxNextGate(ID)=`nível. Tabela: demanda, Priority (Criticality+FinalPriority), gates (3 badges da lista Approvals), Waiting on.

### 5.9 `scrCapacity`
Cards por time de `colCapacity`: alocado = `Sum(Filter('Demand Requests', Team.Value=ThisItem.Team.Value, Status.Value in ["Prioritized","In execution"]), EstimatedHours)`; utilização = alocado / `Coalesce(CommittedHours, MonthlyHours)`; semáforo 70/90/100 (`BrandOk/BrandAmber/BrandDanger`). Botão **Sync with ServiceNow** = roda o fluxo F6 (`PowerAutomate.Run()` do fluxo instant) que atualiza `Team Capacity` → `Refresh('Team Capacity'); ClearCollect(colCapacity, 'Team Capacity')`. Badge "Source: ServiceNow · SyncedAt".

### 5.10 `scrReport` (Admin)
KPIs do mês (`Created >= Date(Year(Today()),Month(Today()),1)`). Canvas não gera PPTX: botão **Generate report** chama fluxo F-report (Power Automate cria arquivo no SharePoint a partir de template e devolve link) — ou exibe visão imprimível.

### 5.11 `scrAdmin` (Admin)
3 galerias CRUD (Areas+Stakeholder, Sponsors, Evaluators) com TextInput+Add / lixeira (Patch/Remove nas listas) + gestão da `User Roles` (adicionar e-mail+papel) + App Registry.

## 6. Identidade visual
Aplicar 100% o **Brand Identity** (`docs/BRAND-IDENTITY-PROMPT.md`) via App.Formulas: nenhuma cor hardcoded; cards flat radius 6 com hairline `BrandLine`; números tabulares; kickers uppercase `BrandBlue`; âmbar só para marcos/alertas; header com lockup Abbott | LIT.

## 7. Segurança — resumo
- App compartilhado com `DemandFlow Staff` (papéis de gestão) + Requesters que usarão o hub (opcional; intake standalone cobre o resto).
- Papéis vêm de `User Roles` (a UI esconde; a **lista** garante: workflow lists visíveis só ao Staff).
- Atenção: Canvas não é segurança de servidor — o modelo de permissão REAL são as permissões das listas (por isso Approvals/Validations/Comments ficam restritas ao Staff, e a lista principal usa item-level para membros comuns).

## 8. Performance & delegação
- Nunca `ClearCollect` da lista principal; galerias filtram delegável (Status.Value, e-mail, números, datas).
- `fxNextGate` em galerias grandes: aceitável até ~centenas de itens em aprovação; acima disso, materializar `NextGate` como coluna na demanda (o F3 atualiza).
- `Concurrent` no OnStart; `Select` para navegação; imagens leves; evitar `AddColumns` sobre a lista inteira sem filtro prévio.

## 9. Checklist de QA (executar por papel!)
- [ ] Ciclo completo como Admin: New → … → Completed sem beco (todas as ações aparecem quando devem).
- [ ] PMO não vê botões de Tech Lead e vice-versa; Requester só Resend em Returned.
- [ ] Recusa em cada um dos 3 gates → Rejected + motivo gravado.
- [ ] Reenvio a aprovação recria os 3 gates Pending (nunca "sem gate").
- [ ] Score: BusinessImpact travado (automático); estações gated; total confere com pesos (ex.: tudo 1 e BI=2 → 1.25).
- [ ] `fxProjectType`: 79h→ME · 100h+100k–500k→Rapid · >500k→Phase 0.
- [ ] Start execution bloqueado sem FinalPriority ou sem capacity.
- [ ] Inbox de cada papel mostra exatamente o que `fxNeedsMe` promete.
- [ ] Capacity: semáforo muda em 70/90/100; sync atualiza SyncedAt.
- [ ] Delegação: zero avisos azuis; teste com 2.500+ itens simulados.
- [ ] Membro comum via URL direta do app: vê apenas as próprias demandas (permissão de lista, não só UI).
- [ ] App Checker limpo + AccessibleLabel em todos os controles.

## 10. Integração com os fluxos (plano executivo)
| Fluxo | Trigger nesta arquitetura | Efeito |
|---|---|---|
| F1 | Item criado em `Demand Requests` | HubNumber (DEM-nnnn), e-mail de confirmação |
| F2 | Status → New | aviso PMO (Teams/e-mail) |
| F3 | Status → In approval | Approvals connector espelhando `Demand Approvals` (decisão via Teams grava na lista; o app reflete) |
| F4 | Status → Prioritized | cria projeto no ServiceNow, grava ServiceNowId |
| F5 | Status modificado | e-mail ao RequesterEmail |
| F6 | Agendado/instant | atualiza `Team Capacity` (FTE real) |
| F7 | Agendado | overdue alerts + backup semanal |

## 11. Cronograma (1 dev experiente em Canvas)
| Semana | Entregas |
|---|---|
| 1 | Listas estendidas + permissões + fundação (tokens, papéis, OnStart) + scrHome + scrRequests |
| 2 | Motor de ações (§4) + scrDetail completo (steppers, score, comentários, anexos) + scrInbox |
| 3 | scrBoard + scrScore + scrApprovers + scrCapacity (com F6) + scrNew |
| 4 | scrReport + scrAdmin + QA por papel (checklist §9) + publicação Staff + fluxos F1–F5 ligados |

**Total: ~4 semanas** para o hub Canvas (o intake standalone do outro guia soma +1 semana, paralelo).

---
### Dataverse depois? (alinhamento com o plano executivo)
Quando as 10 licenças Premium forem aprovadas: migrar `Demand Requests`/`Approvals`/`Validations` para tabelas Dataverse (mesmos nomes lógicos), trocar a fonte de dados no app (fórmulas quase idênticas) e ganhar security roles nativos + auditoria. Este guia foi escrito para que essa troca seja de fonte, não de lógica.

*LIT Digitall · Abbott DemandFlow — guia interno completo (Canvas). v1.0 — Julho 2026.*
