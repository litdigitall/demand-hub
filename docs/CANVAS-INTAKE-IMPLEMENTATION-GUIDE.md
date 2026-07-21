# Guia de Implementação — DemandFlow Requests (Power Apps Canvas)
### App de entrada de solicitações para TODA a companhia · Canvas + SharePoint · sem licença premium

**Escopo deste guia:** o app de **entrada de requests** (a peça "Entrada livre, sem licença" do plano executivo). Ele grava na **mesma lista SharePoint `Demand Requests`** usada pelo agente do Copilot Studio — os dois canais convivem. O Demand Hub (gestão/aprovação) continua sendo o Code App premium; o fluxo F1 leva os itens da lista para dentro dele.

**Resultado final:** app responsivo (desktop + mobile/Teams), 4 telas, wizard de 3 passos + revisão, score de impacto automático, "Minhas solicitações" com status, identidade visual LIT/Abbott, publicado para *Everyone* — usando **apenas conectores standard** (SharePoint + Office 365 Users), portanto **custo de licença: zero** (incluso no M365).

---

## 0. Arquitetura (onde este app se encaixa)

```
Colaborador ──► Canvas App "DemandFlow Requests" ──┐
Colaborador ──► Copilot Studio "DemandFlow Assistant" ──┤──► Lista SP "Demand Requests"
                                                        │         │
                                                        │         ▼ (F1 – Power Automate)
                                                        │   Demand Hub (Code App / Dataverse)
                                                        └──► e-mail de confirmação + status
```

---

## 1. Pré-requisitos (30 min)

| # | Item | Detalhe |
|---|---|---|
| 1 | Site SharePoint | `IT Demand Hub` (Team site). Dono: PMO. |
| 2 | Lista `Demand Requests` | Esquema abaixo (§2). **Criar antes do app.** |
| 3 | Permissões da lista | Membros do site = **Contribute**. Em *Advanced settings* da lista: **Read access: Read items that were created by the user** e **Create and Edit access: Create items and edit items that were created by the user** (cada um vê só o que é seu; PMO/owners veem tudo). |
| 4 | Licenças | Nenhuma premium. SharePoint e Office 365 Users são conectores **standard**. |
| 5 | Ambiente Power Platform | O mesmo do plano (DEV primeiro). Criar o app **dentro de uma Solution** (ALM: exportar DEV → TEST → PROD). |
| 6 | Imagens | `abbott-logo.png` e `lit-mark.png` (as mesmas de `public/plan/assets/`). |

## 2. A lista SharePoint (fonte única)

Colunas (nome interno sem espaços — crie EXATAMENTE assim; o Power Fx referencia esses nomes):

| Nome interno | Tipo | Config |
|---|---|---|
| `Title` | Texto | obrigatório (título da demanda) |
| `Description` | Multilinha (plain text) | obrigatório |
| `RequesterEmail` | Texto | preenchido pelo app |
| `RequesterName` | Texto | preenchido pelo app |
| `Area` | Choice | Sales, Marketing, HR, Finance, Supply Chain, Production, Quality, Regulatory, Legal, IT, **Facilities** |
| `Category` | Choice | Strategic *(default)*, Operational |
| `Classification` | Choice | Infrastructure, Artificial Intelligence, Applications, Other |
| `ClassificationOther` | Texto | quando Other |
| `ImpactScope` | Choice | User, Process, Department/Organization, Infrastructure |
| `ImpactScore` | Número | calculado pelo app (2–5) |
| `ImpactTypes` | Choice **multi** | Revenue, Cost reduction, Efficiency, Risk/Compliance, Customer experience |
| `Urgency` | Choice | Critical, High, Medium, Low *(default Medium)* |
| `Consequence` | Choice **multi** | Cost increase, Regulatory risk, Operational risk, Customer impact, Reputational impact |
| `ValueRange` | Choice | <10k, 10k–50k, 50k–100k, 100k–500k, >500k (USD) |
| `Deadline` | Data | opcional |
| `AppId` | Texto | opcional |
| `RCE` | Texto | opcional |
| `Status` | Choice | **New** *(default)*, In triage, In evaluation, In approval, Prioritized, In execution, Completed, Returned, Rejected |
| `HubNumber` | Texto | preenchido depois pelo fluxo F1 (ex.: DEM-0123) |

