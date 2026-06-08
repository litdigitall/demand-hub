/* ============================================================
   Auth mockado — usuário fixo: sambini / LIt@2020.
   Persiste em localStorage e protege rotas.
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const LS_KEY = "pulse.auth.v1";

const MOCK_CREDS = {
  username: "sambini",
  password: "LIt@2020",
  displayName: "Sambini",
  email: "sambini@litdigitall.com.br",
};

interface AuthSession {
  username: string;
  displayName: string;
  email: string;
  signedAt: string;
}

interface AuthCtx {
  user: AuthSession | null;
  signIn: (u: string, p: string) => boolean;
  signOut: () => void;
}

const Context = createContext<AuthCtx | null>(null);

function loadSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthSession | null>(() => loadSession());

  useEffect(() => {
    if (user) localStorage.setItem(LS_KEY, JSON.stringify(user));
    else localStorage.removeItem(LS_KEY);
  }, [user]);

  function signIn(u: string, p: string): boolean {
    if (u.trim().toLowerCase() === MOCK_CREDS.username && p === MOCK_CREDS.password) {
      setUser({
        username: MOCK_CREDS.username,
        displayName: MOCK_CREDS.displayName,
        email: MOCK_CREDS.email,
        signedAt: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  function signOut() {
    setUser(null);
  }

  return (
    <Context.Provider value={{ user, signIn, signOut }}>{children}</Context.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
