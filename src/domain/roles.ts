/* ============================================================
   Perfis de acesso (RBAC) + personas demo.

   MODELO DE 4 ATORES (fluxo oficial):
     1. Requester      — abre a demanda (intake).
     2. PMO            — triagem, orquestração e priorização (ranking).
     3. Technical Team — avalia a demanda (score técnico, time e horas).
     4. Area Decisor   — decide o gate de aprovação da SUA frente:
                         Infra → Sambini · Apps → Gabriela · AI → AI Decisor.
   (+ Admin para configuração/demonstração.)

   Gating é por PAPEL, não por nome; o gate de decisão também é
   roteado pela ÁREA da demanda (persona.decisorDe).
   ============================================================ */

import type { Categoria } from "../data/types";

export const Role = {
  /** Abre demandas; preenche o lado de negócio do intake. */
  Solicitante: "solicitante",
  /** Avalia a demanda: impacto técnico, esforço, time/horas. */
  TechLead: "techlead",
  /** Triagem, urgência (compliance), prioridade final; orquestra. */
  PMO: "pmo",
  /** Decisor da área (Infra / Apps / AI) — gate único de aprovação. */
  Decisor: "decisor",
  /** Cadastros e configuração. */
  Admin: "admin",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL: Record<Role, string> = {
  solicitante: "Requester",
  techlead: "Technical Team",
  pmo: "PMO",
  decisor: "Area Decisor",
  admin: "Administrator",
};

/** Forma curta, para colunas e chips onde o nome completo trunca. */
export const ROLE_LABEL_CURTO: Record<Role, string> = {
  solicitante: "Requester",
  techlead: "Tech team",
  pmo: "PMO",
  decisor: "Decisor",
  admin: "Admin",
};

export const ROLE_LABEL_EN: Record<Role, string> = {
  solicitante: "Requester",
  techlead: "Technical Team",
  pmo: "PMO",
  decisor: "Area Decisor",
  admin: "Administrator",
};

export const ROLE_DESC: Record<Role, string> = {
  solicitante:
    "Opens the request and describes the business side. Does not need to know the technical impact.",
  techlead:
    "Evaluates the demand: technical impact, effort, and assigns team/hours (capacity).",
  pmo: "Runs triage, assesses urgency/compliance and sets the final ranking priority.",
  decisor:
    "Decides the approval gate of their portfolio area: Infrastructure (Sambini), Applications (Gabriela) or AI.",
  admin: "Manages catalogs (areas, decisors, evaluators) and configuration.",
};

export const ROLE_COLOR: Record<Role, string> = {
  solicitante: "gray",
  techlead: "violet",
  pmo: "teal",
  decisor: "indigo",
  admin: "dark",
};

/* ---------------- Personas demo ---------------------------- */

export interface Persona {
  id: string;
  nome: string;
  email: string;
  area: string;
  cargo: string;
  roles: Role[];
  /** Para Decisores: quais frentes do portfólio esta pessoa decide. */
  decisorDe?: Categoria[];
}

export const PERSONAS: Persona[] = [
  {
    id: "ana",
    nome: "Ana Ribeiro",
    email: "ana.ribeiro@litdigitall.com.br",
    area: "Commercial",
    cargo: "Business Analyst (Requester)",
    roles: [Role.Solicitante],
  },
  {
    id: "paula",
    nome: "Paula Nakamura",
    email: "paula.nakamura@litdigitall.com.br",
    area: "PMO",
    cargo: "PMO Manager",
    roles: [Role.PMO],
  },
  {
    id: "daniela",
    nome: "Daniela Bastos",
    email: "daniela.bastos@litdigitall.com.br",
    area: "Technology",
    cargo: "Technical Team / Solutions Architect",
    roles: [Role.TechLead],
  },
  {
    id: "sambini",
    nome: "Sambini",
    email: "sambini@litdigitall.com.br",
    area: "Infrastructure",
    cargo: "Area Decisor — Infrastructure",
    roles: [Role.Decisor],
    decisorDe: ["infra"],
  },
  {
    id: "gabriela",
    nome: "Gabriela",
    email: "gabriela@litdigitall.com.br",
    area: "Applications",
    cargo: "Area Decisor — Applications",
    roles: [Role.Decisor],
    decisorDe: ["app"],
  },
  {
    id: "aidecisor",
    nome: "AI Decisor",
    email: "ai.decisor@litdigitall.com.br",
    area: "Artificial Intelligence",
    cargo: "Area Decisor — AI",
    roles: [Role.Decisor],
    decisorDe: ["ia"],
  },
  {
    id: "admin",
    nome: "IT Admin",
    email: "admin@litdigitall.com.br",
    area: "Technology",
    cargo: "System Administrator",
    /* Admin enxerga e opera tudo — útil para configurar e demonstrar. */
    roles: [Role.Admin, Role.PMO, Role.TechLead, Role.Decisor, Role.Solicitante],
    decisorDe: ["infra", "ia", "app", "otro"],
  },
];

export function personaById(id: string): Persona | undefined {
  return PERSONAS.find((p) => p.id === id);
}

export function hasRole(roles: Role[] | undefined, role: Role): boolean {
  return !!roles && roles.includes(role);
}

export function hasAnyRole(roles: Role[] | undefined, wanted: Role[]): boolean {
  return !!roles && roles.some((r) => wanted.includes(r));
}

/* Um usuário pode acumular papéis (Admin costuma ter todos). Onde só cabe um
   rótulo, mostramos o de maior alcance em vez de encurtar vários e não ler
   nenhum. */
const ORDEM_PAPEL: Role[] = [
  Role.Admin,
  Role.PMO,
  Role.Decisor,
  Role.TechLead,
  Role.Solicitante,
];
export function papelPrincipal(roles: Role[]): Role {
  return ORDEM_PAPEL.find((r) => roles.includes(r)) ?? Role.Solicitante;
}
