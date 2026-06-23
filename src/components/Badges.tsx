import { Badge } from "@mantine/core";
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
export function StatusBadge({ value }: { value: number }) {
  const L = useLabels();
  return (
    <Badge variant="dot" color={STATUS_COLOR[value] ?? "gray"} radius="sm">
      {L.status[value] ?? statusLabel[value] ?? "—"}
    </Badge>
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
export function UrgenciaBadge({ value }: { value: number }) {
  const L = useLabels();
  return (
    <Badge variant="light" color={URGENCIA_COLOR[value] ?? "gray"} radius="sm">
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
