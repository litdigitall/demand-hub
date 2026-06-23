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
  sponsor: "Sponsor / Negócio",
  techlead: "Tech Lead",
  pmo: "PMO",
  diretor: "Diretor (DMC)",
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
  solicitante: "Abre a demanda e descreve o lado de negócio. Não precisa saber o impacto técnico.",
  sponsor: "Patrocina a demanda e valida os critérios de negócio (impacto, receita, estratégia).",
  techlead: "Define impacto técnico, esforço e aloca time/horas (capacity).",
  pmo: "Faz a triagem, avalia urgência/compliance e define a prioridade final no ranking.",
  diretor: "Aprovação final do comitê (DMC) e liberação para execução.",
  admin: "Gerencia cadastros (áreas, sponsors, avaliadores) e configuração.",
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
    cargo: "Analista de Negócios",
    roles: [Role.Solicitante],
  },
  {
    id: "carlos",
    nome: "Carlos Mendes",
    email: "carlos.mendes@litdigitall.com.br",
    area: "Comercial",
    cargo: "Diretor Comercial (Sponsor)",
    roles: [Role.Sponsor, Role.Solicitante],
  },
  {
    id: "daniela",
    nome: "Daniela Bastos",
    email: "daniela.bastos@litdigitall.com.br",
    area: "Tecnologia",
    cargo: "Tech Lead / Arquiteta de Soluções",
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
    area: "Diretoria",
    cargo: "Diretor de TI (DMC)",
    roles: [Role.Diretor],
  },
  {
    id: "sambini",
    nome: "Sambini (Admin)",
    email: "sambini@litdigitall.com.br",
    area: "Tecnologia",
    cargo: "Administrador do sistema",
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
