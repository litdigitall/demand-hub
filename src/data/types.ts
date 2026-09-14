/* ============================================================
   Modelo de domínio — Demand System (Intake Form de IT)
   ============================================================ */

/* ---------------- Enums (choices) --------------------------- */

/* Os valores numéricos batem com o option set criado no Dataverse
   (base 506970000 — ver dataverse/schema-info.json). */
export const TipoDemanda = {
  ProjetoNovo: 506970000,
  MelhoriaSistema: 506970001,
  CorrecaoBug: 506970002,
  Compliance: 506970003,
  Infraestrutura: 506970004,
  Seguranca: 506970005,
  Automacao: 506970006,
} as const;

export const tipoLabel: Record<number, string> = {
  [TipoDemanda.ProjetoNovo]: "New project",
  [TipoDemanda.MelhoriaSistema]: "Improvement",
  [TipoDemanda.CorrecaoBug]: "Bug fix",
  [TipoDemanda.Compliance]: "Compliance",
  [TipoDemanda.Infraestrutura]: "Infrastructure",
  [TipoDemanda.Seguranca]: "Security",
  [TipoDemanda.Automacao]: "Automation",
};

export const Impacto = {
  Alto: 506970000,
  Medio: 506970001,
  Baixo: 506970002,
} as const;
export const impactoLabel: Record<number, string> = {
  [Impacto.Alto]: "High",
  [Impacto.Medio]: "Medium",
  [Impacto.Baixo]: "Low",
};

export const TipoImpacto = {
  Receita: 1,
  ReducaoCustos: 2,
  Eficiencia: 3,
  Risco: 4,
  ExperienciaCliente: 5,
} as const;
export const tipoImpactoLabel: Record<number, string> = {
  [TipoImpacto.Receita]: "Revenue",
  [TipoImpacto.ReducaoCustos]: "Cost reduction",
  [TipoImpacto.Eficiencia]: "Operational efficiency",
  [TipoImpacto.Risco]: "Risk / compliance",
  [TipoImpacto.ExperienciaCliente]: "Customer experience",
};

export const Urgencia = {
  Critico: 506970000,
  Alto: 506970001,
  Medio: 506970002,
  Baixo: 506970003,
} as const;
export const urgenciaLabel: Record<number, string> = {
  [Urgencia.Critico]: "Critical",
  [Urgencia.Alto]: "High",
  [Urgencia.Medio]: "Medium",
  [Urgencia.Baixo]: "Low",
};

export const EsforcoEstimado = {
  Pequeno: 506970000, // < 1 mês
  Medio: 506970001, // 1–3 meses
  Grande: 506970002, // 3+ meses
} as const;
export const esforcoLabel: Record<number, string> = {
  [EsforcoEstimado.Pequeno]: "Small (<1 month)",
  [EsforcoEstimado.Medio]: "Medium (1-3 months)",
  [EsforcoEstimado.Grande]: "Large (3+ months)",
};

export const StatusDemanda = {
  /* Valores 506970000..5 batem com o option set original do Dataverse;
     506970006..8 foram adicionados para o ciclo de vida unificado. */
  Nova: 506970000, // submetida, aguardando triagem do PMO
  EmAnalise: 506970001, // em avaliação (scoring por papel + capacity)
  Priorizada: 506970002, // aprovada e priorizada no ranking
  EmExecucao: 506970003,
  Concluida: 506970004,
  Recusada: 506970005, // terminal
  Rascunho: 506970006, // solicitante ainda editando, não submeteu
  EmAprovacao: 506970007, // gates sponsor → tech lead → diretor (DMC)
  Devolvida: 506970008, // devolvida ao solicitante para complementar
} as const;
export const statusLabel: Record<number, string> = {
  [StatusDemanda.Rascunho]: "Draft",
  [StatusDemanda.Nova]: "Triage",
  [StatusDemanda.EmAnalise]: "Evaluation",
  [StatusDemanda.EmAprovacao]: "Approval",
  [StatusDemanda.Priorizada]: "Prioritized",
  [StatusDemanda.EmExecucao]: "Execution",
  [StatusDemanda.Concluida]: "Completed",
  [StatusDemanda.Devolvida]: "Returned",
  [StatusDemanda.Recusada]: "Rejected",
};

