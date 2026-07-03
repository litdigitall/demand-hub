/* ============================================================
   Integração ServiceNow (CAMADA DE INTEGRAÇÃO — SIMULADA).

   Este módulo isola TODA a comunicação com o ServiceNow. Hoje as
   funções retornam dados simulados; na versão produtiva, cada uma
   vira uma chamada REST real (Table API / Scripted REST) — o resto
   do app não muda, pois consome apenas esta interface.

   Direção dos dados:
     IN  (ServiceNow → Demand Hub): disponibilidade de FTE / capacity.
     OUT (Demand Hub → ServiceNow): projeto aprovado (RCE, PRJ#, estado).
     SYNC: estado do projeto/demanda.
   ============================================================ */
import {
  CAPACIDADE_PADRAO_HORAS,
  TIMES_IMPLANTACAO,
  statusLabel,
  type Demand,
  type TimeImplantacao,
} from "../data/types";

/* ---------------- Configuração da conexão ------------------ */
export interface ServiceNowConfig {
  /** URL da instância (ex.: https://abbott.service-now.com). */
  instanceUrl: string;
  /** Tabela de recursos/FTE consumida para capacity. */
  fteTable: string;
  /** Tabela de projetos onde a demanda aprovada é publicada. */
  projectTable: string;
  /** Em produção: true quando as credenciais/OAuth estão configuradas. */
  connected: boolean;
}

export const serviceNowConfig: ServiceNowConfig = {
  instanceUrl: "https://abbott.service-now.com",
  fteTable: "resource_allocation",
  projectTable: "pm_project",
  connected: false, // demo: conexão simulada
};

/* ---------------- Tipos de payload ------------------------- */
export interface FteAvailability {
  time: TimeImplantacao;
  /** FTE alocados no ServiceNow. */
  fteAlocado: number;
  /** Capacidade total (horas/mês) do time. */
  capacidadeHoras: number;
  /** Horas já comprometidas segundo o ServiceNow. */
  horasComprometidas: number;
}

export interface PushResult {
  ok: boolean;
  /** Nº do registro criado/atualizado no ServiceNow. */
  ticket: string;
  mensagem: string;
}

/* ---------------- Helpers de simulação --------------------- */
function delay<T>(v: T, ms = 700): Promise<T> {
  return new Promise((res) => setTimeout(() => res(v), ms));
}
/* Determinístico a partir de uma string (evita Math.random). */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/* ============================================================
   IN — disponibilidade de FTE / capacity
   Produção:
     GET {instanceUrl}/api/now/table/{fteTable}?sysparm_query=...
   ============================================================ */
export async function getFteAvailability(): Promise<FteAvailability[]> {
  const data = TIMES_IMPLANTACAO.map((time) => {
    const capacidadeHoras = CAPACIDADE_PADRAO_HORAS[time];
    // simulação estável: 55–85% de comprometimento
    const pct = 55 + (hash(time) % 30);
    const horasComprometidas = Math.round((capacidadeHoras * pct) / 100);
    const fteAlocado = Math.round((horasComprometidas / 160) * 10) / 10;
    return { time, fteAlocado, capacidadeHoras, horasComprometidas };
  });
  return delay(data);
}

/* ============================================================
   OUT — publica a demanda aprovada como projeto no ServiceNow
   Produção:
     POST {instanceUrl}/api/now/table/{projectTable}
     body: { short_description, u_rce, u_app_id, u_score, state, ... }
   ============================================================ */
export async function pushDemand(d: Demand): Promise<PushResult> {
  if (!d.rce) {
    return delay({
      ok: false,
      ticket: "",
      mensagem: "RCE ausente — obrigatório para publicar no ServiceNow.",
    });
  }
  const ticket = `PRJ${String(hash(d.id) % 9000000 + 1000000)}`;
  return delay({
    ok: true,
    ticket,
    mensagem: `Proyecto ${ticket} creado/actualizado en ServiceNow (${d.numero}).`,
  });
}

/* ============================================================
   SYNC — lê o estado atual do projeto no ServiceNow
   Produção:
     GET {instanceUrl}/api/now/table/{projectTable}/{sys_id}
   ============================================================ */
export async function syncDemandStatus(d: Demand): Promise<string> {
  return delay(`ServiceNow: estado = "${statusLabel[d.status]}" (sync simulado)`);
}

/** Resumo do mapeamento de campos Demand Hub ↔ ServiceNow (para o painel). */
export const FIELD_MAPPING: { hub: string; snow: string; dir: "in" | "out" }[] = [
  { hub: "capacity (horas/FTE)", snow: `${serviceNowConfig.fteTable}.hours`, dir: "in" },
  { hub: "RCE", snow: "pm_project.u_rce", dir: "out" },
  { hub: "Nº proyecto", snow: "pm_project.number", dir: "out" },
  { hub: "APP ID", snow: "pm_project.u_app_id", dir: "out" },
  { hub: "Score ponderado", snow: "pm_project.u_score", dir: "out" },
  { hub: "Estado / status", snow: "pm_project.state", dir: "out" },
];
