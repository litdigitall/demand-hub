/* ============================================================
   Motor de ciclo de vida da demanda (fonte única da verdade).

   Substitui as 4 "máquinas de estado" paralelas que existiam
   (status + aprovações + scoring + estágios + DMC) por UM
   pipeline linear. Cada transição declara:
     - de qual estado parte e para qual vai
     - QUAL PAPEL pode executá-la (gating por papel, não por nome)
     - uma GUARDA: condição que precisa estar satisfeita
     - o que ela MUDA na demanda (apply)

   `proximasAcoes(demanda, papéis)` devolve as ações que o usuário
   atual pode tomar agora → alimenta o CTA "o que precisa de mim
   agora" e a caixa de entrada por papel.
   ============================================================ */

import {
  StatusDemanda,
  CRITERIO_CATEGORIA,
  aprovacoesPadrao,
  type Demand,
  type Score,
  type AprovacaoStep,
  type NivelAprovacao,
} from "../data/types";
import { Role, ROLE_LABEL } from "./roles";

/* Mapeia o nível de aprovação (dado da demanda) para o papel RBAC. */
export const NIVEL_PARA_PAPEL: Record<NivelAprovacao, Role> = {
  sponsor: Role.Sponsor,
  techlead: Role.TechLead,
  diretor: Role.Diretor,
};

/* ---------------- Etapas do pipeline (para a timeline) ------ */
export const PIPELINE: { status: number; label: string; descricao: string }[] = [
  { status: StatusDemanda.Rascunho, label: "Borrador", descricao: "Solicitante completando la solicitud." },
  { status: StatusDemanda.Nova, label: "Triaje", descricao: "PMO valida si la solicitud está lo bastante completa." },
  { status: StatusDemanda.EmAnalise, label: "Evaluación", descricao: "Negocio, técnico y PMO puntúan los criterios; se define equipo/horas." },
  { status: StatusDemanda.EmAprovacao, label: "Aprobación", descricao: "Sponsor → Tech Lead → Director (DMC) deciden." },
  { status: StatusDemanda.Priorizada, label: "Priorización", descricao: "PMO posiciona en el ranking y libera para ejecución." },
  { status: StatusDemanda.EmExecucao, label: "Ejecución", descricao: "Proyecto en curso." },
  { status: StatusDemanda.Concluida, label: "Concluida", descricao: "Entregada." },
];

/** Índice da etapa no pipeline linear (estados laterais retornam -1). */
export function pipelineIndex(status: number): number {
  return PIPELINE.findIndex((p) => p.status === status);
}

/* ---------------- Guardas auxiliares ----------------------- */

/** Critérios validados, por categoria (negócio/técnico/pmo). */
export function avaliacaoCobertura(d: Demand) {
  const validados = new Set(d.avaliacoes.map((a) => a.criterio));
  const total = (Object.keys(CRITERIO_CATEGORIA) as (keyof Score)[]).length;
  const porCategoria = { negocio: false, tecnico: false, pmo: false };
  // categoria coberta = TODOS os critérios dela validados
  const cats: Array<"negocio" | "tecnico" | "pmo"> = ["negocio", "tecnico", "pmo"];
  for (const cat of cats) {
    const criteriosDaCat = (Object.keys(CRITERIO_CATEGORIA) as (keyof Score)[]).filter(
      (c) => CRITERIO_CATEGORIA[c] === cat,
    );
    porCategoria[cat] = criteriosDaCat.every((c) => validados.has(c));
  }
  return {
    validados: validados.size,
    total,
    completo: validados.size >= total,
    porCategoria,
  };
}

/** A demanda tem time e horas alocados (capacity definido pelo tech lead)? */
export function capacityDefinido(d: Demand): boolean {
  return !!d.time && d.horasEstimadas > 0;
}

/** Próximo passo de aprovação pendente (sponsor → techlead → diretor). */
export function proximaAprovacao(d: Demand): AprovacaoStep | undefined {
  return d.aprovacoes.find((a) => a.status === "pendente");
}

/* ---------------- Definição das ações ---------------------- */

export interface AcaoContexto {
  comentario?: string;
  time?: string;
  horasEstimadas?: number;
  finalPriority?: number | null;
  idServiceNow?: string;
  idProjeto?: string;
  rce?: string;
}

export interface Acao {
  id: string;
  label: string;
  /** Papéis que podem executar (estático). */
  papeis: Role[];
  /** Papéis que podem executar AGORA, dependendo do estado da demanda
      (ex.: em aprovação, só o papel do gate pendente). Sobrepõe `papeis`. */
  papeisDinamicos?: (d: Demand) => Role[];
  /** Cor do botão (Mantine). */
  cor: string;
  /** Se a ação exige um comentário/justificativa. */
  exigeComentario?: boolean;
  /** Campos extras que a ação coleta antes de aplicar. */
  campos?: Array<"capacity" | "prioridade" | "serviceNow">;
  /** Guarda: retorna true se liberada, ou string com o motivo do bloqueio. */
  guarda: (d: Demand) => true | string;
  /** Produz as mudanças a aplicar na demanda. */
  apply: (d: Demand, ator: string, ctx: AcaoContexto) => Partial<Demand>;
}