type Option = { value: number; label: string };
export const toOptions = (m: Record<number, string>): Option[] =>
  Object.entries(m).map(([v, label]) => ({ value: Number(v), label }));

export const tipoOptions = toOptions(tipoLabel);
export const impactoOptions = toOptions(impactoLabel);
export const tipoImpactoOptions = toOptions(tipoImpactoLabel);
export const urgenciaOptions = toOptions(urgenciaLabel);
export const esforcoOptions = toOptions(esforcoLabel);
export const statusOptions = toOptions(statusLabel);

/* ---------------- Abrangência do impacto (score automático) -----
   O solicitante escolhe ATÉ ONDE a demanda impacta; o critério
   "Impacto no Negócio" (businessImpact) é calculado automaticamente
   a partir disso — o usuário não precisa saber pontuar. */
export const ImpactoAbrangencia = {
  Usuario: 1,
  Processo: 2,
  Departamento: 3,
  Infraestrutura: 4,
} as const;
export const abrangenciaLabel: Record<number, string> = {
  [ImpactoAbrangencia.Usuario]: "User (individual impact)",
  [ImpactoAbrangencia.Processo]: "Process (a single workflow)",
  [ImpactoAbrangencia.Departamento]: "Department / Organization",
  [ImpactoAbrangencia.Infraestrutura]: "Infrastructure (IT backbone)",
};
export const abrangenciaOptions = toOptions(abrangenciaLabel);
/** Mapa abrangência → nota 1..5 do critério businessImpact. */
export const ABRANGENCIA_SCORE: Record<number, number> = {
  [ImpactoAbrangencia.Usuario]: 2,
  [ImpactoAbrangencia.Processo]: 3,
  [ImpactoAbrangencia.Departamento]: 4,
  [ImpactoAbrangencia.Infraestrutura]: 5,
};
export const AUTO_AVALIADOR = "Automatic (impact level)";

/** Criticality (qualification) derived from urgency. */
export function criticidad(urgencia: number): { label: string; color: string } {
  if (urgencia === Urgencia.Critico) return { label: "Critical", color: "red" };
  if (urgencia === Urgencia.Alto) return { label: "High", color: "orange" };
  if (urgencia === Urgencia.Medio) return { label: "Medium", color: "yellow" };
  return { label: "Low", color: "gray" };
}

/* ---------------- Clasificación de proyecto (view por portfólio) ----
   Tres frentes con dueños distintos. Es un campo explícito de la demanda
   (`clasificacion`); si no se informa, se deriva del Demand Type. */
export type Categoria = "infra" | "ia" | "app" | "otro";
export const CATEGORIA_TIPO: Record<number, Categoria> = {
  [TipoDemanda.Infraestrutura]: "infra",
  [TipoDemanda.Seguranca]: "infra",
  [TipoDemanda.ProjetoNovo]: "app",
  [TipoDemanda.MelhoriaSistema]: "app",
  [TipoDemanda.CorrecaoBug]: "app",
  [TipoDemanda.Automacao]: "app",
  [TipoDemanda.Compliance]: "app",
};
export const CATEGORIA_VIEW_LABEL: Record<Categoria, string> = {
  infra: "Infrastructure",
  ia: "AI",
  app: "Applications",
  otro: "Other",
};
/* Decisor de cada frente do portfólio (gate único de aprovação). */
export const CATEGORIA_RESPONSAVEL: Record<Categoria, string> = {
  infra: "Sambini",
  ia: "AI Decisor",
  app: "Gabriela",
  otro: "—",
};
export const CATEGORIA_COR_VIEW: Record<Categoria, string> = {
  infra: "gray",
  ia: "violet",
  app: "cyan",
  otro: "orange",
};
export const clasificacionOptions = (Object.keys(CATEGORIA_VIEW_LABEL) as Categoria[]).map(
  (v) => ({ value: v, label: CATEGORIA_VIEW_LABEL[v] }),
);
export function categoriaDe(tipo: number): Categoria {
  return CATEGORIA_TIPO[tipo] ?? "app";
}
/** Clasificación efectiva: campo explícito o, si falta, derivado del tipo. */
export function clasificacionEfetiva(d: { clasificacion?: string; tipo: number }): Categoria {
  const c = d.clasificacion as Categoria | undefined;
  return c === "infra" || c === "ia" || c === "app" || c === "otro" ? c : categoriaDe(d.tipo);
}

