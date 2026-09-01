/* ============================================================
   EmptyState — uma linha, e só.

   Substitui os blocos de meia tela (ThemeIcon gigante + título +
   parágrafo explicativo) das telas antigas. Vazio é informação
   secundária: ocupa o espaço de uma linha de tabela, não de uma
   página.
   ============================================================ */
import type { ReactNode } from "react";
import { Text } from "@mantine/core";

export interface EmptyStateProps {
  children: ReactNode;
}

export function EmptyState({ children }: EmptyStateProps) {
  return (
    <Text c="dimmed" size="sm" ta="center" py="md">
      {children}
    </Text>
  );
}
