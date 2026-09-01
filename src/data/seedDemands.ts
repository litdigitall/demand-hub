/* ============================================================
   Demandas-semente da demo — 5 demandas cobrindo as 3 frentes
   (Infra · AI · Apps) e os principais estados do fluxo de 4 atores:
   2 já aprovadas pelo decisor da área, 1 em aprovação, 1 em
   avaliação e 1 em triagem.
   ============================================================ */
import {
  AUTO_AVALIADOR,
  ImpactoAbrangencia,
  Impacto,
  StatusDemanda,
  TipoDemanda,
  TipoImpacto,
  Urgencia,
  aprovacoesPadrao,
  scoreAutomatico,
  type Demand,
} from "./types";

const dia = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString();
};

/** nome.sobrenome@litdigitall.com.br a partir do nome do solicitante. */
function emailDe(nome: string): string {
  const slug = nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return slug ? `${slug}@litdigitall.com.br` : "";
}

function base(n: number, extra: Partial<Demand>): Demand {
  const abr = extra.impactoAbrangencia ?? ImpactoAbrangencia.Processo;
  const criadoEm = extra.dataSolicitacao ?? dia(-10);
  const d: Demand = {
    id: `seed-${n}`,
    numero: `DEM-${String(n).padStart(4, "0")}`,
    titulo: "",
    descricao: "",
    areaSolicitante: "",
    solicitante: "Ana Ribeiro",
    email: "",
    telefone: "",
    dataSolicitacao: criadoEm,
    problemaResolve: "",
    objetivoPrincipal: "",
    processosImpactados: "",
    consequenciaNaoExecucao: "Operational disruption",
    tipo: TipoDemanda.ProjetoNovo,
    impactoNivel: Impacto.Medio,
    tiposImpacto: [TipoImpacto.Eficiencia],
    valorEstimado: null,
    impactoAbrangencia: abr,
    roiEstimado: null,
    urgencia: Urgencia.Medio,
    deadline: "",
    sistemasEnvolvidos: "",
    integracoesNecessarias: "",
    requisitosPrincipais: "",
    solucaoProposta: "",
    sponsor: "Carlos Mendes",
    donoProcesso: "",
    areasEnvolvidas: "",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforcoEstimado: null,
    anexos: [],
    status: StatusDemanda.Nova,
    score: { businessImpact: 1, urgency: 1, returnValue: 1 },
    scoreFlags: [],
    projectStage: "Discovery",
    finalPriority: null,
    comentarios: [],
    avaliacoes: [
      {
        criterio: "businessImpact",
        validadoPor: AUTO_AVALIADOR,
        validadoEm: criadoEm,
        comentario: "Automatically calculated from the impact level informed at intake.",
      },
    ],
    stackValidadaPor: "",
    stackValidadaEm: "",
    aprovacoes: [],
    time: "",
    horasEstimadas: 0,
    respostaBusiness: "",
    dmcAprovado: null,
    dmcData: "",
    dmcComentario: "",
    idServiceNow: "",
    idProjeto: "",
    rce: "",
    criadoEm,
    modificadoEm: criadoEm,
    ...extra,
  };
  // O e-mail acompanha quem pediu (antes toda demanda herdava o mesmo endereço)
  if (!d.email) d.email = emailDe(d.solicitante);
  // As 3 notas saem automaticamente dos campos do intake (modelo simplificado)
  d.score = scoreAutomatico(d);
  // Gate coerente com a classificação, se não veio pronto no extra
  if (!d.aprovacoes.length) d.aprovacoes = aprovacoesPadrao(d);
  return d;
}

/** Gate do decisor já APROVADO (para as demandas aceitas pelo DMC). */
function gateAprovado(d: { clasificacion?: string; tipo: number }, quando: string, comentario: string) {
  return aprovacoesPadrao(d).map((s) => ({
    ...s,
    status: "aprovado" as const,
    acaoEm: quando,
    comentario,
  }));
}

