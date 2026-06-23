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
        title: "Informe generado",
        message: "La descarga del PPTX ha comenzado.",
      });
    } catch (err) {
      notifications.show({ color: "red", title: "Error", message: (err as Error).message });
    } finally {
      setGerando(false);
    }
  }

  const cards: { label: string; value: number; color: string }[] = [
    { label: "Ideas registradas en el mes", value: stats.ideiasNoMes, color: "blue" },
    { label: "En evaluación", value: stats.emAvaliacao, color: "orange" },
    { label: "En aprobación", value: stats.emAprovacao, color: "orange" },
    { label: "Priorizadas", value: stats.priorizadas, color: "cyan" },
    { label: "En ejecución", value: stats.emExecucao, color: "teal" },
    { label: "Concluidas", value: stats.concluidas, color: "green" },
    { label: "Rechazadas", value: stats.recusadas, color: "red" },
    { label: "Total en la base", value: stats.total, color: "dark" },
  ];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>Informe mensual</Title>
          <Text c="dimmed" mt={4}>
            {stats.mesLabel} · resultados del funnel de solicitudes para presentación.
          </Text>
        </div>
        <Button
          size="md"
          color="abbott"
          leftSection={<IconPresentation size={18} />}
          loading={gerando}
          onClick={gerar}
        >
          Generar PPTX
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
          Qué incluye el deck
        </Text>
        <Text size="sm">
          Portada, resumen ejecutivo (KPIs de arriba), <strong>ideas registradas en el mes</strong>,{" "}
          <strong>proyectos en desarrollo</strong> (con equipo, horas y nº de ServiceNow),{" "}
          <strong>backlog priorizado</strong> por score y <strong>capacity por equipo</strong>.
          Disponible solo para administradores por ahora.
        </Text>
      </Alert>

      <Group gap="xs" c="dimmed">
        <ThemeIcon variant="light" color="gray" size="sm">
          <IconFileTypeXls size={14} />
        </ThemeIcon>
        <Text size="xs">
          Archivo generado en el navegador (PowerPoint .pptx) — ningún dato sale del app.
        </Text>
      </Group>
    </Stack>
  );
}
