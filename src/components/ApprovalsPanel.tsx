/* ============================================================
   ApprovalsPanel — visualiza o workflow de 3 níveis com avatares,
   status farol, comentários e ação rápida (aprovar/recusar/reabrir).
   ============================================================ */
import { useState } from "react";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Modal,
  Paper,
  Progress,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowBackUp,
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import {
  StatusDemanda,
  aprovacoesPadrao,
  nivelAprovacaoLabel,
  nivelAprovacaoLabelEN,
  type AprovacaoStep,
  type Demand,
  type StatusAprovacao,
} from "../data/types";
import { useT } from "../i18n";
import { useCurrentUser } from "../lib/useCurrentUser";
import { formatDateTime, initialsFromName } from "../lib/format";

interface Props {
  demand: Demand;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
  /** Se false, o painel é apenas visual (decisões passam pelo motor de ações). */
  interactive?: boolean;
}

const NIVEL_COLOR = {
  sponsor: "blue",
  techlead: "violet",
  diretor: "teal",
} as const;

export function ApprovalsPanel({ demand, onSave, interactive = true }: Props) {
  const { t, lang } = useT();
  const user = useCurrentUser();
  const labelNivel = lang === "en" ? nivelAprovacaoLabelEN : nivelAprovacaoLabel;
  const [modal, setModal] = useState<{
    step: AprovacaoStep;
    action: "aprovado" | "recusado";
    comentario: string;
  } | null>(null);

  const steps = demand.aprovacoes.length
    ? demand.aprovacoes
    : aprovacoesPadrao(demand.sponsor);
  const aprovados = steps.filter((s) => s.status === "aprovado").length;
  const recusados = steps.filter((s) => s.status === "recusado").length;
  const completos = aprovados + recusados;
  const progresso = Math.round((completos / steps.length) * 100);
  const nextStep = steps.find((s) => s.status === "pendente");

  const userKey = user.name.toLowerCase();

  async function inicializar() {
    await onSave({ aprovacoes: aprovacoesPadrao(demand.sponsor) });
  }

  async function decidir() {
    if (!modal) return;
    const { step, action, comentario } = modal;
    const novas = steps.map((s) =>
      s === step
        ? { ...s, status: action, acaoEm: new Date().toISOString(), comentario }
        : s,
    );
    let novoStatus = demand.status;
    if (action === "recusado") {
      novoStatus = StatusDemanda.Recusada;
    } else if (novas.every((s) => s.status === "aprovado")) {
      novoStatus = StatusDemanda.Priorizada;
    } else if (demand.status === StatusDemanda.Nova) {
      novoStatus = StatusDemanda.EmAnalise;
    }
    await onSave({ aprovacoes: novas, status: novoStatus });
    notifications.show({
      color: action === "aprovado" ? "teal" : "red",
      title: action === "aprovado" ? t("approved") : t("rejected"),
      message: `${labelNivel[step.nivel]} — ${step.responsavel}`,
    });
    setModal(null);
  }

  async function reabrir(step: AprovacaoStep) {
    const novas = steps.map((s) =>
      s === step ? { ...s, status: "pendente" as StatusAprovacao, acaoEm: "", comentario: "" } : s,
    );
    await onSave({ aprovacoes: novas });
  }

  if (demand.aprovacoes.length === 0) {
    return (
      <Card withBorder radius="lg" padding="lg">
        <Stack align="center" gap="md" py="md">
          <ThemeIcon size={60} radius="xl" color="abbott" variant="light">
            <IconInfoCircle size={28} />
          </ThemeIcon>
          <Text fw={700}>Approval workflow not initialized</Text>
          <Text size="sm" c="dimmed" ta="center" maw={460}>
            Requests created in the app already come with the standard sequence (Sponsor →
            Tech Lead → Director). To initialize it on this existing request, click below.
          </Text>
          <Button onClick={inicializar}>Initialize approval flow</Button>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="lg">
      {/* ----- Cabeçalho com progresso ----- */}
      <Card withBorder radius="lg" padding="lg" bg="abbott.0">
        <Group justify="space-between" wrap="wrap" mb="sm">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={1}>
              {t("apr_workflow")}
            </Text>
            <Text fw={700} fz="xl">
              {aprovados}/{steps.length} approved
              {recusados > 0 && ` · ${recusados} rejected`}
            </Text>
            <Text size="sm" c="dimmed">
              {t("apr_workflow_help")}
            </Text>
          </div>
          {nextStep && (
            <Badge color="orange" variant="light" size="lg">
              Next: {labelNivel[nextStep.nivel]}
            </Badge>
          )}
          {!nextStep && recusados === 0 && (
            <Badge color="teal" variant="filled" size="lg" leftSection={<IconCheck size={12} />}>
              Completed
            </Badge>
          )}
          {recusados > 0 && (
            <Badge color="red" variant="filled" size="lg">
              Rejected
            </Badge>
          )}
        </Group>
        <Progress
          value={progresso}
          color={recusados > 0 ? "red" : "abbott.6"}
          radius="xl"
          size="md"
        />
      </Card>

      {/* ----- Timeline vertical dos steps ----- */}
      <Stack gap="md">
        {steps.map((s, idx) => {
          const isCurrentUser = s.responsavel.toLowerCase().includes(userKey);
          const isNext = nextStep === s;
          const color = NIVEL_COLOR[s.nivel];
          const statusColor =
            s.status === "aprovado" ? "teal" : s.status === "recusado" ? "red" : "gray";
          const StatusIcon =
            s.status === "aprovado" ? IconCheck : s.status === "recusado" ? IconX : IconClock;

          return (
            <Box key={`${s.nivel}-${idx}`} style={{ position: "relative" }}>
              {idx < steps.length - 1 && (
                <Box
                  style={{
                    position: "absolute",
                    left: 28,
                    top: 60,
                    bottom: -16,
                    width: 2,
                    background:
                      s.status === "aprovado"
                        ? "var(--mantine-color-teal-4)"
                        : "var(--mantine-color-gray-3)",
                  }}
                />
              )}
              <Card
                withBorder
                radius="md"
                padding="md"
                style={{
                  borderColor:
                    isNext && isCurrentUser
                      ? "var(--mantine-color-abbott-5)"
                      : undefined,
                  borderWidth: isNext && isCurrentUser ? 2 : 1,
                  background:
                    s.status === "aprovado"
                      ? "var(--mantine-color-teal-0)"
                      : s.status === "recusado"
                        ? "var(--mantine-color-red-0)"
                        : undefined,
                }}
              >
                <Group justify="space-between" wrap="wrap" gap="md">
                  <Group gap="md" style={{ flex: 1, minWidth: 0 }}>
                    <Avatar
                      color={color}
                      variant="filled"
                      radius="xl"
                      size="lg"
                    >
                      {initialsFromName(s.responsavel)}
                    </Avatar>
                    <Box style={{ minWidth: 0, flex: 1 }}>
                      <Group gap={8}>
                        <Badge color={color} variant="light" size="sm">
                          {labelNivel[s.nivel]}
                        </Badge>
                        {isNext && (
                          <Badge color="orange" variant="filled" size="sm">
                            {isCurrentUser ? t("apr_youAreNext") : "Pending"}
                          </Badge>
                        )}
                      </Group>
                      <Text fw={700} mt={2}>
                        {s.responsavel}
                      </Text>
                      {s.acaoEm && (
                        <Text size="xs" c="dimmed">
                          {s.status === "aprovado" ? t("approved") : t("rejected")} on{" "}
                          {formatDateTime(s.acaoEm)}
                        </Text>
                      )}
                      {s.comentario && (
                        <Paper withBorder radius="sm" p="xs" mt="xs" bg="white">
                          <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                            "{s.comentario}"
                          </Text>
                        </Paper>
                      )}
                    </Box>
                  </Group>

                  <Group gap="xs">
                    <Badge color={statusColor} variant="light" size="lg" leftSection={<StatusIcon size={12} />}>
                      {s.status === "pendente"
                        ? t("pending")
                        : s.status === "aprovado"
                          ? t("approved")
                          : t("rejected")}
                    </Badge>
                    {interactive && s.status === "pendente" && isCurrentUser && isNext && (
                      <>
                        <Button
                          size="xs"
                          color="red"
                          variant="outline"
                          leftSection={<IconX size={14} />}
                          onClick={() => setModal({ step: s, action: "recusado", comentario: "" })}
                        >
                          {t("reject")}
                        </Button>
                        <Button
                          size="xs"
                          color="teal"
                          leftSection={<IconCheck size={14} />}
                          onClick={() => setModal({ step: s, action: "aprovado", comentario: "" })}
                        >
                          {t("approve")}
                        </Button>
                      </>
                    )}
                    {interactive && s.status !== "pendente" && (
                      <Button
                        size="xs"
                        variant="subtle"
                        color="gray"
                        leftSection={<IconArrowBackUp size={14} />}
                        onClick={() => reabrir(s)}
                      >
                        {t("reopen")}
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>
            </Box>
          );
        })}
      </Stack>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm">
          <strong>Rule:</strong> any rejection moves the request to the{" "}
          <em>Rejected</em> status. All 3 approvals release it to <em>Prioritized</em>. Requests
          in approval appear in the current approver's <strong>My inbox</strong> and
          count toward the bell badge above.
        </Text>
      </Alert>

      {/* ----- Modal decisão ----- */}
      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.action === "aprovado"
            ? `${t("approve")} — ${modal.step ? labelNivel[modal.step.nivel] : ""}`
            : `${t("reject")} — ${modal ? labelNivel[modal.step.nivel] : ""}`
        }
      >
        {modal && (
          <Stack>
            <Paper withBorder radius="md" p="sm" bg="gray.0">
              <Group gap="sm">
                <Avatar color="abbott" radius="xl" size="md" variant="filled">
                  {initialsFromName(modal.step.responsavel)}
                </Avatar>
                <div>
                  <Text fw={600} size="sm">
                    {modal.step.responsavel}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {labelNivel[modal.step.nivel]}
                  </Text>
                </div>
              </Group>
            </Paper>
            <Textarea
              label={t("comment")}
              autosize
              minRows={2}
              placeholder="Justify your decision..."
              value={modal.comentario}
              onChange={(e) =>
                setModal({ ...modal, comentario: e.currentTarget.value })
              }
            />
            <Divider />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setModal(null)}>
                {t("cancel")}
              </Button>
              <Button
                color={modal.action === "aprovado" ? "teal" : "red"}
                leftSection={
                  modal.action === "aprovado" ? <IconCheck size={16} /> : <IconX size={16} />
                }
                onClick={decidir}
              >
                {modal.action === "aprovado" ? t("approve") : t("reject")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
