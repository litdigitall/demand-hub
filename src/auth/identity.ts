/* ============================================================
   identity — quem é o usuário, de verdade.

   Em produção o app roda dentro do host do Power Apps (Code App):
   a identidade vem do M365 via SDK, não de um seletor de persona.
   Fora do host (dev local, GitHub Pages, preview) não há contexto:
   resolveIdentidade() devolve null e o chamador cai no modo demo.

   Contrato do SDK (node_modules/@microsoft/power-apps/dist/app/App.Types.d.ts):
     IContext.user: IUserContext { fullName?, objectId?, tenantId?, userPrincipalName? }
   Todos os campos são opcionais — por isso a validação abaixo.
   ============================================================ */
import type { IContext } from "@microsoft/power-apps/app";

/** Identidade resolvida do host. */
export interface Identidade {
  nome: string;
  email: string;
}

/**
 * Modo demo: sem host do Power Apps, a autenticação usa personas.
 * - `DEV`  → npm run dev
 * - `VITE_DEMO_MODE=true` → build de demonstração (GitHub Pages)
 */
export const MODO_DEMO =
  import.meta.env.DEV || import.meta.env.VITE_DEMO_MODE === "true";

/** Teto de espera pelo host: sem resposta, é porque não há host. */
const TIMEOUT_MS = 5000;

function comTimeout<T>(p: Promise<T>): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = setTimeout(() => resolve(null), TIMEOUT_MS);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Identidade do usuário logado no host do Power Apps.
 * Devolve `null` fora do host, em modo demo, ou em qualquer falha
 * (o chamador decide o fallback).
 */
export async function resolveIdentidade(): Promise<Identidade | null> {
  if (MODO_DEMO) return null;

  try {
    /* Import dinâmico: o SDK só é baixado quando há host para responder. */
    const { getContext } = await import("@microsoft/power-apps/app");
    const ctx = await comTimeout<IContext>(getContext());
    if (!ctx) return null;

    const email = ctx.user?.userPrincipalName?.trim();
    if (!email) return null;

    const nome = ctx.user?.fullName?.trim();
    return { nome: nome || email, email };
  } catch {
    return null;
  }
}