/** Note about when effort counting starts. */
export const ESFUERZO_TRIGGER_NOTA =
  "Effort (hours/FTE) is counted from the technical evaluation (Phase 0), set by the technical team.";

/* ---------------- Score (priorização) -----------------------
   MODELO SIMPLIFICADO (3 critérios, pesos redondos).

   Objetivo do score: ordenar a fila para decidir O QUE FAZER PRIMEIRO.
   Ele mede VALOR para o negócio. O ESFORÇO (horas/time) NÃO entra no
   score — é o outro lado da conta, tratado em Capacity pelo PMO.

   As três notas são DERIVADAS automaticamente do que o solicitante já
   informou no intake (ver scoreAutomatico). PMO/Time Técnico podem
   ajustar manualmente, mas ninguém precisa "saber pontuar".        */

export interface Score {
  businessImpact: number; // 50% — até onde a demanda impacta
  urgency: number;        // 30% — urgência / risco de não fazer
  returnValue: number;    // 20% — retorno econômico esperado
}

export const SCORE_WEIGHTS: Score = {
  businessImpact: 0.5,
  urgency: 0.3,
  returnValue: 0.2,
};

export const SCORE_LABELS: Record<keyof Score, string> = {
  businessImpact: "Business impact",
  urgency: "Urgency & risk",
  returnValue: "Expected return",
};

/** Explicação em uma linha — mostrada ao lado de cada critério. */
export const SCORE_HELP: Record<keyof Score, string> = {
  businessImpact: "How far the request reaches: one user, a process, a department or the IT backbone.",
  urgency: "Deadline pressure, legal/compliance exposure and the consequence of not doing it.",
  returnValue: "Expected economic benefit (savings or revenue) declared by the requester.",
};

/** De onde a nota vem automaticamente (rastreabilidade na tela). */
export const SCORE_ORIGEM: Record<keyof Score, string> = {
  businessImpact: "Impact scope",
  urgency: "Urgency",
  returnValue: "Expected benefit",
};

/** Quem é responsável por validar cada critério */
export type CategoriaAvaliacao = "negocio" | "pmo";

export const CRITERIO_CATEGORIA: Record<keyof Score, CategoriaAvaliacao> = {
  businessImpact: "negocio",
  returnValue: "negocio",
  urgency: "pmo",
};

export const CATEGORIA_LABEL: Record<CategoriaAvaliacao, string> = {
  negocio: "Business",
  pmo: "PMO",
};

export const CATEGORIA_DESCRICAO: Record<CategoriaAvaliacao, string> = {
  negocio: "Value for the business — comes from the intake form",
  pmo: "Urgency and compliance — validated by the PMO",
};

export const CATEGORIA_COR: Record<CategoriaAvaliacao, string> = {
  negocio: "blue",
  pmo: "teal",
};

/* --------- Derivação automática das três notas --------------- */

/** Urgência informada → nota 1..5 do critério de urgência. */
export const URGENCIA_SCORE: Record<number, number> = {
  [Urgencia.Critico]: 5,
  [Urgencia.Alto]: 4,
  [Urgencia.Medio]: 3,
  [Urgencia.Baixo]: 2,
};

/** Faixas do benefício econômico esperado → nota 1..5. */
export const FAIXAS_RETORNO: { ate: number; nota: number; label: string }[] = [
  { ate: 1, nota: 1, label: "Not declared" },
  { ate: 50_000, nota: 2, label: "< US$ 50k" },
  { ate: 200_000, nota: 3, label: "US$ 50k – 200k" },
  { ate: 500_000, nota: 4, label: "US$ 200k – 500k" },
  { ate: Number.POSITIVE_INFINITY, nota: 5, label: "≥ US$ 500k" },
];

export function retornoScore(valorEstimado: number | null | undefined): number {
  const v = valorEstimado ?? 0;
  return FAIXAS_RETORNO.find((f) => v < f.ate)?.nota ?? 5;
}

/** Calcula as 3 notas a partir dos campos do intake (sem pedir nada a mais). */
export function scoreAutomatico(d: {
  impactoAbrangencia?: number;
  urgencia: number;
  valorEstimado: number | null;
}): Score {
  return {
    businessImpact: ABRANGENCIA_SCORE[d.impactoAbrangencia ?? 0] ?? 2,
    urgency: URGENCIA_SCORE[d.urgencia] ?? 3,
    returnValue: retornoScore(d.valorEstimado),
  };
}

