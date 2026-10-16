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
import { Intake_demandasService } from "../generated/services/Intake_demandasService";
import type {
  Intake_demandas,
  Intake_demandasBase,
} from "../generated/models/Intake_demandasModel";
import type { IOperationResult } from "@microsoft/power-apps/data";

const SELECT_FIELDS = [
  "intake_demandaid",
  "intake_titulo",
  "intake_numero",
  "intake_descricao",
  "intake_areasolicitante",
  "intake_solicitante",
  "intake_email",
  "intake_telefone",
  "intake_datasolicitacao",
  "intake_problemaresolve",
  "intake_objetivoprincipal",
  "intake_processosimpactados",
  "intake_consequencianaoexecucao",
  "intake_tipo",
  "intake_impactonivel",
  "intake_tiposimpacto",
  "intake_valorestimado",
  "intake_urgencia",
  "intake_deadline",
  "intake_sistemasenvolvidos",
  "intake_integracoesnecessarias",
  "intake_requisitosprincipais",
  "intake_solucaoproposta",
  "intake_sponsor",
  "intake_donoprocesso",
  "intake_areasenvolvidas",
  "intake_dadossensiveis",
  "intake_impactaseguranca",
  "intake_requerauditoria",
  "intake_esforcoestimado",
  "intake_status",
  "intake_projectstage",
  "intake_finalpriority",
  "intake_scorebusinessimpact",
  "intake_scorerisk",
  "intake_scoretechnical",
  "intake_scorerevenue",
  "intake_scorestrategic",
  "intake_scorestakeholder",
  "intake_scoreurgency",
  "intake_impactoabrangencia",
  "intake_clasificacion",
  "intake_rce",
  "intake_appid",
  "intake_statusdesde",
  "intake_requerenteupn",
  "intake_decisorupn",
  "intake_comentariosjson",
  "intake_anexosjson",
  "intake_avaliacoesjson",
  "intake_stackvalidadapor",
  "intake_stackvalidadaem",
  "intake_aprovacoesjson",
  "intake_time",
  "intake_horasestimadas",
  "intake_respostabusiness",
  "intake_dmcaprovado",
  "intake_dmcdata",
  "intake_dmccomentario",
  "intake_idservicenow",
  "intake_idprojeto",
  "createdon",
  "modifiedon",
];

type DvRecord = Omit<Intake_demandasBase, "intake_demandaid">;

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

