/* ============================================================
   Caixa de entrada por papel — "o que precisa de mim agora".
   Lista as demandas em que algum papel do usuário tem uma ação
   disponível (motor de ciclo de vida). As decisões usam o mesmo
   NextActionCard da tela de detalhe (fonte única de transições).
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Badge,
  Card,
  Center,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { IconChecks, IconInbox } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { statusLabel, type Demand } from "../data/types";
import { precisaDeMim } from "../domain/workflow";
import { ROLE_LABEL } from "../domain/roles";
import { NextActionCard } from "../components/NextActionCard";
import { TipoBadge, UrgenciaBadge } from "../components/Badges";
import { useCurrentUser } from "../lib/useCurrentUser";
import { formatRelative } from "../lib/format";

export function AprovacoesPage() {
  const user = useCurrentUser();
  const roles = user.roles;
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setItems(await demandService.list());
  }

  useEffect(() => {
    setLoading(true);
    demandService
      .list()
      .then(setItems)
      .finally(() => setLoading(false));
  }, []);

  const pendentes = useMemo(
    () => items.filter((d) => precisaDeMim(d, roles)),
    [items, roles],
  );

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
        <Title order={2}>My inbox</Title>
        <Text c="dimmed" mt={4}>
          {user.name} · {roles.map((r) => ROLE_LABEL[r]).join(" · ")} —{" "}
          <strong>{pendentes.length} request(s) waiting on you</strong>
        </Text>
      </div>

      {pendentes.length === 0 ? (
        <Paper withBorder radius="lg" p="xl">
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon size={60} radius="xl" variant="light" color="teal">
                <IconChecks size={30} />
              </ThemeIcon>
              <Text fw={600}>Nothing pending for you</Text>
              <Text size="sm" c="dimmed">
                When a request needs an action from your roles, it will appear here.
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <Stack gap="md">
          {pendentes.map((demand) => (
            <Card key={demand.id} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="sm" wrap="wrap">
                <Group gap="sm" style={{ minWidth: 0, flex: 1 }}>
                  <Badge color="abbott" radius="sm" size="lg" variant="filled">
                    {demand.numero}
                  </Badge>
                  <Anchor
                    component={Link}
                    to={`/demandas/${demand.id}`}
                    fw={700}
                    fz="lg"
                    truncate
                  >
                    {demand.titulo}
                  </Anchor>
                </Group>
                <Group gap="xs">
                  <Badge variant="light" color="gray">
                    {statusLabel[demand.status]}
                  </Badge>
                  <TipoBadge value={demand.tipo} />
                  <UrgenciaBadge value={demand.urgencia} />
                </Group>
              </Group>

              <Text size="sm" c="dimmed" mb="md">
                {demand.areaSolicitante} · {demand.solicitante} ·{" "}
                {formatRelative(demand.dataSolicitacao)}
              </Text>

              <NextActionCard
                demand={demand}
                roles={roles}
                ator={user.name}
                onSave={async (changes) => {
                  await demandService.update(demand.id, changes);
                  await refresh();
                }}
              />
            </Card>
          ))}
        </Stack>
      )}

      <Paper withBorder radius="md" p="md" bg="gray.0">
        <Group gap="xs">
          <IconInbox size={16} />
          <Text size="sm" c="dimmed">
            Switch persona above (menu ▾) to see the inbox of each role in the flow.
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
