/* ============================================================
   mockDemandService — local-only, persiste em localStorage.
   Usado em dev (npm run dev) e como fallback.
   ============================================================ */
import {
  aprovacoesPadrao,
  emptyScore,
  ABRANGENCIA_SCORE,
  AUTO_AVALIADOR,
  StatusDemanda,
  type Demand,
  type DemandInput,
  type DemandService,
  type AvaliacaoCriterio,
} from "./types";

// v2: começa VAZIO (sem demandas de exemplo). O Admin pode popular a amostra.
const LS_KEY_DEMANDS = "demand-system.demands.v2";

function loadDemands(): Demand[] {
  try {
    const raw = localStorage.getItem(LS_KEY_DEMANDS);
    if (raw) return JSON.parse(raw) as Demand[];
  } catch {
    /* recreate */
  }
  localStorage.setItem(LS_KEY_DEMANDS, JSON.stringify([]));
  return [];
}

function saveDemands(items: Demand[]) {
  localStorage.setItem(LS_KEY_DEMANDS, JSON.stringify(items));
}

let cache: Demand[] = loadDemands();

function nextNumero(): string {
  const max = cache.reduce((acc, d) => {
    const n = Number(d.numero.replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `DEM-${String(max + 1).padStart(4, "0")}`;
}

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

function delay<T>(value: T, ms = 80): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

export const mockDemandService: DemandService = {
  async list() {
    return delay([...cache].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)));
  },
  async get(id) {
    return delay(cache.find((d) => d.id === id));
  },
  async create(input: DemandInput) {
    const now = new Date().toISOString();
    // Score de "Impacto no Negócio" calculado automaticamente pela abrangência
    // escolhida pelo solicitante — e já validado (não exige avaliador manual).
    const score = emptyScore();
    const avaliacoes: AvaliacaoCriterio[] = [];
    const abr = input.impactoAbrangencia;
    if (abr && ABRANGENCIA_SCORE[abr]) {
      score.businessImpact = ABRANGENCIA_SCORE[abr];
      avaliacoes.push({
        criterio: "businessImpact",
        validadoPor: AUTO_AVALIADOR,
        validadoEm: now,
        comentario: "Calculado automaticamente pelo nível de impacto informado no intake.",
      });
    }
    const novo: Demand = {
      ...input,
      id: uid("dem"),
      numero: nextNumero(),
      dataSolicitacao: now,
      status: StatusDemanda.Nova,
      score,
      scoreFlags: [],
      projectStage: "Discovery",
      finalPriority: null,
      comentarios: [],
      anexos: [],
      avaliacoes,
      stackValidadaPor: "",
      stackValidadaEm: "",
      aprovacoes: aprovacoesPadrao(input.sponsor),
      respostaBusiness: "",
      dmcAprovado: null,
      dmcData: "",
      dmcComentario: "",
      idServiceNow: "",
      idProjeto: "",
      criadoEm: now,
      modificadoEm: now,
    };
    cache = [novo, ...cache];
    saveDemands(cache);
    return delay(novo);
  },
  async update(id, changes) {
    const idx = cache.findIndex((d) => d.id === id);
    if (idx < 0) throw new Error("Demanda não encontrada");
    const atual = cache[idx];
    const novo: Demand = {
      ...atual,
      ...changes,
      id: atual.id,
      numero: atual.numero,
      modificadoEm: new Date().toISOString(),
    };
    cache = [...cache.slice(0, idx), novo, ...cache.slice(idx + 1)];
    saveDemands(cache);
    return delay(novo);
  },
  async remove(id) {
    cache = cache.filter((d) => d.id !== id);
    saveDemands(cache);
    return delay(undefined);
  },
  async addComment(id, autor, texto) {
    return this.update(id, {
      comentarios: [
        ...(cache.find((d) => d.id === id)?.comentarios ?? []),
        {
          id: uid("com"),
          autor,
          texto,
          data: new Date().toISOString(),
        },
      ],
    });
  },
  async addAnexo(id, nome, tamanho) {
    return this.update(id, {
      anexos: [
        ...(cache.find((d) => d.id === id)?.anexos ?? []),
        {
          id: uid("anx"),
          nomeArquivo: nome,
          tamanhoBytes: tamanho,
          uploadEm: new Date().toISOString(),
        },
      ],
    });
  },
  async removeAnexo(id, anexoId) {
    const atual = cache.find((d) => d.id === id);
    if (!atual) throw new Error("Demanda não encontrada");
    return this.update(id, {
      anexos: atual.anexos.filter((a) => a.id !== anexoId),
    });
  },
  async reset() {
    localStorage.removeItem(LS_KEY_DEMANDS);
    cache = loadDemands();
    return delay(undefined);
  },
};