/* Picklist intake_clasificacion: 506970000..3 <-> infra/ia/app/otro */
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
function fromDv(r: Intake_demandas): Demand {
  const score = emptyScore();
  /* Modelo de 3 critérios sobre as colunas existentes do Dataverse:
     impacto → scorebusinessimpact · urgência → scoreurgency ·
     retorno → scorerevenue. As colunas legadas (risk/technical/
     strategic/stakeholder) continuam na tabela, mas não são mais usadas. */
  const baseScore = {
    businessImpact:
      (r.intake_scorebusinessimpact as number | undefined) ?? score.businessImpact,
    urgency: (r.intake_scoreurgency as number | undefined) ?? score.urgency,
    returnValue: (r.intake_scorerevenue as number | undefined) ?? score.returnValue,
  };

  return {
    id: r.intake_demandaid,
    numero: r.intake_numero ?? "",
    titulo: r.intake_titulo ?? "",
    descricao: r.intake_descricao ?? "",
    areaSolicitante: r.intake_areasolicitante ?? "",
    solicitante: r.intake_solicitante ?? "",
    email: r.intake_email ?? "",
    telefone: r.intake_telefone ?? "",
    dataSolicitacao: r.intake_datasolicitacao ?? "",
    problemaResolve: r.intake_problemaresolve ?? "",
    objetivoPrincipal: r.intake_objetivoprincipal ?? "",
    processosImpactados: r.intake_processosimpactados ?? "",
    consequenciaNaoExecucao: r.intake_consequencianaoexecucao ?? "",
    tipo: (r.intake_tipo as number | undefined) ?? TipoDemanda.ProjetoNovo,
    impactoNivel: (r.intake_impactonivel as number | undefined) ?? 0,
    tiposImpacto: csvToNumberArr(r.intake_tiposimpacto),
    valorEstimado:
      r.intake_valorestimado != null ? Number(r.intake_valorestimado) : null,
    urgencia: (r.intake_urgencia as number | undefined) ?? Urgencia.Medio,
    deadline: r.intake_deadline ?? "",
    sistemasEnvolvidos: r.intake_sistemasenvolvidos ?? "",
    integracoesNecessarias: r.intake_integracoesnecessarias ?? "",
    requisitosPrincipais: r.intake_requisitosprincipais ?? "",
    solucaoProposta: r.intake_solucaoproposta ?? "",
    sponsor: r.intake_sponsor ?? "",
    donoProcesso: r.intake_donoprocesso ?? "",
    areasEnvolvidas: r.intake_areasenvolvidas ?? "",
    dadosSensiveis: !!r.intake_dadossensiveis,
    impactaSeguranca: !!r.intake_impactaseguranca,
    requerAuditoria: !!r.intake_requerauditoria,
    esforcoEstimado: (r.intake_esforcoestimado as number | undefined) ?? null,
    /* Campos que faltavam no mapeamento — sem eles o gate era roteado pelo
       fallback do tipo e o score nascia no piso.
       O acesso é via `novo` (Record) porque o modelo tipado em src/generated é
       gerado A PARTIR da tabela: estas colunas só entram no tipo depois de rodar
       dataverse/Setup-DemandaTable.ps1 e `pac code add-data-source`. */
    /* Colunas tipadas desde que a tabela foi atualizada e o modelo regerado
       (pac code add-data-source). Antes viviam atrás de um cast porque não
       existiam no ambiente. */
    impactoAbrangencia: r.intake_impactoabrangencia ?? undefined,
    clasificacion: dvParaClassificacao(r.intake_clasificacion),
    rce: r.intake_rce ?? "",
    appId: r.intake_appid ?? "",
    statusDesde: r.intake_statusdesde ?? "",
    requerenteUpn: r.intake_requerenteupn ?? "",
    decisorUpn: r.intake_decisorupn ?? "",
    anexos: parseJsonArray<Anexo>(r.intake_anexosjson),
    status: (r.intake_status as number | undefined) ?? StatusDemanda.Nova,
    score: baseScore,
    scoreFlags: csvToFlagArr(r.intake_scoreflags),
    projectStage: r.intake_projectstage ?? "Discovery",
    finalPriority:
      r.intake_finalpriority != null ? Number(r.intake_finalpriority) : null,
    comentarios: parseJsonArray<Comentario>(r.intake_comentariosjson),
    avaliacoes: parseJsonArray<AvaliacaoCriterio>(r.intake_avaliacoesjson),
    stackValidadaPor: r.intake_stackvalidadapor ?? "",
    stackValidadaEm: r.intake_stackvalidadaem ?? "",
    aprovacoes: parseJsonArray<AprovacaoStep>(r.intake_aprovacoesjson),
    time: r.intake_time ?? "",
    horasEstimadas:
      r.intake_horasestimadas != null ? Number(r.intake_horasestimadas) : 0,
    respostaBusiness: r.intake_respostabusiness ?? "",
    dmcAprovado:
      r.intake_dmcaprovado == null ? null : !!r.intake_dmcaprovado,
    dmcData: r.intake_dmcdata ?? "",
    dmcComentario: r.intake_dmccomentario ?? "",
    idServiceNow: r.intake_idservicenow ?? "",
    idProjeto: r.intake_idprojeto ?? "",
    criadoEm: r.createdon ?? "",
    modificadoEm: r.modifiedon ?? "",
  };
}