const agora = () => new Date().toISOString();

/** Aplica decisão no passo de aprovação atual e devolve a lista atualizada. */
function decidirAprovacao(
  d: Demand,
  decisao: "aprovado" | "recusado",
  ator: string,
  comentario: string,
): AprovacaoStep[] {
  let decidiu = false;
  return d.aprovacoes.map((a) => {
    if (!decidiu && a.status === "pendente") {
      decidiu = true;
      return { ...a, status: decisao, acaoEm: agora(), comentario, responsavel: ator || a.responsavel };
    }
    return a;
  });
}

/* Catálogo de todas as ações do fluxo, indexado por estado de origem. */
export const ACOES_POR_ESTADO: Record<number, Acao[]> = {
  /* -------- Rascunho -------- */
  [StatusDemanda.Rascunho]: [
    {
      id: "submeter",
      label: "Enviar solicitud",
      papeis: [Role.Solicitante],
      cor: "blue",
      guarda: (d) =>
        d.titulo.trim() && d.descricao.trim() && d.areaSolicitante.trim()
          ? true
          : "Complete título, descripción y área antes de enviar.",
      apply: () => ({ status: StatusDemanda.Nova }),
    },
  ],

  /* -------- Em triagem (Nova) -------- */
  [StatusDemanda.Nova]: [
    {
      id: "aceitarTriagem",
      label: "Aceptar e iniciar evaluación",
      papeis: [Role.PMO],
      cor: "teal",
      guarda: () => true,
      apply: () => ({ status: StatusDemanda.EmAnalise }),
    },
    {
      id: "devolver",
      label: "Devolver al solicitante",
      papeis: [Role.PMO],
      cor: "yellow",
      exigeComentario: true,
      guarda: () => true,
      apply: () => ({ status: StatusDemanda.Devolvida }),
    },
    {
      id: "recusarTriagem",
      label: "Rechazar solicitud",
      papeis: [Role.PMO],
      cor: "red",
      exigeComentario: true,
      guarda: () => true,
      apply: () => ({ status: StatusDemanda.Recusada }),
    },
  ],

  /* -------- Devolvida -------- */
  [StatusDemanda.Devolvida]: [
    {
      id: "reenviar",
      label: "Reenviar a triaje",
      papeis: [Role.Solicitante],
      cor: "blue",
      guarda: (d) =>
        d.titulo.trim() && d.descricao.trim() ? true : "Complete título y descripción.",
      apply: () => ({ status: StatusDemanda.Nova }),
    },
  ],

  /* -------- Em avaliação (scoring + capacity) -------- */
  [StatusDemanda.EmAnalise]: [
    {
      id: "definirCapacity",
      label: "Definir equipo y horas (capacity)",
      papeis: [Role.TechLead],
      cor: "violet",
      campos: ["capacity"],
      guarda: () => true,
      apply: (_d, _ator, ctx) => ({
        time: ctx.time ?? _d.time,
        horasEstimadas: ctx.horasEstimadas ?? _d.horasEstimadas,
      }),
    },
    {
      id: "enviarParaAprovacao",
      label: "Concluir evaluación → enviar a aprobación",
      // PMO orquestra, mas o Tech Lead que definiu o capacity também pode empurrar.
      papeis: [Role.PMO, Role.TechLead],
      cor: "teal",
      // Requisito para avançar: capacity definido. O scoring é recomendado
      // (alimenta a prioridade) mas NÃO bloqueia — evita beco sem saída.
      guarda: (d) =>
        capacityDefinido(d)
          ? true
          : "Defina equipo y horas (capacity) antes de enviar a aprobación.",
      // Reinicia a sequência de gates como PENDENTE ao entrar na aprovação
      // (garante que sempre há um gate para decidir — sem becos sem saída).
      apply: (d) => ({
        status: StatusDemanda.EmAprovacao,
        aprovacoes: aprovacoesPadrao(d.sponsor),
      }),
    },
    {
      id: "devolverAvaliacao",
      label: "Devolver al solicitante",
      papeis: [Role.PMO],
      cor: "yellow",
      exigeComentario: true,
      guarda: () => true,
      apply: () => ({ status: StatusDemanda.Devolvida }),
    },
  ],

  /* -------- Em aprovação (gates por papel) -------- */
  [StatusDemanda.EmAprovacao]: [
    {
      id: "aprovarGate",
      label: "Aprobar (mi gate)",
      papeis: [Role.Sponsor, Role.TechLead, Role.Diretor],
      papeisDinamicos: (d) => {
        const prox = proximaAprovacao(d);
        return prox ? [NIVEL_PARA_PAPEL[prox.nivel]] : [];
      },
      cor: "green",
      campos: ["serviceNow"], // capturado no aceite final (diretor)
      guarda: (d) => (proximaAprovacao(d) ? true : "Sin gate pendiente."),
      apply: (d, ator, ctx) => {
        const aprovacoes = decidirAprovacao(d, "aprovado", ator, ctx.comentario ?? "");
        const todasAprovadas = aprovacoes.every((a) => a.status === "aprovado");
        const passoAtual = proximaAprovacao(d); // o que estava pendente antes
        const eraDiretor = passoAtual?.nivel === "diretor";
        const changes: Partial<Demand> = { aprovacoes };
        if (todasAprovadas) {
          // demanda ACEITA pelo comitê → registra DMC e nº do projeto (ServiceNow)
          changes.status = StatusDemanda.Priorizada;
          changes.dmcAprovado = true;
          changes.dmcData = agora();
          changes.dmcComentario = eraDiretor ? (ctx.comentario ?? "") : d.dmcComentario;
          if (ctx.idServiceNow) changes.idServiceNow = ctx.idServiceNow;
          if (ctx.idProjeto) changes.idProjeto = ctx.idProjeto;
          if (ctx.rce) changes.rce = ctx.rce;
        }
        return changes;
      },
    },
    {
      id: "recusarGate",
      label: "Rechazar (mi gate)",
      papeis: [Role.Sponsor, Role.TechLead, Role.Diretor],
      papeisDinamicos: (d) => {
        const prox = proximaAprovacao(d);
        return prox ? [NIVEL_PARA_PAPEL[prox.nivel]] : [];
      },
      cor: "red",
      exigeComentario: true,
      guarda: (d) => (proximaAprovacao(d) ? true : "Sin gate pendiente."),
      apply: (d, ator, ctx) => ({
        aprovacoes: decidirAprovacao(d, "recusado", ator, ctx.comentario ?? ""),
        status: StatusDemanda.Recusada,
        dmcAprovado: false,
        dmcData: agora(),
        dmcComentario: ctx.comentario ?? "",
      }),
    },
  ],

  /* -------- Priorizada -------- */
  [StatusDemanda.Priorizada]: [
    {
      id: "definirPrioridade",
      label: "Definir prioridad en el ranking",
      papeis: [Role.PMO],
      cor: "teal",
      campos: ["prioridade"],
      guarda: () => true,
      apply: (_d, _ator, ctx) => ({ finalPriority: ctx.finalPriority ?? _d.finalPriority }),
    },
    {
      id: "iniciarExecucao",
      label: "Iniciar ejecución",
      papeis: [Role.PMO, Role.TechLead],
      cor: "blue",
      guarda: (d) =>
        d.finalPriority != null && d.finalPriority > 0
          ? capacityDefinido(d)
            ? true
            : "Defina equipo y horas antes de iniciar."
          : "El PMO debe definir la prioridad en el ranking primero.",
      apply: () => ({ status: StatusDemanda.EmExecucao, projectStage: "Build" }),
    },
  ],

  /* -------- Em execução -------- */
  [StatusDemanda.EmExecucao]: [
    {
      id: "concluir",
      label: "Concluir solicitud",
      papeis: [Role.TechLead, Role.PMO],
      cor: "green",
      campos: ["serviceNow"],
      guarda: () => true,
      apply: (_d, _ator, ctx) => ({
        status: StatusDemanda.Concluida,
        projectStage: "Done",
        idProjeto: ctx.idProjeto ?? _d.idProjeto,
      }),
    },
  ],
};

