/**
 * Seed-MockData.mjs
 * --------------------------------------------------------------------------
 * Popula a tabela ardx_demanda no Dataverse com 18 demandas ficticias.
 * Reusa o refresh token salvo em .dvauth.json.
 *
 * Uso:
 *   node Seed-MockData.mjs
 * --------------------------------------------------------------------------
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_FILE = path.join(__dirname, ".dvauth.json");

const rawAuth = (await fs.readFile(AUTH_FILE, "utf8")).replace(/^﻿/, "");
const auth = JSON.parse(rawAuth);
const ORG = auth.org_url.replace(/\/$/, "");
const API = `${ORG}/api/data/v9.2`;

// ---- 1. Refresh token ------------------------------------------------------
const tokenRes = await fetch(
  `https://login.microsoftonline.com/${auth.tenant}/oauth2/v2.0/token`,
  {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: auth.client_id,
      refresh_token: auth.refresh_token,
    }),
  },
);
const tok = await tokenRes.json();
if (!tok.access_token) {
  console.error("Falha no refresh token:", tok);
  process.exit(1);
}
console.log("Auth OK");

// Salva novo refresh token
if (tok.refresh_token) {
  auth.refresh_token = tok.refresh_token;
  await fs.writeFile(AUTH_FILE, JSON.stringify(auth, null, 2), "utf8");
}

const headers = {
  Authorization: `Bearer ${tok.access_token}`,
  "OData-MaxVersion": "4.0",
  "OData-Version": "4.0",
  Accept: "application/json",
  "Content-Type": "application/json",
  "If-None-Match": "null",
  Prefer: "return=representation",
};

// ---- 2. Enums (mesmos valores do schema-info.json) ------------------------
const T = {
  ProjetoNovo: 506970000,
  MelhoriaSistema: 506970001,
  CorrecaoBug: 506970002,
  Compliance: 506970003,
  Infraestrutura: 506970004,
  Seguranca: 506970005,
  Automacao: 506970006,
};
const I = { Alto: 506970000, Medio: 506970001, Baixo: 506970002 };
const U = { Critico: 506970000, Alto: 506970001, Medio: 506970002, Baixo: 506970003 };
const E = { Pequeno: 506970000, Medio: 506970001, Grande: 506970002 };
const S = {
  Nova: 506970000,
  EmAnalise: 506970001,
  Priorizada: 506970002,
  EmExecucao: 506970003,
  Concluida: 506970004,
  Recusada: 506970005,
};

const dAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
const dAhead = (n) =>
  new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// Helper: monta payload Dataverse
// Default team per demand type (English defaults)
const TIME_POR_TIPO = {
  [T.ProjetoNovo]: "External Delivery",
  [T.MelhoriaSistema]: "Internal Delivery",
  [T.CorrecaoBug]: "Support",
  [T.Compliance]: "Internal Delivery",
  [T.Infraestrutura]: "Support",
  [T.Seguranca]: "Internal Delivery",
  [T.Automacao]: "Internal Delivery",
};
const HORAS_POR_ESFORCO = {
  [E.Pequeno]: 80,
  [E.Medio]: 240,
  [E.Grande]: 640,
};

// Avatares fixos para o demo
const SPONSOR_NAMES = (s) => s || "Sponsor designado";
function aprovacoesFor(sponsor, status, idx) {
  const steps = [
    { nivel: "sponsor", responsavel: SPONSOR_NAMES(sponsor), status: "pendente", acaoEm: "", comentario: "" },
    { nivel: "techlead", responsavel: "Daniela Bastos (Tech Lead)", status: "pendente", acaoEm: "", comentario: "" },
    { nivel: "diretor", responsavel: "Marcelo Tavares (IT Director)", status: "pendente", acaoEm: "", comentario: "" },
  ];
  // Priorizada/EmExecucao/Concluida = 3 aprovados completos
  if ([S.Priorizada, S.EmExecucao, S.Concluida].includes(status)) {
    const agora = new Date();
    steps.forEach((s, i) => {
      const dt = new Date(agora.getTime() - (3 - i) * 86400000).toISOString();
      s.status = "aprovado";
      s.acaoEm = dt;
      s.comentario =
        i === 0
          ? "Sponsor aprovou — alinhado com OKRs do trimestre."
          : i === 1
            ? "Tech Lead validou arquitetura e estimativa."
            : "Approved by IT Director — moving to prioritization.";
    });
    return steps;
  }
  // Recusada: sponsor recusou
  if (status === S.Recusada) {
    steps[0].status = "recusado";
    steps[0].acaoEm = new Date().toISOString();
    steps[0].comentario = "Não alinhado com prioridades atuais.";
    return steps;
  }
  // EmAnalise: forço 3 padroes diferentes pra demo
  if (status === S.EmAnalise) {
    const r = idx % 3;
    if (r === 0) {
      steps[0].status = "aprovado";
      steps[0].acaoEm = new Date(Date.now() - 2 * 86400000).toISOString();
      steps[0].comentario = "Sponsor approved — moving to technical review.";
    } else if (r === 1) {
      steps[0].status = "aprovado";
      steps[0].acaoEm = new Date(Date.now() - 3 * 86400000).toISOString();
      steps[0].comentario = "Sponsor approved — moving to tech.";
      steps[1].status = "aprovado";
      steps[1].acaoEm = new Date(Date.now() - 86400000).toISOString();
      steps[1].comentario = "Tech Lead validated architecture — ready for IT Director decision.";
    }
    return steps;
  }
  if (status === S.Nova && idx % 2 === 0) {
    steps[0].status = "aprovado";
    steps[0].acaoEm = new Date(Date.now() - 86400000).toISOString();
    steps[0].comentario = "Sponsor approved.";
  }
  return steps;
}

function make({
  n,
  titulo,
  descricao,
  area,
  solicitante,
  email,
  telefone,
  diasAtras,
  problema,
  objetivo,
  processos,
  consequencia,
  tipo,
  impacto,
  tiposImpacto, // array de numeros 1..5
  valor,
  urgencia,
  deadline,
  sistemas,
  integracoes,
  requisitos,
  solucao,
  sponsor,
  donoProcesso,
  areasEnvolvidas,
  dadosSensiveis,
  impactaSeguranca,
  requerAuditoria,
  esforco,
  status,
  projectStage,
  finalPriority,
  score, // [b, r, t, rev, sf, st, urg]
  stackValidadaPor,
}) {
  return {
    ardx_titulo: titulo,
    ardx_numero: `DEM-${String(n).padStart(4, "0")}`,
    ardx_descricao: descricao,
    ardx_areasolicitante: area,
    ardx_solicitante: solicitante,
    ardx_email: email,
    ardx_telefone: telefone,
    ardx_datasolicitacao: dAgo(diasAtras),
    ardx_problemaresolve: problema,
    ardx_objetivoprincipal: objetivo,
    ardx_processosimpactados: processos,
    ardx_consequencianaoexecucao: consequencia,
    ardx_tipo: tipo,
    ardx_impactonivel: impacto,
    ardx_tiposimpacto: tiposImpacto.join(","),
    ardx_valorestimado: valor,
    ardx_urgencia: urgencia,
    ardx_deadline: deadline,
    ardx_sistemasenvolvidos: sistemas,
    ardx_integracoesnecessarias: integracoes,
    ardx_requisitosprincipais: requisitos,
    ardx_solucaoproposta: solucao,
    ardx_sponsor: sponsor,
    ardx_donoprocesso: donoProcesso,
    ardx_areasenvolvidas: areasEnvolvidas,
    ardx_dadossensiveis: dadosSensiveis,
    ardx_impactaseguranca: impactaSeguranca,
    ardx_requerauditoria: requerAuditoria,
    ardx_esforcoestimado: esforco,
    ardx_status: status,
    ardx_projectstage: projectStage,
    ardx_finalpriority: finalPriority,
    ardx_scorebusinessimpact: score[0],
    ardx_scorerisk: score[1],
    ardx_scoretechnical: score[2],
    ardx_scorerevenue: score[3],
    ardx_scorestrategic: score[4],
    ardx_scorestakeholder: score[5],
    ardx_scoreurgency: score[6],
    ardx_scoreflags: "",
    ardx_comentariosjson: "[]",
    ardx_anexosjson: "[]",
    ardx_avaliacoesjson: "[]",
    ardx_stackvalidadapor: stackValidadaPor || "",
    ardx_stackvalidadaem: stackValidadaPor ? dAgo(diasAtras - 2) : null,
    ardx_aprovacoesjson: JSON.stringify(aprovacoesFor(sponsor, status, n)),
    ardx_time: TIME_POR_TIPO[tipo] ?? "Support",
    ardx_horasestimadas: esforco ? HORAS_POR_ESFORCO[esforco] ?? 120 : 120,
    // Fluxo end-to-end: simula vários estágios baseado no status para demo
    ardx_respostabusiness:
      status === S.Nova
        ? ""
        : `Business validou a demanda. Alinhamento confirmado com OKRs ${
            new Date().getFullYear()
          } da área ${area}.`,
    ardx_dmcaprovado:
      status === S.Recusada
        ? false
        : [S.EmExecucao, S.Concluida, S.Priorizada].includes(status)
          ? true
          : null,
    ardx_dmcdata: [S.EmExecucao, S.Concluida, S.Priorizada, S.Recusada].includes(status)
      ? dAgo(Math.max(1, diasAtras - 5))
      : null,
    ardx_dmccomentario:
      status === S.Recusada
        ? "DMC entendeu que não há janela no portfólio para o trimestre."
        : [S.EmExecucao, S.Concluida, S.Priorizada].includes(status)
          ? "DMC aprovou. Liberar verba e abrir projeto."
          : "",
    ardx_idservicenow:
      [S.EmExecucao, S.Concluida, S.Priorizada, S.EmAnalise].includes(status)
        ? `INC${String(7800000 + n * 13).padStart(7, "0")}`
        : "",
    ardx_idprojeto:
      [S.EmExecucao, S.Concluida].includes(status)
        ? `PRJ-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`
        : "",
  };
}

// ---- 3. 18 fictional demands (English defaults) ---------------------------
const items = [
  make({
    n: 1,
    titulo: "Self-service portal for partners",
    descricao:
      "Build a web portal so business partners can check orders, invoices and SLAs without opening a ticket.",
    area: "Sales",
    solicitante: "Mariana Ferreira",
    email: "mariana.ferreira@abbott.com",
    telefone: "+55 (11) 98888-1234",
    diasAtras: 45,
    problema:
      "Partners currently call the Service Desk for basic queries, generating 60+ tickets/day.",
    objetivo: "Reduce operational query tickets by 70%.",
    processos: "Service Desk, Sales, Billing",
    consequencia: "Growing partner base increases Service Desk load and op cost.",
    tipo: T.ProjetoNovo,
    impacto: I.Alto,
    tiposImpacto: [2, 5],
    valor: 850000,
    urgencia: U.Alto,
    deadline: dAhead(120),
    sistemas: "SAP, Salesforce, new Web Portal",
    integracoes: "SAP via API, SSO via Azure AD",
    requisitos: "Multi-tenant, SSO access, 24-month historical lookup, Excel export.",
    solucao: "Yes - React + .NET on Azure App Service.",
    sponsor: "Carlos Mendes",
    donoProcesso: "Mariana Ferreira",
    areasEnvolvidas: "Sales, IT, Service Desk",
    dadosSensiveis: true,
    impactaSeguranca: true,
    requerAuditoria: false,
    esforco: E.Grande,
    status: S.Priorizada,
    projectStage: "Build",
    finalPriority: 1,
    score: [5, 4, 3, 4, 5, 4, 3],
    stackValidadaPor: "Eduardo Lima (Architect)",
  }),
  make({
    n: 2,
    titulo: "Monthly accounting close automation",
    descricao: "Reduce manual close work via RPA on reconciliations.",
    area: "Finance",
    solicitante: "Pedro Henrique Santos",
    email: "pedro.santos@abbott.com",
    telefone: "+55 (11) 97777-5678",
    diasAtras: 60,
    problema: "Team spends 4 business days on manual reconciliation.",
    objetivo: "Cut close time from 5 to 2 business days.",
    processos: "Accounting, Controllership, Audit",
    consequencia: "Risk of tax fine in case of SPED delay.",
    tipo: T.Automacao,
    impacto: I.Alto,
    tiposImpacto: [3, 4, 2],
    valor: 320000,
    urgencia: U.Alto,
    deadline: dAhead(60),
    sistemas: "SAP, Power Automate, Power Apps",
    integracoes: "SAP OData",
    requisitos: "Automated reconciliation, audit log, multi-level approval.",
    solucao: "Yes - Power Apps + Dataverse + Power Automate (PoC done).",
    sponsor: "Roberto Almeida",
    donoProcesso: "Pedro Henrique Santos",
    areasEnvolvidas: "Finance, IT",
    dadosSensiveis: true,
    impactaSeguranca: false,
    requerAuditoria: true,
    esforco: E.Medio,
    status: S.EmExecucao,
    projectStage: "UAT",
    finalPriority: 2,
    score: [4, 5, 2, 3, 4, 4, 5],
    stackValidadaPor: "Daniela Bastos (Tech Lead)",
  }),
  make({
    n: 3,
    titulo: "Time-clock system update (compliance)",
    descricao: "Adapt the system to MTE Ordinance 671 changes.",
    area: "Human Resources",
    solicitante: "Camila Rocha",
    email: "camila.rocha@abbott.com",
    telefone: "+55 (11) 96666-3456",
    diasAtras: 20,
    problema: "Current system fails Ordinance 671 - tax risk.",
    objetivo: "Meet 100% of MTE regulatory requirements.",
    processos: "HR, Payroll, Compliance",
    consequencia: "Fines for regulatory non-compliance.",
    tipo: T.Compliance,
    impacto: I.Alto,
    tiposImpacto: [4],
    valor: 120000,
    urgencia: U.Critico,
    deadline: dAhead(30),
    sistemas: "Time-clock (vendor), SAP HR",
    integracoes: "Vendor update + SAP integration",
    requisitos: "Ordinance 671 / AFD Law compliance.",
    solucao: "Yes - contract the vendor update.",
    sponsor: "Patricia Lima",
    donoProcesso: "Camila Rocha",
    areasEnvolvidas: "HR, Legal, IT",
    dadosSensiveis: true,
    impactaSeguranca: false,
    requerAuditoria: true,
    esforco: E.Pequeno,
    status: S.Priorizada,
    projectStage: "Discovery",
    finalPriority: 3,
    score: [4, 5, 1, 1, 3, 4, 5],
    stackValidadaPor: "",
  }),
  make({
    n: 4,
    titulo: "Executive Sales dashboard (Power BI)",
    descricao: "Consolidated sales panel by region, product and channel.",
    area: "Sales",
    solicitante: "Ricardo Pereira",
    email: "ricardo.pereira@abbott.com",
    telefone: "+55 (11) 95555-7890",
    diasAtras: 15,
    problema: "Leadership lacks real-time funnel visibility.",
    objetivo: "D-1 executive sales view.",
    processos: "Sales, Finance, Leadership",
    consequencia: "Continued reliance on Excel via e-mail.",
    tipo: T.MelhoriaSistema,
    impacto: I.Medio,
    tiposImpacto: [3, 1],
    valor: 80000,
    urgencia: U.Medio,
    deadline: dAhead(45),
    sistemas: "SAP, Power BI, Excel",
    integracoes: "Power BI Gateway",
    requisitos: "Region drill-down, product filter.",
    solucao: "Yes - Power BI Premium.",
    sponsor: "Carlos Mendes",
    donoProcesso: "Ricardo Pereira",
    areasEnvolvidas: "Sales, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Pequeno,
    status: S.EmAnalise,
    projectStage: "Discovery",
    finalPriority: 4,
    score: [3, 2, 1, 4, 3, 3, 1],
    stackValidadaPor: "",
  }),
  make({
    n: 5,
    titulo: "Bug: NF generation on inter-branch transfers",
    descricao: "Transfers generate wrong CFOP, requiring manual re-issue.",
    area: "Finance",
    solicitante: "Renata Almeida",
    email: "renata.almeida@abbott.com",
    telefone: "+55 (11) 94444-1122",
    diasAtras: 10,
    problema: "5+ wrong NFs per week - tax rework.",
    objetivo: "Zero incorrect CFOPs on transfers.",
    processos: "Tax, Logistics",
    consequencia: "Ongoing rework + tax assessment risk.",
    tipo: T.CorrecaoBug,
    impacto: I.Medio,
    tiposImpacto: [4, 3],
    valor: 15000,
    urgencia: U.Alto,
    deadline: dAhead(15),
    sistemas: "SAP, NFe",
    integracoes: "-",
    requisitos: "CFOP table updated per operation type.",
    solucao: "Yes - fix in the SAP Z* customization.",
    sponsor: "Roberto Almeida",
    donoProcesso: "Renata Almeida",
    areasEnvolvidas: "Tax, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: true,
    esforco: E.Pequeno,
    status: S.EmExecucao,
    projectStage: "Build",
    finalPriority: 5,
    score: [3, 4, 2, 1, 2, 3, 4],
    stackValidadaPor: "Daniela Bastos (Tech Lead)",
  }),
  make({
    n: 6,
    titulo: "MFA mandatory for critical systems",
    descricao: "Roll out 2nd factor (MS Authenticator) on SAP, Salesforce and VPN.",
    area: "IT",
    solicitante: "Eduardo Lima",
    email: "eduardo.lima@abbott.com",
    telefone: "+55 (11) 93333-4455",
    diasAtras: 7,
    problema: "Audit flagged credential leak risk.",
    objetivo: "Reduce access breach risk.",
    processos: "All employees",
    consequencia: "Financial and reputation exposure in case of incident.",
    tipo: T.Seguranca,
    impacto: I.Alto,
    tiposImpacto: [4],
    valor: 200000,
    urgencia: U.Alto,
    deadline: dAhead(75),
    sistemas: "Azure AD, SAP, Salesforce, GlobalProtect",
    integracoes: "Conditional Access policies",
    requisitos: "100% user coverage, controlled exceptions.",
    solucao: "Yes - Conditional Access + MS Authenticator.",
    sponsor: "Marcelo Tavares",
    donoProcesso: "Eduardo Lima",
    areasEnvolvidas: "IT, Security, HR",
    dadosSensiveis: false,
    impactaSeguranca: true,
    requerAuditoria: true,
    esforco: E.Medio,
    status: S.Priorizada,
    projectStage: "Discovery",
    finalPriority: 6,
    score: [4, 5, 2, 1, 4, 3, 5],
    stackValidadaPor: "Eduardo Lima (Architect)",
  }),
  make({
    n: 7,
    titulo: "Adobe Creative licenses renewal",
    descricao: "Renegotiate and renew the Adobe pack for Marketing.",
    area: "Marketing",
    solicitante: "Beatriz Carvalho",
    email: "beatriz.carvalho@abbott.com",
    telefone: "+55 (11) 92222-9988",
    diasAtras: 5,
    problema: "Licenses expire in 90 days.",
    objetivo: "Keep the team productive.",
    processos: "Marketing",
    consequencia: "Creative activities interrupted.",
    tipo: T.Infraestrutura,
    impacto: I.Baixo,
    tiposImpacto: [3],
    valor: 90000,
    urgencia: U.Medio,
    deadline: dAhead(90),
    sistemas: "Adobe Cloud",
    integracoes: "SSO",
    requisitos: "12 full licenses.",
    solucao: "No - pending vendor quote.",
    sponsor: "Juliana Costa",
    donoProcesso: "Beatriz Carvalho",
    areasEnvolvidas: "Marketing, Procurement",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Pequeno,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 7,
    score: [2, 2, 1, 1, 2, 2, 1],
    stackValidadaPor: "",
  }),
  make({
    n: 8,
    titulo: "Rewrite of sales-rep tablet ordering app",
    descricao: "Current app is a 2017 Cordova build - offline mode breaks.",
    area: "Sales",
    solicitante: "Fabio Nascimento",
    email: "fabio.nascimento@abbott.com",
    telefone: "+55 (11) 91111-2233",
    diasAtras: 30,
    problema: "Reps lose orders when connectivity drops.",
    objetivo: "Offline-first app with robust sync.",
    processos: "Sales, Logistics, Billing",
    consequencia: "Ongoing revenue loss from unsent orders.",
    tipo: T.MelhoriaSistema,
    impacto: I.Alto,
    tiposImpacto: [1, 3],
    valor: 600000,
    urgencia: U.Alto,
    deadline: dAhead(180),
    sistemas: "SAP, Mobile App, API Gateway",
    integracoes: "SAP OData, Push notifications",
    requisitos: "Offline-first, incremental sync, iOS and Android.",
    solucao: "Yes - React Native + local SQLite.",
    sponsor: "Carlos Mendes",
    donoProcesso: "Fabio Nascimento",
    areasEnvolvidas: "Sales, IT, Logistics",
    dadosSensiveis: true,
    impactaSeguranca: true,
    requerAuditoria: false,
    esforco: E.Grande,
    status: S.EmAnalise,
    projectStage: "Discovery",
    finalPriority: 8,
    score: [5, 3, 4, 5, 4, 4, 3],
    stackValidadaPor: "",
  }),
  make({
    n: 9,
    titulo: "Personal data mapping (RoPA / LGPD)",
    descricao: "Survey and map personal data processing activities.",
    area: "Legal",
    solicitante: "Mauro Rangel",
    email: "mauro.rangel@abbott.com",
    telefone: "+55 (11) 90000-1111",
    diasAtras: 12,
    problema: "RoPA 18 months out of date; audit flagged it.",
    objetivo: "Update RoPA per LGPD art. 37.",
    processos: "All areas",
    consequencia: "Risk of ANPD sanction.",
    tipo: T.Compliance,
    impacto: I.Alto,
    tiposImpacto: [4],
    valor: 0,
    urgencia: U.Critico,
    deadline: dAhead(45),
    sistemas: "Governance platform (to be contracted)",
    integracoes: "No",
    requisitos: "Mapping by process, legal basis, flows.",
    solucao: "Yes - OneTrust or similar.",
    sponsor: "Patricia Lima",
    donoProcesso: "Mauro Rangel",
    areasEnvolvidas: "Legal, IT, Security",
    dadosSensiveis: true,
    impactaSeguranca: true,
    requerAuditoria: true,
    esforco: E.Medio,
    status: S.EmAnalise,
    projectStage: "Discovery",
    finalPriority: 9,
    score: [4, 5, 2, 1, 4, 3, 5],
    stackValidadaPor: "",
  }),
  make({
    n: 10,
    titulo: "Improve ERP performance during monthly close",
    descricao: "MM reports stall from 12:00-14:00 during close.",
    area: "Supply Chain",
    solicitante: "Ronaldo Pinto",
    email: "ronaldo.pinto@abbott.com",
    telefone: "+55 (11) 98765-4321",
    diasAtras: 40,
    problema: "Latency impacts 80 daily users.",
    objetivo: "Cut average latency by 60%.",
    processos: "Supply Chain, Procurement, Logistics",
    consequencia: "Team loses 2h/day during close.",
    tipo: T.Infraestrutura,
    impacto: I.Medio,
    tiposImpacto: [3],
    valor: 250000,
    urgencia: U.Medio,
    deadline: dAhead(100),
    sistemas: "SAP, HANA, Solman",
    integracoes: "-",
    requisitos: "Profiling + index tuning + capacity plan.",
    solucao: "Yes - engagement with BC and Basis.",
    sponsor: "Roberto Almeida",
    donoProcesso: "Ronaldo Pinto",
    areasEnvolvidas: "Supply Chain, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Medio,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 10,
    score: [3, 3, 4, 2, 3, 3, 2],
    stackValidadaPor: "",
  }),
  make({
    n: 11,
    titulo: "Official WhatsApp for Service Desk",
    descricao: "Roll out WhatsApp Business API integrated to Service Desk.",
    area: "Marketing",
    solicitante: "Tatiana Almeida",
    email: "tatiana.almeida@abbott.com",
    telefone: "+55 (11) 96543-8722",
    diasAtras: 8,
    problema: "Customers want service via WhatsApp.",
    objetivo: "Add a WhatsApp channel to the Service Desk.",
    processos: "Service Desk, Marketing",
    consequencia: "Competitors already have it - we lose NPS.",
    tipo: T.ProjetoNovo,
    impacto: I.Medio,
    tiposImpacto: [5],
    valor: 180000,
    urgencia: U.Medio,
    deadline: dAhead(120),
    sistemas: "Zendesk, WhatsApp Business API",
    integracoes: "Twilio or 360dialog connector",
    requisitos: "Approved templates, initial bot flow.",
    solucao: "Yes - Twilio + Zendesk Talk.",
    sponsor: "Juliana Costa",
    donoProcesso: "Tatiana Almeida",
    areasEnvolvidas: "Marketing, Service Desk, IT",
    dadosSensiveis: true,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Medio,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 11,
    score: [3, 2, 2, 3, 4, 3, 2],
    stackValidadaPor: "",
  }),
  make({
    n: 12,
    titulo: "File server migration to SharePoint Online",
    descricao: "Move 4TB out of the on-prem file server to SharePoint Online.",
    area: "IT",
    solicitante: "Daniela Bastos",
    email: "daniela.bastos@abbott.com",
    telefone: "+55 (11) 95432-9876",
    diasAtras: 60,
    problema: "Hardware end-of-life; no off-site backup.",
    objetivo: "Eliminate file-server dependency.",
    processos: "All",
    consequencia: "Risk of data loss.",
    tipo: T.Infraestrutura,
    impacto: I.Alto,
    tiposImpacto: [4, 3],
    valor: 220000,
    urgencia: U.Alto,
    deadline: dAhead(150),
    sistemas: "File Server, SharePoint Online, Migration Manager",
    integracoes: "AD sync, permissions",
    requisitos: "Preserve NTFS permissions, incremental sync.",
    solucao: "Yes - Microsoft Migration Manager.",
    sponsor: "Marcelo Tavares",
    donoProcesso: "Daniela Bastos",
    areasEnvolvidas: "IT",
    dadosSensiveis: true,
    impactaSeguranca: true,
    requerAuditoria: false,
    esforco: E.Medio,
    status: S.EmExecucao,
    projectStage: "Build",
    finalPriority: 12,
    score: [4, 4, 3, 1, 4, 3, 3],
    stackValidadaPor: "Daniela Bastos (Tech Lead)",
  }),
  make({
    n: 13,
    titulo: "Automated RNDS validation (Digital Health)",
    descricao: "Integrate with RNDS for automated clinical-event submission.",
    area: "Regulatory",
    solicitante: "Claudio Berto",
    email: "claudio.berto@abbott.com",
    telefone: "+55 (11) 94321-7654",
    diasAtras: 25,
    problema: "Manual event submission to Conecte SUS - recurring delays.",
    objetivo: "Automated RNDS conformance.",
    processos: "Regulatory, IT",
    consequencia: "ANVISA sanctions.",
    tipo: T.Compliance,
    impacto: I.Alto,
    tiposImpacto: [4],
    valor: 350000,
    urgencia: U.Alto,
    deadline: dAhead(90),
    sistemas: "Internal regulatory system, RNDS",
    integracoes: "FHIR API",
    requisitos: "FHIR R4 standard, ICP-Brasil digital certificate.",
    solucao: "Yes - FHIR middleware.",
    sponsor: "Patricia Lima",
    donoProcesso: "Claudio Berto",
    areasEnvolvidas: "Regulatory, IT, Legal",
    dadosSensiveis: true,
    impactaSeguranca: true,
    requerAuditoria: true,
    esforco: E.Grande,
    status: S.EmAnalise,
    projectStage: "Discovery",
    finalPriority: 13,
    score: [4, 5, 4, 2, 3, 3, 5],
    stackValidadaPor: "",
  }),
  make({
    n: 14,
    titulo: "Corporate training calendar",
    descricao: "Single portal to sign up for internal trainings.",
    area: "Human Resources",
    solicitante: "Sonia Camargo",
    email: "sonia.camargo@abbott.com",
    telefone: "+55 (11) 93210-6543",
    diasAtras: 18,
    problema: "Trainings are announced by email; low reach.",
    objetivo: "Increase enrollment in internal trainings.",
    processos: "HR, trained areas",
    consequencia: "Continued low adoption.",
    tipo: T.ProjetoNovo,
    impacto: I.Baixo,
    tiposImpacto: [3],
    valor: 60000,
    urgencia: U.Baixo,
    deadline: dAhead(180),
    sistemas: "SharePoint, Power Apps",
    integracoes: "AD for login",
    requisitos: "Enrollment, waitlist, reports.",
    solucao: "Yes - Power Apps + SharePoint List.",
    sponsor: "Patricia Lima",
    donoProcesso: "Sonia Camargo",
    areasEnvolvidas: "HR, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Pequeno,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 14,
    score: [2, 1, 1, 1, 2, 2, 1],
    stackValidadaPor: "",
  }),
  make({
    n: 15,
    titulo: "Corporate ESG dashboard",
    descricao: "Centralize ESG indicators on one panel.",
    area: "Legal",
    solicitante: "Renan Vasques",
    email: "renan.vasques@abbott.com",
    telefone: "+55 (11) 92109-5432",
    diasAtras: 35,
    problema: "Indicators are scattered; annual reports take long.",
    objetivo: "Monthly ESG dashboard.",
    processos: "Legal, HR, Operations",
    consequencia: "Annual report takes 3 months.",
    tipo: T.ProjetoNovo,
    impacto: I.Medio,
    tiposImpacto: [4, 3],
    valor: 140000,
    urgencia: U.Medio,
    deadline: dAhead(150),
    sistemas: "Power BI, SAP, SharePoint",
    integracoes: "Power BI gateway",
    requisitos: "GRI indicators, PDF export.",
    solucao: "Yes - Power BI Premium.",
    sponsor: "Juliana Costa",
    donoProcesso: "Renan Vasques",
    areasEnvolvidas: "Legal, HR, Sustainability",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: true,
    esforco: E.Medio,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 15,
    score: [3, 2, 2, 2, 4, 3, 2],
    stackValidadaPor: "",
  }),
  make({
    n: 16,
    titulo: "Reduce printer failures on the shop floor",
    descricao: "Label printers freeze multiple times per week.",
    area: "Production",
    solicitante: "Anderson Cruz",
    email: "anderson.cruz@abbott.com",
    telefone: "+55 (11) 91098-4321",
    diasAtras: 3,
    problema: "Line stops 20-30 min per label failure.",
    objetivo: "Eliminate freezes.",
    processos: "Production, Logistics",
    consequencia: "Daily OEE loss.",
    tipo: T.CorrecaoBug,
    impacto: I.Medio,
    tiposImpacto: [3],
    valor: 35000,
    urgencia: U.Alto,
    deadline: dAhead(20),
    sistemas: "MES, Zebra Designer, Windows",
    integracoes: "-",
    requisitos: "Driver replacement / update.",
    solucao: "Under review.",
    sponsor: "Roberto Almeida",
    donoProcesso: "Anderson Cruz",
    areasEnvolvidas: "Production, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Pequeno,
    status: S.EmAnalise,
    projectStage: "Discovery",
    finalPriority: 16,
    score: [2, 3, 2, 1, 1, 2, 3],
    stackValidadaPor: "",
  }),
  make({
    n: 17,
    titulo: "Supplier evaluation app (NPS)",
    descricao: "Quick supplier rating after goods receipt.",
    area: "Supply Chain",
    solicitante: "Marina Yamada",
    email: "marina.yamada@abbott.com",
    telefone: "+55 (11) 90987-3210",
    diasAtras: 50,
    problema: "No structured supplier evaluation base.",
    objetivo: "Consolidated ratings for SRM.",
    processos: "Supply Chain, Quality",
    consequencia: "Continued reliance on scattered spreadsheets.",
    tipo: T.Automacao,
    impacto: I.Baixo,
    tiposImpacto: [3],
    valor: 80000,
    urgencia: U.Baixo,
    deadline: dAhead(180),
    sistemas: "Power Apps, SAP MM",
    integracoes: "-",
    requisitos: "1-5 rating, comment, history.",
    solucao: "Yes - Power Apps + SAP integration.",
    sponsor: "Roberto Almeida",
    donoProcesso: "Marina Yamada",
    areasEnvolvidas: "Supply Chain, Quality, IT",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Pequeno,
    status: S.Recusada,
    projectStage: "Discovery",
    finalPriority: null,
    score: [2, 1, 1, 1, 2, 2, 1],
    stackValidadaPor: "",
  }),
  make({
    n: 18,
    titulo: "Internal chatbot for HR questions",
    descricao: "Teams chatbot answers vacation, benefits and policy questions.",
    area: "Human Resources",
    solicitante: "Igor Pacheco",
    email: "igor.pacheco@abbott.com",
    telefone: "+55 (11) 99876-2109",
    diasAtras: 2,
    problema: "HR gets 200+ basic tickets per week.",
    objetivo: "Reduce basic tickets by 60%.",
    processos: "HR",
    consequencia: "HR team consumes time with FAQ.",
    tipo: T.Automacao,
    impacto: I.Medio,
    tiposImpacto: [3, 5],
    valor: 110000,
    urgencia: U.Medio,
    deadline: dAhead(120),
    sistemas: "Microsoft Copilot Studio, Teams",
    integracoes: "HR Workday via Graph API",
    requisitos: "English & Portuguese, corporate FAQ, human handoff.",
    solucao: "Yes - Copilot Studio.",
    sponsor: "Patricia Lima",
    donoProcesso: "Igor Pacheco",
    areasEnvolvidas: "HR, IT",
    dadosSensiveis: true,
    impactaSeguranca: false,
    requerAuditoria: false,
    esforco: E.Medio,
    status: S.Nova,
    projectStage: "Discovery",
    finalPriority: 17,
    score: [3, 2, 3, 1, 4, 3, 2],
    stackValidadaPor: "",
  }),
];


// ---- 4. (opcional) Reset: apaga todas as demandas existentes -------------
if (process.argv.includes("--reset")) {
  console.log("Apagando demandas existentes...");
  let nextLink = `${API}/ardx_demandas?$select=ardx_demandaid&$top=5000`;
  const ids = [];
  while (nextLink) {
    const r = await fetch(nextLink, { headers });
    const page = await r.json();
    if (page.value) ids.push(...page.value.map((x) => x.ardx_demandaid));
    nextLink = page["@odata.nextLink"] || null;
  }
  console.log(`  ${ids.length} para apagar`);
  for (const id of ids) {
    await fetch(`${API}/ardx_demandas(${id})`, { method: "DELETE", headers });
  }
  console.log(`  ${ids.length} apagadas`);
}

// ---- 5. POST loop ---------------------------------------------------------
let ok = 0;
let fail = 0;
const fails = [];

console.log(`Criando ${items.length} demandas...`);
for (let i = 0; i < items.length; i++) {
  const it = items[i];
  try {
    const r = await fetch(`${API}/ardx_demandas`, {
      method: "POST",
      headers,
      body: JSON.stringify(it),
    });
    if (!r.ok) {
      const text = await r.text();
      let msg = text;
      try {
        const j = JSON.parse(text);
        msg = j.error?.message ?? text;
      } catch {
        /* keep text */
      }
      throw new Error(`HTTP ${r.status}: ${msg.slice(0, 200)}`);
    }
    ok++;
    console.log(`  + ${it.ardx_numero}  ${it.ardx_titulo.slice(0, 50)}`);
  } catch (e) {
    fail++;
    fails.push({ numero: it.ardx_numero, error: e.message });
    console.log(`  ! ${it.ardx_numero}  FALHA: ${e.message}`);
  }
}

console.log(`\nResultado: ${ok} criadas, ${fail} falhas`);
if (fails.length) console.log("Falhas:", fails);
