/* ============================================================
   perfilService — cadastro de perfis (quem é quem no app).

   Tipos, parsing e a lista de demonstração moram em perfilBase.ts, sem
   dependência do SDK. Aqui entra só a implementação Dataverse, sobre a
   tabela intake_perfil.

   No build de demonstração (VITE_DEMO_MODE=true) o Vite troca este
   arquivo por perfilService.demo.ts — ver vite.config.ts.
   ============================================================ */
import { MODO_DEMO } from "../auth/identity";
import { Intake_perfilsService } from "../generated/services/Intake_perfilsService";
import type {
  Intake_perfils,
  Intake_perfilsBase,
} from "../generated/models/Intake_perfilsModel";
import type { IOperationResult } from "@microsoft/power-apps/data";
import {
  demoPerfilService,
  frentesDe,
  papeisDe,
  type Perfil,
  type PerfilService,
} from "./perfilBase";

export type { Perfil, PerfilService } from "./perfilBase";
export { papeisDe, frentesDe } from "./perfilBase";

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
