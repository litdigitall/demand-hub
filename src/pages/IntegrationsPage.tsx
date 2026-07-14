/* ============================================================
   Integración ServiceNow (panel demostrativo, admin).
   Muestra qué ENTRA (FTE/capacity), qué SALE (proyecto aprobado:
   RCE, nº, score, estado), el estado de conexión y el mapeo de
   campos. Todo simulado vía src/integrations/serviceNow.ts.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowDown,
  IconArrowUp,
  IconCloudComputing,
  IconInfoCircle,
  IconPlugConnected,
  IconRefresh,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { StatusDemanda, weightedScore, type Demand } from "../data/types";
import {
  FIELD_MAPPING,
  getFteAvailability,
  pushDemand,
  serviceNowConfig,
  type FteAvailability,
} from "../integrations/serviceNow";
import { useCurrentUser } from "../lib/useCurrentUser";
import { Role } from "../domain/roles";

export function IntegrationsPage() {
  const user = useCurrentUser();
  const isAdmin = user.roles.includes(Role.Admin);
  const [fte, setFte] = useState<FteAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncEm, setSyncEm] = useState<string | null>(null);
  const [demands, setDemands] = useState<Demand[]>([]);
  const [selId, setSelId] = useState<string | null>(null);
  const [pushing, setPushing] = useState(false);
  const [ultimoTicket, setUltimoTicket] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getFteAvailability(), demandService.list()])
      .then(([f, d]) => {
        setFte(f);
        setDemands(d);
      })
      .finally(() => setLoading(false));
  }, []);

  const publicables = useMemo(
    () =>
      demands.filter(
        (d) =>
          d.status === StatusDemanda.Priorizada ||
          d.status === StatusDemanda.EmExecucao ||
          d.status === StatusDemanda.Concluida,
      ),
    [demands],
  );

  if (!isAdmin) return <Navigate to="/" replace />;
  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  async function sincronizar() {
    setSyncing(true);
    const f = await getFteAvailability();
    setFte(f);
    setSyncEm(new Date().toLocaleString("en-US"));
    setSyncing(false);
    notifications.show({ color: "teal", title: "Capacity synced", message: "FTE updated from ServiceNow (simulated)." });
  }

  async function publicar() {
    const d = demands.find((x) => x.id === selId);
    if (!d) return;
    setPushing(true);
    const r = await pushDemand(d);
    setPushing(false);
    if (r.ok) {
      setUltimoTicket(r.ticket);
      notifications.show({ color: "teal", title: "Published to ServiceNow", message: r.mensagem });
    } else {
      notifications.show({ color: "red", title: "Could not publish", message: r.mensagem });
    }
  }

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>ServiceNow Integration</Title>
        <Text c="dimmed" mt={4}>
          Integration preview: what data flows in and out between Demand Hub and ServiceNow.
        </Text>
      </div>

      {/* Estado de conexión */}
      <Card withBorder radius="lg" padding="lg">
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm">
            <ThemeIcon size={42} radius="md" variant="light" color={serviceNowConfig.connected ? "teal" : "orange"}>
              <IconPlugConnected size={22} />
            </ThemeIcon>
            <div>
              <Text fw={700}>{serviceNowConfig.instanceUrl}</Text>
              <Text size="sm" c="dimmed">
                Tables: {serviceNowConfig.fteTable} · {serviceNowConfig.projectTable}
              </Text>
            </div>
          </Group>
          <Badge size="lg" variant="light" color={serviceNowConfig.connected ? "teal" : "orange"}>
            {serviceNowConfig.connected ? "Connected" : "Simulated (demo)"}
          </Badge>
        </Group>
      </Card>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
        {/* IN — FTE / capacity */}
        <Card withBorder radius="lg" padding="lg">
          <Group justify="space-between" mb="sm">
            <Group gap="xs">
              <ThemeIcon color="blue" variant="light" radius="md">
                <IconArrowDown size={18} />
              </ThemeIcon>
              <Text fw={700}>In: FTE / Capacity</Text>
            </Group>
            <Button
              size="xs"
              variant="light"
              leftSection={<IconCloudComputing size={14} />}
              loading={syncing}
              onClick={sincronizar}
            >
              Sync
            </Button>
          </Group>
          <Table verticalSpacing="xs" fz="sm">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Team</Table.Th>
                <Table.Th ta="right">FTE</Table.Th>
                <Table.Th ta="right">Committed h.</Table.Th>
                <Table.Th ta="right">Capacity</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {fte.map((f) => (
                <Table.Tr key={f.time}>
                  <Table.Td>{f.time}</Table.Td>
                  <Table.Td ta="right">{f.fteAlocado}</Table.Td>
                  <Table.Td ta="right">{f.horasComprometidas}h</Table.Td>
                  <Table.Td ta="right" c="dimmed">{f.capacidadeHoras}h</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
          <Text size="xs" c="dimmed" mt="xs">
            {syncEm ? `Last sync: ${syncEm}` : "Source: ServiceNow API (simulated)"}
          </Text>
        </Card>

        {/* OUT — publica proyecto */}
        <Card withBorder radius="lg" padding="lg">
          <Group gap="xs" mb="sm">
            <ThemeIcon color="grape" variant="light" radius="md">
              <IconArrowUp size={18} />
            </ThemeIcon>
            <Text fw={700}>Out: Approved project</Text>
          </Group>
          <Text size="sm" c="dimmed" mb="sm">
            Publishes the approved demand's data to ServiceNow (RCE, no., score, status).
          </Text>
          <Select
            label="Demand to publish"
            placeholder="Pick a prioritized/in-execution demand"
            data={publicables.map((d) => ({ value: d.id, label: `${d.numero} — ${d.titulo}` }))}
            value={selId}
            onChange={setSelId}
            searchable
            mb="sm"
          />
          {selId && (() => {
            const d = demands.find((x) => x.id === selId);
            if (!d) return null;
            return (
              <Table fz="sm" mb="sm">
                <Table.Tbody>
                  <Table.Tr><Table.Td c="dimmed">RCE</Table.Td><Table.Td>{d.rce || "— (missing)"}</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td c="dimmed">APP ID</Table.Td><Table.Td>{d.appId || "—"}</Table.Td></Table.Tr>
                  <Table.Tr><Table.Td c="dimmed">Score</Table.Td><Table.Td>{weightedScore(d.score).toFixed(2)}</Table.Td></Table.Tr>
                </Table.Tbody>
              </Table>
            );
          })()}
          <Button
            color="grape"
            leftSection={<IconArrowUp size={16} />}
            disabled={!selId}
            loading={pushing}
            onClick={publicar}
          >
            Publish to ServiceNow
          </Button>
          {ultimoTicket && (
            <Badge mt="sm" color="teal" variant="light">
              Last project: {ultimoTicket}
            </Badge>
          )}
        </Card>
      </SimpleGrid>

      {/* Mapeo de campos */}
      <Card withBorder radius="lg" padding="lg">
        <Text fw={700} mb="sm">
          Field mapping
        </Text>
        <Table verticalSpacing="xs" fz="sm">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Demand Hub</Table.Th>
              <Table.Th>Direction</Table.Th>
              <Table.Th>ServiceNow</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {FIELD_MAPPING.map((m) => (
              <Table.Tr key={m.hub}>
                <Table.Td>{m.hub}</Table.Td>
                <Table.Td>
                  <Badge variant="light" color={m.dir === "in" ? "blue" : "grape"} size="sm">
                    {m.dir === "in" ? "IN ↓" : "OUT ↑"}
                  </Badge>
                </Table.Td>
                <Table.Td c="dimmed">{m.snow}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm">
          Simulated integration for the demo. The logic is isolated in{" "}
          <strong>src/integrations/serviceNow.ts</strong> — in production, each function
          is replaced by a REST call (Table API / Scripted REST) without touching the rest of the app.
        </Text>
      </Alert>

      <Group gap="xs" c="dimmed">
        <IconRefresh size={14} />
        <Text size="xs">Real authentication via OAuth/instance credentials (out of scope for the prototype).</Text>
      </Group>
    </Stack>
  );
}
