/* ============================================================
   perfilService — quem é quem no app.

   No Power Apps a IDENTIDADE vem do host (M365): não existe tela de
   login. Mas o PAPEL de cada pessoa — PMO, time técnico, decisor de
   qual frente — é dado de negócio e muda sem parar: entra gente,
   troca decisor, alguém sai de férias.

   Antes isso morava em src/auth/papeis.ts. Cadastrar um decisor novo
   exigia editar TypeScript, buildar e republicar o app. Agora mora na
   tabela intake_perfil e se cadastra no módulo administrativo.

   - Produção: tabela intake_perfil no Dataverse.
   - Dev/demo: lista em memória com as personas, para a tela funcionar
     sem ambiente. Nada é gravado em localStorage — cadastro de acesso
     que só vale no navegador de quem clicou seria pior que nenhum.

   Este arquivo não importa o SDK do Power Apps: é o que o build de
   demonstração (GitHub Pages) consegue compilar sem .power/schemas.
   ============================================================ */
import { Role } from "../domain/roles";
import type { Categoria } from "./types";

export interface Perfil {
  id: string;
  /** UPN / e-mail — é a chave: é o que o host devolve. */
  upn: string;
  nome: string;
  papeis: Role[];
  /** Frentes que a pessoa decide (só faz sentido com Role.Decisor). */
  frentes: Categoria[];
  ativo: boolean;
}

export interface PerfilService {
  listar(): Promise<Perfil[]>;
  salvar(p: Omit<Perfil, "id"> & { id?: string }): Promise<Perfil>;
  remover(id: string): Promise<void>;
  /** Cadastro editável? Em demo a lista é fixa. */
  readonly editavel: boolean;
}

/* ---------------- parsing tolerante ------------------------- */

const PAPEIS_VALIDOS = new Set<string>(Object.values(Role));
const FRENTES_VALIDAS = new Set(["infra", "ia", "app", "otro"]);

/** JSON gravado por versão anterior ou por mão humana não derruba a tela. */
function lerLista(bruto: unknown, valido: Set<string>): string[] {
  if (typeof bruto !== "string" || !bruto.trim()) return [];
  try {
    const v = JSON.parse(bruto);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string" && valido.has(x)) : [];
  } catch {
    return [];
  }
}

export function papeisDe(bruto: unknown): Role[] {
  return lerLista(bruto, PAPEIS_VALIDOS) as Role[];
}

export function frentesDe(bruto: unknown): Categoria[] {
  return lerLista(bruto, FRENTES_VALIDAS) as Categoria[];
}

/* ---------------- demo: lista fixa -------------------------- */

const DEMO: Perfil[] = [
  {
    id: "demo-1",
    upn: "pmo@litdigitall.com.br",
    nome: "IT PMO",
    papeis: [Role.PMO],
    frentes: [],
    ativo: true,
  },
  {
    id: "demo-2",
    upn: "tech@litdigitall.com.br",
    nome: "Technical Team",
    papeis: [Role.TechLead],
    frentes: [],
    ativo: true,
  },
  {
    id: "demo-3",
    upn: "sambini@litdigitall.com.br",
    nome: "Sambini",
    papeis: [Role.Decisor],
    frentes: ["infra"],
    ativo: true,
  },
  {
    id: "demo-4",
    upn: "gabriela@litdigitall.com.br",
    nome: "Gabriela",
    papeis: [Role.Decisor],
    frentes: ["app"],
    ativo: true,
  },
  {
    id: "demo-5",
    upn: "ai.decisor@litdigitall.com.br",
    nome: "AI Decisor",
    papeis: [Role.Decisor],
    frentes: ["ia"],
    ativo: true,
  },
];

export const demoPerfilService: PerfilService = {
  editavel: false,
  async listar() {
    return DEMO.map((p) => ({ ...p }));
  },
  async salvar() {
    throw new Error("Profiles are read-only in demo mode.");
  },
  async remover() {
    throw new Error("Profiles are read-only in demo mode.");
  },
};

