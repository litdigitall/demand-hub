/* ============================================================
   Gerador de relatório mensal em PPTX (pptxgenjs).
   Monta um deck apresentável com: capa, resumo executivo (KPIs),
   ideias inseridas no mês, projetos em desenvolvimento, backlog
   priorizado e capacity por time.
   ============================================================ */
import pptxgen from "pptxgenjs";
import {
  StatusDemanda,
  statusLabel,
  weightedScore,
  CAPACIDADE_PADRAO_HORAS,
  TIMES_IMPLANTACAO,
  type Demand,
} from "../data/types";

/* Paleta */
const NAVY = "0B2C5E";
const BLUE = "1E6FBF";
const ACCENT = "00A3E0";
const LIGHT = "F2F6FC";
const GRAY = "6B7280";
const WHITE = "FFFFFF";
const GREEN = "2F9E44";
const ORANGE = "E8590C";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function noMes(iso: string, ano: number, mes: number): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return d.getFullYear() === ano && d.getMonth() === mes;
}

export interface ReportStats {
  mesLabel: string;
  total: number;
  ideiasNoMes: number;
  emAvaliacao: number;
  emAprovacao: number;
  priorizadas: number;
  emExecucao: number;
  concluidas: number;
  recusadas: number;
}

/** Estatísticas para preview na tela (sem gerar o arquivo). */
export function computeReportStats(demands: Demand[], ref = new Date()): ReportStats {
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const by = (s: number) => demands.filter((d) => d.status === s).length;
  return {
    mesLabel: `${MESES[mes]} ${ano}`,
    total: demands.length,
    ideiasNoMes: demands.filter((d) => noMes(d.criadoEm, ano, mes)).length,
    emAvaliacao: by(StatusDemanda.EmAnalise),
    emAprovacao: by(StatusDemanda.EmAprovacao),
    priorizadas: by(StatusDemanda.Priorizada),
    emExecucao: by(StatusDemanda.EmExecucao),
    concluidas: by(StatusDemanda.Concluida),
    recusadas: by(StatusDemanda.Recusada),
  };
}

function header(slide: pptxgen.Slide, pptx: pptxgen, titulo: string, sub: string) {
  slide.background = { color: WHITE };
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: "100%", h: 0.9, fill: { color: NAVY } });
  slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0.9, w: "100%", h: 0.06, fill: { color: ACCENT } });
  slide.addText(titulo, { x: 0.5, y: 0.12, w: 9, h: 0.45, fontSize: 22, bold: true, color: WHITE });
  slide.addText(sub, { x: 0.5, y: 0.54, w: 9, h: 0.3, fontSize: 12, color: "C9D6EA" });
}

function kpiCard(
  slide: pptxgen.Slide,
  pptx: pptxgen,
  x: number,
  y: number,
  w: number,
  valor: string | number,
  rotulo: string,
  cor: string,
) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h: 1.25, rectRadius: 0.08,
    fill: { color: LIGHT }, line: { color: "E2E8F0", width: 1 },
  });
  slide.addText(String(valor), { x, y: y + 0.12, w, h: 0.6, fontSize: 32, bold: true, color: cor, align: "center" });
  slide.addText(rotulo, { x, y: y + 0.78, w, h: 0.35, fontSize: 11, color: GRAY, align: "center" });
}