export interface AvaliacaoCriterio {
  criterio: keyof Score;
  validadoPor: string; // nome do avaliador
  validadoEm: string; // ISO
  comentario: string;
}

/* ---------------- Aprovações ------------------------------- */
/** Step do fluxo de aprovação: UM gate, decidido pelo DECISOR DA ÁREA
    da demanda (Infra → Sambini · Apps → Gabriela · AI → AI Decisor). */
export const NivelAprovacao = {
  Decisor: "decisor",
} as const;
export type NivelAprovacao = (typeof NivelAprovacao)[keyof typeof NivelAprovacao];

/* Records tipados como Record<string,…> de propósito: dados antigos podem
   conter os níveis legados (sponsor/techlead/diretor) e não podem quebrar a UI. */
export const nivelAprovacaoLabel: Record<string, string> = {
  decisor: "Decisor da área",
  sponsor: "Sponsor (legado)",
  techlead: "Tech Lead (legado)",
  diretor: "Diretor (legado)",
};
export const nivelAprovacaoLabelEN: Record<string, string> = {
  decisor: "Area Decisor",
  sponsor: "Sponsor (legacy)",
  techlead: "Tech Lead (legacy)",
  diretor: "Director (legacy)",
};

export const StatusAprovacao = {
  Pendente: "pendente",
  Aprovado: "aprovado",
  Recusado: "recusado",
} as const;
export type StatusAprovacao = (typeof StatusAprovacao)[keyof typeof StatusAprovacao];

export interface AprovacaoStep {
  nivel: NivelAprovacao;
  /** Nome de quem deve aprovar (mostra como avatar/etiqueta). */
  responsavel: string;
  status: StatusAprovacao;
  /** ISO de quando foi aprovada/recusada. "" se ainda pendente. */
  acaoEm: string;
  comentario: string;
}

/* ---------------- Delivery Teams --------------------------- */
export const TIMES_IMPLANTACAO = [
  "Internal Delivery",
  "External Delivery",
  "Support",
] as const;
export type TimeImplantacao = (typeof TIMES_IMPLANTACAO)[number];

/** Estados que de fato ocupam hora de time (base do cálculo de capacidade). */
export const CONSOME_CAPACIDADE: number[] = [
  StatusDemanda.Priorizada,
  StatusDemanda.EmExecucao,
];

/** Monthly default capacity per team (hours) — used in /capacity. */
export const CAPACIDADE_PADRAO_HORAS: Record<TimeImplantacao, number> = {
  "Internal Delivery": 640, // 4 people x 160h
  "External Delivery": 960, // 6 people x 160h (consultancies)
  Support: 480, // 3 people x 160h
};

/* ---------------- Workflow end-to-end (7 estágios) ---------- */
export const ESTAGIOS_FLUXO = [
  "intake",
  "businessResponse",
  "priorityMatrix",
  "priorityLevel",
  "dmcApproval",
  "execution",
  "implementation",
] as const;
export type EstagioFluxo = (typeof ESTAGIOS_FLUXO)[number];

export const estagioLabel: Record<EstagioFluxo, string> = {
  intake: "Intake",
  businessResponse: "Resposta Business",
  priorityMatrix: "Matriz de Priorização",
  priorityLevel: "Nível de Prioridade",
  dmcApproval: "DMC (Aprovação)",
  execution: "Andamento do Projeto",
  implementation: "Implementação",
};

export const estagioLabelEN: Record<EstagioFluxo, string> = {
  intake: "Intake",
  businessResponse: "Business Response",
  priorityMatrix: "Priority Matrix",
  priorityLevel: "Priority Level",
  dmcApproval: "DMC (Approval)",
  execution: "Project in Progress",
  implementation: "Implementation",
};

export type EstagioStatus = "concluido" | "atual" | "futuro" | "bloqueado";

export interface EstagioInfo {
  estagio: EstagioFluxo;
  status: EstagioStatus;
  hint: string;
}

