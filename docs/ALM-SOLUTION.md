# Intake Forms — Solution do Power Platform (ALM)

Como o app sai daqui e entra no ambiente do cliente **como Solution**, e não
como um `pac code push` solto apontando para um environment fixo.

O projeto da solution mora em [`solution/`](../solution) e é versionado junto
com o código. O pacote `.zip` é artefato de build — sai do `.gitignore` de
propósito, ninguém commita zip.

---

## 0. Por que Solution, e não só `pac code push`

`pac code push` publica o app **naquele** environment, usando o `environmentId`
e o `appId` que estão em `power.config.json`. Isso tem três consequências ruins:

1. O repositório carrega identificadores do ambiente produtivo do cliente.
2. Não existe caminho DEV → TEST → PROD: cada ambiente é um push manual.
3. Cada coisa que muda por ambiente (UPN do decisor, conta que envia e-mail,
   URL do formulário) vira constante no código ou passo manual no portal.

A Solution resolve os três: os valores que mudam viram **environment
variables**, preenchidas na hora do import, e o mesmo pacote entra em qualquer
ambiente.

---

## 1. O que já está no projeto (versionado, empacota offline)

| Componente | Onde |
|---|---|
| Publisher `ardxpublisher` — prefixo `ardx`, **OptionValuePrefix 50697** | `solution/src/Other/Solution.xml` |
| 10 environment variables | `solution/src/environmentvariabledefinitions/` |

> **O 50697 não é detalhe.** É dele que saem os valores `506970000…` de todos
> os option sets (`ardx_Status`, `ardx_Urgencia`, `ardx_Tipo`…). Publisher com
> outro prefixo de option value cria choices em outra faixa e o de/para do app
> quebra em silêncio. O `pac solution init` gera um número aleatório: este foi
> corrigido à mão para bater com o que `dataverse/Setup-DemandaTable.ps1` usa.

### As 10 variáveis

Uma para cada ponto que o `GO-LIVE.md` §5 lista como "muda por ambiente".
As quatro de SLA cobrem exatamente as quatro etapas com meta em `SLA_DIAS`.

| Nome | Tipo | Padrão | Quem consome |
|---|---|---|---|
| `ardx_IntakeFormUrl` | String | — | Botão **New request** do app |
| `ardx_NotificationSender` | String | — | Flows N1–N5 (conta com Send As) |
| `ardx_DecisorInfraUpn` | String | — | Flow N3 (endereça a decisão) |
| `ardx_DecisorAppsUpn` | String | — | Flow N3 |
| `ardx_DecisorAiUpn` | String | — | Flow N3 |
| `ardx_PmoGroupUpn` | String | — | Flows N1 e N5 |
| `ardx_SlaTriageDays` | Number | 3 | Flow N5 |
| `ardx_SlaEvaluationDays` | Number | 5 | Flow N5 |
| `ardx_SlaDecisionDays` | Number | 3 | Flow N5 |
| `ardx_SlaReturnedDays` | Number | 5 | Flow N5 |

---

## 2. O que ainda NÃO está no projeto (e por quê)

Estes componentes existem no Dataverse, não em arquivo: só entram no projeto
depois de serem criados **dentro da solution** num ambiente e sincronizados de
volta. Isso exige login interativo no tenant (`pac auth create`), que não roda
em sessão automatizada.

| Componente | Como entra |
|---|---|
| Tabela `ardx_demanda` + option sets | `dataverse/Setup-DemandaTable.ps1` (já cria dentro da solution `IntakeForms`) |
| O Code App | `pac code push` e depois adicionar o app à solution |
| Flows N1–N5 | Criados no ambiente dentro da solution (ver `GO-LIVE.md` §4) |
| Security roles | Criados no ambiente dentro da solution |

Depois de tudo criado, um `pac solution sync` traz a definição declarativa para
`solution/src/` e aí sim o pacote inteiro passa a ser versionado.

---

## 3. Empacotar

```powershell
npm run solution:pack    # gera solution/out/IntakeForms.zip
npm run solution:check   # desempacota de volta — valida a estrutura
```

Sem parâmetro de ambiente, sem login: é só empacotar o que está em
`solution/src`. Foi assim que este pacote foi validado.

---

## 4. Ciclo DEV → TEST → PROD

### 4.1 Preparar o DEV **[CLIENTE fornece o ambiente]**

```powershell
pac auth create --environment <ID_DO_DEV>
pwsh dataverse/Setup-DemandaTable.ps1 -OrgUrl <URL_DO_DEV> -SolutionUniqueName IntakeForms
pac solution import --path solution/out/IntakeForms.zip --publish-changes
```

> Ambiente que **já foi provisionado** com o nome antigo `ARDXDemandSystem`:
> passe `-SolutionUniqueName ARDXDemandSystem`, ou mova os componentes para a
> solution nova pelo portal. Misturar os dois nomes deixa metade dos
> componentes fora do pacote.

Depois, publicar o app e adicioná-lo à solution:

```powershell
npm run build
pac code push
```

### 4.2 Trazer tudo para o repositório

```powershell
pac solution sync --solution-folder solution --solution-unique-name IntakeForms
npm run solution:pack
```

A partir daqui a tabela, o app e os flows estão em arquivo e o pacote é
reproduzível.

### 4.3 Subir para TEST e PROD

```powershell
pac auth create --environment <ID_DO_TEST>
pac solution import --path solution/out/IntakeForms.zip `
  --activate-plugins --force-overwrite
```

No import o Power Platform **pergunta o valor de cada environment variable**.
É aí que entram o UPN de cada decisor, a conta que envia e-mail e a URL do
formulário — sem tocar em código.

Para PROD, exportar como **managed** e importar com `--async`.

---

## 5. O ponto que ainda diverge (resolver no DEV)

As metas de SLA existem hoje em **dois lugares**:

- `src/domain/sla.ts` → `SLA_DIAS` — é o que pinta de vermelho na tela
- `ardx_SlaTriageDays` · `…Evaluation…` · `…Decision…` · `…Returned…` — é o que o flow N5 usa

Enquanto o app não ler a variável de ambiente, os dois têm que ser mantidos
iguais à mão. Para eliminar a duplicação, no ambiente DEV:

```powershell
pac code add-data-source -a dataverse -t environmentvariabledefinition
pac code add-data-source -a dataverse -t environmentvariablevalue
```

e trocar a constante de `sla.ts` pela leitura da variável. O mesmo vale para
`ardx_IntakeFormUrl`, que hoje é a variável de build `VITE_INTAKE_FORM_URL`.

> Não implementei isso agora porque o `add-data-source` gera o modelo tipado a
> partir do tenant: sem login, o código ficaria sem como ser compilado nem
> testado. Está registrado no checklist do `GO-LIVE.md`.

---

## 6. Checklist da Solution

- [ ] `npm run solution:pack` e `npm run solution:check` passam
- [ ] Publisher no pacote com prefixo `ardx` e OptionValuePrefix **50697**
- [ ] Tabela criada com `-SolutionUniqueName IntakeForms`
- [ ] App adicionado à solution depois do `pac code push`
- [ ] Flows N1–N5 criados **dentro** da solution
- [ ] `pac solution sync` rodado e o resultado commitado
- [ ] Valores das 10 variáveis preenchidos no import de cada ambiente
- [ ] `SLA_DIAS` (código) igual às variáveis de SLA — até a leitura ser unificada
