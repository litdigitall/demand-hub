/* ============================================================
   Auth demo baseado em PERSONAS multi-papel.

   Em vez de usuário/senha, o login escolhe uma persona (cada uma
   com 1+ papéis RBAC). Um "switcher" permite trocar de persona
   sem deslogar — ideal para demonstrar o fluxo de ponta a ponta.
   Persiste a persona ativa em localStorage.
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PERSONAS, personaById, type Persona, type Role } from "../domain/roles";
import type { Categoria } from "../data/types";
import { MODO_DEMO, resolveIdentidade } from "./identity";
import { resolverPapeis } from "./papeis";
import { perfilService, type Perfil } from "../data/perfilService";

const LS_KEY = "demand-system.persona.v1";

export interface AuthSession {
  personaId: string;
  /** Mantido por compatibilidade (= personaId). */
  username: string;
  displayName: string;
  email: string;
  area: string;
  cargo: string;
  roles: Role[];
  /** Para Decisores: frentes do portfólio que esta persona decide. */
  decisorDe: Categoria[];
  signedAt: string;
}

/** Senha demo compartilhada (no Power Apps a identidade vem do M365). */
export const DEMO_PASSWORD = "demand2026";

interface AuthCtx {
  user: AuthSession | null;
  roles: Role[];
  /** Produção: aguardando o host do Power Apps devolver a identidade. */
  resolvendo: boolean;
  /** true = personas (dev/demo); false = identidade real do host. */
  modoDemo: boolean;
  personas: Persona[];
  /** Login real por papel: e-mail + senha. */
  signIn: (email: string, password: string) => boolean;
  signInAs: (personaId: string) => boolean;
  switchPersona: (personaId: string) => void;
  signOut: () => void;
  hasRole: (role: Role) => boolean;
}

const Context = createContext<AuthCtx | null>(null);

function sessionFromPersona(p: Persona): AuthSession {
  return {
    personaId: p.id,
    username: p.id,
    displayName: p.nome,
    email: p.email,
    area: p.area,
    cargo: p.cargo,
    roles: p.roles,
    decisorDe: p.decisorDe ?? [],
    signedAt: new Date().toISOString(),
  };
}

/** Sessão a partir da identidade real do host (produção). A identidade vem do
    M365; os PAPÉIS vêm do cadastro em ardx_perfil (Settings → People). Quem
    não está cadastrado é Requester e só enxerga as próprias demandas. */
function sessionDoHost(nome: string, email: string, perfis: Perfil[]): AuthSession {
  const { papeis, decisorDe } = resolverPapeis(email, perfis);
  return {
    personaId: "host",
    username: email,
    displayName: nome,
    email,
    area: "",
    cargo: "",
    roles: papeis,
    decisorDe,
    signedAt: new Date().toISOString(),
  };
}

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { personaId?: string };
    const p = saved.personaId ? personaById(saved.personaId) : undefined;
    return p ? sessionFromPersona(p) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(() =>
    MODO_DEMO ? loadSession() : null,
  );
  /* Em produção esperamos o host do Power Apps responder quem é o usuário. */
  const [resolvendo, setResolvendo] = useState(!MODO_DEMO);

  useEffect(() => {
    if (MODO_DEMO) return;
    let vivo = true;
    /* Identidade e cadastro em paralelo: um não depende do outro, e a tela
       só pode decidir o que mostrar quando tem os dois. */
    Promise.all([resolveIdentidade(), perfilService.listar()])
      .then(([id, perfis]) => {
        if (!vivo || !id) return;
        setUser(sessionDoHost(id.nome, id.email, perfis));
      })
      .catch(() => {
        /* Falha no cadastro não tranca ninguém do lado de fora: entra como
           Requester e o módulo administrativo mostra o problema. */
      })
      .finally(() => vivo && setResolvendo(false));
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(() => {
    // A persona só é lembrada no modo demo; em produção a identidade é do host.
    if (!MODO_DEMO) return;
    if (user) localStorage.setItem(LS_KEY, JSON.stringify({ personaId: user.personaId }));
    else localStorage.removeItem(LS_KEY);
  }, [user]);

  function signInAs(personaId: string): boolean {
    const p = personaById(personaId);
    if (!p) return false;
    setUser(sessionFromPersona(p));
    return true;
  }

  function signIn(email: string, password: string): boolean {
    if (password !== DEMO_PASSWORD) return false;
    const p = PERSONAS.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
    if (!p) return false;
    setUser(sessionFromPersona(p));
    return true;
  }

  function switchPersona(personaId: string) {
    const p = personaById(personaId);
    if (p) setUser(sessionFromPersona(p));
  }

  function signOut() {
    setUser(null);
  }

  const roles = user?.roles ?? [];

  return (
    <Context.Provider
      value={{
        user,
        roles,
        resolvendo,
        modoDemo: MODO_DEMO,
        personas: PERSONAS,
        signIn,
        signInAs,
        switchPersona,
        signOut,
        hasRole: (role) => roles.includes(role),
      }}
    >
      {children}
    </Context.Provider>
  );
}

/* Padrão de Context: o provider e o hook moram juntos de propósito.
   O aviso é só do fast-refresh do dev server. */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
