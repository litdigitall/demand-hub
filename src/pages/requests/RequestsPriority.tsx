/* ============================================================
   Requests · Priority — a fila de execução.

   Ordem: finalPriority (quando houver) e depois score ponderado.
   A posição só é editável por PMO/Admin e apenas em demandas
   Priorizadas — e a gravação passa pelo motor (ação
   "definirPrioridade"), nunca por um update solto.
   Linha de corte = soma das horas estimadas contra a capacidade
   total dos times; sem horas, sem linha.
   ============================================================ */
import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ActionIcon, Box, Group, NumberInput, Stack, Table, Text, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconChevronDown, IconChevronUp } from "@tabler/icons-react";
import { demandService } from "../../data/demandService";
import {
  CAPACIDADE_PADRAO_HORAS,
  SCORE_LABELS,
  SCORE_WEIGHTS,
  CONSOME_CAPACIDADE,
  weightedScore,
  type Demand,
  type Score,
} from "../../data/types";
import { aplicarAcao, proximasAcoes } from "../../domain/workflow";
import { Role } from "../../domain/roles";
import { TipoBadge, UrgenciaBadge } from "../../components/Badges";
import { useCurrentUser } from "../../lib/useCurrentUser";

const COLS = 7;
const CRITERIOS = Object.keys(SCORE_WEIGHTS) as (keyof Score)[];
const CAPACIDADE_TOTAL = Object.values(CAPACIDADE_PADRAO_HORAS).reduce((a, b) => a + b, 0);

/* Mesma regra do /capacity: só demanda priorizada ou em execução consome
   capacidade. Somar as concluídas/recusadas empurraria a linha de corte
   para cima com horas que já não existem. */
function horasNaFila(d: Demand): number {
  return CONSOME_CAPACIDADE.includes(d.status) ? d.horasEstimadas || 0 : 0;
}