/** Calcula o status de cada um dos 7 estágios do fluxo a partir da demanda. */
export function fluxoEstagios(d: {
  status: number;
  respostaBusiness: string;
  score: Score;
  avaliacoes: AvaliacaoCriterio[];
  finalPriority: number | null;
  dmcAprovado: boolean | null;
  aprovacoes: AprovacaoStep[];
  idProjeto: string;
}): EstagioInfo[] {
  const isRecusada = d.status === StatusDemanda.Recusada;
  const isConcluida = d.status === StatusDemanda.Concluida;
  const isEmExec = d.status === StatusDemanda.EmExecucao;
  const totalAvaliacoes = d.avaliacoes.length;

  // Passos com lógica
  const intakeDone = true;
  const businessDone = !!d.respostaBusiness.trim();
  const matrixDone = totalAvaliacoes >= 4; // pelo menos 4 critérios validados
  const priorityDone = d.finalPriority != null && d.finalPriority > 0;
  const dmcDone = d.dmcAprovado === true;
  const dmcRejected = d.dmcAprovado === false;
  const execStarted = isEmExec || isConcluida;
  const implDone = isConcluida || !!d.idProjeto.trim();

  function step(stage: EstagioFluxo, done: boolean, atual: boolean, hint: string): EstagioInfo {
    let status: EstagioStatus = "futuro";
    if (isRecusada || dmcRejected) {
      if (done) status = "concluido";
      else status = "bloqueado";
    } else if (done) status = "concluido";
    else if (atual) status = "atual";
    return { estagio: stage, status, hint };
  }

  // Determina o estágio "atual" (primeiro não concluído)
  const order: { stage: EstagioFluxo; done: boolean; hint: string }[] = [
    { stage: "intake", done: intakeDone, hint: "Demanda registrada no sistema." },
    {
      stage: "businessResponse",
      done: businessDone,
      hint: businessDone ? "Business respondeu." : "Aguardando resposta do business.",
    },
    {
      stage: "priorityMatrix",
      done: matrixDone,
      hint: matrixDone
        ? `${totalAvaliacoes}/7 critérios validados.`
        : "Aplicar matriz de priorização (scoring).",
    },
    {
      stage: "priorityLevel",
      done: priorityDone,
      hint: priorityDone
        ? `Prioridade #${d.finalPriority} definida.`
        : "PMO define a posição no ranking.",
    },
    {
      stage: "dmcApproval",
      done: dmcDone,
      hint: dmcDone
        ? "DMC aprovou."
        : dmcRejected
          ? "DMC recusou."
          : "Aguardando comitê DMC.",
    },
    {
      stage: "execution",
      done: execStarted,
      hint: execStarted ? "Projeto em andamento." : "Não iniciado.",
    },
    {
      stage: "implementation",
      done: implDone,
      hint: implDone
        ? d.idProjeto
          ? `Projeto ${d.idProjeto}`
          : "Implantado."
        : "Pendente de entrega.",
    },
  ];
  const firstNotDoneIdx = order.findIndex((o) => !o.done);

  return order.map((o, i) =>
    step(o.stage, o.done, !o.done && i === firstNotDoneIdx, o.hint),
  );
}

/** Cria a sequência padrão de aprovação para uma demanda: UM gate com o
    decisor da área da demanda (roteado pela classificação Infra/AI/Apps). */
export function aprovacoesPadrao(d: { clasificacion?: string; tipo: number }): AprovacaoStep[] {
  const cat = clasificacionEfetiva(d);
  const nome = CATEGORIA_RESPONSAVEL[cat];
  const responsavel = cat === "otro" || nome === "—" ? "DMC Committee" : nome;
  return [
    {
      nivel: "decisor",
      responsavel,
      status: "pendente",
      acaoEm: "",
      comentario: "",
    },
  ];
}

/** Regra ÚNICA de criação de demanda — usada pelo mockDemandService e pelo
    dataverseDemandService. Antes cada um tinha a sua e divergiam: o mock derivava
    o score do intake e o Dataverse gravava emptyScore(), então o recurso central
    ("as notas saem do formulário") funcionava na demo e não no cliente. */
