import type { ReactNode } from "react";
import { Badge, Box, Group, Text } from "@mantine/core";
import {
  EsforcoEstimado,
  Impacto,
  StatusDemanda,
  TipoDemanda,
  Urgencia,
  statusLabel,
} from "../data/types";
import { useLabels } from "../i18n/useLabels";

/* ===========================================================
   Status (estilo "farol") — cor por etapa do ciclo de vida
   =========================================================== */
const STATUS_COLOR: Record<number, string> = {
  [StatusDemanda.Rascunho]: "gray",
  [StatusDemanda.Nova]: "gray",
  [StatusDemanda.EmAnalise]: "blue",
  [StatusDemanda.EmAprovacao]: "grape",
  [StatusDemanda.Priorizada]: "indigo",
  [StatusDemanda.EmExecucao]: "yellow",
  [StatusDemanda.Concluida]: "teal",
  [StatusDemanda.Devolvida]: "orange",
  [StatusDemanda.Recusada]: "red",
};
/* Ponto colorido + texto neutro, no lugar da pílula. Numa lista com dezenas
   de linhas a pílula colorida vira ruído; o ponto dá a mesma leitura por cor
   ocupando um oitavo do peso visual. É a forma que status e trilha
   compartilham — duas dimensões, uma gramática visual. */
export function DotLabel({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
      <Box w={6} h={6} bg={`${cor}.6`} style={{ borderRadius: "50%", flexShrink: 0 }} />
      <Text fz="xs" c="dark.6" truncate>
        {children}
      </Text>
    </Group>
  );
}

export function StatusBadge({ value }: { value: number }) {
  const L = useLabels();
  return (
    <DotLabel cor={STATUS_COLOR[value] ?? "gray"}>
      {L.status[value] ?? statusLabel[value] ?? "—"}
    </DotLabel>
  );
}

/* ===========================================================
   Urgência
   =========================================================== */
const URGENCIA_COLOR: Record<number, string> = {
  [Urgencia.Critico]: "red",
  [Urgencia.Alto]: "orange",
  [Urgencia.Medio]: "yellow",
  [Urgencia.Baixo]: "gray",
};
/* Numa lista densa, colorir as quatro urgências transforma a coluna numa
   parede de cor e nada mais salta. Só Critical e High levam cor — que é
   justamente o que faz alguém mudar de plano. */
const URGENCIA_DESTACA = new Set<number>([Urgencia.Critico, Urgencia.Alto]);

export function UrgenciaBadge({ value }: { value: number }) {
  const L = useLabels();
  const destaca = URGENCIA_DESTACA.has(value);
  return (
    <Badge
      variant={destaca ? "light" : "default"}
      color={destaca ? (URGENCIA_COLOR[value] ?? "gray") : undefined}
      radius="sm"
      fw={destaca ? 600 : 500}
    >
      {L.urgencia[value] ?? "—"}
    </Badge>
  );
}

/* ===========================================================
   Impacto no Negócio (Alto/Médio/Baixo)
   =========================================================== */
const IMPACTO_COLOR: Record<number, string> = {
  [Impacto.Alto]: "red",
  [Impacto.Medio]: "yellow",
  [Impacto.Baixo]: "gray",
};
export function ImpactoBadge({ value }: { value: number }) {
  const L = useLabels();
  return (
    <Badge variant="outline" color={IMPACTO_COLOR[value] ?? "gray"} radius="sm">
      {L.impacto[value] ?? "—"}
    </Badge>
  );
}

/* ===========================================================
   Tipo de Demanda
   =========================================================== */
const TIPO_COLOR: Record<number, string> = {
  [TipoDemanda.ProjetoNovo]: "blue",
  [TipoDemanda.MelhoriaSistema]: "cyan",
  [TipoDemanda.CorrecaoBug]: "orange",
  [TipoDemanda.Compliance]: "violet",
  [TipoDemanda.Infraestrutura]: "gray",
  [TipoDemanda.Seguranca]: "red",
  [TipoDemanda.Automacao]: "teal",
};
export function TipoBadge({ value }: { value: number }) {
  const L = useLabels();
  return (
    <Badge variant="light" color={TIPO_COLOR[value] ?? "gray"} radius="sm">
      {L.tipo[value] ?? "—"}
    </Badge>
  );
}

/* ===========================================================
   Esforço Estimado
   =========================================================== */
const ESFORCO_COLOR: Record<number, string> = {
  [EsforcoEstimado.Pequeno]: "teal",
  [EsforcoEstimado.Medio]: "yellow",
  [EsforcoEstimado.Grande]: "red",
};
export function EsforcoBadge({ value }: { value: number | null | undefined }) {
  const L = useLabels();
  if (value == null) return null;
  return (
    <Badge variant="outline" color={ESFORCO_COLOR[value] ?? "gray"} radius="sm">
      {L.esforco[value] ?? "—"}
    </Badge>
  );
}
