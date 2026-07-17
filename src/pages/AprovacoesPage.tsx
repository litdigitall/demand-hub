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
import { criticidad, statusLabel, type Demand } from "../data/types";
import { precisaDeMim } from "../domain/workflow";
import { ROLE_LABEL } from "../domain/roles";
import { NextActionCard } from "../components/NextActionCard";
import { TipoBadge, UrgenciaBadge } from "../components/Badges";
import { useCurrentUser } from "../lib/useCurrentUser";
import { formatRelative } from "../lib/format";

/** Par label/valor compacto usado nos cards da bandeja. */
function InfoBit({ label, value, warn, color }: { label: string; value: string; warn?: boolean; color?: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.5}>
        {label}
      </Text>
      {color ? (
        <Badge variant="light" color={color} radius="sm">{value}</Badge>
      ) : (
        <Text size="sm" fw={600} c={warn ? "red.7" : undefined}>
          {value}
        </Text>
      )}
    </div>
  );
}

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

              <Text size="sm" c="dimmed" mb="xs">
                {demand.areaSolicitante} · {demand.solicitante} ·{" "}
                {formatRelative(demand.dataSolicitacao)}
              </Text>

              {/* Datos clave para decidir (análise UX): deadline, impacto,
                  esfuerzo, presupuesto y riesgo. */}
              <Group gap="lg" mb="md" wrap="wrap">
                <InfoBit
                  label="Deadline"
                  value={demand.deadline ? new Date(demand.deadline).toLocaleDateString("en-US") : "—"}
                  warn={!!demand.deadline && new Date(demand.deadline) < new Date()}
                />
                <InfoBit label="Business impact" value={`${demand.score.businessImpact}/5`} />
                <InfoBit
                  label="Estimated effort"
                  value={demand.horasEstimadas ? `${demand.horasEstimadas}h` : "—"}
                />
                <InfoBit
                  label="Budget"
                  value={demand.valorEstimado != null ? `US$ ${demand.valorEstimado.toLocaleString("en-US")}` : "—"}
                />
                <InfoBit label="Risk" value={criticidad(demand.urgencia).label} color={criticidad(demand.urgencia).color} />
              </Group>

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
            Sign in with another role account to see that role's inbox.
          </Text>
        </Group>
      </Paper>
    </Stack>
  );
}
