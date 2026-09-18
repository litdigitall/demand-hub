/* ============================================================
   useRequests — estado único da tela Requests.

   UMA leitura de demandService.list() alimenta as três views
   (Table / Board / Priority). Concentra: escopo por papel, busca,
   filtros, ordenação e contadores. As views são burras: recebem
   `items` já filtrado e ordenado.
   ============================================================ */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { demandService } from "../../data/demandService";
import {
  StatusDemanda,
  clasificacionEfetiva,
  statusLabel,
  urgenciaLabel,
  weightedScore,
  type Categoria,
  type Demand,
} from "../../data/types";
import { aguardando } from "../../domain/workflow";
import { isOverdue } from "../../domain/sla";
import { Role } from "../../domain/roles";
import { useCurrentUser } from "../../lib/useCurrentUser";

export type RequestsView = "table" | "board" | "priority";
export type GroupBy = "none" | "status" | "area" | "waiting";
export type SortKey = "recent" | "score" | "deadline" | "number";

export const REQUESTS_VIEWS: RequestsView[] = ["table", "board", "priority"];

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Newest" },
  { value: "score", label: "Score" },
  { value: "deadline", label: "Deadline" },
  { value: "number", label: "Number" },
];

/* A regra de atraso é uma só no app — mora em domain/sla; reexportada aqui
   porque as três views já a importam por este módulo. */
export { isOverdue };

/** `aguardando()` sem o prefixo — a coluna já se chama "Waiting on". */
export function waitingLabel(d: Demand): string {
  const raw = aguardando(d);
  return raw.startsWith("Waiting on ") ? raw.slice(11) : raw;
}

/** View válida vinda da URL (?view=board). */
export function parseView(value: string | null): RequestsView {
  return REQUESTS_VIEWS.includes(value as RequestsView) ? (value as RequestsView) : "table";
}

/* Deep-links: as rotas de compatibilidade usam apelidos em vez do código
   numérico (/approvers → ?status=aprovacao). Sem esta tradução o link cai
   numa lista vazia — parece que as demandas sumiram. */
const STATUS_ALIAS: Record<string, number> = {
  rascunho: StatusDemanda.Rascunho,
  triagem: StatusDemanda.Nova,
  nova: StatusDemanda.Nova,
  analise: StatusDemanda.EmAnalise,
  aprovacao: StatusDemanda.EmAprovacao,
  priorizada: StatusDemanda.Priorizada,
  execucao: StatusDemanda.EmExecucao,
  concluida: StatusDemanda.Concluida,
  devolvida: StatusDemanda.Devolvida,
  recusada: StatusDemanda.Recusada,
};

/** ?status=506970007 · ?status=aprovacao · lista separada por vírgula.
    Valores desconhecidos são descartados (filtro inválido some, não zera). */
function parseStatusParam(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .map((s) => (s in STATUS_ALIAS ? String(STATUS_ALIAS[s]) : s))
    .filter((s) => statusLabel[Number(s)] !== undefined);
}

/** ?urg=506970000 — só urgência conhecida vira filtro. */
function parseUrgParam(raw: string | null): string | null {
  return raw && urgenciaLabel[Number(raw)] !== undefined ? raw : null;
}

/** ?area=infra|ia|app|otro */
function parseAreaParam(raw: string | null): Categoria | null {
  return raw === "infra" || raw === "ia" || raw === "app" || raw === "otro" ? raw : null;
}

function timeOf(iso: string): number {
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? 0 : t;
}

function compare(a: Demand, b: Demand, key: SortKey): number {
  switch (key) {
    case "score":
      return weightedScore(b.score) - weightedScore(a.score);
    case "deadline": {
      const at = a.deadline ? timeOf(a.deadline) : Number.POSITIVE_INFINITY;
      const bt = b.deadline ? timeOf(b.deadline) : Number.POSITIVE_INFINITY;
      return at - bt;
    }
    case "number":
      return a.numero.localeCompare(b.numero);
    case "recent":
    default:
      return timeOf(b.dataSolicitacao || b.criadoEm) - timeOf(a.dataSolicitacao || a.criadoEm);
  }
}

