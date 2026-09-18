/* ============================================================
   Requests · Table — lista densa, uma linha por demanda.

   Desktop primeiro: a tabela tinha 8 colunas e sobrava meia tela, com a
   coluna Title esticada em 840px e o prazo quebrando em duas linhas. Agora
   as colunas que o PMO usa para decidir (urgência, idade no estado, horas,
   quem pediu) ocupam esse espaço, o prazo não quebra e o cabeçalho gruda no
   topo — com 48 linhas, perder o cabeçalho ao rolar é perder a referência.
   ============================================================ */
import { Fragment, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge, Box, Group, Table, Text, Tooltip } from "@mantine/core";
import { IconChevronRight } from "@tabler/icons-react";
import {
  CATEGORIA_COR_VIEW,
  CATEGORIA_VIEW_LABEL,
  clasificacionEfetiva,
  statusLabel,
  weightedScore,
  type Demand,
} from "../../data/types";
import { pipelineIndex } from "../../domain/workflow";
import { StatusBadge, UrgenciaBadge } from "../../components/Badges";
import { useLabels } from "../../i18n/useLabels";
import { formatDate } from "../../lib/format";
import { sla } from "../../domain/sla";
import { isOverdue, waitingLabel, type GroupBy } from "./useRequests";

const COLS = 12;

interface RowGroup {
  key: string;
  label: string;
  order: number;
  items: Demand[];
}

function groupOf(
  d: Demand,
  by: GroupBy,
  statusName: (s: number) => string,
): { key: string; label: string; order: number } {
  if (by === "status") {
    const idx = pipelineIndex(d.status);
    return { key: String(d.status), label: statusName(d.status), order: idx < 0 ? 99 : idx };
  }
  if (by === "area") {
    const cat = clasificacionEfetiva(d);
    return { key: cat, label: CATEGORIA_VIEW_LABEL[cat], order: 0 };
  }
  const w = waitingLabel(d);
  return { key: w, label: w, order: 0 };
}

/** "parada há 8 de 5 dias-meta" — a coluna é estreita, o tooltip explica. */
function tituloIdade(d: Demand): string {
  const { dias, alvo } = sla(d);
  return alvo === undefined
    ? `In this stage for ${dias} day${dias === 1 ? "" : "s"}`
    : `In this stage for ${dias} of ${alvo} target days`;
}

export function RequestsTable({ items, groupBy }: { items: Demand[]; groupBy: GroupBy }) {
  const navigate = useNavigate();
  const L = useLabels();

  const groups = useMemo<RowGroup[]>(() => {
    const statusName = (s: number) => L.status[s] ?? statusLabel[s] ?? "—";
    if (groupBy === "none") return [{ key: "all", label: "", order: 0, items }];
    const map = new Map<string, RowGroup>();
    items.forEach((d) => {
      const g = groupOf(d, groupBy, statusName);
      const cur = map.get(g.key);
      if (cur) cur.items.push(d);
      else map.set(g.key, { key: g.key, label: g.label, order: g.order, items: [d] });
    });
    return [...map.values()].sort((a, b) =>
      a.order !== b.order ? a.order - b.order : a.label.localeCompare(b.label),
    );
  }, [items, groupBy, L]);

  function open(id: string) {
    navigate(`/demandas/${id}`);
  }

  /* Sem Table.ScrollContainer de propósito: ele cria um contexto de rolagem
     próprio e o cabeçalho "fixo" passa a grudar DENTRO dele, aparecendo no meio
     das linhas. Esta tabela só renderiza a partir de lg, onde as colunas cabem;
     abaixo disso a tela usa RequestsCards. */
  return (
    <Box>
      <Table
        highlightOnHover
        verticalSpacing={5}
        horizontalSpacing="sm"
        layout="fixed"
        stickyHeader
        stickyHeaderOffset={62}
      >
        <Table.Thead bg="var(--mantine-color-gray-0)">
          <Table.Tr>
            <Table.Th w={92}>Number</Table.Th>
            <Table.Th>Title</Table.Th>
            <Table.Th w={96} visibleFrom="xl">
              Urgency
            </Table.Th>
            <Table.Th w={134}>Area</Table.Th>
            <Table.Th w={62} ta="right">
              Age
            </Table.Th>
            <Table.Th w={62} ta="right" visibleFrom="xxl">
              Hours
            </Table.Th>
            <Table.Th w={104} visibleFrom="xl">
              Due
            </Table.Th>
            <Table.Th w={64} ta="right">
              Score
            </Table.Th>
            <Table.Th w={122}>Status</Table.Th>
            <Table.Th w={136}>Waiting on</Table.Th>
            <Table.Th w={132} visibleFrom="xxl">
              Requester
            </Table.Th>
            <Table.Th w={34} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={COLS}>
                <Text size="sm" c="dimmed" py="sm">
                  No requests match the current filters.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}

          {groups.map((g) => (
            <Fragment key={g.key}>
              {groupBy !== "none" && (
                <Table.Tr bg="var(--mantine-color-gray-0)">
                  <Table.Td colSpan={COLS} py={6}>
                    <Group gap={8}>
                      <Text size="xs" fw={700} tt="uppercase" lts={0.4}>
                        {g.label}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {g.items.length}
                      </Text>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              )}

              {g.items.map((d) => {
                const cat = clasificacionEfetiva(d);
                const late = isOverdue(d);
                const idade = sla(d);
                return (
                  <Table.Tr
                    key={d.id}
                    tabIndex={0}
                    style={{ cursor: "pointer" }}
                    onClick={() => open(d.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") open(d.id);
                    }}
                  >
                    <Table.Td>
                      <Text size="xs" c="dimmed" ff="monospace">
                        {d.numero}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} truncate>
                        {d.titulo}
                      </Text>
                    </Table.Td>
                    <Table.Td visibleFrom="xl">
                      <UrgenciaBadge value={d.urgencia} />
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" radius="sm" color={CATEGORIA_COR_VIEW[cat]}>
                        {CATEGORIA_VIEW_LABEL[cat]}
                      </Badge>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Tooltip label={tituloIdade(d)} openDelay={300} withArrow>
                        <Text
                          size="xs"
                          fw={idade.tom === "ok" ? 400 : 700}
                          c={
                            idade.tom === "estourado"
                              ? "red.7"
                              : idade.tom === "atencao"
                                ? "orange.7"
                                : "dimmed"
                          }
                        >
                          {idade.dias}d
                        </Text>
                      </Tooltip>
                    </Table.Td>
                    <Table.Td ta="right" visibleFrom="xxl">
                      <Text size="xs" c="dimmed">
                        {d.horasEstimadas ? `${d.horasEstimadas}h` : "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td visibleFrom="xl">
                      <Text
                        size="xs"
                        fw={late ? 700 : 400}
                        c={late ? "red.7" : "dimmed"}
                        style={{ whiteSpace: "nowrap" }}
                      >
                        {formatDate(d.deadline)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={700} c="abbott.7">
                        {weightedScore(d.score).toFixed(2)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge value={d.status} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="xs" c="dimmed" truncate>
                        {waitingLabel(d)}
                      </Text>
                    </Table.Td>
                    <Table.Td visibleFrom="xxl">
                      <Text size="xs" c="dimmed" truncate>
                        {d.solicitante || "—"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Box c="gray.4" style={{ display: "flex" }}>
                        <IconChevronRight size={14} />
                      </Box>
                    </Table.Td>
                  </Table.Tr>
                );
              })}
            </Fragment>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  );
}
