/* ============================================================
   Tempo e SLA — a dimensão que faltava na tela.

   Score diz o que é mais importante; isto diz o que está parado.
   Sem os dois juntos, uma demanda de score alto pode envelhecer
   três semanas na triagem sem ninguém perceber.

   A fonte é `statusDesde`, carimbado por `aplicarAcao()` a cada
   transição e na criação (`novaDemandaBase`). Registro antigo sem
   o carimbo cai em `modificadoEm` e, na falta dele, na data da
   solicitação — nunca some da conta.
   ============================================================ */
import { StatusDemanda, type Demand } from "../data/types";

const UM_DIA = 86_400_000;

/* Metas de resposta por etapa, em dias corridos. É CONFIGURAÇÃO — o mesmo
   número que alimenta o flow N5 de SLA no Power Automate (docs/GO-LIVE.md §4).
   Etapa que não está aqui não tem meta: mostramos a idade, sem cobrar. */
export const SLA_DIAS: Record<number, number> = {
  [StatusDemanda.Nova]: 3, // triagem do PMO
  [StatusDemanda.EmAnalise]: 5, // avaliação do time técnico
  [StatusDemanda.EmAprovacao]: 3, // decisão do decisor da área
  [StatusDemanda.Devolvida]: 5, // devolvida: bola com o solicitante
};

/** Etapas encerradas: não envelhecem nem cobram prazo. */
function encerrada(status: number): boolean {
  return status === StatusDemanda.Concluida || status === StatusDemanda.Recusada;
}

/** Desde quando a demanda está no estado atual. */
export function desdeQuando(d: Demand): string {
  return d.statusDesde || d.modificadoEm || d.dataSolicitacao || "";
}

/** Dias corridos no estado atual (0 se entrou hoje ou se a data não existe). */
export function diasNoEstado(d: Demand): number {
  const iso = desdeQuando(d);
  if (!iso) return 0;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / UM_DIA));
}

/** Meta da etapa atual, ou undefined se a etapa não tem meta. */
export function slaAlvo(d: Demand): number | undefined {
  return encerrada(d.status) ? undefined : SLA_DIAS[d.status];
}

export type TomSla = "ok" | "atencao" | "estourado";

/** Idade + como ela se compara com a meta da etapa. */
export function sla(d: Demand): { dias: number; alvo?: number; tom: TomSla } {
  const dias = diasNoEstado(d);
  const alvo = slaAlvo(d);
  if (alvo === undefined) return { dias, tom: "ok" };
  if (dias > alvo) return { dias, alvo, tom: "estourado" };
  if (dias >= alvo) return { dias, alvo, tom: "atencao" };
  return { dias, alvo, tom: "ok" };
}

/** Prazo combinado com o solicitante já passou (campo opcional do intake). */
export function isOverdue(d: Demand): boolean {
  if (!d.deadline) return false;
  if (encerrada(d.status)) return false;
  const t = new Date(d.deadline).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** "3d" / "12d" — coluna estreita, e o tooltip explica. */
export function idadeCurta(dias: number): string {
  return `${dias}d`;
}

/** Ordem de trabalho: atrasado primeiro, depois SLA estourado, depois score. */
export function porPrioridadeDeTrabalho(
  a: Demand,
  b: Demand,
  score: (d: Demand) => number,
): number {
  const atraso = Number(isOverdue(b)) - Number(isOverdue(a));
  if (atraso !== 0) return atraso;
  const estouro = Number(sla(b).tom === "estourado") - Number(sla(a).tom === "estourado");
  if (estouro !== 0) return estouro;
  const s = score(b) - score(a);
  if (s !== 0) return s;
  return diasNoEstado(b) - diasNoEstado(a);
}
