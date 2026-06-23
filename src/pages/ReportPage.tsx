/* ============================================================
   Relatório mensal (admin-only).
   Preview de KPIs do mês + botão que gera um PPTX apresentável
   com ideias inseridas, projetos em desenvolvimento e backlog.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Center,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconFileTypeXls, IconInfoCircle, IconPresentation } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import type { Demand } from "../data/types";
import { computeReportStats, generateMonthlyReport } from "../lib/monthlyReport";
import { useCurrentUser } from "../lib/useCurrentUser";
import { Role } from "../domain/roles";

export function ReportPage() {
  const user = useCurrentUser();
  const isAdmin = user.roles.includes(Role.Admin);
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    demandService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => computeReportStats(items), [items]);

  if (!isAdmin) return <Navigate to="/" replace />;

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  async function gerar() {
    setGerando(true);
    try {
      await generateMonthlyReport(items);
      notifications.show({
        color: "teal",
        title: "Relatório gerado",
        message: "O download do PPTX foi iniciado.",
      });
    } catch (err) {
      notifications.show({ color: "red", title: "Erro", message: (err as Error).message });
    } finally {
      setGerando(false);
    }
  }

  const cards: { label: string; value: number; color: string }[] = [
    { label: "Ideias inseridas no mês", value: stats.ideiasNoMes, color: "blue" },
    { label: "Em avaliação", value: stats.emAvaliacao, color: "orange" },
    { label: "Em aprovação", value: stats.emAprovacao, color: "orange" },
    { label: "Priorizadas", value: stats.priorizadas, color: "cyan" },
    { label: "Em execução", value: stats.emExecucao, color: "teal" },
    { label: "Concluídas", value: stats.concluidas, color: "green" },
    { label: "Recusadas", value: stats.recusadas, color: "red" },
    { label: "Total na base", value: stats.total, color: "dark" },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>Relatório mensal</Title>
          <Text c="dimmed" mt={4}>
            {stats.mesLabel} · resultados do funil de demandas para apresentação.
          </Text>
        </div>
        <Button
          size="md"
          color="abbott"
          leftSection={<IconPresentation size={18} />}
          loading={gerando}
          onClick={gerar}
        >
          Gerar PPTX
        </Button>
      </Group>

      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
        {cards.map((c) => (
          <Card key={c.label} withBorder radius="lg" padding="lg">
            <Text fz={34} fw={800} c={c.color}>
              {c.value}
            </Text>
            <Text size="sm" c="dimmed">
              {c.label}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm" fw={600} mb={4}>
          O que entra no deck
        </Text>
        <Text size="sm">
          Capa, resumo executivo (KPIs acima), <strong>ideias inseridas no mês</strong>,{" "}
          <strong>projetos em desenvolvimento</strong> (com time, horas e nº do ServiceNow),{" "}
          <strong>backlog priorizado</strong> por score e <strong>capacity por time</strong>.
          Disponível apenas para administradores neste momento.
        </Text>
      </Alert>

      <Group gap="xs" c="dimmed">
        <ThemeIcon variant="light" color="gray" size="sm">
          <IconFileTypeXls size={14} />
        </ThemeIcon>
        <Text size="xs">
          Arquivo gerado no navegador (PowerPoint .pptx) — nenhum dado sai do app.
        </Text>
      </Group>
    </Stack>
  );
}
