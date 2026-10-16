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

/* Primeira execução.

   O módulo de perfis exige Admin para abrir, e o Admin vem do próprio
   cadastro: recém-instalado, o cadastro está vazio, ninguém é Admin e
   ninguém conseguiria cadastrar o primeiro.

   Em vez de um e-mail fixo no código (que vira lixo ao trocar de cliente),
   a regra é: **cadastro lido com sucesso e vazio** => quem entrou é Admin,
   para poder cadastrar a equipe. Assim que existir UM perfil ativo, a regra
   se desliga sozinha.

   A distinção entre "vazio" e "não consegui ler" é o que torna isso seguro:
   falha de leitura chega aqui como `null` e resulta em Requester. Se fosse
   lista vazia nos dois casos, uma queda do Dataverse daria Admin a todo
   mundo. */

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
export function resolverPapeis(
  email: string,
  /** `null` = não foi possível ler o cadastro. Falha FECHADA: Requester. */
  perfis: Perfil[] | null,
): PapeisResolvidos {
  if (!email.trim() || perfis === null) return APENAS_REQUERENTE;

  /* Primeira execução = cadastro SEM NENHUMA linha. Deliberadamente não vale
     para "tem linhas, todas inativas": senão desativar todo mundo devolveria
     Admin a quem entrasse depois — escalada de privilégio por exclusão.
     Nesse caso a saída é editar a linha direto na tabela pelo maker portal. */
  const primeiraExecucao = perfis.length === 0;
  const meu = perfis.find((p) => p.ativo && mesmo(p.upn, email));

  if (!meu || meu.papeis.length === 0) {
    return primeiraExecucao
      ? { papeis: [Role.Admin, Role.Solicitante], decisorDe: [] }
      : APENAS_REQUERENTE;
  }

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
