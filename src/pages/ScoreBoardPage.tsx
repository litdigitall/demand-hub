import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  NumberInput,
  Paper,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalculator,
  IconChevronDown,
  IconChevronUp,
  IconFlame,
  IconInfoCircle,
  IconRefresh,
  IconSparkles,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  SCORE_WEIGHTS,
  rawScoreSum,
  weightedScore,
  type Demand,
  type Score,
} from "../data/types";
import { TipoBadge, UrgenciaBadge } from "../components/Badges";
import { useT } from "../i18n";

const SCORE_COLS: { key: keyof Score; short: string }[] = [
  { key: "businessImpact", short: "Impact" },
  { key: "riskOfNoExecution", short: "Risk" },
  { key: "technicalChallenge", short: "Tech" },
  { key: "revenuePotential", short: "Revenue" },
  { key: "strategicFit", short: "Strategic" },
  { key: "stakeholder", short: "Stkh" },
  { key: "urgency", short: "Urg" },
];

function priorityColor(p: number | null | undefined): string {
  if (p == null) return "gray";
  if (p <= 3) return "red";
  if (p <= 6) return "orange";
  if (p <= 10) return "yellow";
  return "gray";
}

export function ScoreBoardPage() {
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Demand[]>([]);
  const [soTop, setSoTop] = useState(false); // portfólio: só score alto (≥4,5)
  // Linhas expandidas ("View score detail") — evita sobrecarga visual (análise UX)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      const data = await demandService.list();
      setItems(orderForBoard(data));
    } finally {
      setLoading(false);
    }
  }

  /** Ordena: prioridade manual (finalPriority) primeiro; resto por score ponderado desc. */
  function orderForBoard(data: Demand[]): Demand[] {
    return [...data].sort((a, b) => {
      const ap = a.finalPriority ?? Number.POSITIVE_INFINITY;
      const bp = b.finalPriority ?? Number.POSITIVE_INFINITY;
      if (ap !== bp) return ap - bp;
      return weightedScore(b.score) - weightedScore(a.score);
    });
  }

  async function autoSortByScore() {
    const sorted = [...items].sort(
      (a, b) => weightedScore(b.score) - weightedScore(a.score),
    );
    const updated = await Promise.all(
      sorted.map((d, i) =>
        demandService.update(d.id, { finalPriority: i + 1 }),
      ),
    );
    setItems(orderForBoard(updated));
    notifications.show({
      color: "abbott",
      title: t("score_notification_resorted"),
      message: t("score_notification_resortedDesc"),
    });
  }

  async function setPriority(id: string, val: number | "") {
    const numeric = typeof val === "number" ? val : null;
    const updated = await demandService.update(id, { finalPriority: numeric });
    setItems((prev) => orderForBoard(prev.map((x) => (x.id === id ? updated : x))));
  }

  async function move(id: string, direction: -1 | 1) {
    const idx = items.findIndex((d) => d.id === id);
    if (idx < 0) return;
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    const ap = a.finalPriority ?? idx + 1;
    const bp = b.finalPriority ?? swapIdx + 1;
    await demandService.update(a.id, { finalPriority: bp });
    await demandService.update(b.id, { finalPriority: ap });
    refresh();
  }

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const totalPriorizadas = items.filter((d) => d.finalPriority != null).length;
  const avgScore =
    items.reduce((acc, d) => acc + weightedScore(d.score), 0) / Math.max(items.length, 1);
  const visiveis = soTop ? items.filter((d) => weightedScore(d.score) >= 4.5) : items;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>{t("score_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("score_summary", { n: items.length, prio: totalPriorizadas, avg: avgScore.toFixed(2) })}
          </Text>
        </div>
        <Group>
          <Tooltip label={t("refresh")}>
            <ActionIcon size="lg" variant="default" onClick={refresh}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button
            variant={soTop ? "filled" : "default"}
            color="red"
            leftSection={<IconFlame size={16} />}
            onClick={() => setSoTop((v) => !v)}
          >
            Top score portfolio (≥4.5)
          </Button>
          <Button
            variant="default"
            leftSection={<IconSparkles size={16} />}
            onClick={autoSortByScore}
          >
            {t("score_resort")}
          </Button>
        </Group>
      </Group>

      <Paper withBorder radius="lg" p="md" bg="abbott.0">
        <Group gap="md" wrap="wrap">
          <IconInfoCircle size={20} color="var(--mantine-color-abbott-8)" />
          <Box style={{ flex: 1 }}>
            <Text size="sm">{t("score_help_box")}</Text>
            <Group gap="xs" mt={6}>
              {SCORE_COLS.map(({ key, short }) => (
                <Badge key={key} variant="outline" color="gray">
                  {short} {(SCORE_WEIGHTS[key] * 100).toFixed(0)}%
                </Badge>
              ))}
            </Group>
          </Box>
        </Group>
      </Paper>

      {/* Tabla compacta (análise UX): Demand · Type · Priority · Score · Position
          + fila expandible "View score detail" con los 7 criterios/validación. */}
      <Card withBorder radius="lg" padding={0}>
        <Table.ScrollContainer minWidth={760}>
          <Table verticalSpacing="sm" highlightOnHover horizontalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={80}>#</Table.Th>
                <Table.Th>{t("list_demand")}</Table.Th>
                <Table.Th>{t("list_type")}</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th ta="center" w={100}>{t("list_score")}</Table.Th>
                <Table.Th w={120} ta="center">Position</Table.Th>
                <Table.Th w={140} />
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {visiveis.map((d, i) => {
                const wScore = weightedScore(d.score);
                const isOpen = expanded.has(d.id);
                const v = d.avaliacoes.length;
                const stack = !!d.stackValidadaPor;
                return (
                  <React.Fragment key={d.id}>
                    <Table.Tr>
                      <Table.Td>
                        <Group gap={4}>
                          <Text fw={700}>{d.finalPriority ?? "—"}</Text>
                          <Stack gap={0}>
                            <ActionIcon size="xs" variant="subtle" disabled={i === 0} onClick={() => move(d.id, -1)}>
                              <IconChevronUp size={12} />
                            </ActionIcon>
                            <ActionIcon size="xs" variant="subtle" disabled={i === items.length - 1} onClick={() => move(d.id, 1)}>
                              <IconChevronDown size={12} />
                            </ActionIcon>
                          </Stack>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Anchor component={Link} to={`/demandas/${d.id}`} fw={600}>
                          {d.titulo}
                        </Anchor>
                        <Text size="xs" c="dimmed">
                          {d.numero} · {d.areaSolicitante}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <TipoBadge value={d.tipo} />
                      </Table.Td>
                      <Table.Td>
                        <UrgenciaBadge value={d.urgencia} />
                      </Table.Td>
                      <Table.Td ta="center">
                        <Badge size="lg" variant="filled" color={wScore >= 4 ? "red" : wScore >= 3 ? "orange" : "abbott"}>
                          {wScore.toFixed(2)}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <NumberInput
                          size="xs"
                          min={1}
                          max={999}
                          value={d.finalPriority ?? ""}
                          onChange={(val) => setPriority(d.id, typeof val === "number" ? val : "")}
                          styles={{
                            input: {
                              textAlign: "center",
                              fontWeight: 700,
                              color: `var(--mantine-color-${priorityColor(d.finalPriority)}-7)`,
                            },
                          }}
                        />
                      </Table.Td>
                      <Table.Td>
                        <Button
                          size="compact-xs"
                          variant="subtle"
                          rightSection={isOpen ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                          onClick={() => toggleExpand(d.id)}
                        >
                          {isOpen ? "Hide detail" : "View score detail"}
                        </Button>
                      </Table.Td>
                    </Table.Tr>
                    {isOpen && (
                      <Table.Tr bg="gray.0">
                        <Table.Td colSpan={7}>
                          <Group gap="lg" wrap="wrap" py={4}>
                            {SCORE_COLS.map((c) => (
                              <Stack key={c.key} gap={2} align="center">
                                <Text size="xs" c="dimmed">
                                  {c.short} · {(SCORE_WEIGHTS[c.key] * 100).toFixed(0)}%
                                </Text>
                                <Badge
                                  size="sm"
                                  variant="light"
                                  color={d.score[c.key] >= 4 ? "abbott" : d.score[c.key] >= 3 ? "blue" : "gray"}
                                >
                                  {d.score[c.key]} → {(d.score[c.key] * SCORE_WEIGHTS[c.key]).toFixed(2)}
                                </Badge>
                              </Stack>
                            ))}
                            <Stack gap={2} align="center">
                              <Text size="xs" c="dimmed">Validation</Text>
                              <Badge variant={v === 7 ? "filled" : "outline"} color={v === 7 ? "teal" : v > 0 ? "yellow" : "gray"}>
                                {v}/7{stack && " ✓ stack"}
                              </Badge>
                            </Stack>
                            <Stack gap={2} align="center">
                              <Text size="xs" c="dimmed">Σ raw</Text>
                              <Badge variant="outline" color="gray">{rawScoreSum(d.score)}</Badge>
                            </Stack>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </React.Fragment>
                );
              })}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>

      <Alert color="abbott" variant="light" icon={<IconCalculator size={18} />}>
        <Text size="sm">
          <strong>{t("score_calc_title")}</strong> {t("score_calc_help")}
        </Text>
        <Group gap={6} mt={4}>
          <ThemeIcon size="xs" color="red" variant="filled">
            <IconInfoCircle size={10} />
          </ThemeIcon>
          <Text size="xs" c="dimmed">
            {t("score_legend")}
          </Text>
        </Group>
      </Alert>
    </Stack>
  );
}