export function novaDemandaBase(
  input: { impactoAbrangencia?: number; urgencia: number; valorEstimado: number | null },
  agoraIso: string,
): Partial<Demand> {
  const score = scoreAutomatico(input);
  return {
    dataSolicitacao: agoraIso,
    status: StatusDemanda.Nova,
    statusDesde: agoraIso,
    score,
    avaliacoes: (Object.keys(score) as (keyof Score)[]).map((criterio) => ({
      criterio,
      validadoPor: AUTO_AVALIADOR,
      validadoEm: agoraIso,
      comentario: "Calculated automatically from the intake answers.",
    })),
    projectStage: "Discovery",
    finalPriority: null,
    comentarios: [],
    anexos: [],
    /* O gate NÃO nasce com a demanda: ele é criado ao entrar em aprovação
       (enviarParaAprovacao), já roteado pela classificação vigente. */
    aprovacoes: [],
    dmcAprovado: null,
    dmcData: "",
    dmcComentario: "",
    idServiceNow: "",
    idProjeto: "",
  };
}

export function emptyScore(): Score {
  return { businessImpact: 1, urgency: 1, returnValue: 1 };
}

export function rawScoreSum(s: Score): number {
  return (Object.keys(SCORE_WEIGHTS) as (keyof Score)[]).reduce(
    (acc, k) => acc + (Number(s?.[k]) || 0),
    0,
  );
}

/** Score ponderado: cada critério multiplicado pelo seu peso (resultado 1..5). */
export function weightedScore(s: Score): number {
  const total = (Object.keys(SCORE_WEIGHTS) as (keyof Score)[]).reduce(
    (acc, k) => acc + (Number(s?.[k]) || 0) * SCORE_WEIGHTS[k],
    0,
  );
  return Math.round(total * 100) / 100;
}

/* ---------------- Elementos extras do score board ---------- */
/* "Other elements to consider (mark with an X)" — flags adicionais
   que entram na composição do julgamento final. */
export const SCORE_FLAGS = [
  "pmCapacity",
  "unclearCriteria",
  "otherUrgentRequests",
  "lackOfData",
  "stakeholderPressure",
  "dependencyConflicts",
  "othersDoNotPrioritize",
  "complexExecution",
] as const;
export type ScoreFlag = (typeof SCORE_FLAGS)[number];

export const SCORE_FLAG_LABELS: Record<ScoreFlag, string> = {
  pmCapacity: "PM capacity",
  unclearCriteria: "Unclear criteria",
  otherUrgentRequests: "Other urgent requests",
  lackOfData: "Lack of data",
  stakeholderPressure: "Stakeholder pressure",
  dependencyConflicts: "Dependency conflicts",
  othersDoNotPrioritize: "Others do not prioritize",
  complexExecution: "Complex / execution time",
};

/* ---------------- Demanda principal ------------------------- */

export interface Anexo {
  id: string;
  nomeArquivo: string;
  tamanhoBytes: number;
  uploadEm: string; // ISO
}

export interface Comentario {
  id: string;
  autor: string;
  data: string; // ISO
  texto: string;
}

