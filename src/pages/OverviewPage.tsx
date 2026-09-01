/* ============================================================
   Overview — a única tela de leitura do funil.
   Substitui DashboardPage (4 gráficos, muitos deles vazios numa
   base pequena) e ReportPage (KPIs duplicados + alert didático).

   O que sobrou, e por quê:
     - 5 KPIs clicáveis → cada número leva à lista já filtrada
       (mesmas regras de filtro da DemandasPage, senão o número
       da faixa não bate com o da lista).
     - 1 gráfico: volume por área. Responde "de onde vem a fila".
       Sem série temporal (meses vazios) e sem donut.
     - Top priority (5 linhas) → entra no detalhe.
     - Export monthly deck → PPTX real (monthlyReport.ts).
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPresentation } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { StatusDemanda, weightedScore, type Demand } from "../data/types";
import { StatusBadge } from "../components/Badges";
import { useCurrentUser } from "../lib/useCurrentUser";
import { Role } from "../domain/roles";

/* Máximo de barras no gráfico; o excedente vira uma barra "Other". */
const MAX_BARS = 8;

/* ---------------- KPI clicável ------------------------------ */
interface KpiTileProps {
  label: string;
  value: number;
  /** Destino já filtrado — o número e a lista têm que casar. */
  to: string;
  /** Cor do número quando > 0 (só para o que exige ação). */
  tone?: string;
}
function KpiTile({ label, value, to, tone }: KpiTileProps) {
  return (
    <Card
      component={Link}
      to={to}
      withBorder
      radius="lg"
      padding="md"
      className="hover-lift"
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <Text size="xs" fw={600} tt="uppercase" lts={0.8} c="dimmed">
        {label}
      </Text>
      <Text fz={30} fw={800} lh={1.1} mt={6} c={value === 0 ? "dimmed" : tone}>
        {value}
      </Text>
    </Card>
  );
}

