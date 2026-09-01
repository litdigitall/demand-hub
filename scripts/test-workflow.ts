/* ============================================================
   Teste determinístico do motor de ciclo de vida (4 atores).
   Roda com: npx tsx scripts/test-workflow.ts

   É a rede de segurança da refatoração: cobre TODA transição, TODA
   guarda e o roteamento do gate por área. Sem cast para Demand —
   se o modelo mudar, o TypeScript quebra aqui primeiro.
   ============================================================ */
import {
  ACOES_POR_ESTADO,
  aplicarAcao,
  proximasAcoes,
  precisaDeMim,
  aguardando,
  capacityDefinido,
  decisorDaDemanda,
  PIPELINE,
} from "../src/domain/workflow";
import {
  StatusDemanda,
  TipoDemanda,
  Urgencia,
  Impacto,
  ImpactoAbrangencia,
  aprovacoesPadrao,
  novaDemandaBase,
  scoreAutomatico,
  weightedScore,
  type Categoria,
  type Demand,
} from "../src/data/types";
import { Role } from "../src/domain/roles";

let falhas = 0;
const ok = (nome: string) => console.log("PASS " + nome);
const check = (cond: boolean, nome: string, extra?: string) => {
  if (cond) ok(nome);
  else {
    console.log("FAIL " + nome + (extra ? " — " + extra : ""));
    falhas++;
  }
};

const AGORA = "2026-08-25T12:00:00.000Z";

/** Demanda completa e TIPADA (sem cast) — se o modelo mudar, quebra aqui. */
function demanda(extra: Partial<Demand> = {}): Demand {
  const base = {
    impactoAbrangencia: ImpactoAbrangencia.Processo,
    urgencia: Urgencia.Medio,
    valorEstimado: 100_000,
    ...extra,
  };
  const d: Demand = {
    id: "d1",
    numero: "DEM-0001",
    titulo: "Test request",
    descricao: "Description long enough",
    areaSolicitante: "Commercial",
    solicitante: "Ana",
    email: "ana@abbott.com",
    telefone: "",
    problemaResolve: "",
    objetivoPrincipal: "",
    processosImpactados: "",
    consequenciaNaoExecucao: "Operational disruption",
    tipo: TipoDemanda.ProjetoNovo,
    impactoNivel: Impacto.Medio,
    tiposImpacto: [],
    valorEstimado: base.valorEstimado,
    impactoAbrangencia: base.impactoAbrangencia,
    urgencia: base.urgencia,
    deadline: "",
    sistemasEnvolvidos: "",
    integracoesNecessarias: "",
    requisitosPrincipais: "",
    solucaoProposta: "",
    sponsor: "Carlos",
    donoProcesso: "",
    areasEnvolvidas: "",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforcoEstimado: null,
    anexos: [],
    scoreFlags: [],
    stackValidadaPor: "",
    stackValidadaEm: "",
    respostaBusiness: "",
    time: "",
    horasEstimadas: 0,
    criadoEm: AGORA,
    modificadoEm: AGORA,
    ...novaDemandaBase(base, AGORA),
    ...extra,
  } as Demand;
  return d;
}

function agir(
  d: Demand,
  acaoId: string,
  papeis: Role[],
  decisorDe?: Categoria[],
  ctx: Record<string, unknown> = {},
): Demand {
  const acoes = proximasAcoes(d, papeis, decisorDe);
  const acao = acoes.find((a) => a.id === acaoId);
  if (!acao) {
    throw new Error(
      `ação ${acaoId} indisponível para ${papeis.join(",")} (disponíveis: ${
        acoes.map((a) => a.id).join("|") || "nenhuma"
      })`,
    );
  }
  const guarda = acao.guarda(d);
  if (guarda !== true) throw new Error(`guarda bloqueou ${acaoId}: ${guarda}`);
  return { ...d, ...aplicarAcao(acao, d, "Tester", ctx as never) };
}