export interface Demand {
  id: string;
  numero: string; // ex.: "DEM-0001"
  /* --- 1. Informações Básicas --- */
  titulo: string;
  descricao: string;
  areaSolicitante: string;
  solicitante: string;
  email: string;
  telefone: string;
  dataSolicitacao: string; // ISO
  /* --- 2. Objetivo & Justificativa --- */
  problemaResolve: string;
  objetivoPrincipal: string;
  processosImpactados: string;
  consequenciaNaoExecucao: string;
  /* --- 3. Tipo --- */
  tipo: number; // TipoDemanda
  /* --- 4. Impacto no Negócio --- */
  impactoNivel: number; // Impacto
  tiposImpacto: number[]; // TipoImpacto[]
  valorEstimado: number | null; // BRL
  /** Abrangência do impacto (ImpactoAbrangencia) — dirige o score de businessImpact. */
  impactoAbrangencia?: number;
  /** ROI estimado (%) — retorno esperado do investimento. */
  roiEstimado?: number | null;
  /* --- 5. Urgência --- */
  urgencia: number;
  deadline: string; // ISO ou ""
  /* --- 6. Escopo & Técnico --- */
  sistemasEnvolvidos: string;
  integracoesNecessarias: string;
  requisitosPrincipais: string;
  solucaoProposta: string;
  /* --- 7. Stakeholders --- */
  sponsor: string;
  donoProcesso: string;
  areasEnvolvidas: string;
  /* --- 8. Compliance & Risco --- */
  dadosSensiveis: boolean;
  impactaSeguranca: boolean;
  requerAuditoria: boolean;
  /* --- 9. Esforço --- */
  esforcoEstimado: number | null;
  /* --- 10. Anexos --- */
  anexos: Anexo[];
  /* --- Workflow --- */
  status: number;
  score: Score;
  scoreFlags: ScoreFlag[]; // flags marcadas como X
  projectStage: string; // ex.: "Discovery", "Build", "UAT"
  finalPriority: number | null; // ordem manual
  comentarios: Comentario[];
  /* Workflow de validação do score (1 entrada por critério validado) */
  avaliacoes: AvaliacaoCriterio[];
  stackValidadaPor: string;
  stackValidadaEm: string;
  /* Workflow de aprovação da demanda em si (3 níveis) */
  aprovacoes: AprovacaoStep[];
  /* Atribuição de execução */
  time: string; // TimeImplantacao | ""
  horasEstimadas: number; // 0 = não estimado
  /* Fluxo end-to-end */
  respostaBusiness: string;
  dmcAprovado: boolean | null; // null = ainda não decidiu
  dmcData: string; // ISO date
  dmcComentario: string;
  idServiceNow: string;
  idProjeto: string;
  /** Momento da ÚLTIMA mudança de status — base de SLA/aging.
      (modifiedon do Dataverse não serve: qualquer edição o reseta.) */
  statusDesde?: string;
  /** UPNs resolvidos na transição, para os flows endereçarem direto do gatilho. */
  requerenteUpn?: string;
  decisorUpn?: string;
  /** RCE — nº do projeto aprovado pela Gestão (obrigatório no aceite). */
  rce?: string;
  /** APP ID — código da aplicação (demandas de sistema). */
  appId?: string;
  /** Classificação SPM: Category (strategic/operational). */
  category?: string;
  /** Abbott Project Type (Project/Phase 0/Rapid/Operations/Minor Enhancement). */
  abbottProjectType?: string;
  /** Clasificación de proyecto: infra / ia / app / otro. */
  clasificacion?: string;
  /** Texto libre cuando clasificacion = "otro". */
  clasificacionOtro?: string;
  /** ¿Ya hay una solución propuesta? (si sí, detalles en solucaoProposta). */
  temSolucaoProposta?: boolean;
  /** Nombre de la app (auto por APP ID). */
  appName?: string;
  criadoEm: string;
  modificadoEm: string;
}

/* ---------------- Stakeholder por área (auto) ----------------
   Ao escolher a Área solicitante, o stakeholder/sponsor responsável
   é preenchido automaticamente. */
export const AREA_STAKEHOLDER: Record<string, string> = {
  Facilities: "Sambini",
  IT: "Sambini",
  Sales: "Carlos Mendes",
  Marketing: "Carlos Mendes",
  Finance: "Patricia Lima",
  "Human Resources": "Juliana Costa",
  "Supply Chain": "Roberto Almeida",
  Production: "Roberto Almeida",
  Quality: "Ana Beatriz Souza",
  Regulatory: "Ana Beatriz Souza",
  Legal: "Patricia Lima",
};
export function stakeholderDaArea(area: string): string {
  return AREA_STAKEHOLDER[area] ?? "";
}

/* ---------------- Registro de aplicaciones (APP ID → nombre) ---
   Al informar el APP ID, el nombre aparece automáticamente. */
export const APP_REGISTRY: Record<string, string> = {
  "APP-0456": "SAP S/4HANA",
  "APP-0123": "Salesforce CRM",
  "APP-0789": "ServiceNow ITSM",
  "APP-0321": "Workday HCM",
  "APP-0654": "Adobe Creative Cloud",
  "APP-0987": "Power BI",
};
export function appName(appId: string): string {
  const k = appId.trim().toUpperCase();
  return APP_REGISTRY[k] ?? "";
}

/* ---------------- Modelo de entrega / esforço ---------------- */
export const TIME_DESCRICAO: Record<TimeImplantacao, string> = {
  "Internal Delivery": "Wipro / Abbott",
  "External Delivery": "Third parties / independent contractors",
  Support: "Support / sustaining",
};

/* ---------------- Classificação SPM (Abbott) ----------------
   Category: Strategic / Operational. Type: sempre Project.
   Abbott Project Type derivado do esforço/valor (processo). */
