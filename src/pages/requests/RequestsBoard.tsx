/* ============================================================
   Requests · Board — colunas na ordem do PIPELINE.

   READ-ONLY de propósito: status só muda pelo motor de ciclo de
   vida (proximasAcoes → acao.apply), nunca por arrastar um card.
   Clicar no card leva ao detalhe, onde as ações reais estão.
   ============================================================ */
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Card, Group, Paper, Stack, Text } from "@mantine/core";
import {
  StatusDemanda,
  clasificacionEfetiva,
  CATEGORIA_COR_VIEW,
  CATEGORIA_VIEW_LABEL,
  statusLabel,
  weightedScore,
  type Demand,
} from "../../data/types";
import { PIPELINE } from "../../domain/workflow";
import { formatDate } from "../../lib/format";
import { isOverdue, waitingLabel } from "./useRequests";

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

/* Laterais do fluxo: só aparecem quando têm conteúdo. */
const LATERAIS: number[] = [StatusDemanda.Devolvida, StatusDemanda.Recusada];

/* Estados sem ação pendente. */
const TERMINAIS: number[] = [StatusDemanda.Concluida, StatusDemanda.Recusada];

export function RequestsBoard({ items }: { items: Demand[] }) {
  const columns = useMemo(() => {
    const map = new Map<number, Demand[]>();
    items.forEach((d) => {
      const list = map.get(d.status);
      if (list) list.push(d);
      else map.set(d.status, [d]);
    });

    const coluna = (status: number, label: string) => ({
      status,
      label,
      items: map.get(status) ?? [],
    });

    /* Draft e as laterais não são etapas do PIPELINE: entram como coluna
       só quando têm conteúdo — mas precisam entrar, senão a demanda some
       do board sem deixar rastro. */
    const foraDoPipeline = (s: number) => ((map.get(s)?.length ?? 0) > 0 ? [coluna(s, statusLabel[s])] : []);

    return [
      ...foraDoPipeline(StatusDemanda.Rascunho),
      ...PIPELINE.map((p) => coluna(p.status, p.label)),
      ...LATERAIS.flatMap(foraDoPipeline),
    ];
  }, [items]);

  if (items.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        No requests match the current filters.
      </Text>
    );
  }

  return (
    <Box style={{ overflowX: "auto", paddingBottom: 8 }}>
      <Group gap="sm" wrap="nowrap" align="flex-start">
        {columns.map((col) => (
          <Paper
            key={col.status}
            withBorder
            radius="lg"
            p="xs"
            style={{ width: 262, flex: "0 0 262px", background: "var(--mantine-color-gray-0)" }}
          >
            <Group justify="space-between" px={6} py={2} mb={6} wrap="nowrap">
              <Group gap={7} wrap="nowrap">
                <Box
                  w={7}
                  h={7}
                  style={{
                    borderRadius: 999,
                    background: `var(--mantine-color-${STATUS_COLOR[col.status] ?? "gray"}-6)`,
                  }}
                />
                <Text size="sm" fw={600} truncate>
                  {col.label}
                </Text>
              </Group>
              <Text size="xs" c="dimmed">
                {col.items.length}
              </Text>
            </Group>

            <Stack gap={6}>
              {col.items.length === 0 ? (
                <Text size="xs" c="dimmed" px={6} py={4}>
                  Empty
                </Text>
              ) : (
                col.items.map((d) => <BoardCard key={d.id} d={d} />)
              )}
            </Stack>
          </Paper>
        ))}
      </Group>
    </Box>
  );
}

function BoardCard({ d }: { d: Demand }) {
  const navigate = useNavigate();
  const cat = clasificacionEfetiva(d);
  const late = isOverdue(d);
  return (
    <Card
      withBorder
      radius="md"
      padding="xs"
      tabIndex={0}
      style={{ cursor: "pointer" }}
      onClick={() => navigate(`/demandas/${d.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") navigate(`/demandas/${d.id}`);
      }}
    >
      <Group justify="space-between" gap={6} wrap="nowrap" mb={4}>
        <Text size="xs" c="dimmed" ff="monospace">
          {d.numero}
        </Text>
        <Text size="xs" fw={700} c="abbott.7">
          {weightedScore(d.score).toFixed(2)}
        </Text>
      </Group>

      <Text size="sm" fw={500} lineClamp={2} style={{ lineHeight: 1.3 }}>
        {d.titulo}
      </Text>

      <Group gap={6} mt={8} justify="space-between" wrap="nowrap">
        <Badge size="xs" variant="light" radius="sm" color={CATEGORIA_COR_VIEW[cat]}>
          {CATEGORIA_VIEW_LABEL[cat]}
        </Badge>
        {d.deadline && (
          <Text size="xs" c={late ? "red.7" : "dimmed"} fw={late ? 600 : 400}>
            {formatDate(d.deadline)}
          </Text>
        )}
      </Group>

      {/* Em estados terminais a coluna já diz tudo — não repetir. */}
      {!TERMINAIS.includes(d.status) && (
        <Text size="xs" c="dimmed" mt={4} truncate>
          {waitingLabel(d)}
        </Text>
      )}
    </Card>
  );
}