export function RequestsPriority({
  items,
  onChanged,
}: {
  items: Demand[];
  onChanged: () => void;
}) {
  const navigate = useNavigate();
  const user = useCurrentUser();
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const podeEditar = user.roles.includes(Role.PMO) || user.roles.includes(Role.Admin);

  const ranked = useMemo(
    () =>
      [...items].sort((a, b) => {
        const ap = a.finalPriority ?? Number.POSITIVE_INFINITY;
        const bp = b.finalPriority ?? Number.POSITIVE_INFINITY;
        if (ap !== bp) return ap - bp;
        return weightedScore(b.score) - weightedScore(a.score);
      }),
    [items],
  );

  /* Índice da primeira demanda que estoura a capacidade acumulada. */
  const cutIndex = useMemo(() => {
    if (!ranked.some((d) => horasNaFila(d) > 0)) return -1;
    let soma = 0;
    for (let i = 0; i < ranked.length; i++) {
      soma += horasNaFila(ranked[i]);
      if (soma > CAPACIDADE_TOTAL) return i;
    }
    return -1;
  }, [ranked]);

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /** Ação de prioridade liberada pelo motor para este usuário/demanda. */
  function acaoPrioridade(d: Demand) {
    return proximasAcoes(d, user.roles, user.decisorDe).find((a) => a.id === "definirPrioridade");
  }

  async function commitPosition(d: Demand, valor: number) {
    const acao = acaoPrioridade(d);
    if (!acao || acao.guarda(d) !== true) return;
    try {
      /* aplicarAcao é a porta oficial do motor (carimba statusDesde quando
         a ação muda de estado); nunca um update solto. */
      await demandService.update(
        d.id,
        aplicarAcao(acao, d, user.name, { finalPriority: valor }),
      );
      onChanged();
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not save position",
        message: (e as Error).message,
      });
    }
  }

  return (
    <Table.ScrollContainer minWidth={820}>
      <Table verticalSpacing={8} horizontalSpacing="md">
        <Table.Thead>
          <Table.Tr>
            <Table.Th w={48}>#</Table.Th>
            <Table.Th>Demand</Table.Th>
            <Table.Th w={190}>Type</Table.Th>
            <Table.Th w={120}>Urgency</Table.Th>
            <Table.Th w={90} ta="center">
              Score
            </Table.Th>
            <Table.Th w={110} ta="center">
              Position
            </Table.Th>
            <Table.Th w={40} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {ranked.length === 0 && (
            <Table.Tr>
              <Table.Td colSpan={COLS}>
                <Text size="sm" c="dimmed" py="sm">
                  No requests match the current filters.
                </Text>
              </Table.Td>
            </Table.Tr>
          )}

          {ranked.map((d, i) => {
            const w = weightedScore(d.score);
            const isOpen = expanded.has(d.id);
            const acao = acaoPrioridade(d);
            const editable = podeEditar && !!acao && acao.guarda(d) === true;
            return (
              <Fragment key={d.id}>
                {cutIndex >= 0 && i === cutIndex && <CapacityCut />}

                <Table.Tr>
                  <Table.Td>
                    <Text size="sm" c="dimmed" fw={600}>
                      {i + 1}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Box
                      tabIndex={0}
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/demandas/${d.id}`)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") navigate(`/demandas/${d.id}`);
                      }}
                    >
                      <Text size="sm" fw={500} truncate>
                        {d.titulo}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {d.numero}
                        {d.horasEstimadas > 0 ? ` · ${d.horasEstimadas} h` : ""}
                      </Text>
                    </Box>
                  </Table.Td>
                  <Table.Td>
                    <TipoBadge value={d.tipo} />
                  </Table.Td>
                  <Table.Td>
                    <UrgenciaBadge value={d.urgencia} />
                  </Table.Td>
                  <Table.Td ta="center">
                    <Text size="sm" fw={700} c="abbott.7">
                      {w.toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {/* key inclui a posição: o valor gravado remonta o input,
                        dispensando um efeito de sincronização. */}
                    <PositionCell
                      key={`${d.id}-${d.finalPriority ?? "none"}`}
                      d={d}
                      editable={editable}
                      onCommit={commitPosition}
                    />
                  </Table.Td>
                  <Table.Td>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      size="sm"
                      aria-label={isOpen ? "Hide score detail" : "Show score detail"}
                      onClick={() => toggle(d.id)}
                    >
                      {isOpen ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                    </ActionIcon>
                  </Table.Td>
                </Table.Tr>

                {isOpen && (
                  <Table.Tr bg="var(--mantine-color-gray-0)">
                    <Table.Td colSpan={COLS}>
                      <Group gap="xl" py={2} pl={4}>
                        {CRITERIOS.map((k) => (
                          <Stack key={k} gap={2}>
                            <Text size="xs" c="dimmed">
                              {SCORE_LABELS[k]} · {(SCORE_WEIGHTS[k] * 100).toFixed(0)}%
                            </Text>
                            <Text size="sm" fw={600}>
                              {d.score[k]}{" "}
                              <Text span size="sm" c="abbott.7">
                                → {(d.score[k] * SCORE_WEIGHTS[k]).toFixed(2)}
                              </Text>
                            </Text>
                          </Stack>
                        ))}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Fragment>
            );
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  );
}

/* ---------------- Linha de corte da capacidade -------------- */
function CapacityCut() {
  return (
    <Table.Tr>
      <Table.Td colSpan={COLS} py={4}>
        <Group gap="sm" wrap="nowrap">
          <Box style={{ flex: 1, borderTop: "1px dashed var(--mantine-color-red-4)" }} />
          <Text size="xs" c="red.7" fw={600} tt="lowercase">
            capacity limit · {CAPACIDADE_TOTAL.toLocaleString("en-US")} h
          </Text>
          <Box style={{ flex: 1, borderTop: "1px dashed var(--mantine-color-red-4)" }} />
        </Group>
      </Table.Td>
    </Table.Tr>
  );
}

/* ---------------- Position (finalPriority) ------------------ */
function PositionCell({
  d,
  editable,
  onCommit,
}: {
  d: Demand;
  editable: boolean;
  onCommit: (d: Demand, valor: number) => void;
}) {
  const [draft, setDraft] = useState<string | number>(d.finalPriority ?? "");

  if (!editable) {
    return (
      <Tooltip label="Position can only be set while the request is Prioritized." withArrow>
        <Text ta="center" size="sm" fw={600} c={d.finalPriority == null ? "dimmed" : undefined}>
          {d.finalPriority ?? "—"}
        </Text>
      </Tooltip>
    );
  }

  function commit() {
    const n = typeof draft === "number" ? draft : Number(draft);
    if (!Number.isFinite(n) || n < 1) {
      setDraft(d.finalPriority ?? "");
      return;
    }
    if (n === d.finalPriority) return;
    onCommit(d, n);
  }

  return (
    <NumberInput
      size="xs"
      min={1}
      max={999}
      hideControls
      value={draft}
      onChange={setDraft}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      styles={{ input: { textAlign: "center", fontWeight: 700 } }}
    />
  );
}
