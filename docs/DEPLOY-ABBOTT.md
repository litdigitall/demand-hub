# Intake Forms — subir no ambiente Abbott

Passo a passo do que importar, nesta ordem, e o que confirmar em cada etapa.
Tudo que exige login interativo está marcado **[VOCÊ]**.

---

## A arquitetura, em uma frase

**Canvas "IT Request Form" → lista SharePoint → fluxo F1 (conta de serviço) →
Dataverse `intake_demanda` → app premium (Intake Forms).**

Quem abre demanda usa o Canvas, que fala só com o SharePoint — **conector
padrão, sem licença premium para o solicitante**. A licença premium fica só com
quem opera o funil, dentro do app.

## O que vai no pacote

| Componente | Vai na Solution? |
|---|---|
| Tabela `intake_demanda` — 78 colunas, 9 estados | sim |
| Tabela `intake_perfil` — cadastro de acesso | sim |
| Fluxo **F1** — lista SharePoint → Dataverse | sim |
| Fluxos **N1–N5** — notificações | sim |
| Publisher `intakepublisher` (prefixo `intake`) | sim |
| Lista SharePoint `ITRequests` | **não** — criar à mão, ver §1.1 |
| Canvas "IT Request Form" | **não** — exportar/importar à parte |
| O app (Power Apps Code App) | **não** — vai por `pac code push`, ver §3 |

Code App ainda não é exportável como componente de solution. O `--solutionName`
associa o app à solution no ambiente, mas o export não o carrega.

---

## 1.1 A lista SharePoint `ITRequests` **[VOCÊ]**

O Canvas grava aqui. As colunas abaixo saíram do próprio app (li os
`DataField` do formulário), não de suposição — **o nome tem que bater exatamente**,
senão o Canvas não liga.

Crie uma lista chamada `ITRequests` e adicione:

| Coluna | Tipo |
|---|---|
| `Titulo` · `Descricao` · `ProblemaResolve` · `ObjetivoPrincipal` | Texto (as duas últimas, multilinha) |
| `AreaSolicitante` · `Solicitante` · `Email` · `Sponsor` | Texto |
| `ConsequenciaNaoExecucao` · `RCE` · `Origem` · `Numero` | Texto |
| `SistemasEnvolvidos` · `AreasEnvolvidas` · `DonoProcesso` · `DonoProcessoEmail` | Texto |
| `ImpactoAbrangencia` · `Urgencia` · `Tipo` · `Status` | Número |
| `ValorEstimado` · `PrioridadeEstimada` | Número |
| `ScoreBusinessImpact` · `ScoreUrgency` · `ScoreRevenue` | Número |
| `ImpactoAbrangenciaNome` · `UrgenciaNome` · `TipoNome` · `StatusNome` · `ValorEstimadoNome` | Texto |
| `DataSolicitacao` | Data e hora |
| `PrazoDesejado` | Data |
| `DadosSensiveis` · `ImpactaSeguranca` · `RequerAuditoria` | Sim/Não |
| `Sincronizado` | Sim/Não |
| Anexos | habilitar anexos na lista |

> As colunas terminadas em `Nome` guardam o rótulo legível ao lado do código
> numérico. É o que deixa a lista legível para quem abre o SharePoint direto,
> sem precisar decorar que 506970000 é "Crítico".

**`Sincronizado` é o que impede duplicata:** o F1 só processa item com esse
campo vazio e o marca ao terminar. Sem essa coluna, cada rodada do gatilho
recria a demanda.

**O número vem do SharePoint.** O Canvas grava `Numero` como
`"DEM-" & Text(ID,"0000")`, derivado do ID do item, e o F1 só copia.

> Atenção a uma colisão possível: o formulário interno do app (`/solicitar`,
> que é só reserva) numera por "maior existente + 1". Se os dois pontos de
> entrada forem usados em paralelo, dois registros podem receber o mesmo
> número. Com o Canvas como porta única, não acontece.

---

## 1. Importar a Solution **[VOCÊ]**

Arquivo: `entrega/IntakeForms_managed.zip`

Pelo portal: **make.powerapps.com** → ambiente da Abbott → *Soluções* →
*Importar solução* → escolher o arquivo → *Avançar* até concluir.

> ### Importe DUAS VEZES na primeira instalação
>
> O Dataverse **não cria uma tabela e as choices dela no mesmo import**. Na
> primeira passada a `intake_demanda` entra sem as 6 choices (Status, Tipo,
> Urgência, Impacto, Esforço, Classificação) e o import pode acusar erro. A
> segunda passada, com a tabela já existindo, completa tudo.
>
> Isso foi descoberto bissetando por tipo de atributo: sem as choices, as 72
> colunas restantes entram; com a tabela existindo, as 78 passam.

**Conferir:** a tabela `intake_demanda` tem o campo **Status** com 8 opções,
incluindo *Em aprovacao* e *Devolvida*. Sem esses dois, "enviar para aprovação"
e "devolver" falham na gravação e o app parece quebrado sem motivo aparente.

### Por que o prefixo é `intake` e a faixa de choice é 50697

Os valores das choices são `506970000`, `506970001`… e as constantes de
`src/data/types.ts` dependem deles. A faixa vem do publisher
(`OptionValuePrefix × 10000`). **Não troque o publisher da solution**: com
outra faixa, as choices nascem em `3169…` e o de-para do app quebra em
silêncio — grava e lê valores que não existem.

---

## 2. Ligar as conexões dos fluxos **[VOCÊ]**