/** Gera e baixa o PPTX do mês. */
export async function generateMonthlyReport(demands: Demand[], ref = new Date()): Promise<void> {
  const stats = computeReportStats(demands, ref);
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Demand Hub";
  pptx.company = "LIT Digitall";
  pptx.title = `Demand Hub — Relatório ${stats.mesLabel}`;

  /* ---------- Capa ---------- */
  const capa = pptx.addSlide();
  capa.background = { color: NAVY };
  capa.addShape(pptx.ShapeType.rect, { x: 0, y: 3.9, w: "100%", h: 0.08, fill: { color: ACCENT } });
  capa.addText("DEMAND HUB", { x: 0.6, y: 1.5, w: 11, h: 0.5, fontSize: 14, bold: true, color: ACCENT, charSpacing: 4 });
  capa.addText("Relatório Mensal de Demandas", { x: 0.6, y: 2.0, w: 11.5, h: 0.9, fontSize: 40, bold: true, color: WHITE });
  capa.addText(stats.mesLabel, { x: 0.6, y: 3.0, w: 11, h: 0.6, fontSize: 22, color: "C9D6EA" });
  capa.addText("LIT Digitall · Confidencial", { x: 0.6, y: 6.6, w: 11, h: 0.3, fontSize: 11, color: "8AA0C0" });

  /* ---------- Resumo executivo (KPIs) ---------- */
  const resumo = pptx.addSlide();
  header(resumo, pptx, "Resumo executivo", `Visão geral do funil de demandas — ${stats.mesLabel}`);
  const y1 = 1.4;
  const cardW = 2.55;
  const gap = 0.18;
  const xs = [0.5, 0.5 + (cardW + gap), 0.5 + 2 * (cardW + gap), 0.5 + 3 * (cardW + gap), 0.5 + 4 * (cardW + gap)];
  kpiCard(resumo, pptx, xs[0], y1, cardW, stats.ideiasNoMes, "Ideias inseridas no mês", BLUE);
  kpiCard(resumo, pptx, xs[1], y1, cardW, stats.emAvaliacao, "Em avaliação", ORANGE);
  kpiCard(resumo, pptx, xs[2], y1, cardW, stats.emAprovacao, "Em aprovação", ORANGE);
  kpiCard(resumo, pptx, xs[3], y1, cardW, stats.priorizadas, "Priorizadas", ACCENT);
  kpiCard(resumo, pptx, xs[4], y1, cardW, stats.emExecucao, "Em execução", GREEN);
  const y2 = y1 + 1.5;
  kpiCard(resumo, pptx, xs[0], y2, cardW, stats.concluidas, "Concluídas", GREEN);
  kpiCard(resumo, pptx, xs[1], y2, cardW, stats.recusadas, "Recusadas", "C92A2A");
  kpiCard(resumo, pptx, xs[2], y2, cardW, stats.total, "Total na base", NAVY);

  resumo.addText(
    "Funil: Ideias → Triagem → Avaliação (scoring) → Aprovação (Sponsor → Tech Lead → Diretor) → Priorização → Execução → Conclusão.",
    { x: 0.5, y: y2 + 1.6, w: 12.3, h: 0.5, fontSize: 12, italic: true, color: GRAY },
  );

  /* ---------- Ideias inseridas no mês ---------- */
  const ano = ref.getFullYear();
  const mes = ref.getMonth();
  const ideias = demands.filter((d) => noMes(d.criadoEm, ano, mes));
  addTableSlide(
    pptx,
    "Ideias inseridas no mês",
    `${ideias.length} nova(s) demanda(s) registrada(s) em ${stats.mesLabel}`,
    ["Nº", "Título", "Área", "Solicitante", "Status"],
    ideias.map((d) => [d.numero, d.titulo, d.areaSolicitante, d.solicitante, statusLabel[d.status]]),
    [1.1, 4.6, 2.4, 2.6, 1.7],
  );

  /* ---------- Projetos em desenvolvimento ---------- */
  const emExec = demands.filter((d) => d.status === StatusDemanda.EmExecucao);
  addTableSlide(
    pptx,
    "Projetos em desenvolvimento",
    `${emExec.length} projeto(s) em execução`,
    ["Nº", "Projeto", "Time", "Horas", "Estágio", "ServiceNow"],
    emExec.map((d) => [
      d.numero, d.titulo, d.time || "—",
      d.horasEstimadas ? `${d.horasEstimadas}h` : "—",
      d.projectStage || "—", d.idServiceNow || "—",
    ]),
    [1.0, 4.3, 2.1, 1.0, 1.6, 2.4],
  );

  /* ---------- Backlog priorizado ---------- */
  const priorizadas = demands
    .filter((d) => d.status === StatusDemanda.Priorizada)
    .sort((a, b) => (a.finalPriority ?? 999) - (b.finalPriority ?? 999));
  addTableSlide(
    pptx,
    "Backlog priorizado",
    `${priorizadas.length} demanda(s) aprovada(s) aguardando execução, por prioridade`,
    ["Prioridade", "Nº", "Título", "Score", "Time"],
    priorizadas.map((d) => [
      d.finalPriority != null ? `#${d.finalPriority}` : "—",
      d.numero, d.titulo, weightedScore(d.score).toFixed(2), d.time || "—",
    ]),
    [1.4, 1.1, 5.2, 1.4, 2.3],
  );

  /* ---------- Capacity por time ---------- */
  const cap = pptx.addSlide();
  header(cap, pptx, "Capacity por time", "Horas alocadas (demandas ativas) vs. capacidade mensal");
  const ativos = demands.filter(
    (d) => d.status === StatusDemanda.Priorizada || d.status === StatusDemanda.EmExecucao,
  );
  const capRows: pptxgen.TableRow[] = [
    headRow(["Time", "Capacidade", "Alocado", "Utilização"]),
  ];
  TIMES_IMPLANTACAO.forEach((time) => {
    const alocado = ativos.filter((d) => d.time === time).reduce((s, d) => s + (d.horasEstimadas || 0), 0);
    const capacidade = CAPACIDADE_PADRAO_HORAS[time];
    const util = capacidade ? Math.round((alocado / capacidade) * 100) : 0;
    capRows.push([
      cell(time, { bold: true }),
      cell(`${capacidade}h`),
      cell(`${alocado}h`),
      cell(`${util}%`, { color: util > 100 ? "C92A2A" : util > 80 ? ORANGE : GREEN, bold: true }),
    ]);
  });
  cap.addTable(capRows, {
    x: 0.5, y: 1.4, w: 12.3, colW: [4.5, 2.6, 2.6, 2.6],
    border: { type: "solid", color: "E2E8F0", pt: 1 },
    fontSize: 13, rowH: 0.5, valign: "middle",
  });
  cap.addText(
    "Utilização acima de 100% indica sobrealocação — repriorizar ou ajustar prazos.",
    { x: 0.5, y: 5.6, w: 12.3, h: 0.4, fontSize: 12, italic: true, color: GRAY },
  );

  const fileName = `Demand-Hub-${MESES[mes]}-${ano}.pptx`;
  await pptx.writeFile({ fileName });
}