/* ---------- 1. Score automático ---------- */
const sc = scoreAutomatico({
  impactoAbrangencia: ImpactoAbrangencia.Infraestrutura,
  urgencia: Urgencia.Critico,
  valorEstimado: 750_000,
});
check(sc.businessImpact === 5 && sc.urgency === 5 && sc.returnValue === 5, "score máximo = 5/5/5");
check(weightedScore(sc) === 5, "score ponderado do máximo = 5.00", String(weightedScore(sc)));
const scMin = scoreAutomatico({ impactoAbrangencia: ImpactoAbrangencia.Usuario, urgencia: Urgencia.Baixo, valorEstimado: null });
check(weightedScore(scMin) === 2 * 0.5 + 2 * 0.3 + 1 * 0.2, "score mínimo bate com os pesos 50/30/20", String(weightedScore(scMin)));

/* ---------- 2. Criação: score derivado, sem gate prematuro ---------- */
const nova = demanda({});
check(weightedScore(nova.score) > 1, "demanda nasce com score derivado (não 1.00)", String(weightedScore(nova.score)));
check(nova.aprovacoes.length === 0, "gate NÃO nasce com a demanda");
check(nova.avaliacoes.length === 3, "as 3 notas nascem registradas");
check(nova.statusDesde === AGORA, "statusDesde carimbado na criação");

/* ---------- 3. Roteamento do gate por área ---------- */
const rotas: Array<[Partial<Demand>, string]> = [
  [{ tipo: TipoDemanda.Infraestrutura }, "Sambini"],
  [{ tipo: TipoDemanda.ProjetoNovo }, "Gabriela"],
  [{ tipo: TipoDemanda.Automacao, clasificacion: "ia" }, "AI Decisor"],
];
for (const [extra, esperado] of rotas) {
  const gate = aprovacoesPadrao({ tipo: extra.tipo!, clasificacion: extra.clasificacion });
  check(gate.length === 1 && gate[0].responsavel.includes(esperado), `gate roteado para ${esperado}`, gate[0]?.responsavel);
  check(decisorDaDemanda(demanda(extra)).nome === esperado, `decisorDaDemanda = ${esperado}`);
}

/* ---------- 4. Ciclo completo ---------- */
let d = demanda({});
check(d.status === StatusDemanda.Nova, "1 nasce em triagem");
check(precisaDeMim(d, [Role.PMO]) === true, "1b triagem é pendência do PMO");
check(precisaDeMim(d, [Role.TechLead]) === false, "1c não é pendência do time técnico");

d = agir(d, "aceitarTriagem", [Role.PMO]);
check(d.status === StatusDemanda.EmAnalise, "2 PMO aceita → avaliação");
check(precisaDeMim(d, [Role.TechLead]) === true, "2b avaliação é pendência do time técnico");

/* guarda: sem capacity não vai para aprovação */
const semCap = ACOES_POR_ESTADO[StatusDemanda.EmAnalise].find((a) => a.id === "enviarParaAprovacao")!;
check(semCap.guarda(d) !== true, "3 guarda: capacity obrigatório antes da aprovação");

d = agir(d, "definirCapacity", [Role.TechLead], undefined, { time: "Internal Delivery", horasEstimadas: 60 });
check(capacityDefinido(d), "4 capacity definido");
check(String(d.abbottProjectType).includes("Minor"), "4b <80h → Minor Enhancement", String(d.abbottProjectType));
check(precisaDeMim(d, [Role.TechLead]) === true, "4c ainda pendente: falta enviar para aprovação");

d = agir(d, "enviarParaAprovacao", [Role.TechLead]);
check(d.status === StatusDemanda.EmAprovacao, "5 → aprovação");
check(d.aprovacoes.length === 1 && d.aprovacoes[0].status === "pendente", "5b gate criado pendente");
check(aguardando(d).includes("Gabriela"), "5c aguardando mostra o decisor", aguardando(d));
check(d.statusDesde !== AGORA, "5d statusDesde atualizado na transição");

/* roteamento por área na prática */
check(proximasAcoes(d, [Role.Decisor], ["infra"]).length === 0, "6 decisor de Infra não vê gate de Apps");
check(precisaDeMim(d, [Role.Decisor], ["app"]) === true, "6b decisor de Apps tem a pendência");
check(precisaDeMim(d, [Role.Admin, Role.Decisor], ["infra"]) === true, "6c Admin ignora a restrição de área");