/* ---------------- Página ------------------------------------ */
export function OverviewPage() {
  const user = useCurrentUser();
  /* O deck consolida a base inteira — mesmo escopo da antiga ReportPage,
     que era admin-only. Fora de PMO/Admin o botão não existe. */
  const podeExportar = user.roles.includes(Role.PMO) || user.roles.includes(Role.Admin);
  const [items, setItems] = useState<Demand[]>([]);
  /** Instante da carga — referência do cálculo de atraso (render puro). */
  const [carregadoEm, setCarregadoEm] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let vivo = true;
    demandService
      .list()
      .then((data) => {
        if (!vivo) return;
        setItems(data);
        setCarregadoEm(Date.now());
      })
      .catch((err: unknown) => {
        notifications.show({
          color: "red",
          title: "Could not load requests",
          message: err instanceof Error ? err.message : "Unexpected error.",
        });
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const kpis = useMemo(() => {
    const by = (s: number) => items.filter((d) => d.status === s).length;
    return {
      total: items.length,
      novas: by(StatusDemanda.Nova),
      emAprovacao: by(StatusDemanda.EmAprovacao),
      emAnalise: by(StatusDemanda.EmAnalise),
      emExecucao: by(StatusDemanda.EmExecucao),
      /* Mesma regra do filtro `overdue=1` da lista de demandas. */
      atrasadas: items.filter(
        (d) =>
          !!d.deadline &&
          new Date(d.deadline).getTime() < carregadoEm &&
          d.status !== StatusDemanda.Concluida &&
          d.status !== StatusDemanda.Recusada,
      ).length,
    };
  }, [items, carregadoEm]);

  /* Volume por área solicitante — ordenado, com agregação da cauda. */
  const areaData = useMemo(() => {
    const contagem = new Map<string, number>();
    items.forEach((d) => {
      const area = d.areaSolicitante?.trim() || "Unassigned";
      contagem.set(area, (contagem.get(area) ?? 0) + 1);
    });
    const ordenado = [...contagem.entries()].sort((a, b) => b[1] - a[1]);
    const topo = ordenado.slice(0, MAX_BARS).map(([area, count]) => ({ area, count }));
    const resto = ordenado.slice(MAX_BARS);
    if (resto.length > 0) {
      topo.push({
        area: `Other (${resto.length})`,
        count: resto.reduce((s, [, n]) => s + n, 0),
      });
    }
    return topo;
  }, [items]);

  /** Maior volume da lista: escala as barras sem depender de lib de gráfico. */
  const maxArea = Math.max(1, ...areaData.map((a) => a.count));

  /* Fila viva ordenada por score — o que deveria sair primeiro. */
  const topPriority = useMemo(
    () =>
      items
        .filter(
          (d) =>
            d.status !== StatusDemanda.Concluida &&
            d.status !== StatusDemanda.Recusada &&
            d.status !== StatusDemanda.Rascunho,
        )
        .sort((a, b) => {
          const diff = weightedScore(b.score) - weightedScore(a.score);
          if (diff !== 0) return diff;
          return (a.finalPriority ?? 999) - (b.finalPriority ?? 999);
        })
        .slice(0, 5),
    [items],
  );

  async function exportDeck() {
    setExporting(true);
    try {
      // import dinâmico: pptxgenjs (~370 kB) só entra quando o deck é pedido
      const { generateMonthlyReport } = await import("../lib/monthlyReport");
      await generateMonthlyReport(items);
    } catch (err: unknown) {
      notifications.show({
        color: "red",
        title: "Export failed",
        message: err instanceof Error ? err.message : "Could not generate the deck.",
      });
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <Title order={2}>Overview</Title>
        {podeExportar && (
          <Button
            radius="md"
            leftSection={<IconPresentation size={18} />}
            loading={exporting}
            onClick={exportDeck}
          >
            Export monthly deck
          </Button>
        )}
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="md">
        <KpiTile
          label="In triage"
          value={kpis.novas}
          to={`/demandas?status=${StatusDemanda.Nova}`}
        />
        <KpiTile
          label="Needs decision"
          value={kpis.emAprovacao}
          tone="grape.7"
          to={`/demandas?status=${StatusDemanda.EmAprovacao}`}
        />
        <KpiTile
          label="In evaluation"
          value={kpis.emAnalise}
          to={`/demandas?status=${StatusDemanda.EmAnalise}`}
        />
        <KpiTile label="Overdue" value={kpis.atrasadas} tone="red.7" to="/demandas?overdue=1" />
        <KpiTile
          label="In execution"
          value={kpis.emExecucao}
          to={`/demandas?status=${StatusDemanda.EmExecucao}`}
        />
        <KpiTile label="Total" value={kpis.total} to="/demandas" />
      </SimpleGrid>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Text fw={700} mb="md">
              Requests by area
            </Text>
            {areaData.length === 0 ? (
              <Text size="sm" c="dimmed">
                No requests yet.
              </Text>
            ) : (
              <Stack gap={10}>
                {areaData.map((a) => (
                  <Group key={a.area} gap="sm" wrap="nowrap">
                    <Text size="sm" c="dimmed" ta="right" w={124} lh={1.25} lineClamp={2}>
                      {a.area}
                    </Text>
                    <Box
                      style={{
                        flex: 1,
                        height: 10,
                        borderRadius: 999,
                        background: "var(--mantine-color-gray-1)",
                      }}
                    >
                      <Box
                        style={{
                          width: `${Math.round((a.count / maxArea) * 100)}%`,
                          height: "100%",
                          borderRadius: 999,
                          background: "var(--mantine-color-abbott-6)",
                        }}
                      />
                    </Box>
                    <Text size="sm" fw={700} w={22} ta="right">
                      {a.count}
                    </Text>
                  </Group>
                ))}
              </Stack>
            )}
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Text fw={700} mb="md">
              Top priority
            </Text>
            {topPriority.length === 0 ? (
              <Text size="sm" c="dimmed">
                No open requests.
              </Text>
            ) : (
              <Table verticalSpacing="xs" horizontalSpacing="sm" highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={96}>
                      <Text size="xs" c="dimmed" fw={600}>
                        No.
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text size="xs" c="dimmed" fw={600}>
                        Request
                      </Text>
                    </Table.Th>
                    <Table.Th w={132}>
                      <Text size="xs" c="dimmed" fw={600}>
                        Area
                      </Text>
                    </Table.Th>
                    <Table.Th w={122}>
                      <Text size="xs" c="dimmed" fw={600}>
                        Status
                      </Text>
                    </Table.Th>
                    <Table.Th w={66} ta="right">
                      <Text size="xs" c="dimmed" fw={600}>
                        Score
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {topPriority.map((d) => (
                    <Table.Tr key={d.id}>
                      <Table.Td>
                        <Text size="xs" c="dimmed" ff="monospace" style={{ whiteSpace: "nowrap" }}>
                          {d.numero}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Anchor
                          component={Link}
                          to={`/demandas/${d.id}`}
                          fw={600}
                          size="sm"
                          lineClamp={1}
                        >
                          {d.titulo}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed" lh={1.25} lineClamp={2}>
                          {d.areaSolicitante || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <StatusBadge value={d.status} />
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={700}>
                          {weightedScore(d.score).toFixed(2)}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
