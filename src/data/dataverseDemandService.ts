/* ============================================================
   dataverseDemandService — implementação Dataverse do DemandService.
   Usa o serviço tipado gerado pelo plugin Power Apps Vite.
   Ativado no build de produção (ver demandService.ts).
   ============================================================ */
import {
  StatusDemanda,
  TipoDemanda,
  Urgencia,
  novaDemandaBase,
  emptyScore,
  type Anexo,
  type AprovacaoStep,
  type AvaliacaoCriterio,
  type Comentario,
  type Demand,
  type DemandInput,
  type DemandService,
  type ScoreFlag,
} from "./types";
import { Ardx_demandasService } from "../generated/services/Ardx_demandasService";
import type {
  Ardx_demandas,
  Ardx_demandasBase,
} from "../generated/models/Ardx_demandasModel";
import type { IOperationResult } from "@microsoft/power-apps/data";

const SELECT_FIELDS = [
  "ardx_demandaid",
  "ardx_titulo",
  "ardx_numero",
  "ardx_descricao",
  "ardx_areasolicitante",
  "ardx_solicitante",
  "ardx_email",
  "ardx_telefone",
  "ardx_datasolicitacao",
  "ardx_problemaresolve",
  "ardx_objetivoprincipal",
  "ardx_processosimpactados",
  "ardx_consequencianaoexecucao",
  "ardx_tipo",
  "ardx_impactonivel",
  "ardx_tiposimpacto",
  "ardx_valorestimado",
  "ardx_urgencia",
  "ardx_deadline",
  "ardx_sistemasenvolvidos",
  "ardx_integracoesnecessarias",
  "ardx_requisitosprincipais",
  "ardx_solucaoproposta",
  "ardx_sponsor",
  "ardx_donoprocesso",
  "ardx_areasenvolvidas",
  "ardx_dadossensiveis",
  "ardx_impactaseguranca",
  "ardx_requerauditoria",
  "ardx_esforcoestimado",
  "ardx_status",
  "ardx_projectstage",
  "ardx_finalpriority",
  "ardx_scorebusinessimpact",
  "ardx_scorerisk",
  "ardx_scoretechnical",
  "ardx_scorerevenue",
  "ardx_scorestrategic",
  "ardx_scorestakeholder",
  "ardx_scoreurgency",
  "ardx_impactoabrangencia",
  "ardx_clasificacion",
  "ardx_rce",
  "ardx_appid",
  "ardx_statusdesde",
  "ardx_requerenteupn",
  "ardx_decisorupn",
  "ardx_comentariosjson",
  "ardx_anexosjson",
  "ardx_avaliacoesjson",
  "ardx_stackvalidadapor",
  "ardx_stackvalidadaem",
  "ardx_aprovacoesjson",
  "ardx_time",
  "ardx_horasestimadas",
  "ardx_respostabusiness",
  "ardx_dmcaprovado",
  "ardx_dmcdata",
  "ardx_dmccomentario",
  "ardx_idservicenow",
  "ardx_idprojeto",
  "createdon",
  "modifiedon",
];

type DvRecord = Omit<Ardx_demandasBase, "ardx_demandaid">;

function parseJsonArray<T>(s: string | null | undefined): T[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? (v as T[]) : [];
  } catch {
    return [];
  }
}

function csvToNumberArr(s: string | null | undefined): number[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => Number(x.trim()))
    .filter((n) => Number.isFinite(n));
}

function csvToFlagArr(s: string | null | undefined): ScoreFlag[] {
  if (!s) return [];
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean) as ScoreFlag[];
}

/* Picklist ardx_clasificacion: 506970000..3 <-> infra/ia/app/otro */
const CLASSIFICACAO_BASE = 506970000;
const CLASSIFICACAO_ORDEM = ["infra", "ia", "app", "otro"] as const;

