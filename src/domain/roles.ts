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
  solicitante: "Solicitante",
  sponsor: "Sponsor / Negocio",
  techlead: "Tech Lead",
  pmo: "PMO",
  diretor: "Director (DMC)",
  admin: "Administrador",
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
  solicitante: "Abre la solicitud y describe el lado de negocio. No necesita saber el impacto técnico.",
  sponsor: "Patrocina la solicitud y valida los criterios de negocio (impacto, ingresos, estrategia).",
  techlead: "Define impacto técnico, esfuerzo y asigna equipo/horas (capacity).",
  pmo: "Hace el triaje, evalúa urgencia/compliance y define la prioridad final en el ranking.",
  diretor: "Aprobación final del comité (DMC) y liberación para ejecución.",
  admin: "Gestiona catálogos (áreas, sponsors, evaluadores) y configuración.",
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
    area: "Comercial",
    cargo: "Analista de Negocio",
    roles: [Role.Solicitante],
  },
  {
    id: "carlos",
    nome: "Carlos Mendes",
    email: "carlos.mendes@litdigitall.com.br",
    area: "Comercial",
    cargo: "Director Comercial (Sponsor)",
    roles: [Role.Sponsor, Role.Solicitante],
  },
  {
    id: "daniela",
    nome: "Daniela Bastos",
    email: "daniela.bastos@litdigitall.com.br",
    area: "Tecnología",
    cargo: "Tech Lead / Arquitecta de Soluciones",
    roles: [Role.TechLead],
  },
  {
    id: "paula",
    nome: "Paula Nakamura",
    email: "paula.nakamura@litdigitall.com.br",
    area: "PMO",
    cargo: "Gerente de PMO",
    roles: [Role.PMO],
  },
  {
    id: "marcelo",
    nome: "Marcelo Tavares",
    email: "marcelo.tavares@litdigitall.com.br",
    area: "Dirección",
    cargo: "Director de TI (DMC)",
    roles: [Role.Diretor],
  },
  {
    id: "sambini",
    nome: "Sambini (Admin)",
    email: "sambini@litdigitall.com.br",
    area: "Tecnología",
    cargo: "Administrador del sistema",
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
