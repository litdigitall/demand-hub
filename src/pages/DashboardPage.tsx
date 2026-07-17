import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Paper,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { BarChart, LineChart } from "@mantine/charts";
import {
  IconAlertTriangle,
  IconChecks,
  IconClipboardList,
  IconRocket,
  IconShieldCheck,
  IconTrendingUp,
  type Icon,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  StatusDemanda,
  Urgencia,
  weightedScore,
  type Demand,
} from "../data/types";
import { StatusBadge, TipoBadge, UrgenciaBadge } from "../components/Badges";
import { formatRelative } from "../lib/format";
import { useT } from "../i18n";
import { useLabels } from "../i18n/useLabels";

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon: Icon;
  color: string;
  /** Clicable: navega a la lista filtrada (dashboard accionable). */
  to?: string;
  emphasized?: boolean;
}
function KpiCard({ label, value, hint, icon: Icon, color, to, emphasized }: KpiCardProps) {
  const card = (
    <Card
      withBorder
      radius="lg"
      padding="lg"
      className={to ? "hover-lift" : undefined}
      style={{
        cursor: to ? "pointer" : undefined,
        borderColor: emphasized ? `var(--mantine-color-${color}-4)` : undefined,
        borderWidth: emphasized ? 2 : 1,
        background: emphasized ? `var(--mantine-color-${color}-0)` : undefined,
        height: "100%",
      }}
    >
      <Group justify="space-between" align="flex-start">
        <div>
          <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
            {label}
          </Text>
          <Text fz={30} fw={800} lh={1.05} mt={6} c={emphasized ? `${color}.8` : undefined}>
            {value}
          </Text>
          {hint && (
            <Text size="xs" c="dimmed" mt={4}>
              {hint}
            </Text>
          )}
        </div>
        <ThemeIcon size={44} radius="md" color={color} variant={emphasized ? "filled" : "light"}>
          <Icon size={22} stroke={1.8} />
        </ThemeIcon>
      </Group>
    </Card>
  );
  return to ? (
    <Link to={to} style={{ textDecoration: "none", color: "inherit" }}>
      {card}
    </Link>
  ) : (
    card
  );
}

const TIPO_COLORS = [
  "abbott.6",
  "cyan.6",
  "orange.6",
  "violet.6",
  "gray.6",
  "red.6",
  "teal.6",
];
const URGENCIA_COLORS: Record<number, string> = {
  [Urgencia.Critico]: "red.6",
  [Urgencia.Alto]: "orange.6",
  [Urgencia.Medio]: "yellow.6",
  [Urgencia.Baixo]: "gray.5",
};