function dvParaClassificacao(v: number | undefined): string | undefined {
  if (v == null) return undefined;
  return CLASSIFICACAO_ORDEM[v - CLASSIFICACAO_BASE];
}
function classificacaoParaDv(v: string | undefined): number | null {
  if (!v) return null;
  const i = CLASSIFICACAO_ORDEM.indexOf(v as (typeof CLASSIFICACAO_ORDEM)[number]);
  return i < 0 ? null : CLASSIFICACAO_BASE + i;
}

/** Dataverse -> modelo de domínio. */
function fromDv(r: Ardx_demandas): Demand {
  const score = emptyScore();
  /* Modelo de 3 critérios sobre as colunas existentes do Dataverse:
     impacto → scorebusinessimpact · urgência → scoreurgency ·
     retorno → scorerevenue. As colunas legadas (risk/technical/
     strategic/stakeholder) continuam na tabela, mas não são mais usadas. */
  const baseScore = {
    businessImpact:
      (r.ardx_scorebusinessimpact as number | undefined) ?? score.businessImpact,
    urgency: (r.ardx_scoreurgency as number | undefined) ?? score.urgency,
    returnValue: (r.ardx_scorerevenue as number | undefined) ?? score.returnValue,
  };

  return {
    id: r.ardx_demandaid,
    numero: r.ardx_numero ?? "",
    titulo: r.ardx_titulo ?? "",
    descricao: r.ardx_descricao ?? "",
    areaSolicitante: r.ardx_areasolicitante ?? "",
    solicitante: r.ardx_solicitante ?? "",
    email: r.ardx_email ?? "",
    telefone: r.ardx_telefone ?? "",
    dataSolicitacao: r.ardx_datasolicitacao ?? "",
    problemaResolve: r.ardx_problemaresolve ?? "",
    objetivoPrincipal: r.ardx_objetivoprincipal ?? "",
    processosImpactados: r.ardx_processosimpactados ?? "",
    consequenciaNaoExecucao: r.ardx_consequencianaoexecucao ?? "",
    tipo: (r.ardx_tipo as number | undefined) ?? TipoDemanda.ProjetoNovo,
    impactoNivel: (r.ardx_impactonivel as number | undefined) ?? 0,
    tiposImpacto: csvToNumberArr(r.ardx_tiposimpacto),
    valorEstimado:
      r.ardx_valorestimado != null ? Number(r.ardx_valorestimado) : null,
    urgencia: (r.ardx_urgencia as number | undefined) ?? Urgencia.Medio,
    deadline: r.ardx_deadline ?? "",
    sistemasEnvolvidos: r.ardx_sistemasenvolvidos ?? "",
    integracoesNecessarias: r.ardx_integracoesnecessarias ?? "",
    requisitosPrincipais: r.ardx_requisitosprincipais ?? "",
    solucaoProposta: r.ardx_solucaoproposta ?? "",
    sponsor: r.ardx_sponsor ?? "",
    donoProcesso: r.ardx_donoprocesso ?? "",
    areasEnvolvidas: r.ardx_areasenvolvidas ?? "",
    dadosSensiveis: !!r.ardx_dadossensiveis,
    impactaSeguranca: !!r.ardx_impactaseguranca,
    requerAuditoria: !!r.ardx_requerauditoria,
    esforcoEstimado: (r.ardx_esforcoestimado as number | undefined) ?? null,
    /* Campos que faltavam no mapeamento — sem eles o gate era roteado pelo
       fallback do tipo e o score nascia no piso.
       O acesso é via `novo` (Record) porque o modelo tipado em src/generated é
       gerado A PARTIR da tabela: estas colunas só entram no tipo depois de rodar
       dataverse/Setup-DemandaTable.ps1 e `pac code add-data-source`. */
    /* Colunas tipadas desde que a tabela foi atualizada e o modelo regerado
       (pac code add-data-source). Antes viviam atrás de um cast porque não
       existiam no ambiente. */
    impactoAbrangencia: r.ardx_impactoabrangencia ?? undefined,
    clasificacion: dvParaClassificacao(r.ardx_clasificacion),
    rce: r.ardx_rce ?? "",
    appId: r.ardx_appid ?? "",
    statusDesde: r.ardx_statusdesde ?? "",
    requerenteUpn: r.ardx_requerenteupn ?? "",
    decisorUpn: r.ardx_decisorupn ?? "",
    anexos: parseJsonArray<Anexo>(r.ardx_anexosjson),
    status: (r.ardx_status as number | undefined) ?? StatusDemanda.Nova,
    score: baseScore,
    scoreFlags: csvToFlagArr(r.ardx_scoreflags),
    projectStage: r.ardx_projectstage ?? "Discovery",
    finalPriority:
      r.ardx_finalpriority != null ? Number(r.ardx_finalpriority) : null,
    comentarios: parseJsonArray<Comentario>(r.ardx_comentariosjson),
    avaliacoes: parseJsonArray<AvaliacaoCriterio>(r.ardx_avaliacoesjson),
    stackValidadaPor: r.ardx_stackvalidadapor ?? "",
    stackValidadaEm: r.ardx_stackvalidadaem ?? "",
    aprovacoes: parseJsonArray<AprovacaoStep>(r.ardx_aprovacoesjson),
    time: r.ardx_time ?? "",
    horasEstimadas:
      r.ardx_horasestimadas != null ? Number(r.ardx_horasestimadas) : 0,
    respostaBusiness: r.ardx_respostabusiness ?? "",
    dmcAprovado:
      r.ardx_dmcaprovado == null ? null : !!r.ardx_dmcaprovado,
    dmcData: r.ardx_dmcdata ?? "",
    dmcComentario: r.ardx_dmccomentario ?? "",
    idServiceNow: r.ardx_idservicenow ?? "",
    idProjeto: r.ardx_idprojeto ?? "",
    criadoEm: r.createdon ?? "",
    modificadoEm: r.modifiedon ?? "",
  };
}

