/* ============================================================
   Auth demo baseado em PERSONAS multi-papel.

   Em vez de usuário/senha, o login escolhe uma persona (cada uma
   com 1+ papéis RBAC). Um "switcher" permite trocar de persona
   sem deslogar — ideal para demonstrar o fluxo de ponta a ponta.
   Persiste a persona ativa em localStorage.
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PERSONAS, personaById, type Persona, type Role } from "../domain/roles";

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
  signedAt: string;
}

/** Senha demo compartilhada (no Power Apps a identidade vem do M365). */
export const DEMO_PASSWORD = "demand2026";

interface AuthCtx {
  user: AuthSession | null;
  roles: Role[];
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
  const [user, setUser] = useState<AuthSession | null>(() => loadSession());

  useEffect(() => {
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

export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