> Dica: crie 3–4 itens de teste manualmente antes de abrir o Studio — o Power Apps infere tipos melhor com dados.

## 3. Criar o app e configurações-base (20 min)

1. make.powerapps.com → sua **Solution** → *New → App → Canvas app* → nome **DemandFlow Requests** → formato **Tablet**.
2. **Settings → Display**: Scale to fit **Off** · Lock aspect ratio **Off** · Lock orientation **Off** (isso habilita layout responsivo).
3. **Settings → Upcoming features**: ligue *Modern controls*, *Named formulas (App.Formulas)*, *Enhanced delegation*.
4. **Data** (painel esquerdo → Add data): `Demand Requests` (SharePoint) e **Office 365 Users**.
5. Faça upload das duas imagens em **Media**.

### 3.1 Identidade visual — App.Formulas (tokens da marca)
Em **App → Formulas** cole (tokens do Brand Identity LIT/Abbott):

```powerfx
// ===== BRAND TOKENS (não hardcodear cor em controle nenhum) =====
BrandBg = ColorValue("#F3F7FA");
BrandSurface = ColorValue("#FFFFFF");
BrandInk = ColorValue("#16293A");
BrandHeading = ColorValue("#0A2E4C");
BrandMuted = ColorValue("#587085");
BrandLine = ColorValue("#D8E2EB");
BrandBlue = ColorValue("#0072BC");
BrandNavy = ColorValue("#003E66");
BrandBlueSoft = ColorValue("#E9F3FB");
BrandAmber = ColorValue("#C27A10");
BrandOk = ColorValue("#0E7F6E");
BrandDanger = ColorValue("#C0392B");

// ===== USUÁRIO LOGADO =====
Me = Office365Users.MyProfileV2();

// ===== SCORE AUTOMÁTICO por abrangência =====
fxImpactScore(scope: Text): Number =
  Switch(scope,
    "User", 2,
    "Process", 3,
    "Department/Organization", 4,
    "Infrastructure", 5,
    0);

// ===== CORES DE STATUS (Minhas solicitações) =====
fxStatusColor(st: Text): Color =
  Switch(st,
    "New", BrandMuted,
    "In triage", BrandBlue,
    "In evaluation", BrandBlue,
    "In approval", ColorValue("#7C35FF"),
    "Prioritized", BrandNavy,
    "In execution", BrandAmber,
    "Completed", BrandOk,
    "Returned", BrandAmber,
    "Rejected", BrandDanger,
    BrandMuted);
```

### 3.2 App.OnStart

```powerfx
Set(varStep, 1);
Set(varSubmitting, false);
// rascunho do formulário (um registro só, limpo)
Set(varDraft, {
  Title: "", Description: "",
  Area: Blank(), Category: {Value:"Strategic"}, Classification: Blank(),
  ClassificationOther: "", ImpactScope: Blank(),
  Urgency: {Value:"Medium"}, ValueRange: Blank(),
  Deadline: Blank(), AppId: "", RCE: ""
});
ClearCollect(colImpactTypes, Blank()); Clear(colImpactTypes);
ClearCollect(colConsequence, Blank()); Clear(colConsequence);
```

> Padrão de nomes: `scr` telas, `con` containers, `lbl` labels, `txt` inputs, `dd` dropdowns, `cmb` combos, `gal` galerias, `btn` botões, `var` variáveis, `col` coleções, `fx` funções.

## 4. Telas — estrutura e fórmulas

