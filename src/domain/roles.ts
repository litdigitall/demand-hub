/* ============================================================
   Perfis de acesso (RBAC) + personas demo.

   Gating é por PAPEL, não por nome. Cada gate do fluxo declara
   qual papel pode agir; qualquer persona que tenha esse papel
   pode executar a ação. Isso desacopla o fluxo das pessoas e
   torna as filas ("o que precisa de mim agora") confiáveis.
   ============================================================ */

export const Role = {
  /** Abre demandas; preenche o lado de negócio do intake. */
  Solicitante: "solicitante",
  /** Patrocina e valida critérios de NEGÓCIO; 1º gate de aprovação. */
  Sponsor: "sponsor",
  /** Define impacto TÉCNICO, esforço, time/horas; 2º gate. */
  TechLead: "techlead",
  /** Triagem, urgência (compliance), prioridade final; orquestra. */
  PMO: "pmo",
  /** Decisão final (DMC); 3º gate. */
  Diretor: "diretor",
  /** Cadastros e configuração. */
  Admin: "admin",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ROLE_LABEL: Record<Role, string> = {
  solicitante: "Requester",
  sponsor: "Sponsor / Business",
  techlead: "Tech Lead",
  pmo: "PMO",
  diretor: "Director (DMC)",
  admin: "Administrator",
};

export const ROLE_LABEL_EN: Record<Role, string> = {
  solicitante: "Requester",
  sponsor: "Sponsor / Business",
  techlead: "Tech Lead",
  pmo: "PMO",
  diretor: "Director (DMC)",
  admin: "Administrator",
};

export const ROLE_DESC: Record<Role, string> = {
  solicitante: "Opens the request and describes the business side. Does not need to know the technical impact.",
  sponsor: "Sponsors the request and validates the business criteria (impact, revenue, strategy).",
  techlead: "Defines technical impact, effort and assigns team/hours (capacity).",
  pmo: "Runs triage, assesses urgency/compliance and sets the final ranking priority.",
  diretor: "Final committee (DMC) approval and release to execution.",
  admin: "Manages catalogs (areas, sponsors, evaluators) and configuration.",
};

export const ROLE_COLOR: Record<Role, string> = {
  solicitante: "gray",
  sponsor: "blue",
  techlead: "violet",
  pmo: "teal",
  diretor: "indigo",
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
}

/* Nomes alinhados aos aprovadores históricos do mock data
   (Daniela Bastos = Tech Lead, Marcelo Tavares = Diretor),
   para que as demandas-semente já caiam nas filas certas. */
export const PERSONAS: Persona[] = [
  {
    id: "ana",
    nome: "Ana Ribeiro",
    email: "ana.ribeiro@litdigitall.com.br",
    area: "Commercial",
    cargo: "Business Analyst",
    roles: [Role.Solicitante],
  },
  {
    id: "carlos",
    nome: "Carlos Mendes",
    email: "carlos.mendes@litdigitall.com.br",
    area: "Commercial",
    cargo: "Commercial Director (Sponsor)",
    roles: [Role.Sponsor],
  },
  {
    id: "daniela",
    nome: "Daniela Bastos",
    email: "daniela.bastos@litdigitall.com.br",
    area: "Technology",
    cargo: "Tech Lead / Solutions Architect",
    roles: [Role.TechLead],
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
    id: "marcelo",
    nome: "Marcelo Tavares",
    email: "marcelo.tavares@litdigitall.com.br",
    area: "Leadership",
    cargo: "IT Director (DMC)",
    roles: [Role.Diretor],
  },
  {
    id: "sambini",
    nome: "Sambini (Admin)",
    email: "sambini@litdigitall.com.br",
    area: "Technology",
    cargo: "System Administrator",
    /* Admin enxerga e opera tudo — útil para configurar e demonstrar. */
    roles: [Role.Admin, Role.PMO, Role.TechLead, Role.Sponsor, Role.Diretor, Role.Solicitante],
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
