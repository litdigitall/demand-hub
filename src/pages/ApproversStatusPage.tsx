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
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { IconCheck, IconClock, IconX } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { StatusDemanda, statusLabel, type AprovacaoStep, type Demand } from "../data/types";

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

  return (
    <Stack gap="lg">
      <div>
        <Title order={2}>Approvers Status</Title>
        <Text c="dimmed" mt={4}>
          Estado de los gates de aprobación (Sponsor → Tech Lead → Director/DMC) por demanda.
        </Text>
      </div>

      <Card withBorder radius="lg" padding={0}>
        <Table.ScrollContainer minWidth={820}>
          <Table verticalSpacing="sm" horizontalSpacing="lg" highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Demanda</Table.Th>
                <Table.Th>Estado</Table.Th>
                <Table.Th>Gates de aprobación</Table.Th>
                <Table.Th>Esperando</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {enAprobacion.length === 0 ? (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text ta="center" c="dimmed" py="md">Sin demandas en aprobación.</Text>
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
                          <Badge color="teal" variant="light">Completo</Badge>
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
