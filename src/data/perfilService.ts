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
   ============================================================ */
import { Role } from "../domain/roles";
import type { Categoria } from "./types";
import { MODO_DEMO } from "../auth/identity";
import { Intake_perfilsService } from "../generated/services/Intake_perfilsService";
import type {
  Intake_perfils,
  Intake_perfilsBase,
} from "../generated/models/Intake_perfilsModel";
import type { IOperationResult } from "@microsoft/power-apps/data";

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

/* Tabela intake_perfil. O serviço tipado foi gerado com
   `pac code add-data-source -a dataverse -t intake_perfil`. */
type LinhaPerfil = Intake_perfils;
/* Os campos que o Dataverse preenche sozinho (dono, estado) aparecem como
   obrigatórios no tipo gerado; o serviço de demandas usa o mesmo corte. */
type RegistroPerfil = Omit<Intake_perfilsBase, "intake_perfilid">;

function daLinha(r: LinhaPerfil): Perfil {
  return {
    id: r.intake_perfilid ?? "",
    upn: (r.intake_upn ?? "").trim(),
    nome: (r.intake_nome ?? "").trim(),
    papeis: papeisDe(r.intake_papeisjson),
    frentes: frentesDe(r.intake_frentesjson),
    ativo: r.intake_ativo !== false,
  };
}

function paraLinha(p: Omit<Perfil, "id">): Partial<RegistroPerfil> {
  return {
    intake_upn: p.upn.trim().toLowerCase(),
    intake_nome: p.nome.trim(),
    intake_papeisjson: JSON.stringify(p.papeis),
    intake_frentesjson: JSON.stringify(p.frentes),
    intake_ativo: p.ativo,
  };
}

/** Mensagem do Dataverse, quando vier, para a tela não dizer só "falhou". */
function motivo(res: IOperationResult<unknown>): string {
  const e = res.error as unknown;
  if (!e) return "";
  if (e instanceof Error) return ` ${e.message}`;
  return typeof e === "string" ? ` ${e}` : "";
}

const dataversePerfilService: PerfilService = {
  editavel: true,

  async listar() {
    try {
      const res = await Intake_perfilsService.getAll({
        select: [
          "intake_perfilid",
          "intake_upn",
          "intake_nome",
          "intake_papeisjson",
          "intake_frentesjson",
          "intake_ativo",
        ],
        top: 500,
      });
      if (!res.success) return [];
      return (res.data ?? []).map(daLinha).filter((p) => p.upn);
    } catch {
      /* Sem permissão ou tabela fora do ar: falha FECHADA — sem perfis, todo
         mundo é Requester. Nunca o contrário. */
      return [];
    }
  },

  async salvar(p) {
    const linha = paraLinha(p);
    if (p.id) {
      const res = await Intake_perfilsService.update(p.id, linha);
      if (!res.success) throw new Error(`Could not update the profile.${motivo(res)}`);
      return { ...p, id: p.id } as Perfil;
    }
    const res = await Intake_perfilsService.create(linha as RegistroPerfil);
    if (!res.success || !res.data) {
      throw new Error(`Could not create the profile.${motivo(res)}`);
    }
    return daLinha(res.data);
  },

  async remover(id) {
    await Intake_perfilsService.delete(id);
  },
};

export const perfilService: PerfilService = MODO_DEMO
  ? demoPerfilService
  : dataversePerfilService;