### 4.0 Componente de cabeçalho (todas as telas)
Container horizontal `conHeader` (Height 56, Fill `BrandSurface`, borda inferior `BrandLine` 1px, acima dele um retângulo 3px Fill `BrandBlue`):
`imgAbbott` (118×20) · retângulo 1×22 `BrandLine` · `imgLit` (34×34) · `lblCaption` = `"IT HUB (DMC) — LIT DIGITALL"` (11px, uppercase via texto, Color `BrandMuted`) · espaçador · `lblUser` = `Me.displayName` · botão "My requests" → `Navigate(scrMyRequests)`.

---

### 4.1 `scrHome`
- H1 `lblTitle`: `"Request something from IT"` (Font Segoe UI, 32, Semibold, Color `BrandHeading`; acima um retângulo 44×3 `BrandBlue`).
- Sub `lblSub`: `"Describe what you need — the IT Hub will take it from there. Under 2 minutes."` (Color `BrandMuted`).
- `btnNew` **New request** (Fill `BrandBlue`, texto branco, radius 6):
  ```powerfx
  Set(varStep, 1);
  Set(varDraft, {Title:"", Description:"", Area:Blank(), Category:{Value:"Strategic"},
     Classification:Blank(), ClassificationOther:"", ImpactScope:Blank(),
     Urgency:{Value:"Medium"}, ValueRange:Blank(), Deadline:Blank(), AppId:"", RCE:""});
  Clear(colImpactTypes); Clear(colConsequence);
  Navigate(scrForm, ScreenTransition.Fade)
  ```
- `btnMine` **My requests** (variante outline: Fill transparente, borda `BrandBlue`, texto `BrandBlue`) → `Navigate(scrMyRequests)`.
- Cartão lateral "How it works": 1 Submit → 2 PMO triage → 3 DMC approval → 4 You get updates by email.

---

### 4.2 `scrForm` — wizard em 3 passos (containers empilhados)
Topo: `lblStep` = `"Step " & varStep & " of 3"` (12px, uppercase, `BrandBlue`) + barra de progresso: retângulo fundo `BrandBlueSoft` + retângulo `BrandBlue` com **Width** = `Parent.Width * varStep / 3`.

Três containers (`conStep1/2/3`) com **Visible** = `varStep = 1` (2, 3).

**conStep1 — What & who**
- `txtTitle` (TextInput, HintText `"Short title (max 10 words)"`) — obrigatório.
- `txtDesc` (multiline, altura 120, HintText `"Describe the need or problem in your own words"`) — obrigatório.
- `ddArea` (Dropdown) → **Items** = `Choices('Demand Requests'.Area)` — obrigatório.
- Nome/e-mail: exibir `Me.displayName` e `Me.mail` como labels (read-only — nunca perguntar).

**conStep2 — Impact & urgency**
- `ddScope` → Items `Choices('Demand Requests'.ImpactScope)` — obrigatório. Ao lado, chip de score automático:
  `lblScore.Text` = `If(IsBlank(ddScope.Selected.Value), "", "Business impact: " & fxImpactScore(ddScope.Selected.Value) & "/5 (automatic)")` — Fill `BrandBlueSoft`, Color `BrandNavy`.
- `ddUrgency` → `Choices('Demand Requests'.Urgency)`, **DefaultSelectedItems** `[{Value:"Medium"}]`.
- `cmbConsequence` (Combobox multi) → `Choices('Demand Requests'.Consequence)`.
- `cmbImpactTypes` (Combobox multi) → `Choices('Demand Requests'.ImpactTypes)`.
- `ddValueRange` → `Choices('Demand Requests'.ValueRange)` (opcional, rótulo "Expected economic benefit").
- `dateDeadline` (DatePicker, opcional, **DefaultDate** `Blank()`).

**conStep3 — Classification & extras (tudo opcional exceto Classification)**
- `ddCategory` → `Choices('Demand Requests'.Category)`, default Strategic.
- `ddClass` → `Choices('Demand Requests'.Classification)` — obrigatório.
- `txtClassOther` **Visible** = `ddClass.Selected.Value = "Other"`.
- `txtAppId` (HintText `"e.g.: APP-0456"`), `txtRCE` (HintText `"Approved project no. (if you have it)"`).