/* ---------------- API pública ------------------------------ */

/** Ações disponíveis no estado atual da demanda (independente de papel). */
export function acoesDoEstado(status: number): Acao[] {
  return ACOES_POR_ESTADO[status] ?? [];
}

/** Papéis que podem executar a ação AGORA (dinâmicos sobrepõem estáticos). */
export function papeisDaAcao(acao: Acao, d: Demand): Role[] {
  return acao.papeisDinamicos ? acao.papeisDinamicos(d) : acao.papeis;
}

/** Ações que o usuário (com `papeis`) pode acionar no estado atual da demanda. */
export function proximasAcoes(d: Demand, papeis: Role[]): Acao[] {
  return acoesDoEstado(d.status).filter((a) =>
    papeisDaAcao(a, d).some((p) => papeis.includes(p)),
  );
}

/** Verdadeiro se ALGUMA ação do estado atual está liberada para esses papéis. */
export function precisaDeMim(d: Demand, papeis: Role[]): boolean {
  return proximasAcoes(d, papeis).some((a) => a.guarda(d) === true);
}

/** Texto curto do que a demanda aguarda agora (para listas/cards). */
export function aguardando(d: Demand): string {
  const acoes = acoesDoEstado(d.status);
  if (!acoes.length) {
    if (d.status === StatusDemanda.Concluida) return "Concluida";
    if (d.status === StatusDemanda.Recusada) return "Rechazada";
    return "—";
  }
  if (d.status === StatusDemanda.EmAprovacao) {
    const prox = proximaAprovacao(d);
    if (prox) return `Esperando ${ROLE_LABEL[NIVEL_PARA_PAPEL[prox.nivel]]}`;
  }
  const papeis = new Set(acoes.flatMap((a) => a.papeis));
  return `Esperando ${[...papeis].map((p) => ROLE_LABEL[p]).join(" / ")}`;
}
