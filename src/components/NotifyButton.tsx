/* ============================================================
   NotifyButton — notificação por Teams / e-mail (SIMULADA).
   Abre um preview do e-mail formatado, vinculando as perguntas
   do intake e o detalhamento do score, e botões de envio fake.
   Numa versão real, ligaria no Graph API (Teams) e SMTP/Graph (e-mail).
   ============================================================ */
import { useState } from "react";
import {
  Badge,
  Button,
  Divider,
  Group,
  Modal,
  Paper,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBrandTeams, IconMail, IconSend } from "@tabler/icons-react";
import {
  SCORE_LABELS,
  SCORE_WEIGHTS,
  statusLabel,
  weightedScore,
  abrangenciaLabel,
  type Demand,
  type Score,
} from "../data/types";

export function NotifyButton({ demand }: { demand: Demand }) {
  const [open, setOpen] = useState(false);
  const wScore = weightedScore(demand.score);

  const linkDemanda = `${window.location.origin}${window.location.pathname}#/demandas/${demand.id}`;

  function enviar(canal: "email" | "Teams") {
    notifications.show({
      color: "teal",
      title: `Notification sent to approvers (${canal})`,
      message: `${demand.numero} — with link to the request · simulated`,
    });
    setOpen(false);
  }

  const perguntas: { q: string; a: string }[] = [
    { q: "Problem/opportunity", a: demand.problemaResolve || "—" },
    { q: "Main objective", a: demand.objetivoPrincipal || "—" },
    { q: "Consequence of not executing", a: demand.consequenciaNaoExecucao || "—" },
    {
      q: "Impact scope",
      a: demand.impactoAbrangencia ? abrangenciaLabel[demand.impactoAbrangencia] : "—",
    },
    {
      q: "Estimated ROI",
      a: demand.roiEstimado != null ? `${demand.roiEstimado}%` : "—",
    },
  ];

  return (
    <>
      <Button
        variant="default"
        leftSection={<IconSend size={16} />}
        onClick={() => setOpen(true)}
      >
        Notify
      </Button>

      <Modal opened={open} onClose={() => setOpen(false)} title="Notify the committee / stakeholders" size="lg">
        <Stack>
          <Group gap="xs">
            <Badge color="grape" variant="light">
              DMC · IT Hub Committee
            </Badge>
            <Badge variant="light" color="gray">
              {statusLabel[demand.status]}
            </Badge>
          </Group>

          {/* Preview del correo formateado */}
          <Paper withBorder radius="md" p="md" bg="gray.0">
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={1}>
              Subject
            </Text>
            <Text fw={700} mb="sm">
              [Demand Hub] {demand.numero} — {demand.titulo} (score {wScore.toFixed(2)})
            </Text>

            <Text size="sm" mb="xs">
              Dear committee, please find the request for your evaluation below. The
              requester's answers and the score breakdown follow.
            </Text>
            <Text size="sm" mb="xs">
              Open the request:{" "}
              <a href={linkDemanda} target="_blank" rel="noreferrer">
                {demand.numero} — {demand.titulo}
              </a>
            </Text>

            <Divider my="sm" label="Intake answers" labelPosition="left" />
            <Stack gap={6}>
              {perguntas.map((p) => (
                <div key={p.q}>
                  <Text size="xs" c="dimmed" fw={600}>
                    {p.q}
                  </Text>
                  <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                    {p.a}
                  </Text>
                </div>
              ))}
            </Stack>

            <Divider my="sm" label="Weighted score (100% = 5.00)" labelPosition="left" />
            <Table verticalSpacing={4} fz="sm">
              <Table.Tbody>
                {(Object.keys(SCORE_LABELS) as (keyof Score)[]).map((k) => (
                  <Table.Tr key={k}>
                    <Table.Td>{SCORE_LABELS[k]}</Table.Td>
                    <Table.Td ta="center" w={50}>
                      {demand.score[k]}
                    </Table.Td>
                    <Table.Td ta="center" w={60} c="dimmed">
                      ×{(SCORE_WEIGHTS[k] * 100).toFixed(0)}%
                    </Table.Td>
                    <Table.Td ta="right" w={60} fw={600}>
                      {(demand.score[k] * SCORE_WEIGHTS[k]).toFixed(2)}
                    </Table.Td>
                  </Table.Tr>
                ))}
                <Table.Tr>
                  <Table.Td fw={700}>TOTAL</Table.Td>
                  <Table.Td colSpan={2} />
                  <Table.Td ta="right" fw={800} c="abbott.7">
                    {wScore.toFixed(2)}
                  </Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Paper>

          <Text size="xs" c="dimmed">
            Simulated send — in the integrated version, it fires on the Teams channel and by
            email (Microsoft Graph). The content above is the actual template.
          </Text>

          <Group justify="flex-end">
            <Button
              variant="light"
              color="grape"
              leftSection={<IconBrandTeams size={16} />}
              onClick={() => enviar("Teams")}
            >
              Notify on Teams
            </Button>
            <Button
              color="abbott"
              leftSection={<IconMail size={16} />}
              onClick={() => enviar("email")}
            >
              Send email
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
