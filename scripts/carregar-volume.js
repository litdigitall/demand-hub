/* ============================================================
   Carregar volume de avaliação — FERRAMENTA, NÃO FAZ PARTE DO APP.

   Para que serve: julgar densidade de tela. Com as 5 demandas de
   demonstração qualquer layout parece aceitável; o desperdício de
   espaço (e o comportamento de SLA, aging, capacidade e cabeçalho
   fixo) só aparece com volume.

   Como usar:
     1. abra o app e faça login
     2. F12 → Console
     3. cole o conteúdo deste arquivo e dê Enter
     4. a página recarrega sozinha com 48 demandas

   Para voltar ao estado original:
     localStorage.removeItem("demand-system.demands.v4"); location.reload();

   Não clona nada de fora: pega as próprias demandas-semente e varia
   status, área, quem pediu, datas, horas, prazo e urgência. Por isso
   a forma do objeto é sempre a real — nada de campo inventado.
   ============================================================ */
(() => {
  const CHAVE = "demand-system.demands.v4";
  const QUANTIDADE = 48;

  const base = JSON.parse(localStorage.getItem(CHAVE) || "[]");
  if (!base.length) {
    console.error(
      "Nenhuma demanda-semente encontrada. Faça login no app primeiro e rode de novo.",
    );
    return;
  }
  if (base.length >= QUANTIDADE) {
    console.warn(`Já existem ${base.length} demandas. Nada a fazer.`);
    return;
  }

  /* Distribuição proposital: a entrada é sempre a parte mais cheia do funil. */
  const STATUS = [
    506970000, 506970000, 506970000, // triagem
    506970001, 506970001, 506970001, // avaliação
    506970007, 506970007, // aprovação
    506970002, 506970002, // priorizada
    506970003, 506970003, // execução
    506970004, // concluída
    506970008, // devolvida
    506970005, // recusada
  ];
  const AREAS = [
    "Facilities", "Finance", "Human Resources", "IT", "Legal", "Marketing",
    "Production", "Quality", "Regulatory", "Sales", "Supply Chain",
  ];
  const PESSOAS = [
    "Ana Ribeiro", "Carlos Mendes", "Juliana Costa", "Roberto Almeida",
    "Patricia Lima", "Ana Beatriz Souza", "Marcelo Tavares", "Marina Alves",
  ];
  const ASSUNTOS = [
    "B2B ordering portal", "SAP x Salesforce integration", "OEE dashboard",
    "Month-end close automation", "Distribution centre switch refresh",
    "Quality inspection app", "Service desk copilot", "OT network segmentation",
    "File server migration", "Electronic contract signature",
    "Bank reconciliation bot", "Batch traceability", "IT service catalogue",
    "MFA for suppliers", "Regulatory deviation panel", "Delivery route optimisation",
    "Employee portal", "Immutable backup", "Commercial data lake",
    "Software licence management", "Cold room monitoring", "Purchase approval workflow",
    "Digital onboarding", "Automated ANVISA report", "Barcode scanner replacement",
    "Real-time stock API", "In-transit temperature alerts", "Quality deviation workflow",
    "Plant link upgrade", "Expense fraud detection", "Cloud contract consolidation",
    "Invoice automation", "Line capacity panel", "Training portal",
    "SOP search assistant", "Secure media disposal", "Payroll integration",
    "Checklist digitisation", "ML demand forecast", "Document reissue",
    "PPE management", "Production kiosk", "IT metrics centre", "LGPD purge routine",
  ];
  const SUFIXO = ["", " — Plant RJ", " — Plant SP", " (phase 2)", " — LATAM", " — pilot"];

  const dia = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return d.toISOString();
  };

  const saida = base.slice();
  for (let i = 0; i < QUANTIDADE - base.length; i++) {
    const n = base.length + i + 1;
    const status = STATUS[i % STATUS.length];
    /* Idades variadas: é isso que faz o SLA e o "parada há N dias" aparecerem. */
    const idade = [0, 1, 2, 3, 5, 8, 12, 18, 25, 34][i % 10];
    const d = JSON.parse(JSON.stringify(base[i % base.length]));
    const pessoa = PESSOAS[i % PESSOAS.length];

    d.id = `vol-${n}`;
    d.numero = `DEM-${String(n).padStart(4, "0")}`;
    d.titulo = ASSUNTOS[i % ASSUNTOS.length] + SUFIXO[i % SUFIXO.length];
    d.status = status;
    d.statusDesde = dia(-idade);
    d.dataSolicitacao = dia(-(idade + 3 + (i % 20)));
    d.criadoEm = d.dataSolicitacao;
    d.modificadoEm = d.statusDesde;
    d.areaSolicitante = AREAS[i % AREAS.length];
    d.solicitante = pessoa;
    d.email = `${pessoa.toLowerCase().replace(/\s+/g, ".")}@litdigitall.com.br`;
    d.horasEstimadas = [0, 0, 80, 120, 160, 240, 320, 400, 640][i % 9];
    d.deadline = i % 4 === 0 ? dia(12 - (i % 20)) : "";
    d.urgencia = [506970000, 506970001, 506970002, 506970003][i % 4];
    d.impactoAbrangencia = [1, 2, 3, 4][i % 4];
    d.valorEstimado = [null, 25000, 125000, 350000, 750000][i % 5];
    d.finalPriority = status === 506970002 ? (i % 7) + 1 : null;
    saida.push(d);
  }

  localStorage.setItem(CHAVE, JSON.stringify(saida));
  console.log(
    `%c${saida.length} demandas carregadas. Recarregando...`,
    "color:#0072BC;font-weight:bold",
  );
  location.reload();
})();