/** Modelo de domínio -> Dataverse (parcial). */
function toDv(input: Partial<Demand>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (input.titulo !== undefined) r.intake_titulo = input.titulo;
  if (input.numero !== undefined) r.intake_numero = input.numero;
  if (input.descricao !== undefined) r.intake_descricao = input.descricao;
  if (input.areaSolicitante !== undefined)
    r.intake_areasolicitante = input.areaSolicitante;
  if (input.solicitante !== undefined) r.intake_solicitante = input.solicitante;
  if (input.email !== undefined) r.intake_email = input.email;
  if (input.telefone !== undefined) r.intake_telefone = input.telefone;
  if (input.dataSolicitacao !== undefined)
    r.intake_datasolicitacao = input.dataSolicitacao
      ? input.dataSolicitacao.slice(0, 10)
      : null;
  if (input.problemaResolve !== undefined)
    r.intake_problemaresolve = input.problemaResolve;
  if (input.objetivoPrincipal !== undefined)
    r.intake_objetivoprincipal = input.objetivoPrincipal;
  if (input.processosImpactados !== undefined)
    r.intake_processosimpactados = input.processosImpactados;
  if (input.consequenciaNaoExecucao !== undefined)
    r.intake_consequencianaoexecucao = input.consequenciaNaoExecucao;
  if (input.tipo !== undefined) r.intake_tipo = input.tipo;
  if (input.impactoNivel !== undefined) r.intake_impactonivel = input.impactoNivel;
  if (input.tiposImpacto !== undefined)
    r.intake_tiposimpacto = input.tiposImpacto.join(",");
  if (input.valorEstimado !== undefined) r.intake_valorestimado = input.valorEstimado;
  if (input.urgencia !== undefined) r.intake_urgencia = input.urgencia;
  if (input.deadline !== undefined)
    r.intake_deadline = input.deadline ? input.deadline.slice(0, 10) : null;
  if (input.sistemasEnvolvidos !== undefined)
    r.intake_sistemasenvolvidos = input.sistemasEnvolvidos;
  if (input.integracoesNecessarias !== undefined)
    r.intake_integracoesnecessarias = input.integracoesNecessarias;
  if (input.requisitosPrincipais !== undefined)
    r.intake_requisitosprincipais = input.requisitosPrincipais;
  if (input.solucaoProposta !== undefined)
    r.intake_solucaoproposta = input.solucaoProposta;
  if (input.sponsor !== undefined) r.intake_sponsor = input.sponsor;
  if (input.donoProcesso !== undefined) r.intake_donoprocesso = input.donoProcesso;
  if (input.areasEnvolvidas !== undefined)
    r.intake_areasenvolvidas = input.areasEnvolvidas;
  if (input.dadosSensiveis !== undefined)
    r.intake_dadossensiveis = input.dadosSensiveis;
  if (input.impactaSeguranca !== undefined)
    r.intake_impactaseguranca = input.impactaSeguranca;
  if (input.requerAuditoria !== undefined)
    r.intake_requerauditoria = input.requerAuditoria;
  if (input.esforcoEstimado !== undefined)
    r.intake_esforcoestimado = input.esforcoEstimado;
  if (input.status !== undefined) r.intake_status = input.status;
  if (input.projectStage !== undefined) r.intake_projectstage = input.projectStage;
  if (input.finalPriority !== undefined)
    r.intake_finalpriority = input.finalPriority;
  if (input.score) {
    r.intake_scorebusinessimpact = input.score.businessImpact;
    r.intake_scoreurgency = input.score.urgency;
    r.intake_scorerevenue = input.score.returnValue;
  }
  if (input.scoreFlags !== undefined)
    r.intake_scoreflags = input.scoreFlags.join(",");
  if (input.comentarios !== undefined)
    r.intake_comentariosjson = JSON.stringify(input.comentarios);
  if (input.anexos !== undefined)
    r.intake_anexosjson = JSON.stringify(input.anexos);
  if (input.avaliacoes !== undefined)
    r.intake_avaliacoesjson = JSON.stringify(input.avaliacoes);
  if (input.stackValidadaPor !== undefined)
    r.intake_stackvalidadapor = input.stackValidadaPor;
  if (input.stackValidadaEm !== undefined)
    r.intake_stackvalidadaem = input.stackValidadaEm
      ? input.stackValidadaEm.slice(0, 10)
      : null;
  if (input.aprovacoes !== undefined)
    r.intake_aprovacoesjson = JSON.stringify(input.aprovacoes);
  if (input.time !== undefined) r.intake_time = input.time;
  if (input.horasEstimadas !== undefined)
    r.intake_horasestimadas = input.horasEstimadas;
  if (input.respostaBusiness !== undefined)
    r.intake_respostabusiness = input.respostaBusiness;
  if (input.dmcAprovado !== undefined) r.intake_dmcaprovado = input.dmcAprovado;
  if (input.dmcData !== undefined)
    r.intake_dmcdata = input.dmcData ? input.dmcData.slice(0, 10) : null;
  if (input.dmcComentario !== undefined)
    r.intake_dmccomentario = input.dmcComentario;
  if (input.idServiceNow !== undefined) r.intake_idservicenow = input.idServiceNow;
  if (input.idProjeto !== undefined) r.intake_idprojeto = input.idProjeto;
  if (input.impactoAbrangencia !== undefined)
    r.intake_impactoabrangencia = input.impactoAbrangencia;
  if (input.clasificacion !== undefined)
    r.intake_clasificacion = classificacaoParaDv(input.clasificacion);
  if (input.rce !== undefined) r.intake_rce = input.rce;
  if (input.appId !== undefined) r.intake_appid = input.appId;
  if (input.statusDesde !== undefined)
    r.intake_statusdesde = input.statusDesde ? input.statusDesde.slice(0, 10) : null;
  if (input.requerenteUpn !== undefined) r.intake_requerenteupn = input.requerenteUpn;
  if (input.decisorUpn !== undefined) r.intake_decisorupn = input.decisorUpn;
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
  const res = await Intake_demandasService.getAll({
    select: ["intake_numero"],
    top: 5000,
  });
  if (!res.success) return `DEM-${Date.now().toString().slice(-4)}`;
  const max = (res.data ?? []).reduce((acc, d) => {
    const n = Number((d.intake_numero ?? "").replace(/\D/g, ""));
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return `DEM-${String(max + 1).padStart(4, "0")}`;
}

class DataverseDemandService implements DemandService {
  async list(): Promise<Demand[]> {
    const res = await Intake_demandasService.getAll({
      select: SELECT_FIELDS,
      orderBy: ["createdon desc"],
      top: 5000,
    });
    if (!res.success) throw new Error(`Falha ao listar demandas.${detail(res)}`);
    return (res.data ?? []).map(fromDv);
  }

  async get(id: string): Promise<Demand | undefined> {
    try {
      const res = await Intake_demandasService.get(id, { select: SELECT_FIELDS });
      return res.success && res.data ? fromDv(res.data) : undefined;
    } catch {
      return undefined;
    }
  }

  private async refetch(id: string): Promise<Demand> {
    const res = await Intake_demandasService.get(id, { select: SELECT_FIELDS });
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
    const res = await Intake_demandasService.create(toDv(rec) as DvRecord);
    if (!res.success || !res.data)
      throw new Error(`Falha ao criar a demanda.${detail(res)}`);
    return fromDv(res.data);
  }

  async update(id: string, changes: Partial<Demand>): Promise<Demand> {
    const res = await Intake_demandasService.update(
      id,
      toDv(changes) as Partial<DvRecord>,
    );
    if (!res.success) throw new Error(`Falha ao salvar.${detail(res)}`);
    return this.refetch(id);
  }

  async remove(id: string): Promise<void> {
    await Intake_demandasService.delete(id);
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