**Navegação (rodapé do scrForm)**
- `btnBack`: **Visible** `varStep > 1` · OnSelect `Set(varStep, varStep - 1)`.
- `btnNext`: **Visible** `varStep < 3` · OnSelect:
  ```powerfx
  If(varStep = 1 && (IsBlank(Trim(txtTitle.Text)) || IsBlank(Trim(txtDesc.Text)) || IsBlank(ddArea.Selected)),
     Notify("Fill in title, description and area to continue.", NotificationType.Warning),
  varStep = 2 && IsBlank(ddScope.Selected),
     Notify("Tell us who this affects (impact scope).", NotificationType.Warning),
     Set(varStep, varStep + 1))
  ```
- `btnReview`: **Visible** `varStep = 3` · OnSelect:
  ```powerfx
  If(IsBlank(ddClass.Selected),
     Notify("Pick a project classification.", NotificationType.Warning),
     Navigate(scrReview, ScreenTransition.Fade))
  ```

---

### 4.3 `scrReview` — confirmação (padrão da análise UX: revisar antes de enviar)
Cartões-resumo com botão **Edit** por seção (`Set(varStep, n); Back()`):
- GENERAL: Title, Area, Requester (Me) · Edit→1
- PRIORITIZATION: Scope + score automático, Urgency, ValueRange, Deadline, Consequence · Edit→2
- CLASSIFICATION: Category, Classification(+Other), AppId, RCE · Edit→3

`btnSubmit` **Submit request** (Fill `BrandBlue`; **DisplayMode** = `If(varSubmitting, DisplayMode.Disabled, DisplayMode.Edit)`):

```powerfx
Set(varSubmitting, true);
IfError(
  Set(varCreated,
    Patch('Demand Requests', Defaults('Demand Requests'), {
      Title: Trim(txtTitle.Text),
      Description: Trim(txtDesc.Text),
      RequesterEmail: Lower(Me.mail),
      RequesterName: Me.displayName,
      Area: ddArea.Selected,
      Category: ddCategory.Selected,
      Classification: ddClass.Selected,
      ClassificationOther: If(ddClass.Selected.Value = "Other", Trim(txtClassOther.Text), ""),
      ImpactScope: ddScope.Selected,
      ImpactScore: fxImpactScore(ddScope.Selected.Value),
      ImpactTypes: cmbImpactTypes.SelectedItems,
      Urgency: ddUrgency.Selected,
      Consequence: cmbConsequence.SelectedItems,
      ValueRange: ddValueRange.Selected,
      Deadline: dateDeadline.SelectedDate,
      AppId: Trim(txtAppId.Text),
      RCE: Trim(txtRCE.Text)
      // Status: default "New" da lista — não enviar
    })
  );
  Set(varSubmitting, false);
  Navigate(scrSuccess, ScreenTransition.Fade),
  // onError:
  Set(varSubmitting, false);
  Notify("Could not submit: " & FirstError.Message, NotificationType.Error)
)
```

> **Por que funciona:** colunas Choice aceitam direto o `.Selected` do dropdown ligado a `Choices(...)`; multi-choice aceita `.SelectedItems` do Combobox. Nada de `{Value: ...}` manual quando a origem é `Choices()`.

---

### 4.4 `scrSuccess`
- Ícone check (círculo `BrandOk`), `lblOk` = `"Request #" & varCreated.ID & " submitted!"`
- `lblNext` = `"The PMO will triage it. You'll receive status updates at " & Me.mail & "."`
- `btnAnother` → mesma OnSelect do `btnNew` do Home · `btnSeeMine` → `Navigate(scrMyRequests)`.

