import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Progress,
  RingProgress,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Button } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBuildingFactory2,
  IconCheck,
  IconClock,
  IconCloudComputing,
  IconExchange,
  IconUsersGroup,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { getFteAvailability } from "../integrations/serviceNow";
import {
  CAPACIDADE_PADRAO_HORAS,
  StatusDemanda,
  TIMES_IMPLANTACAO,
  type Demand,
  type TimeImplantacao,
} from "../data/types";
import { useT } from "../i18n";

interface TeamStats {
  time: TimeImplantacao;
  capacidade: number;
  alocado: number;
  utilizacao: number; // %
  disponivel: number;
  demandasAtivas: Demand[];
}

const TIME_ICON = {
  "Internal Delivery": IconBuildingFactory2,
  "External Delivery": IconExchange,
  Support: IconUsersGroup,
} as const;

const TIME_COLOR = {
  "Internal Delivery": "blue",
  "External Delivery": "grape",
  Support: "teal",
} as const;

function helpKeyFor(time: TimeImplantacao): "cap_team_help" | "cap_team_help_ext" | "cap_team_help_sus" {
  if (time === "External Delivery") return "cap_team_help_ext";
  if (time === "Support") return "cap_team_help_sus";
  return "cap_team_help";
}

function labelKeyFor(time: TimeImplantacao): "cap_internal" | "cap_external" | "cap_support" {
  if (time === "External Delivery") return "cap_external";
  if (time === "Support") return "cap_support";
  return "cap_internal";
}