export const Category = {
  Strategic: "strategic",
  Operational: "operational",
} as const;
export const categoryLabel: Record<string, string> = {
  strategic: "Strategic",
  operational: "Operational",
};
export const categoryOptions = Object.entries(categoryLabel).map(([value, label]) => ({ value, label }));

/** Opções do "Abbott Project Type" (derivado, mas selecionável). */
export const ABBOTT_PROJECT_TYPES = [
  "Project",
  "Phase 0",
  "Rapid",
  "Operations",
  "Minor Enhancement",
] as const;

/* Limiares do roteamento de processo (ajustáveis). */
export const LIMITE_ME_HORAS = 80; // < 80h → Minor Enhancement
export const LIMITE_FASE0_USD = 500_000; // > US$500k → Phase 0

export interface ProcessoInfo {
  /** Processo de entrega recomendado. */
  processo: string;
  /** Abbott Project Type correspondente. */
  projectType: (typeof ABBOTT_PROJECT_TYPES)[number];
  color: string;
  motivo: string;
}

/** Decide o processo/Abbott Project Type pelo esforço (horas) e valor (USD). */
export function processoRecomendado(d: {
  horasEstimadas: number;
  valorEstimado: number | null;
}): ProcessoInfo {
  if (d.horasEstimadas > 0 && d.horasEstimadas < LIMITE_ME_HORAS) {
    return { processo: "Minor Enhancement (ME)", projectType: "Minor Enhancement", color: "teal", motivo: "< 80 hours" };
  }
  if ((d.valorEstimado ?? 0) > LIMITE_FASE0_USD) {
    return { processo: "Phase 0", projectType: "Phase 0", color: "red", motivo: "> US$ 500k" };
  }
  return { processo: "RAPID / Sprint Planning", projectType: "Rapid", color: "blue", motivo: "< US$ 500k (Major Enhancement)" };
}

/** Classificação curta de porte (badge) — usa o processo recomendado. */
export function classificaEsforco(d: {
  horasEstimadas: number;
  valorEstimado: number | null;
}): { label: string; color: string } {
  if (d.horasEstimadas <= 0 && (d.valorEstimado ?? 0) <= 0) {
    return { label: "Not estimated", color: "gray" };
  }
  const p = processoRecomendado(d);
  return { label: p.projectType, color: p.color };
}

/* Tudo que pode ser preenchido ao criar uma demanda (sem campos de sistema). */
export type DemandInput = Omit<
  Demand,
  | "id"
  | "numero"
  | "dataSolicitacao"
  | "status"
  | "score"
  | "scoreFlags"
  | "projectStage"
  | "finalPriority"
  | "comentarios"
  | "avaliacoes"
  | "stackValidadaPor"
  | "stackValidadaEm"
  | "aprovacoes"
  | "respostaBusiness"
  | "dmcAprovado"
  | "dmcData"
  | "dmcComentario"
  | "idServiceNow"
  | "idProjeto"
  | "criadoEm"
  | "modificadoEm"
  | "anexos"
>;

export interface DemandService {
  list(): Promise<Demand[]>;
  get(id: string): Promise<Demand | undefined>;
  create(input: DemandInput): Promise<Demand>;
  update(id: string, changes: Partial<Demand>): Promise<Demand>;
  remove(id: string): Promise<void>;
  addComment(id: string, autor: string, texto: string): Promise<Demand>;
  addAnexo(id: string, nome: string, tamanho: number): Promise<Demand>;
  removeAnexo(id: string, anexoId: string): Promise<Demand>;
  reset(): Promise<void>; // restaura mock data fresh (útil pro demo)
}

/* ---------------- Cadastros (lookups) ----------------------- */

export interface AdminLookup {
  id: string;
  nome: string;
}

export interface AdminLookupService {
  listAreas(): Promise<AdminLookup[]>;
  listSponsors(): Promise<AdminLookup[]>;
  listAvaliadores(): Promise<AdminLookup[]>;
  addArea(nome: string): Promise<AdminLookup>;
  addSponsor(nome: string): Promise<AdminLookup>;
  addAvaliador(nome: string): Promise<AdminLookup>;
  removeArea(id: string): Promise<void>;
  removeSponsor(id: string): Promise<void>;
  removeAvaliador(id: string): Promise<void>;
}