/* ---------- helpers de tabela ---------- */
function headRow(labels: string[]): pptxgen.TableRow {
  return labels.map((l) => cell(l, { bold: true, color: WHITE, fill: NAVY }));
}
function cell(
  text: string,
  opts?: { bold?: boolean; color?: string; fill?: string },
): pptxgen.TableCell {
  return {
    text,
    options: {
      fontSize: 12,
      bold: opts?.bold,
      color: opts?.color ?? "1F2937",
      fill: opts?.fill ? { color: opts.fill } : undefined,
      valign: "middle",
    },
  };
}

function addTableSlide(
  pptx: pptxgen,
  titulo: string,
  sub: string,
  cols: string[],
  rows: string[][],
  colW: number[],
) {
  const slide = pptx.addSlide();
  header(slide, pptx, titulo, sub);
  if (rows.length === 0) {
    slide.addText("Nenhum item neste período.", {
      x: 0.5, y: 3, w: 12.3, h: 0.6, fontSize: 16, italic: true, color: GRAY, align: "center",
    });
    return;
  }
  const tableRows: pptxgen.TableRow[] = [headRow(cols)];
  rows.slice(0, 12).forEach((r, i) => {
    tableRows.push(
      r.map((c) => cell(c, { fill: i % 2 ? LIGHT : WHITE })),
    );
  });
  slide.addTable(tableRows, {
    x: 0.5, y: 1.4, w: 12.3, colW,
    border: { type: "solid", color: "E2E8F0", pt: 1 },
    rowH: 0.42, autoPage: false,
  });
  if (rows.length > 12) {
    slide.addText(`+ ${rows.length - 12} outros itens`, {
      x: 0.5, y: 7.0, w: 12.3, h: 0.3, fontSize: 10, italic: true, color: GRAY,
    });
  }
}