export function CapacityPage() {
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Demand[]>([]);
  const [syncEm, setSyncEm] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    demandService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  function syncServiceNow() {
    setSyncing(true);
    // Usa a camada de integração isolada (src/integrations/serviceNow.ts).
    getFteAvailability()
      .then(() => {
        setSyncEm(new Date().toLocaleString("es-ES"));
        notifications.show({
          color: "teal",
          title: "Capacity sincronizado",
          message: "FTE actualizado vía ServiceNow API (simulado).",
        });
      })
      .finally(() => setSyncing(false));
  }

  const stats: TeamStats[] = useMemo(() => {
    return TIMES_IMPLANTACAO.map((time) => {
      const capacidade = CAPACIDADE_PADRAO_HORAS[time];
      const ativas = items.filter(
        (d) =>
          d.time === time &&
          (d.status === StatusDemanda.EmExecucao ||
            d.status === StatusDemanda.Priorizada),
      );
      const alocado = ativas.reduce((acc, d) => acc + (d.horasEstimadas ?? 0), 0);
      const utilizacao = capacidade > 0 ? Math.round((alocado / capacidade) * 100) : 0;
      return {
        time,
        capacidade,
        alocado,
        utilizacao,
        disponivel: Math.max(0, capacidade - alocado),
        demandasAtivas: ativas,
      };
    });
  }, [items]);

  const totalCapacidade = stats.reduce((acc, s) => acc + s.capacidade, 0);
  const totalAlocado = stats.reduce((acc, s) => acc + s.alocado, 0);
  const totalUtilizacao = Math.round((totalAlocado / Math.max(totalCapacidade, 1)) * 100);

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>{t("cap_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("cap_subtitle")}
          </Text>
          <Group gap="xs" mt={6}>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconCloudComputing size={14} />}
              loading={syncing}
              onClick={syncServiceNow}
            >
              Sincronizar con ServiceNow
            </Button>
            <Badge variant="dot" color={syncEm ? "teal" : "gray"}>
              {syncEm ? `Fuente: ServiceNow (simulado) · ${syncEm}` : "Fuente: estimaciones del app"}
            </Badge>
          </Group>
        </div>
        <Card withBorder radius="lg" padding="md">
          <Group gap="md">
            <RingProgress
              size={64}
              thickness={7}
              roundCaps
              sections={[
                {
                  value: Math.min(100, totalUtilizacao),
                  color: totalUtilizacao > 90 ? "red" : totalUtilizacao > 70 ? "orange" : "teal",
                },
              ]}
              label={
                <Center>
                  <Text size="xs" fw={800}>
                    {totalUtilizacao}%
                  </Text>
                </Center>
              }
            />
            <div>
              <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
                {t("cap_total_utilization")}
              </Text>
              <Text fw={800} fz="lg">
                {totalAlocado.toLocaleString()} / {totalCapacidade.toLocaleString()} h
              </Text>
              <Text size="xs" c="dimmed">
                {(totalCapacidade - totalAlocado).toLocaleString()} h {t("cap_available").toLowerCase()}
              </Text>
            </div>
          </Group>
        </Card>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        {stats.map((s) => {
          const Icon = TIME_ICON[s.time];
          const color = TIME_COLOR[s.time];
          const isOver = s.utilizacao > 100;
          const isHot = s.utilizacao > 90;
          return (
            <Card key={s.time} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm">
                <Group gap="sm">
                  <ThemeIcon size={42} radius="md" variant="light" color={color}>
                    <Icon size={22} />
                  </ThemeIcon>
                  <div>
                    <Text fw={700}>{t(labelKeyFor(s.time))}</Text>
                    <Text size="xs" c="dimmed">
                      {t(helpKeyFor(s.time))}
                    </Text>
                  </div>
                </Group>
                {isOver ? (
                  <Badge color="red" variant="filled" leftSection={<IconAlertTriangle size={12} />}>
                    {t("cap_overallocated")}
                  </Badge>
                ) : isHot ? (
                  <Badge color="orange" variant="light">
                    {t("cap_limit")}
                  </Badge>
                ) : (
                  <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                    {t("cap_ok")}
                  </Badge>
                )}
              </Group>

              <SimpleGrid cols={2} spacing="xs" mb="sm">
                <Box>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                    {t("cap_capacity")}
                  </Text>
                  <Text fw={800} fz="lg">
                    {s.capacidade.toLocaleString()} h
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                    {t("cap_allocated")}
                  </Text>
                  <Text fw={800} fz="lg" c={isOver ? "red" : isHot ? "orange" : "dark"}>
                    {s.alocado.toLocaleString()} h
                  </Text>
                </Box>
              </SimpleGrid>

              <Group justify="space-between" mb={4}>
                <Group gap={4}>
                  <IconClock size={13} />
                  <Text size="xs" c="dimmed">
                    {t("cap_utilization")}
                  </Text>
                </Group>
                <Text size="xs" fw={700} c={isOver ? "red" : "dark"}>
                  {s.utilizacao}%
                </Text>
              </Group>
              <Progress
                value={Math.min(100, s.utilizacao)}
                color={isOver ? "red" : isHot ? "orange" : color}
                size="lg"
                radius="xl"
              />
              <Text size="xs" c="dimmed" mt={4}>
                {s.disponivel.toLocaleString()} h {t("cap_available").toLowerCase()} ·{" "}
                {s.demandasAtivas.length} {t("cap_demands")}
              </Text>

              {s.demandasAtivas.length > 0 && (
                <>
                  <Text size="xs" fw={600} mt="md" mb={4} tt="uppercase" c="dimmed" lts={1}>
                    {t("cap_demands")}
                  </Text>
                  <Table verticalSpacing="xs">
                    <Table.Tbody>
                      {s.demandasAtivas.slice(0, 6).map((d) => (
                        <Table.Tr key={d.id}>
                          <Table.Td>
                            <Anchor component={Link} to={`/demandas/${d.id}`} size="sm" fw={600}>
                              {d.titulo}
                            </Anchor>
                            <Text size="xs" c="dimmed">
                              {d.numero}
                            </Text>
                          </Table.Td>
                          <Table.Td ta="right">
                            <Badge variant="light" color={color}>
                              {d.horasEstimadas} h
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </>
              )}
            </Card>
          );
        })}
      </SimpleGrid>

      <Paper withBorder radius="lg" p="md" bg="gray.0">
        <Text size="sm" c="dimmed">
          {t("cap_help")}
        </Text>
      </Paper>
    </Stack>
  );
}
