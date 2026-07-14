import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Avatar,
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
  IconCash,
  IconClipboardCheck,
  IconRocket,
  IconUser,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  StatusDemanda,
  Urgencia,
  weightedScore,
  type Demand,
} from "../data/types";
import { StatusBadge, UrgenciaBadge } from "../components/Badges";
import {
  formatCurrency,
  formatDate,
  initialsFromName,
} from "../lib/format";
import { useT } from "../i18n";

interface SponsorStats {
  sponsor: string;
  total: number;
  emExec: number;
  concluidas: number;
  criticas: number;
  valorTotal: number;
  scoreMedio: number;
  demandas: Demand[];
}

export function SponsorsPage() {
  const { t } = useT();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Demand[]>([]);

  useEffect(() => {
    demandService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const sponsors: SponsorStats[] = useMemo(() => {
    const map = new Map<string, Demand[]>();
    items.forEach((d) => {
      const key = d.sponsor || "— no sponsor —";
      const list = map.get(key) ?? [];
      list.push(d);
      map.set(key, list);
    });
    const arr: SponsorStats[] = [];
    map.forEach((list, sponsor) => {
      const total = list.length;
      const emExec = list.filter((d) => d.status === StatusDemanda.EmExecucao).length;
      const concluidas = list.filter((d) => d.status === StatusDemanda.Concluida).length;
      const criticas = list.filter((d) => d.urgencia === Urgencia.Critico).length;
      const valorTotal = list.reduce((acc, d) => acc + (d.valorEstimado ?? 0), 0);
      const scoreMedio = list.reduce((acc, d) => acc + weightedScore(d.score), 0) / total;
      arr.push({
        sponsor,
        total,
        emExec,
        concluidas,
        criticas,
        valorTotal,
        scoreMedio,
        demandas: [...list].sort(
          (a, b) => weightedScore(b.score) - weightedScore(a.score),
        ),
      });
    });
    arr.sort((a, b) => b.total - a.total);
    return arr;
  }, [items]);

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>{t("sponsors_title")}</Title>
        <Text c="dimmed" mt={4}>
          {t("sponsors_subtitle")}
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
        {sponsors.map((s) => (
          <Card key={s.sponsor} withBorder radius="lg" padding="lg">
            <Group justify="space-between" mb="md">
              <Group gap="sm">
                <Avatar color="abbott" radius="xl" size="lg" variant="filled">
                  {initialsFromName(s.sponsor)}
                </Avatar>
                <div>
                  <Text fw={700} size="md">
                    {s.sponsor}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {s.total === 1 ? t("sponsors_oneDemand", { n: s.total }) : t("sponsors_demandsCount", { n: s.total })}{" "}
                    · {s.demandas[0]?.areaSolicitante ?? "—"}
                  </Text>
                </div>
              </Group>
              <Badge color="abbott" size="lg" variant="filled">
                {s.scoreMedio.toFixed(2)}
              </Badge>
            </Group>

            <SimpleGrid cols={4} spacing="xs" mb="md">
              <MiniStat icon={IconRocket} value={s.emExec} label={t("sponsors_inExec")} color="yellow" />
              <MiniStat
                icon={IconClipboardCheck}
                value={s.concluidas}
                label={t("sponsors_done")}
                color="teal"
              />
              <MiniStat
                icon={IconAlertTriangle}
                value={s.criticas}
                label={t("sponsors_critical")}
                color="red"
              />
              <MiniStat icon={IconCash} value="" label="Value" color="abbott" extra={formatCurrency(s.valorTotal)} />
            </SimpleGrid>

            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1} mb={4}>
              {t("sponsors_top")}
            </Text>
            <Table verticalSpacing="xs">
              <Table.Tbody>
                {s.demandas.slice(0, 4).map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/demandas/${d.id}`} size="sm" fw={600}>
                        {d.titulo}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {d.numero} · {formatDate(d.dataSolicitacao)}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Group gap={4} justify="flex-end">
                        <UrgenciaBadge value={d.urgencia} />
                        <StatusBadge value={d.status} />
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            <Box mt="md">
              <Group justify="space-between" mb={4}>
                <Text size="xs" c="dimmed">
                  {t("sponsors_progress")}
                </Text>
                <Text size="xs" fw={600}>
                  {Math.round(((s.concluidas + s.emExec) / s.total) * 100)}%
                </Text>
              </Group>
              <Progress
                value={(s.concluidas / s.total) * 100}
                color="teal"
                size="md"
                radius="xl"
              />
            </Box>
          </Card>
        ))}
      </SimpleGrid>

      {sponsors.length === 0 && (
        <Paper withBorder radius="lg" p="xl">
          <Center>
            <Group gap="xs">
              <IconUser size={18} />
              <Text c="dimmed">{t("sponsors_none")}</Text>
            </Group>
          </Center>
        </Paper>
      )}
    </Stack>
  );
}

function MiniStat({
  icon: Icon,
  value,
  label,
  color,
  extra,
}: {
  icon: typeof IconRocket;
  value: number | string;
  label: string;
  color: string;
  extra?: string;
}) {
  return (
    <Box ta="center">
      <ThemeIcon variant="light" color={color} size="md" radius="md">
        <Icon size={14} />
      </ThemeIcon>
      <Text fw={800} fz={extra ? 14 : 18} mt={2}>
        {extra ?? value}
      </Text>
      <Text size="xs" c="dimmed">
        {label}
      </Text>
    </Box>
  );
}
