/* ============================================================
   Mapa de papéis por pessoa — configuração de produção.

   Em produção a identidade vem do host do Power Apps (identity.ts),
   mas o app ainda precisa saber QUAL PAPEL cada pessoa tem. Enquanto
   não existir uma tabela de papéis no Dataverse, a fonte é este
   arquivo: explícito, versionado e revisável.

   PREENCHER ANTES DE PUBLICAR NO CLIENTE (ver docs/GO-LIVE.md §5).
   Quem não estiver na lista entra como Requester — pode abrir e
   acompanhar as próprias demandas, e mais nada.
   ============================================================ */
import { Role } from "../domain/roles";
import type { Categoria } from "../data/types";

/** e-mail (UPN, minúsculo) → papéis no app. */
export const PAPEIS_POR_EMAIL: Record<string, Role[]> = {
  // "paula.nakamura@abbott.com": [Role.PMO],
  // "daniela.bastos@abbott.com": [Role.TechLead],
  // "sambini@abbott.com": [Role.Decisor],
  // "gabriela@abbott.com": [Role.Decisor],
  // "ti.admin@abbott.com": [Role.Admin],
};

/** e-mail do decisor → frentes do portfólio que ele decide. */
export const DECISOR_POR_EMAIL: Record<string, Categoria[]> = {
  // "sambini@abbott.com": ["infra"],
  // "gabriela@abbott.com": ["app"],
  // "ai.decisor@abbott.com": ["ia"],
};

/** Papéis de quem está logado. Sem mapeamento = apenas Requester. */
export function resolvePapeis(email: string): Role[] {
  return PAPEIS_POR_EMAIL[email.trim().toLowerCase()] ?? [Role.Solicitante];
}

/** Frentes que a pessoa decide (vazio se não for decisor). */
export function resolveDecisorDe(email: string): Categoria[] {
  return DECISOR_POR_EMAIL[email.trim().toLowerCase()] ?? [];
}

/** Há configuração de papéis publicada? (a tela de Settings mostra isso) */
export const PAPEIS_CONFIGURADOS = Object.keys(PAPEIS_POR_EMAIL).length > 0;