export interface RequestsCounts {
  /** Demandas visíveis para o usuário (após escopo por papel). */
  total: number;
  /** Demandas após busca + filtros. */
  shown: number;
  /** Vencidas dentro do escopo do usuário. */
  overdue: number;
}

export function useRequests() {
  const user = useCurrentUser();
  const [params] = useSearchParams();

  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Filtros pré-aplicados pela URL (KPI clicável do dashboard). */
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string[]>(() => parseStatusParam(params.get("status")));
  const [tipo, setTipo] = useState<string[]>([]);
  const [urgencia, setUrgencia] = useState<string | null>(() => parseUrgParam(params.get("urg")));
  const [area, setArea] = useState<string | null>(() => parseAreaParam(params.get("area")));
  const [overdue, setOverdue] = useState(() => params.get("overdue") === "1");
  const [sort, setSort] = useState<SortKey>("recent");

  /** Recarrega a lista (botão de refresh, ou após uma ação do motor).
      Não mexe em `loading`: trocar a tabela por um spinner a cada gravação
      inline desmontaria a linha que o usuário acabou de editar. */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setItems(await demandService.list());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /* Carga inicial. */
  useEffect(() => {
    let vivo = true;
    demandService.list().then(
      (data) => {
        if (!vivo) return;
        setItems(data);
        setError(null);
        setLoading(false);
      },
      (e: unknown) => {
        if (!vivo) return;
        setError((e as Error).message);
        setLoading(false);
      },
    );
    return () => {
      vivo = false;
    };
  }, []);

  /* Escopo por papel: quem só solicita enxerga apenas o que abriu. */
  const scoped = useMemo(() => {
    const soSolicitante =
      user.roles.length > 0 && user.roles.every((r) => r === Role.Solicitante);
    if (!soSolicitante) return items;
    const mail = user.email.toLowerCase();
    return items.filter((d) => d.email.toLowerCase() === mail);
  }, [items, user.roles, user.email]);

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    const out = scoped.filter((d) => {
      if (qn) {
        const cat = clasificacionEfetiva(d);
        const hay =
          `${d.numero} ${d.titulo} ${d.areaSolicitante} ${d.solicitante} ${cat}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      if (area && clasificacionEfetiva(d) !== (area as Categoria)) return false;
      if (status.length > 0 && !status.includes(String(d.status))) return false;
      if (tipo.length > 0 && !tipo.includes(String(d.tipo))) return false;
      if (urgencia && String(d.urgencia) !== urgencia) return false;
      if (overdue && !isOverdue(d)) return false;
      return true;
    });
    return out.sort((a, b) => compare(a, b, sort));
  }, [scoped, q, area, status, tipo, urgencia, overdue, sort]);

  const clear = useCallback(() => {
    setQ("");
    setStatus([]);
    setTipo([]);
    setUrgencia(null);
    setArea(null);
    setOverdue(false);
  }, []);

  const hasFilter =
    q.trim() !== "" ||
    status.length > 0 ||
    tipo.length > 0 ||
    urgencia !== null ||
    area !== null ||
    overdue;

  const counts: RequestsCounts = useMemo(
    () => ({
      total: scoped.length,
      shown: filtered.length,
      overdue: scoped.filter(isOverdue).length,
    }),
    [scoped, filtered],
  );

  return {
    /* dados */
    items: filtered,
    all: scoped,
    counts,
    loading,
    refreshing,
    error,
    refresh,
    /* filtros */
    q,
    setQ,
    status,
    setStatus,
    tipo,
    setTipo,
    urgencia,
    setUrgencia,
    area,
    setArea,
    overdue,
    setOverdue,
    sort,
    setSort,
    hasFilter,
    clear,
  };
}

export type UseRequests = ReturnType<typeof useRequests>;
