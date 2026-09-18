/* ============================================================
   Helpers de formatação
   ============================================================ */

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  /* "01 Sep 2026": dia primeiro (como o Brasil lê) e mês por extenso, então
     ninguém confunde 01/09 com 09/01 numa UI em inglês. */
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function formatRelative(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  if (Number.isNaN(d)) return "—";
  const diffMs = Date.now() - d;
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days`;
  if (diffDays < 30) return plural(Math.floor(diffDays / 7), "week");
  if (diffDays < 365) return plural(Math.floor(diffDays / 30), "month");
  return plural(Math.floor(diffDays / 365), "year");
}

/** "1 demand" / "2 demands" — plural errado é o tipo de detalhe que faz um app
    parecer inacabado. */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** Números com separador de milhar do inglês (2,080) — a UI é toda em inglês. */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-US");
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function initialsFromName(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function initialsFromEmail(email: string): string {
  if (!email) return "?";
  const name = email.split("@")[0].replace(/[._-]/g, " ");
  return initialsFromName(name);
}
