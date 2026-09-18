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
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBuildingFactory2,
  IconCheck,
  IconClock,
  IconExchange,
  IconHelpCircle,
  IconUsersGroup,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  CAPACIDADE_PADRAO_HORAS,
  CONSOME_CAPACIDADE,
  TIMES_IMPLANTACAO,
  type Demand,
  type TimeImplantacao,
} from "../data/types";
import { useT } from "../i18n";
import { formatNumber, plural } from "../lib/format";

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

  useEffect(() => {
    demandService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  /* Consome capacidade = Prioritized ou In execution. A regra mora em
     data/types (CONSOME_CAPACIDADE) e vale igual aqui, na Overview e no
     ranking — antes esta tela repetia a condição à mão. */
  const comprometidas = useMemo(
    () => items.filter((d) => CONSOME_CAPACIDADE.includes(d.status)),
    [items],
  );

  const stats: TeamStats[] = useMemo(() => {
    return TIMES_IMPLANTACAO.map((time) => {
      const capacidade = CAPACIDADE_PADRAO_HORAS[time];
      const ativas = comprometidas.filter((d) => d.time === time);
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
  }, [comprometidas]);

  /* Demanda comprometida SEM time definido. Antes ela simplesmente sumia da
     conta: a tela dizia 100% de utilização enquanto havia centenas de horas
     aprovadas sem dono. Um buraco assim é exatamente o que esta tela existe
     para mostrar. */
  const semTime = useMemo(
    () => comprometidas.filter((d) => !d.time),
    [comprometidas],
  );
  const horasSemTime = semTime.reduce((acc, d) => acc + (d.horasEstimadas ?? 0), 0);

  const totalCapacidade = stats.reduce((acc, s) => acc + s.capacidade, 0);
  const totalAlocado = stats.reduce((acc, s) => acc + s.alocado, 0);
  const totalUtilizacao = Math.round((totalAlocado / Math.max(totalCapacidade, 1)) * 100);
  const totalComprometido = totalAlocado + horasSemTime;
  const saldo = totalCapacidade - totalComprometido;

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
        </div>
      </Group>

      {/* Faixa que fecha a conta: comprometido = por time + sem time. Antes a
          tela só somava o que tinha time, então exibia 100% de utilização com
          horas aprovadas invisíveis. */}
      <Card withBorder radius="lg" padding={0}>
        <Group gap={0} wrap="nowrap">
          <Box px="md" py={10} style={{ flex: 1 }}>
            <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed">
              Monthly capacity
            </Text>
            <Text fz={24} fw={800} lh={1.15}>
              {formatNumber(totalCapacidade)} h
            </Text>
          </Box>
          <Box px="md" py={10} style={{ flex: 1 }}>
            <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed">
              Committed
            </Text>
            <Text
              fz={24}
              fw={800}
              lh={1.15}
              c={totalComprometido > totalCapacidade ? "red.7" : undefined}
            >
              {formatNumber(totalComprometido)} h
            </Text>
          </Box>
          <Box px="md" py={10} style={{ flex: 1 }}>
            <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed">
              Without a team
            </Text>
            <Text fz={24} fw={800} lh={1.15} c={horasSemTime > 0 ? "orange.7" : "dimmed"}>
              {formatNumber(horasSemTime)} h
            </Text>
          </Box>
          <Box px="md" py={10} style={{ flex: 1 }}>
            <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed">
              {saldo >= 0 ? "Left this month" : "Over capacity"}
            </Text>
            <Text fz={24} fw={800} lh={1.15} c={saldo < 0 ? "red.7" : undefined}>
              {formatNumber(Math.abs(saldo))} h
            </Text>
          </Box>
          <Box px="md" py={10} w={170} style={{ flexShrink: 0 }}>
            <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed">
              Teams utilisation
            </Text>
            <Group gap="xs" align="baseline">
              <Text
                fz={24}
                fw={800}
                lh={1.15}
                c={totalUtilizacao > 100 ? "red.7" : totalUtilizacao > 90 ? "orange.7" : undefined}
              >
                {totalUtilizacao}%
              </Text>
              <Text fz="xs" c="dimmed">
                {formatNumber(totalAlocado)} h
              </Text>
            </Group>
          </Box>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2, lg: 4 }} spacing="md">
        {stats.map((s) => {
          const Icon = TIME_ICON[s.time];
          const color = TIME_COLOR[s.time];
          const isOver = s.utilizacao > 100;
          const isHot = s.utilizacao > 90;
          return (
            <Card key={s.time} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <ThemeIcon size={42} radius="md" variant="light" color={color}>
                    <Icon size={22} />
                  </ThemeIcon>
                  <div style={{ minWidth: 0 }}>
                    <Text fw={700}>{t(labelKeyFor(s.time))}</Text>
                    <Text size="xs" c="dimmed" lineClamp={2}>
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
                    {formatNumber(s.capacidade)} h
                  </Text>
                </Box>
                <Box>
                  <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                    {t("cap_allocated")}
                  </Text>
                  <Text fw={800} fz="lg" c={isOver ? "red" : isHot ? "orange" : "dark"}>
                    {formatNumber(s.alocado)} h
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
                {formatNumber(s.disponivel)} h {t("cap_available").toLowerCase()} ·{" "}
                {plural(s.demandasAtivas.length, "demand")}
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
                          <Table.Td ta="right" w={64}>
                            <Text size="sm" fw={700} style={{ whiteSpace: "nowrap" }}>
                              {d.horasEstimadas} h
                            </Text>
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

        {/* O buraco: aprovado, consome hora, e ninguém definiu o time. */}
        {semTime.length > 0 && (
          <Card
            withBorder
            radius="lg"
            padding="lg"
            style={{ borderColor: "var(--mantine-color-orange-3)" }}
          >
            <Group justify="space-between" mb="sm" wrap="nowrap" align="flex-start">
              <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                <ThemeIcon size={42} radius="md" variant="light" color="orange">
                  <IconHelpCircle size={22} />
                </ThemeIcon>
                <div style={{ minWidth: 0 }}>
                  <Text fw={700}>Without a team</Text>
                  <Text size="xs" c="dimmed" lineClamp={2}>
                    Approved work with no delivery team defined
                  </Text>
                </div>
              </Group>
              <Badge color="orange" variant="light">
                {plural(semTime.length, "request")}
              </Badge>
            </Group>

            <Box mb="sm">
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                Hours at stake
              </Text>
              <Text fw={800} fz="lg" c="orange.7">
                {formatNumber(horasSemTime)} h
              </Text>
            </Box>

            <Text size="xs" fw={600} mb={4} tt="uppercase" c="dimmed" lts={1}>
              {t("cap_demands")}
            </Text>
            <Table verticalSpacing={5}>
              <Table.Tbody>
                {semTime.slice(0, 8).map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/demandas/${d.id}`} size="sm" fw={600}>
                        {d.titulo}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {d.numero}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right" w={64}>
                      <Text size="sm" fw={700} style={{ whiteSpace: "nowrap" }}>
                        {d.horasEstimadas ? `${d.horasEstimadas} h` : "—"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
            {semTime.length > 8 && (
              <Text size="xs" c="dimmed" mt={6}>
                +{semTime.length - 8} more
              </Text>
            )}
          </Card>
        )}
      </SimpleGrid>

      <Paper withBorder radius="lg" p="md" bg="gray.0">
        <Text size="sm" c="dimmed">
          {t("cap_help")}
        </Text>
      </Paper>
    </Stack>
  );
}
