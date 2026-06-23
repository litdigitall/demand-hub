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
  [TipoDemanda.ProjetoNovo]: "Projeto novo",
  [TipoDemanda.MelhoriaSistema]: "Melhoria de sistema",
  [TipoDemanda.CorrecaoBug]: "Correção (Bug)",
  [TipoDemanda.Compliance]: "Compliance / Regulatório",
  [TipoDemanda.Infraestrutura]: "Infraestrutura",
  [TipoDemanda.Seguranca]: "Segurança da Informação",
  [TipoDemanda.Automacao]: "Automação / Digitalização",
};

export const Impacto = {
  Alto: 506970000,
  Medio: 506970001,
  Baixo: 506970002,
} as const;
export const impactoLabel: Record<number, string> = {
  [Impacto.Alto]: "Alto",
  [Impacto.Medio]: "Médio",
  [Impacto.Baixo]: "Baixo",
};

export const TipoImpacto = {
  Receita: 1,
  ReducaoCustos: 2,
  Eficiencia: 3,
  Risco: 4,
  ExperienciaCliente: 5,
} as const;
export const tipoImpactoLabel: Record<number, string> = {
  [TipoImpacto.Receita]: "Receita",
  [TipoImpacto.ReducaoCustos]: "Redução de custos",
  [TipoImpacto.Eficiencia]: "Eficiência operacional",
  [TipoImpacto.Risco]: "Risco / compliance",
  [TipoImpacto.ExperienciaCliente]: "Experiência do cliente",
};

export const Urgencia = {
  Critico: 506970000,
  Alto: 506970001,
  Medio: 506970002,
  Baixo: 506970003,
} as const;
export const urgenciaLabel: Record<number, string> = {
  [Urgencia.Critico]: "Crítico",
  [Urgencia.Alto]: "Alto",
  [Urgencia.Medio]: "Médio",
  [Urgencia.Baixo]: "Baixo",
};

