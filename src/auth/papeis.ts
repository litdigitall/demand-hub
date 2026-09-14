/* ============================================================
   Resolução de papéis — a partir do CADASTRO, não do código.

   No Power Apps a identidade vem do host (M365): não há tela de
   login. O que o app precisa decidir é o PAPEL de quem entrou, e
   isso é dado de negócio — entra gente, troca decisor, alguém sai.

   Antes este arquivo era um mapa `Record<email, Role[]>` escrito à
   mão: cadastrar um decisor novo exigia editar TypeScript, buildar
   e republicar. Agora ele só interpreta o que está na tabela
   ardx_perfil, mantida no módulo administrativo (Settings → People).

   Quem não está cadastrado entra como Requester: abre e acompanha
   as próprias demandas, e mais nada. É o padrão seguro — ninguém
   ganha acesso por omissão.
   ============================================================ */
import { Role } from "../domain/roles";
import type { Categoria } from "../data/types";
import type { Perfil } from "../data/perfilService";

/** O que o app precisa saber sobre quem entrou. */
export interface PapeisResolvidos {
  papeis: Role[];
  decisorDe: Categoria[];
}

export const APENAS_REQUERENTE: PapeisResolvidos = {
  papeis: [Role.Solicitante],
  decisorDe: [],
};

/** Comparação de UPN: o host pode devolver com caixa diferente do cadastro. */
function mesmo(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/**
 * Papéis de quem entrou, a partir da lista de perfis cadastrados.
 * Perfil inativo é tratado como não cadastrado — é assim que se tira
 * o acesso de alguém sem apagar o histórico de quem era.
 */
export function resolverPapeis(email: string, perfis: Perfil[]): PapeisResolvidos {
  if (!email.trim()) return APENAS_REQUERENTE;

  const meu = perfis.find((p) => p.ativo && mesmo(p.upn, email));
  if (!meu || meu.papeis.length === 0) return APENAS_REQUERENTE;

  /* Todo mundo continua podendo abrir demanda: os papéis do fluxo se somam
     ao de solicitante, nunca o substituem. */
  const papeis = meu.papeis.includes(Role.Solicitante)
    ? meu.papeis
    : [...meu.papeis, Role.Solicitante];

  return {
    papeis,
    decisorDe: meu.papeis.includes(Role.Decisor) ? meu.frentes : [],
  };
}

/** Há cadastro publicado? A tela de Settings avisa quando não há. */
export function haCadastro(perfis: Perfil[]): boolean {
  return perfis.some((p) => p.ativo && p.papeis.length > 0);
}