### 4.5 `scrMyRequests` — status (requisito "Demands → verificar status")
- `galMine` (galeria vertical flexível):
  **Items** (delegável em SharePoint — igualdade de texto):
  ```powerfx
  SortByColumns(
    Filter('Demand Requests', RequesterEmail = Lower(Me.mail)),
    "Created", SortOrder.Descending)
  ```
- Template do item: `lblT` = `ThisItem.Title` · `lblMeta` = `"#" & ThisItem.ID & If(!IsBlank(ThisItem.HubNumber), " · " & ThisItem.HubNumber, "") & " · " & Text(ThisItem.Created, "dd mmm yyyy")` · **badge de status**: label com Text `ThisItem.Status.Value`, Fill `ColorFade(fxStatusColor(ThisItem.Status.Value), 85%)`, Color `fxStatusColor(ThisItem.Status.Value)`, radius 999.
- Empty state: `lblEmpty` **Visible** = `IsEmpty(galMine.AllItems)` → `"No requests yet — open your first one!"` + botão New request.

## 5. Responsividade (desktop + celular/Teams)
- Tudo dentro de **containers** (horizontal/vertical) com *Flexible height/width*; nada posicionado por X/Y solto.
- Container raiz de conteúdo: **Width** `Min(Parent.Width, 1120)` centralizado (`X = (Parent.Width - Self.Width)/2`).
- Passos do wizard: em telas < 640 (`App.Width < 640`), colunas viram 1 (use containers verticais e `Wrap`).
- Fonte mínima 13; alvos de toque ≥ 40px.

## 6. Qualidade — checklist antes de publicar
- [ ] Enviar com/sem campos opcionais → item correto na lista (choices e multi-choices preenchidos).
- [ ] Usuário SEM permissão de ver itens alheios (testar com conta comum): My requests mostra só os dele.
- [ ] Delegation: nenhum aviso azul nas fórmulas de `galMine` (igualdade de texto = delegável).
- [ ] Score automático confere: User→2 · Process→3 · Department→4 · Infrastructure→5.
- [ ] Duplo clique em Submit não cria 2 itens (`varSubmitting` desabilita o botão).
- [ ] Erro de rede: desligar wifi e enviar → Notify de erro, sem crash, dados preservados.
- [ ] App Checker (banda esquerda) sem erros; acessibilidade: todos os controles com `AccessibleLabel`.
- [ ] Teams: testar embutido (Add to Teams) — header não quebra.

## 7. Publicação para toda a companhia
1. **Publish** → **Share** → adicionar **Everyone except external users** como *User* (não co-owner).
2. Compartilhar a **conexão SharePoint** junto (o Studio pergunta — aceitar).
3. Fixar no **Teams** (Publish to Teams) e/ou distribuir o link direto; ícone do app = lit-mark.
4. Comunicado de lançamento com o link + o agente do Copilot como alternativa conversacional.

## 8. Pós-envio — ligação com o resto do plano
- **Fluxo F1 (Power Automate)**: trigger *When an item is created* na lista → cria a demanda no Demand Hub (com `ImpactScore` já calculado) → escreve `HubNumber` de volta no item → envia e-mail de confirmação ao `RequesterEmail`.
- **Fluxo F5**: *When an item is modified* (coluna Status) → e-mail de status ao solicitante. O app "My requests" reflete automaticamente (o F1/F5 atualizam a mesma lista).
- O agente do Copilot Studio grava na mesma lista → um único funil, dois canais.

## 9. Cronograma sugerido (1 pessoa)
| Dia | Entrega |
|---|---|
| 1 | Lista + permissões + app criado + tokens/header + scrHome |
| 2 | scrForm (3 passos) com validações + score automático |
| 3 | scrReview + Patch + scrSuccess + scrMyRequests |
| 4 | Responsivo + checklist de qualidade + testes com 3 usuários |
| 5 | Publicação Everyone + Teams + fluxo F1 ligado + comunicado |

---
*LIT Digitall · Demand Hub — guia interno de implementação (Canvas). v1.0 — Julho 2026.*
