import { useAuth } from "../auth/AuthContext";
import type { Role } from "../domain/roles";

export interface CurrentUser {
  name: string;
  email: string;
  cargo: string;
  roles: Role[];
  photoUrl?: string;
}

/** Usuário (persona) logado, com seus papéis RBAC. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth();
  if (!user) {
    return { name: "Guest", email: "", cargo: "", roles: [] };
  }
  return { name: user.displayName, email: user.email, cargo: user.cargo, roles: user.roles };
}
