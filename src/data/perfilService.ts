/* ============================================================
   perfilService — quem é quem no app.

   No Power Apps a IDENTIDADE vem do host (M365): não existe tela de
   login. Mas o PAPEL de cada pessoa — PMO, time técnico, decisor de
   qual frente — é dado de negócio e muda sem parar: entra gente,
   troca decisor, alguém sai de férias.

   Antes isso morava em src/auth/papeis.ts. Cadastrar um decisor novo
   exigia editar TypeScript, buildar e republicar o app. Agora mora na
   tabela ardx_perfil e se cadastra no módulo administrativo.

   - Produção: tabela ardx_perfil no Dataverse.
   - Dev/demo: lista em memória com as personas, para a tela funcionar
     sem ambiente. Nada é gravado em localStorage — cadastro de acesso
     que só vale no navegador de quem clicou seria pior que nenhum.
   ============================================================ */
import { Role } from "../domain/roles";
import type { Categoria } from "./types";
import { MODO_DEMO } from "../auth/identity";

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

const demoPerfilService: PerfilService = {
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

/* ---------------- produção: Dataverse ----------------------- */

/* A tabela é criada por dataverse/Setup-DemandaTable.ps1. Enquanto ela não
   existir no ambiente, `listar()` devolve vazio em vez de derrubar a tela:
   todo mundo entra como Requester e o módulo administrativo diz o que fazer. */
interface LinhaPerfil {
  ardx_perfilid?: string;
  ardx_upn?: string;
  ardx_nome?: string;
  ardx_papeisjson?: string;
  ardx_frentesjson?: string;
  ardx_ativo?: boolean;
}

/* O acesso tipado é gerado por `pac code add-data-source -a dataverse
   -t ardx_perfil`, que cria Ardx_perfilsService e registra a tabela em
   .power/schemas. Enquanto isso não roda, o import falha e caímos no
   catch — sem perfis, todo mundo é Requester e a tela de People diz isso. */
const MODULO_PERFIL = "../generated/services/Ardx_perfilsService";

async function servico() {
  const mod = (await import(/* @vite-ignore */ MODULO_PERFIL)) as {
    Ardx_perfilsService: PerfilRepo;
  };
  return mod.Ardx_perfilsService;
}

/** Forma do serviço gerado que este módulo usa. */
interface PerfilRepo {
  getAll(options?: unknown): Promise<{ data?: LinhaPerfil[] }>;
  create(record: LinhaPerfil): Promise<{ data?: LinhaPerfil }>;
  update(id: string, changed: Partial<LinhaPerfil>): Promise<unknown>;
  delete(id: string): Promise<unknown>;
}

function daLinha(r: LinhaPerfil): Perfil {
  return {
    id: r.ardx_perfilid ?? "",
    upn: (r.ardx_upn ?? "").trim(),
    nome: (r.ardx_nome ?? "").trim(),
    papeis: papeisDe(r.ardx_papeisjson),
    frentes: frentesDe(r.ardx_frentesjson),
    ativo: r.ardx_ativo !== false,
  };
}

function paraLinha(p: Omit<Perfil, "id">): LinhaPerfil {
  return {
    ardx_upn: p.upn.trim().toLowerCase(),
    ardx_nome: p.nome.trim(),
    ardx_papeisjson: JSON.stringify(p.papeis),
    ardx_frentesjson: JSON.stringify(p.frentes),
    ardx_ativo: p.ativo,
  };
}

const dataversePerfilService: PerfilService = {
  editavel: true,

  async listar() {
    try {
      const repo = await servico();
      const res = await repo.getAll();
      return (res.data ?? []).map(daLinha).filter((p) => p.upn);
    } catch {
      /* Tabela ausente ou sem permissão: sem perfis, todo mundo é Requester. */
      return [];
    }
  },

  async salvar(p) {
    const repo = await servico();
    const linha = paraLinha(p);
    if (p.id) {
      await repo.update(p.id, linha);
      return { ...p, id: p.id } as Perfil;
    }
    const criado = await repo.create(linha);
    return { ...p, id: criado.data?.ardx_perfilid ?? "" } as Perfil;
  },

  async remover(id) {
    const repo = await servico();
    await repo.delete(id);
  },
};

export const perfilService: PerfilService = MODO_DEMO
  ? demoPerfilService
  : dataversePerfilService;