/** Modelo de domínio -> Dataverse (parcial). */
function toDv(input: Partial<Demand>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (input.titulo !== undefined) r.ardx_titulo = input.titulo;
  if (input.numero !== undefined) r.ardx_numero = input.numero;
  if (input.descricao !== undefined) r.ardx_descricao = input.descricao;
  if (input.areaSolicitante !== undefined)
    r.ardx_areasolicitante = input.areaSolicitante;
  if (input.solicitante !== undefined) r.ardx_solicitante = input.solicitante;
  if (input.email !== undefined) r.ardx_email = input.email;
  if (input.telefone !== undefined) r.ardx_telefone = input.telefone;
  if (input.dataSolicitacao !== undefined)
    r.ardx_datasolicitacao = input.dataSolicitacao
      ? input.dataSolicitacao.slice(0, 10)
      : null;
  if (input.problemaResolve !== undefined)
    r.ardx_problemaresolve = input.problemaResolve;
  if (input.objetivoPrincipal !== undefined)
    r.ardx_objetivoprincipal = input.objetivoPrincipal;
  if (input.processosImpactados !== undefined)
    r.ardx_processosimpactados = input.processosImpactados;
  if (input.consequenciaNaoExecucao !== undefined)
    r.ardx_consequencianaoexecucao = input.consequenciaNaoExecucao;
  if (input.tipo !== undefined) r.ardx_tipo = input.tipo;
  if (input.impactoNivel !== undefined) r.ardx_impactonivel = input.impactoNivel;
  if (input.tiposImpacto !== undefined)
    r.ardx_tiposimpacto = input.tiposImpacto.join(",");
  if (input.valorEstimado !== undefined) r.ardx_valorestimado = input.valorEstimado;
  if (input.urgencia !== undefined) r.ardx_urgencia = input.urgencia;
  if (input.deadline !== undefined)
    r.ardx_deadline = input.deadline ? input.deadline.slice(0, 10) : null;
  if (input.sistemasEnvolvidos !== undefined)
    r.ardx_sistemasenvolvidos = input.sistemasEnvolvidos;
  if (input.integracoesNecessarias !== undefined)
    r.ardx_integracoesnecessarias = input.integracoesNecessarias;
  if (input.requisitosPrincipais !== undefined)
    r.ardx_requisitosprincipais = input.requisitosPrincipais;
  if (input.solucaoProposta !== undefined)
    r.ardx_solucaoproposta = input.solucaoProposta;
  if (input.sponsor !== undefined) r.ardx_sponsor = input.sponsor;
  if (input.donoProcesso !== undefined) r.ardx_donoprocesso = input.donoProcesso;
  if (input.areasEnvolvidas !== undefined)
    r.ardx_areasenvolvidas = input.areasEnvolvidas;
  if (input.dadosSensiveis !== undefined)
    r.ardx_dadossensiveis = input.dadosSensiveis;
  if (input.impactaSeguranca !== undefined)
    r.ardx_impactaseguranca = input.impactaSeguranca;
  if (input.requerAuditoria !== undefined)
    r.ardx_requerauditoria = input.requerAuditoria;
  if (input.esforcoEstimado !== undefined)
    r.ardx_esforcoestimado = input.esforcoEstimado;
  if (input.status !== undefined) r.ardx_status = input.status;
  if (input.projectStage !== undefined) r.ardx_projectstage = input.projectStage;
  if (input.finalPriority !== undefined)
    r.ardx_finalpriority = input.finalPriority;
  if (input.score) {
    r.ardx_scorebusinessimpact = input.score.businessImpact;
    r.ardx_scoreurgency = input.score.urgency;
    r.ardx_scorerevenue = input.score.returnValue;
  }
  if (input.scoreFlags !== undefined)
    r.ardx_scoreflags = input.scoreFlags.join(",");
  if (input.comentarios !== undefined)
    r.ardx_comentariosjson = JSON.stringify(input.comentarios);
  if (input.anexos !== undefined)
    r.ardx_anexosjson = JSON.stringify(input.anexos);
  if (input.avaliacoes !== undefined)
    r.ardx_avaliacoesjson = JSON.stringify(input.avaliacoes);
  if (input.stackValidadaPor !== undefined)
    r.ardx_stackvalidadapor = input.stackValidadaPor;
  if (input.stackValidadaEm !== undefined)
    r.ardx_stackvalidadaem = input.stackValidadaEm
      ? input.stackValidadaEm.slice(0, 10)
      : null;
  if (input.aprovacoes !== undefined)
    r.ardx_aprovacoesjson = JSON.stringify(input.aprovacoes);
  if (input.time !== undefined) r.ardx_time = input.time;
  if (input.horasEstimadas !== undefined)
    r.ardx_horasestimadas = input.horasEstimadas;
  if (input.respostaBusiness !== undefined)
    r.ardx_respostabusiness = input.respostaBusiness;
  if (input.dmcAprovado !== undefined) r.ardx_dmcaprovado = input.dmcAprovado;
  if (input.dmcData !== undefined)
    r.ardx_dmcdata = input.dmcData ? input.dmcData.slice(0, 10) : null;
  if (input.dmcComentario !== undefined)
    r.ardx_dmccomentario = input.dmcComentario;
  if (input.idServiceNow !== undefined) r.ardx_idservicenow = input.idServiceNow;
  if (input.idProjeto !== undefined) r.ardx_idprojeto = input.idProjeto;
  if (input.impactoAbrangencia !== undefined)
    r.ardx_impactoabrangencia = input.impactoAbrangencia;
  if (input.clasificacion !== undefined)
    r.ardx_clasificacion = classificacaoParaDv(input.clasificacion);
  if (input.rce !== undefined) r.ardx_rce = input.rce;
  if (input.appId !== undefined) r.ardx_appid = input.appId;
  if (input.statusDesde !== undefined)
    r.ardx_statusdesde = input.statusDesde ? input.statusDesde.slice(0, 10) : null;
  if (input.requerenteUpn !== undefined) r.ardx_requerenteupn = input.requerenteUpn;
  if (input.decisorUpn !== undefined) r.ardx_decisorupn = input.decisorUpn;
  return r;
}