Os cinco fluxos chegam **desligados** e sem conexão. Cada um usa duas:

| Conector | Para quê |
|---|---|
| **Microsoft Dataverse** | gatilho nas demandas, leitura de perfis, gravação do F1 |
| **Office 365 Outlook** | enviar os e-mails (N1–N5) |
| **SharePoint** | ler a lista do Canvas (só o F1) |

No portal: *Soluções* → Intake Forms → cada fluxo → **Editar** → escolher a
conexão em cada ação → **Salvar** → **Ativar**.

> Recomendado: criar as conexões com uma **conta de serviço** (ex.:
> `it-intake@abbott.com`) e não com uma conta pessoal. Fluxo preso à conta de
> quem saiu da empresa para de rodar.

### O que cada fluxo faz

| Fluxo | Dispara quando | Avisa quem |
|---|---|---|
| **N1** | demanda criada | PMO + confirmação ao solicitante |
| **N2** | status → *Em análise* | time técnico |
| **N3** | status → *Em aprovação* | o decisor da frente da demanda |
| **N4** | status → *Priorizada* ou *Recusada* | solicitante + PMO |
| **N5** | todo dia às 8h | PMO, com o que passou da meta da etapa |

E o **F1**, que não é notificação: a cada 3 minutos lê a lista SharePoint,
cria a demanda no Dataverse e marca `Sincronizado`. Ele usa **SharePoint +
Dataverse** (não usa Outlook). No F1, ajuste no gatilho e na última ação o
endereço do site e o nome da lista — hoje estão com um valor de exemplo
(`https://SEUTENANT.sharepoint.com/sites/IntakeForms`).

**Os destinatários não são e-mails fixos.** Cada fluxo consulta a tabela
`intake_perfil` — a mesma que o administrador mantém em **Settings → People**.
Trocar o PMO ou um decisor é cadastro na tela, não edição de fluxo.

### Dois valores para ajustar dentro dos fluxos

1. **Link do app.** Cada fluxo começa com um *Compose* chamado `Link_do_app`,
   hoje apontando para `make.powerapps.com`. Troque pelo endereço do app
   publicado (§3) para os e-mails levarem direto à demanda.
2. **Metas de SLA no N5.** Os limites (3 dias em triagem, 5 em avaliação, 3 na
   decisão) estão em três *Compose* no começo do fluxo e espelham `SLA_DIAS`
   em `src/domain/sla.ts`. Mudou num lado, mude no outro: senão a tela e o
   e-mail discordam sobre o que está atrasado.

---

## 3. Publicar o app **[VOCÊ + LIT]**

```powershell
pac auth create --environment <ID_DO_AMBIENTE_ABBOTT>
npm install
npm run build
pac code push --solutionName IntakeForms
```

O `pac auth create` abre o navegador — precisa de alguém com acesso ao tenant.

**Conferir:** abrir o app publicado e confirmar que a lista carrega.

---

## 4. Primeiro acesso: quem é o administrador

Não existe tela de login: a identidade vem do Microsoft 365, como em qualquer
app do Power Apps.

Com a tabela `intake_perfil` **vazia**, a primeira pessoa que abrir o app entra
como **Admin**, justamente para poder montar a equipe em **Settings → People**.
Assim que existir qualquer perfil cadastrado, a regra se desliga e passa a
valer só o cadastro.

Cadastre no primeiro acesso:
- o **PMO** (triagem, ranking, Overview e Capacity)
- o **time técnico** (avaliação: time, horas e score)
- um **decisor por frente**: Infrastructure, AI e Applications

Quem não estiver cadastrado entra como **Requester**: abre e acompanha as
próprias demandas, e mais nada.

> Duas garantias, cobertas por teste: falha ao ler o cadastro resulta em
> Requester (nunca em mais acesso), e um cadastro com linhas todas inativas
> **não** volta a dar Admin a quem entrar — senão desativar todo mundo viraria
> escalada de privilégio.

---

## 5. Checklist

- [ ] Solution importada **duas vezes** na primeira instalação
- [ ] `intake_demanda` com Status de 8 opções
- [ ] Publisher `intakepublisher`, prefixo `intake`, OptionValuePrefix 50697
- [ ] Conexões Dataverse e Outlook criadas com conta de serviço
- [ ] Os 5 fluxos com conexão escolhida e **ativados**
- [ ] `Link_do_app` ajustado nos 5 fluxos
- [ ] Metas do N5 iguais a `SLA_DIAS`
- [ ] App publicado com `pac code push --solutionName IntakeForms`
- [ ] Primeiro acesso feito e PMO, time técnico e os 3 decisores cadastrados
- [ ] Lista `ITRequests` criada com os nomes de coluna exatos (§1.1)
- [ ] Canvas "IT Request Form" importado e ligado à lista
- [ ] F1 com site e lista corretos, e **ativado**
- [ ] Uma demanda **pelo Canvas**, conferindo que ela aparece no app em até 3 min
- [ ] Uma demanda de ponta a ponta, conferindo o e-mail de cada etapa

---

## O que não foi testado, e por quê

Os fluxos foram **importados e verificados** no ambiente de desenvolvimento: o
servidor guardou gatilhos, ações e referências de conexão íntegros, o que
confirma que as definições são válidas.

Não foi possível **executá-los**: criar a conexão do Office 365 Outlook exige
consentimento no navegador, e no ambiente de desenvolvimento ela não existe.
Por isso o checklist pede uma demanda de ponta a ponta antes de liberar aos
usuários — é nesse teste que se confirma que cada e-mail sai, com o
destinatário certo.
