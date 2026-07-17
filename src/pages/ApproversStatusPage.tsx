/* ============================================================
   Approvers Status — estado de las aprobaciones (DMC) por demanda.
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
  SimpleGrid,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck, IconClock, IconX } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { StatusDemanda, criticidad, statusLabel, type AprovacaoStep, type Demand } from "../data/types";

const NIVEL_LABEL: Record<string, string> = {
  sponsor: "Sponsor",
  techlead: "Tech Lead",
  diretor: "Director (DMC)",
};

function GateBadge({ step }: { step: AprovacaoStep }) {
  const color = step.status === "aprovado" ? "teal" : step.status === "recusado" ? "red" : "gray";
  const Icon = step.status === "aprovado" ? IconCheck : step.status === "recusado" ? IconX : IconClock;
  return (
    <Badge color={color} variant={step.status === "pendente" ? "outline" : "light"} radius="sm" leftSection={<Icon size={11} />}>
      {NIVEL_LABEL[step.nivel] ?? step.nivel}
    </Badge>
  );
}

export function ApproversStatusPage() {
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    demandService.list().then(setItems).finally(() => setLoading(false));
  }, []);

  const enAprobacion = useMemo(
    () =>
      items
        .filter((d) => d.aprovacoes.length > 0 && (d.status === StatusDemanda.EmAprovacao || d.aprovacoes.some((a) => a.status !== "pendente")))
        .sort((a) => (a.status === StatusDemanda.EmAprovacao ? -1 : 1)),
    [items],
  );

  if (loading) return <Center h="60vh"><Loader /></Center>;

  /* Métricas executivas (análise UX): pendências por gate. */
  const waiting = items.filter((d) => d.status === StatusDemanda.EmAprovacao);
  const waitingOn = (nivel: string) =>
    waiting.filter((d) => d.aprovacoes.find((a) => a.status === "pendente")?.nivel === nivel).length;
  const metrics = [
    { label: "Pending approvals", value: waiting.length, color: "abbott" },
    { label: "Waiting on Sponsor", value: waitingOn("sponsor"), color: "blue" },
    { label: "Waiting on Tech Lead", value: waitingOn("techlead"), color: "violet" },
    { label: "Waiting on Director", value: waitingOn("diretor"), color: "indigo" },
  ];

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Approvers Status</Title>
        <Text c="dimmed" mt={4}>
          Status of the approval gates (Sponsor → Tech Lead → Director/DMC) per demand.
        </Text>
      </div>

      <SimpleGrid cols={{ base: 2, md: 4 }} spacing="md">
        {metrics.map((m) => (
          <Card key={m.label} withBorder radius="lg" padding="lg">
            <Text fz={30} fw={800} c={`${m.color}.7`}>
              {m.value}
            </Text>
            <Text size="sm" c="dimmed">
              {m.label}
            </Text>
          </Card>
        ))}
      </SimpleGrid>

      <Card withBorder radius="lg" padding={0}>
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm" horizontalSpacing="lg" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Demand</Table.Th>
                <Table.Th>Priority</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Approval gates</Table.Th>
                <Table.Th>Waiting on</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {enAprobacion.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={5}>
                    <Text ta="center" c="dimmed" py="md">No demands in approval.</Text>
                  </Table.Td>
                </Table.Tr>
              ) : (
                enAprobacion.map((d) => {
                  const next = d.aprovacoes.find((a) => a.status === "pendente");
                  return (
                    <Table.Tr key={d.id}>
                      <Table.Td>
                        <Anchor component={Link} to={`/demandas/${d.id}`} fw={600}>
                          {d.numero} — {d.titulo}
                        </Anchor>
                      </Table.Td>
                      <Table.Td>
                        {(() => {
                          const c = criticidad(d.urgencia);
                          return (
                            <Badge variant="light" color={c.color} radius="sm">
                              {d.finalPriority != null ? `#${d.finalPriority} · ` : ""}{c.label}
                            </Badge>
                          );
                        })()}
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" color="gray">{statusLabel[d.status]}</Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={6}>
                          {d.aprovacoes.map((a, i) => (
                            <GateBadge key={`${a.nivel}-${i}`} step={a} />
                          ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        {next ? (
                          <Badge color="orange" variant="light">{NIVEL_LABEL[next.nivel]}</Badge>
                        ) : (
                          <Badge color="teal" variant="light">Complete</Badge>
                        )}
                      </Table.Td>
                    </Table.Tr>
                  );
                })
              )}
            </Table.Tbody>
          </Table>
        </Table.ScrollContainer>
      </Card>
    </Stack>
  );
}