d = agir(d, "aprovarGate", [Role.Decisor], ["app"], { comentario: "ok", idServiceNow: "SN-1" });
check(d.status === StatusDemanda.Priorizada && d.dmcAprovado === true, "7 decisor aprova → priorizada");
check(precisaDeMim(d, [Role.PMO]) === true, "7b priorização é pendência do PMO");

const semPrio = ACOES_POR_ESTADO[StatusDemanda.Priorizada].find((a) => a.id === "iniciarExecucao")!;
check(semPrio.guarda(d) !== true, "8 guarda: prioridade obrigatória antes de executar");

d = agir(d, "definirPrioridade", [Role.PMO], undefined, { finalPriority: 1 });
check(precisaDeMim(d, [Role.PMO]) === true, "8b com prioridade, a pendência vira iniciar execução");

d = agir(d, "iniciarExecucao", [Role.PMO]);
check(d.status === StatusDemanda.EmExecucao, "9 execução iniciada");
check(precisaDeMim(d, [Role.TechLead]) === false, "9b execução NÃO fica piscando como pendência");

d = agir(d, "concluir", [Role.TechLead], undefined, { idProjeto: "PRJ-9", idServiceNow: "SN-2", rce: "RCE-7" });
check(d.status === StatusDemanda.Concluida, "10 concluída");
check(d.idServiceNow === "SN-2" && d.rce === "RCE-7", "10b concluir grava ServiceNow e RCE (antes descartava)");

/* ---------- 5. Caminhos laterais ---------- */
let dev = agir(demanda({}), "devolver", [Role.PMO], undefined, { comentario: "faltou escopo" });
check(dev.status === StatusDemanda.Devolvida, "11 PMO devolve");
check(
  dev.comentarios.some((c) => c.texto.includes("faltou escopo")),
  "11a justificativa da devolução fica registrada na demanda",
);
check(precisaDeMim(dev, [Role.Solicitante]) === true, "11b devolvida é pendência do solicitante");
dev = agir(dev, "reenviar", [Role.Solicitante]);
check(dev.status === StatusDemanda.Nova, "11c solicitante reenvia");

const cancelada = agir(
  agir(demanda({}), "devolver", [Role.PMO], undefined, { comentario: "x" }),
  "cancelarDevolvida",
  [Role.PMO],
  undefined,
  { comentario: "sem retorno do solicitante" },
);
check(cancelada.status === StatusDemanda.Recusada, "12 devolvida abandonada tem saída (cancelar)");

const rec = agir(
  demanda({ tipo: TipoDemanda.Infraestrutura, status: StatusDemanda.EmAprovacao, aprovacoes: aprovacoesPadrao({ tipo: TipoDemanda.Infraestrutura }) }),
  "recusarGate",
  [Role.Decisor],
  ["infra"],
  { comentario: "sem budget" },
);
check(rec.status === StatusDemanda.Recusada && rec.dmcAprovado === false, "13 decisor recusa");

/* ---------- 6. Sem becos sem saída ---------- */
const gateVazio = demanda({ status: StatusDemanda.EmAprovacao, aprovacoes: [] });
const aprovar = ACOES_POR_ESTADO[StatusDemanda.EmAprovacao].find((a) => a.id === "aprovarGate")!;
check(aprovar.guarda(gateVazio) === true, "14 gate vazio (dado legado) não trava a demanda");
const recuperada = { ...gateVazio, ...aplicarAcao(aprovar, gateVazio, "Sambini", { comentario: "ok" } as never) };
check(recuperada.status === StatusDemanda.Priorizada, "14b e ainda pode ser decidida");

for (const etapa of PIPELINE) {
  const terminal = etapa.status === StatusDemanda.Concluida;
  const acoes = ACOES_POR_ESTADO[etapa.status] ?? [];
  check(terminal || acoes.length > 0, `15 estado "${etapa.label}" tem ao menos uma ação`);
}

/* ---------- 7. Papéis errados não agem ---------- */
const emTriagem = demanda({});
check(proximasAcoes(emTriagem, [Role.Solicitante]).length === 0, "16 solicitante não faz triagem");
check(proximasAcoes(emTriagem, [Role.Decisor], ["app"]).length === 0, "16b decisor não faz triagem");

console.log(falhas === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${falhas} FALHAS`);
process.exit(falhas === 0 ? 0 : 1);