export const EsforcoEstimado = {
  Pequeno: 506970000, // < 1 mês
  Medio: 506970001, // 1–3 meses
  Grande: 506970002, // 3+ meses
} as const;
export const esforcoLabel: Record<number, string> = {
  [EsforcoEstimado.Pequeno]: "Pequeno (<1 mês)",
  [EsforcoEstimado.Medio]: "Médio (1-3 meses)",
  [EsforcoEstimado.Grande]: "Grande (3+ meses)",
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
  [StatusDemanda.Rascunho]: "Rascunho",
  [StatusDemanda.Nova]: "Em triagem",
  [StatusDemanda.EmAnalise]: "Em avaliação",
  [StatusDemanda.EmAprovacao]: "Em aprovação",
  [StatusDemanda.Priorizada]: "Priorizada",
  [StatusDemanda.EmExecucao]: "Em execução",
  [StatusDemanda.Concluida]: "Concluída",
  [StatusDemanda.Devolvida]: "Devolvida",
  [StatusDemanda.Recusada]: "Recusada",
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

/* ---------------- Score (priorização) ----------------------- */
/* Cada critério recebe nota 1..5; ponderação fixa abaixo soma 100%. */

export interface Score {
  businessImpact: number;       // 25%
  riskOfNoExecution: number;    // 15%
  technicalChallenge: number;   // 10%
  revenuePotential: number;     // 20%
  strategicFit: number;         // 15%
  stakeholder: number;          // 10%
  urgency: number;              // 5%
}

export const SCORE_WEIGHTS: Score = {
  businessImpact: 0.25,
  riskOfNoExecution: 0.15,
  technicalChallenge: 0.1,
  revenuePotential: 0.2,
  strategicFit: 0.15,
  stakeholder: 0.1,
  urgency: 0.05,
};

export const SCORE_LABELS: Record<keyof Score, string> = {
  businessImpact: "Impacto no Negócio",
  riskOfNoExecution: "Risco de Não Executar",
  technicalChallenge: "Complexidade Técnica",
  revenuePotential: "Potencial de Receita",
  strategicFit: "Alinhamento Estratégico",
  stakeholder: "Pressão de Stakeholders",
  urgency: "Urgência (legal/fiscal/compliance)",
};

/** Quem é responsável por validar cada critério */
export type CategoriaAvaliacao = "negocio" | "tecnico" | "pmo";

export const CRITERIO_CATEGORIA: Record<keyof Score, CategoriaAvaliacao> = {
  businessImpact: "negocio",
  revenuePotential: "negocio",
  strategicFit: "negocio",
  stakeholder: "negocio",
  riskOfNoExecution: "tecnico",
  technicalChallenge: "tecnico",
  urgency: "pmo",
};

export const CATEGORIA_LABEL: Record<CategoriaAvaliacao, string> = {
  negocio: "Avaliação de Negócio",
  tecnico: "Avaliação Técnica",
  pmo: "Avaliação PMO",
};

export const CATEGORIA_DESCRICAO: Record<CategoriaAvaliacao, string> = {
  negocio: "Validado pelo sponsor ou owner do processo",
  tecnico: "Validado pelo Tech Lead / Arquiteto de Soluções",
  pmo: "Validado pelo PMO ou Compliance",
};

export const CATEGORIA_COR: Record<CategoriaAvaliacao, string> = {
  negocio: "blue",
  tecnico: "violet",
  pmo: "teal",
};

export interface AvaliacaoCriterio {
  criterio: keyof Score;
  validadoPor: string; // nome do avaliador
  validadoEm: string; // ISO
  comentario: string;
}

/* ---------------- Aprovações ------------------------------- */
/** Step do fluxo de aprovação da demanda (3 níveis padrão). */
export const NivelAprovacao = {
  Sponsor: "sponsor",
  TechLead: "techlead",
  Diretor: "diretor",
} as const;
export type NivelAprovacao = (typeof NivelAprovacao)[keyof typeof NivelAprovacao];

export const nivelAprovacaoLabel: Record<NivelAprovacao, string> = {
  sponsor: "Sponsor",
  techlead: "Tech Lead",
  diretor: "Diretor de TI",
};
export const nivelAprovacaoLabelEN: Record<NivelAprovacao, string> = {
  sponsor: "Sponsor",
  techlead: "Tech Lead",
  diretor: "IT Director",
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

/** Cria a sequência padrão de aprovação para uma demanda nova. */
export function aprovacoesPadrao(sponsor: string): AprovacaoStep[] {
  return [
    {
      nivel: "sponsor",
      responsavel: sponsor || "Sponsor designado",
      status: "pendente",
      acaoEm: "",
      comentario: "",
    },
    {
      nivel: "techlead",
      responsavel: "Daniela Bastos (Tech Lead)",
      status: "pendente",
      acaoEm: "",
      comentario: "",
    },
    {
      nivel: "diretor",
      responsavel: "Marcelo Tavares (IT Director)",
      status: "pendente",
      acaoEm: "",
      comentario: "",
    },
  ];
}

export function emptyScore(): Score {
  return {
    businessImpact: 1,
    riskOfNoExecution: 1,
    technicalChallenge: 1,
    revenuePotential: 1,
    strategicFit: 1,
    stakeholder: 1,
    urgency: 1,
  };
}

export function rawScoreSum(s: Score): number {
  return (
    s.businessImpact +
    s.riskOfNoExecution +
    s.technicalChallenge +
    s.revenuePotential +
    s.strategicFit +
    s.stakeholder +
    s.urgency
  );
}

/** Score ponderado: cada critério multiplicado pelo seu peso (resultado 1..5). */
export function weightedScore(s: Score): number {
  const total =
    s.businessImpact * SCORE_WEIGHTS.businessImpact +
    s.riskOfNoExecution * SCORE_WEIGHTS.riskOfNoExecution +
    s.technicalChallenge * SCORE_WEIGHTS.technicalChallenge +
    s.revenuePotential * SCORE_WEIGHTS.revenuePotential +
    s.strategicFit * SCORE_WEIGHTS.strategicFit +
    s.stakeholder * SCORE_WEIGHTS.stakeholder +
    s.urgency * SCORE_WEIGHTS.urgency;
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
  criadoEm: string;
  modificadoEm: string;
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
