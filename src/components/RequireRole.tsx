/* ============================================================
   RequireRole — guarda de rota por PAPEL (RBAC real).

   O menu esconde as telas, mas a URL não protegia nada: qualquer
   Requester podia digitar #/admin e entrar. Este componente fecha
   o buraco no roteador — sem papel, sem rota.

   Admin passa sempre (opera tudo, por definição em roles.ts).
   ============================================================ */
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Role, hasAnyRole, hasRole } from "../domain/roles";
import { useCurrentUser } from "../lib/useCurrentUser";

export interface RequireRoleProps {
  /** Papéis autorizados. Basta ter UM deles. */
  roles: Role[];
  children: ReactNode;
}

export function RequireRole({ roles, children }: RequireRoleProps) {
  const { roles: meus } = useCurrentUser();

  const autorizado = hasRole(meus, Role.Admin) || hasAnyRole(meus, roles);
  if (!autorizado) return <Navigate to="/" replace />;

  return <>{children}</>;
}