export function seedDemands(): Demand[] {
  return [
    /* 1 — INFRA · aprovada por Sambini · em execução */
    base(
      1,
      {
        titulo: "Data center network segmentation — Plant RJ",
        descricao:
          "Segment the plant network into security zones (OT x IT) and replace the core switches to remove the single point of failure identified in the last audit.",
        areaSolicitante: "Facilities",
        solicitante: "Ana Ribeiro",
        problemaResolve: "Single point of failure and flat network in the plant data center.",
        objetivoPrincipal: "Reduce outage risk and isolate OT traffic from corporate IT.",
        consequenciaNaoExecucao: "Security exposure",
        tipo: TipoDemanda.Infraestrutura,
        clasificacion: "infra",
        impactoNivel: Impacto.Alto,
        impactoAbrangencia: ImpactoAbrangencia.Infraestrutura,
        tiposImpacto: [TipoImpacto.Risco],
        urgencia: Urgencia.Alto,
        valorEstimado: 180000,
        sistemasEnvolvidos: "Core switches, firewalls, WLC",
        sponsor: "Sambini",
        status: StatusDemanda.EmExecucao,
        projectStage: "Build",
        finalPriority: 1,
        time: "External Delivery",
        horasEstimadas: 320,
        abbottProjectType: "RAPID / Sprint",
        aprovacoes: gateAprovado(
          { tipo: TipoDemanda.Infraestrutura, clasificacion: "infra" },
          dia(-6),
          "Approved — audit remediation, start immediately.",
        ),
        dmcAprovado: true,
        dmcData: dia(-6),
        dmcComentario: "Approved — audit remediation, start immediately.",
        idServiceNow: "RITM0045821",
        rce: "RCE-2026-118",
      },
    ),

    /* 2 — APPS · aprovada por Gabriela · priorizada */
    base(
      2,
      {
        titulo: "Salesforce CRM — real-time order status from SAP",
        descricao:
          "Integrate Salesforce CRM with SAP S/4HANA so the commercial team sees order and invoice status without opening tickets to the back office.",
        areaSolicitante: "Sales",
        solicitante: "Carlos Mendes",
        problemaResolve: "Commercial team has no visibility of order status; ~40 tickets/week to back office.",
        objetivoPrincipal: "Self-service order tracking inside the CRM.",
        consequenciaNaoExecucao: "Customer dissatisfaction",
        tipo: TipoDemanda.MelhoriaSistema,
        clasificacion: "app",
        impactoNivel: Impacto.Alto,
        impactoAbrangencia: ImpactoAbrangencia.Departamento,
        tiposImpacto: [TipoImpacto.Eficiencia, TipoImpacto.ExperienciaCliente],
        urgencia: Urgencia.Medio,
        valorEstimado: 95000,
        roiEstimado: 30,
        sistemasEnvolvidos: "Salesforce CRM, SAP S/4HANA",
        integracoesNecessarias: "SAP OData + MuleSoft",
        appId: "APP-0123",
        appName: "Salesforce CRM",
        sponsor: "Carlos Mendes",
        status: StatusDemanda.Priorizada,
        finalPriority: 2,
        time: "Internal Delivery",
        horasEstimadas: 240,
        abbottProjectType: "RAPID / Sprint",
        aprovacoes: gateAprovado(
          { tipo: TipoDemanda.MelhoriaSistema, clasificacion: "app" },
          dia(-3),
          "Approved — high value for the commercial funnel.",
        ),
        dmcAprovado: true,
        dmcData: dia(-3),
        dmcComentario: "Approved — high value for the commercial funnel.",
        idServiceNow: "RITM0046102",
        rce: "RCE-2026-131",
      },
    ),

    /* 3 — AI · em aprovação (aguardando o AI Decisor) */
    base(
      3,
      {
        titulo: "AI copilot for fiscal reconciliation analysts",
        descricao:
          "Assistant that suggests likely matches between fiscal and accounting entries and drafts the justification text for the analyst's decision (human-in-the-loop).",
        areaSolicitante: "Finance",
        solicitante: "Patricia Lima",
        problemaResolve: "Analysts spend days hunting divergences at month-end close.",
        objetivoPrincipal: "Cut reconciliation effort by 60% with AI-assisted matching.",
        consequenciaNaoExecucao: "Increased costs",
        tipo: TipoDemanda.Automacao,
        clasificacion: "ia",
        impactoNivel: Impacto.Alto,
        impactoAbrangencia: ImpactoAbrangencia.Departamento,
        tiposImpacto: [TipoImpacto.ReducaoCustos, TipoImpacto.Eficiencia],
        urgencia: Urgencia.Medio,
        valorEstimado: 620000,
        roiEstimado: 45,
        sistemasEnvolvidos: "SAP FAGLL03, Comply, Azure OpenAI",
        dadosSensiveis: true,
        sponsor: "Patricia Lima",
        status: StatusDemanda.EmAprovacao,
        time: "Internal Delivery",
        horasEstimadas: 400,
        abbottProjectType: "Phase 0",
        aprovacoes: aprovacoesPadrao({ tipo: TipoDemanda.Automacao, clasificacion: "ia" }),
      },
    ),

    /* 4 — APPS · em avaliação (Time Técnico define capacity) */
    base(
      4,
      {
        titulo: "Expense report app crashes on submit (mobile)",
        descricao:
          "Since the last update, the expense report app closes unexpectedly when submitting reports with more than 10 receipts on Android devices.",
        areaSolicitante: "Human Resources",
        solicitante: "Juliana Costa",
        problemaResolve: "Employees cannot submit expense reports on mobile.",
        objetivoPrincipal: "Restore stable submission flow on Android.",
        consequenciaNaoExecucao: "Operational disruption",
        tipo: TipoDemanda.CorrecaoBug,
        clasificacion: "app",
        impactoNivel: Impacto.Medio,
        impactoAbrangencia: ImpactoAbrangencia.Departamento,
        urgencia: Urgencia.Alto,
        appId: "APP-0321",
        appName: "Workday HCM",
        sponsor: "Juliana Costa",
        status: StatusDemanda.EmAnalise,
      },
    ),

    /* 5 — INFRA · em triagem (PMO) */
    base(
      5,
      {
        titulo: "Wi-Fi coverage expansion — Facilities warehouse",
        descricao:
          "Warehouse aisles 12–18 have no Wi-Fi coverage; scanners lose connection during inventory counts.",
        areaSolicitante: "Facilities",
        solicitante: "Roberto Almeida",
        problemaResolve: "Scanners offline in part of the warehouse.",
        objetivoPrincipal: "Full coverage for inventory operations.",
        consequenciaNaoExecucao: "Operational disruption",
        tipo: TipoDemanda.Infraestrutura,
        clasificacion: "infra",
        impactoNivel: Impacto.Medio,
        impactoAbrangencia: ImpactoAbrangencia.Processo,
        urgencia: Urgencia.Medio,
        sponsor: "Sambini",
        status: StatusDemanda.Nova,
        dataSolicitacao: dia(-1),
        criadoEm: dia(-1),
        modificadoEm: dia(-1),
      },
    ),
  ];
}
