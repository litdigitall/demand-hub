import { useAuth } from "../auth/AuthContext";

export interface CurrentUser {
  name: string;
  email: string;
  photoUrl?: string;
}

/* Demo: o usuário logado aparece como "Marcelo Tavares (IT Director)" pra
   que a tela "Minhas Aprovações" mostre as demandas que aguardam decisão
   do nível 3 do fluxo. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user) {
    return { name: "Guest", email: "" };
  }
  if (user.username === "sambini") {
    return {
      name: "Marcelo Tavares (IT Director)",
      email: user.email,
    };
  }
  return { name: user.displayName, email: user.email };
}