function detail(res: IOperationResult<unknown>): string {
  const e = res.error as unknown;
  if (!e) return "";
  if (e instanceof Error) return ` ${e.message}`;
  if (typeof e === "object") {
    const o = e as Record<string, unknown>;
    const msg = o.message ?? o.detail ?? o.error;
    return ` ${typeof msg === "string" ? msg : JSON.stringify(e)}`;
  }
  return ` ${String(e)}`;
}

function uid(prefix = "id"): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
}

async function nextNumero(): Promise<string> {
  const res = await Ardx_demandasService.getAll({
    select: ["ardx_numero"],
    top: 5000,
  });
  if (!res.success) return `DEM-${Date.now().toString().slice(-4)}`;
  const max = (res.data ?? []).reduce((acc, d) => {
    const n = Number((d.ardx_numero ?? "").replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `DEM-${String(max + 1).padStart(4, "0")}`;
}

class DataverseDemandService implements DemandService {
  async list(): Promise<Demand[]> {
    const res = await Ardx_demandasService.getAll({
      select: SELECT_FIELDS,
      orderBy: ["createdon desc"],
      top: 5000,
    });
    if (!res.success) throw new Error(`Falha ao listar demandas.${detail(res)}`);
    return (res.data ?? []).map(fromDv);
  }

  async get(id: string): Promise<Demand | undefined> {
    try {
      const res = await Ardx_demandasService.get(id, { select: SELECT_FIELDS });
      return res.success && res.data ? fromDv(res.data) : undefined;
    } catch {
      return undefined;
    }
  }

  private async refetch(id: string): Promise<Demand> {
    const res = await Ardx_demandasService.get(id, { select: SELECT_FIELDS });
    if (!res.success || !res.data)
      throw new Error(`Demanda não encontrada após gravação.${detail(res)}`);
    return fromDv(res.data);
  }

  async create(input: DemandInput): Promise<Demand> {
    const now = new Date().toISOString();
    const numero = await nextNumero();
    /* MESMA regra de criação do mock (novaDemandaBase): o score nasce derivado
       do intake. Antes gravava emptyScore() e toda demanda nascia 1.00. */
    const rec: Partial<Demand> = {
      ...input,
      ...novaDemandaBase(input, now),
      numero,
    };
    const res = await Ardx_demandasService.create(toDv(rec) as DvRecord);
    if (!res.success || !res.data)
      throw new Error(`Falha ao criar a demanda.${detail(res)}`);
    return fromDv(res.data);
  }

  async update(id: string, changes: Partial<Demand>): Promise<Demand> {
    const res = await Ardx_demandasService.update(
      id,
      toDv(changes) as Partial<DvRecord>,
    );
    if (!res.success) throw new Error(`Falha ao salvar.${detail(res)}`);
    return this.refetch(id);
  }

  async remove(id: string): Promise<void> {
    await Ardx_demandasService.delete(id);
  }

  async addComment(id: string, autor: string, texto: string): Promise<Demand> {
    const atual = await this.get(id);
    if (!atual) throw new Error("Demanda não encontrada");
    const novo: Comentario = {
      id: uid("com"),
      autor,
      data: new Date().toISOString(),
      texto,
    };
    return this.update(id, { comentarios: [...atual.comentarios, novo] });
  }

  async addAnexo(id: string, nome: string, tamanho: number): Promise<Demand> {
    const atual = await this.get(id);
    if (!atual) throw new Error("Demanda não encontrada");
    const novo: Anexo = {
      id: uid("anx"),
      nomeArquivo: nome,
      tamanhoBytes: tamanho,
      uploadEm: new Date().toISOString(),
    };
    return this.update(id, { anexos: [...atual.anexos, novo] });
  }

  async removeAnexo(id: string, anexoId: string): Promise<Demand> {
    const atual = await this.get(id);
    if (!atual) throw new Error("Demanda não encontrada");
    return this.update(id, {
      anexos: atual.anexos.filter((a) => a.id !== anexoId),
    });
  }

  async reset(): Promise<void> {
    // Em produção (Dataverse) o "reset" é no-op — os dados são reais.
    return;
  }
}

export const dataverseDemandService: DemandService = new DataverseDemandService();