export function DashboardPage() {
  const { t, lang } = useT();
  const L = useLabels();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Demand[]>([]);

  useEffect(() => {
    demandService
      .list()
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const total = items.length;
  const novas = items.filter((d) => d.status === StatusDemanda.Nova).length;
  const emExec = items.filter((d) => d.status === StatusDemanda.EmExecucao).length;
  const concl = items.filter((d) => d.status === StatusDemanda.Concluida).length;
  const criticas = items.filter((d) => d.urgencia === Urgencia.Critico).length;
  const activeStatuses = (d: Demand) =>
    d.status !== StatusDemanda.Concluida && d.status !== StatusDemanda.Recusada;
  const overdue = items.filter(
    (d) => activeStatuses(d) && d.deadline && new Date(d.deadline) < new Date(),
  ).length;

  /* Distribución por tipo — barras horizontales ordenadas (análise UX) */
  const tipoCounts = new Map<number, number>();
  items.forEach((d) => tipoCounts.set(d.tipo, (tipoCounts.get(d.tipo) ?? 0) + 1));
  const tipoData = [...tipoCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n], i) => ({
      name: L.tipo[tipo],
      value: n,
      color: TIPO_COLORS[i % TIPO_COLORS.length],
    }));

  /* Distribuição por urgência (barra) */
  const urgenciaCounts = new Map<number, number>();
  items.forEach((d) =>
    urgenciaCounts.set(d.urgencia, (urgenciaCounts.get(d.urgencia) ?? 0) + 1),
  );
  const urgenciaData = [...urgenciaCounts.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([u, n]) => ({
      urgencia: L.urgencia[u],
      total: n,
      color: URGENCIA_COLORS[u] ?? "gray.5",
    }));

  /* Volume por mês (últimos 6 meses) */
  const months: { label: string; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const locale = lang === "en" ? "en-US" : lang === "es" ? "es-ES" : "pt-BR";
    const label = d.toLocaleDateString(locale, { month: "short" }).replace(".", "");
    months.push({ key, label });
  }
  const monthData = months.map((m) => {
    const total = items.filter((d) => d.dataSolicitacao.slice(0, 7) === m.key).length;
    return { mes: m.label, demandas: total };
  });

  /* Top 5 priorizadas (por score ponderado) */
  const top5 = [...items]
    .sort((a, b) => weightedScore(b.score) - weightedScore(a.score))
    .slice(0, 5);

  /* Últimas demandas (mais recentes) */
  const recent = items.slice(0, 5);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("dashboard_overview")}</Title>
          <Text c="dimmed" mt={4}>
            {t("dashboard_summary", { total, exec: emExec, critical: criticas })}
          </Text>
        </div>
        <Button component={Link} to="/demandas/nova" radius="md">
          + {t("newDemand")}
        </Button>
      </Group>

      {/* KPIs accionables — lo urgente primero (análise UX): críticas y vencidas
          con énfasis; cada tarjeta navega a la lista filtrada. */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
        <KpiCard
          label="Critical"
          value={criticas}
          icon={IconAlertTriangle}
          color="red"
          emphasized={criticas > 0}
          hint="Needs attention first"
          to={`/demandas?urg=${Urgencia.Critico}`}
        />
        <KpiCard
          label="Overdue"
          value={overdue}
          icon={IconAlertTriangle}
          color="orange"
          emphasized={overdue > 0}
          hint="Past their deadline"
          to="/demandas?overdue=1"
        />
        <KpiCard
          label={t("kpi_new")}
          value={items.filter((d) => d.status <= StatusDemanda.EmAnalise).length}
          icon={IconRocket}
          color="blue"
          hint={t("kpi_new_count", { n: novas })}
          to={`/demandas?status=${StatusDemanda.Nova}`}
        />
        <KpiCard
          label={t("kpi_inExec")}
          value={emExec}
          icon={IconTrendingUp}
          color="yellow"
          hint={t("kpi_completed", { n: concl })}
          to={`/demandas?status=${StatusDemanda.EmExecucao}`}
        />
        <KpiCard
          label={t("kpi_total")}
          value={total}
          icon={IconClipboardList}
          color="abbott"
          hint={t("kpi_demands")}
          to="/demandas"
        />
      </SimpleGrid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 5 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Text fw={700} mb="md">
              {t("chart_byType")}
            </Text>
            {/* Barras horizontales ordenadas (sustituye al donut — análise UX) */}
            <BarChart
              h={Math.max(180, tipoData.length * 42)}
              data={tipoData.map((d) => ({ type: d.name, count: d.value }))}
              dataKey="type"
              orientation="vertical"
              series={[{ name: "count", color: "abbott.6", label: "Requests" }]}
              withLegend={false}
              barProps={{ radius: 6 }}
              gridAxis="x"
              tickLine="none"
              yAxisProps={{ width: 150 }}
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 7 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Text fw={700} mb="md">
              {t("chart_byUrgency")}
            </Text>
            <BarChart
              h={220}
              data={urgenciaData}
              dataKey="urgencia"
              series={[{ name: "total", color: "abbott.6", label: "Demands" }]}
              withLegend={false}
              barProps={{ radius: 6 }}
              tickLine="none"
              gridAxis="y"
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card withBorder radius="lg" padding="lg">
            <Text fw={700} mb="md">
              {t("chart_inflow")}
            </Text>
            <LineChart
              h={200}
              data={monthData}
              dataKey="mes"
              series={[{ name: "demandas", color: "abbott.6", label: "Demands" }]}
              curveType="monotone"
              withDots
              gridAxis="y"
              tickLine="none"
            />
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={700}>{t("top_priority")}</Text>
              <Anchor component={Link} to="/scoreboard" size="sm">
                {t("see_scoreboard")}
              </Anchor>
            </Group>
            <Table verticalSpacing="sm">
              <Table.Tbody>
                {top5.map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/demandas/${d.id}`} fw={600}>
                        {d.numero} · {d.titulo}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {d.areaSolicitante}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={6} justify="flex-end">
                        <ThemeIcon
                          size={28}
                          radius="md"
                          variant="light"
                          color={
                            weightedScore(d.score) >= 4
                              ? "red"
                              : weightedScore(d.score) >= 3
                                ? "orange"
                                : "gray"
                          }
                        >
                          <IconShieldCheck size={16} />
                        </ThemeIcon>
                        <Text fw={700}>{weightedScore(d.score).toFixed(2)}</Text>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder radius="lg" p="lg" h="100%">
            <Group justify="space-between" mb="md">
              <Text fw={700}>{t("recent")}</Text>
              <Anchor component={Link} to="/demandas" size="sm">
                {t("see_all")}
              </Anchor>
            </Group>
            <Stack gap="sm">
              {recent.map((d) => (
                <Group key={d.id} justify="space-between" wrap="nowrap">
                  <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
                    <Anchor component={Link} to={`/demandas/${d.id}`} fw={600} truncate>
                      {d.titulo}
                    </Anchor>
                    <Group gap="xs">
                      <TipoBadge value={d.tipo} />
                      <UrgenciaBadge value={d.urgencia} />
                      <Text size="xs" c="dimmed">
                        {formatRelative(d.dataSolicitacao)}
                      </Text>
                    </Group>
                  </Stack>
                  <StatusBadge value={d.status} />
                </Group>
              ))}
              {recent.length === 0 && (
                <Center py="md">
                  <Group gap="xs">
                    <IconChecks size={18} />
                    <Text size="sm" c="dimmed">
                      {t("none_registered")}
                    </Text>
                  </Group>
                </Center>
              )}
            </Stack>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
