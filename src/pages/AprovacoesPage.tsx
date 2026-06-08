import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCheck,
  IconClock,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  StatusDemanda,
  nivelAprovacaoLabel,
  nivelAprovacaoLabelEN,
  type AprovacaoStep,
  type Demand,
} from "../data/types";
import { useT } from "../i18n";
import { TipoBadge, UrgenciaBadge } from "../components/Badges";
import { useCurrentUser } from "../lib/useCurrentUser";
import { formatRelative, initialsFromName } from "../lib/format";

interface PendingDecision {
  demand: Demand;
  step: AprovacaoStep;
}

export function AprovacoesPage() {
  const { t, lang } = useT();
  const user = useCurrentUser();
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [decision, setDecision] = useState<{
    item: PendingDecision;
    action: "aprovado" | "recusado";
    comentario: string;
  } | null>(null);

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await demandService.list());
    } finally {
      setLoading(false);
    }
  }

  const userKey = user.name.toLowerCase();
  const nivelLabel = lang === "en" ? nivelAprovacaoLabelEN : nivelAprovacaoLabel;

  const pendentes: PendingDecision[] = useMemo(() => {
    return items
      .map((d) => {
        const next = d.aprovacoes.find((a) => a.status === "pendente");
        if (!next) return null;
        if (!next.responsavel.toLowerCase().includes(userKey)) return null;
        return { demand: d, step: next };
      })
      .filter((x): x is PendingDecision => x !== null);
  }, [items, userKey]);

  // Histórico das demandas em que eu já decidi
  const historico: PendingDecision[] = useMemo(() => {
    const out: PendingDecision[] = [];
    items.forEach((d) => {
      d.aprovacoes
        .filter(
          (a) =>
            a.status !== "pendente" &&
            a.responsavel.toLowerCase().includes(userKey),
        )
        .forEach((s) => out.push({ demand: d, step: s }));
    });
    return out.sort((a, b) => b.step.acaoEm.localeCompare(a.step.acaoEm));
  }, [items, userKey]);

  async function decidir() {
    if (!decision) return;
    const { item, action, comentario } = decision;
    const aprovacoes = item.demand.aprovacoes.map((a) => {
      if (a === item.step) {
        return {
          ...a,
          status: action,
          acaoEm: new Date().toISOString(),
          comentario,
        };
      }
      return a;
    });
    // Se recusado, demanda vai para Recusada. Se todos os 3 aprovaram, vai pra Priorizada
    let novoStatus = item.demand.status;
    if (action === "recusado") {
      novoStatus = StatusDemanda.Recusada;
    } else if (
      aprovacoes.every((a) => a.status === "aprovado") &&
      item.demand.status === StatusDemanda.Nova
    ) {
      novoStatus = StatusDemanda.Priorizada;
    } else if (
      action === "aprovado" &&
      item.demand.status === StatusDemanda.Nova
    ) {
      novoStatus = StatusDemanda.EmAnalise;
    }
    try {
      await demandService.update(item.demand.id, { aprovacoes, status: novoStatus });
      notifications.show({
        color: action === "aprovado" ? "teal" : "red",
        title: action === "aprovado" ? t("approved") : t("rejected"),
        message: `${item.demand.numero} — ${item.demand.titulo}`,
      });
      setDecision(null);
      refresh();
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro",
        message: (err as Error).message,
      });
    }
  }

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>{t("apr_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("apr_subtitle")} —{" "}
            <strong>
              {t("apr_userPending", { user: user.name, n: pendentes.length })}
            </strong>
          </Text>
        </div>
      </Group>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm" fw={600}>
          {t("apr_workflow")}
        </Text>
        <Text size="sm" mt={2}>
          {t("apr_workflow_help")}
        </Text>
      </Alert>

      {/* ============== Pendentes ============== */}
      {pendentes.length === 0 ? (
        <Paper withBorder radius="lg" p="xl">
          <Center>
            <Stack align="center" gap="xs">
              <ThemeIcon size={60} radius="xl" variant="light" color="teal">
                <IconCheck size={30} />
              </ThemeIcon>
              <Text fw={600}>{t("apr_none")}</Text>
              <Text size="sm" c="dimmed">
                {t("apr_allClear")}
              </Text>
            </Stack>
          </Center>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
          {pendentes.map(({ demand, step }) => (
            <Card key={demand.id} withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="xs">
                <Badge color="abbott" radius="sm" size="lg" variant="filled">
                  {demand.numero}
                </Badge>
                <Badge color="orange" variant="light">
                  {nivelLabel[step.nivel]}
                </Badge>
              </Group>
              <Anchor
                component={Link}
                to={`/demandas/${demand.id}`}
                fw={700}
                fz="lg"
                style={{ display: "block", lineHeight: 1.2 }}
              >
                {demand.titulo}
              </Anchor>
              <Text size="sm" c="dimmed" mt={4}>
                {demand.areaSolicitante} · {demand.solicitante} · {formatRelative(demand.dataSolicitacao)}
              </Text>

              <Group gap="xs" mt="sm">
                <TipoBadge value={demand.tipo} />
                <UrgenciaBadge value={demand.urgencia} />
              </Group>

              <Text size="sm" mt="md" lineClamp={3}>
                {demand.descricao}
              </Text>

              <Group justify="space-between" mt="lg">
                <Text size="sm" c="dimmed">
                  {t("apr_sponsorLabel")} {demand.sponsor}
                </Text>
                <Group gap="xs">
                  <Button
                    color="red"
                    variant="outline"
                    leftSection={<IconX size={16} />}
                    onClick={() =>
                      setDecision({ item: { demand, step }, action: "recusado", comentario: "" })
                    }
                  >
                    {t("reject")}
                  </Button>
                  <Button
                    color="teal"
                    leftSection={<IconCheck size={16} />}
                    onClick={() =>
                      setDecision({ item: { demand, step }, action: "aprovado", comentario: "" })
                    }
                  >
                    {t("approve")}
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </SimpleGrid>
      )}

      {/* ============== Histórico ============== */}
      {historico.length > 0 && (
        <>
          <Title order={4} mt="lg">
            {t("apr_history")}
          </Title>
          <Stack gap="xs">
            {historico.slice(0, 8).map(({ demand, step }, i) => (
              <Paper key={`${demand.id}-${i}`} withBorder radius="md" p="md">
                <Group justify="space-between" wrap="wrap">
                  <Group gap="sm">
                    <Avatar
                      color={step.status === "aprovado" ? "teal" : "red"}
                      variant="filled"
                      radius="xl"
                      size="md"
                    >
                      {step.status === "aprovado" ? "✓" : "✗"}
                    </Avatar>
                    <div>
                      <Anchor component={Link} to={`/demandas/${demand.id}`} fw={600}>
                        {demand.titulo}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {demand.numero} · {nivelLabel[step.nivel]} · {formatRelative(step.acaoEm)}
                      </Text>
                    </div>
                  </Group>
                  <Badge color={step.status === "aprovado" ? "teal" : "red"} variant="light">
                    {step.status === "aprovado" ? t("approved") : t("rejected")}
                  </Badge>
                </Group>
                {step.comentario && (
                  <Text size="sm" mt="xs" c="dimmed">
                    "{step.comentario}"
                  </Text>
                )}
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* ============== Modal decidir ============== */}
      <Modal
        opened={!!decision}
        onClose={() => setDecision(null)}
        title={
          decision?.action === "aprovado"
            ? t("apr_decideTitle_approve", { numero: decision?.item.demand.numero ?? "" })
            : decision
              ? t("apr_decideTitle_reject", { numero: decision.item.demand.numero })
              : ""
        }
      >
        {decision && (
          <Stack>
            <Paper withBorder radius="md" p="sm" bg="gray.0">
              <Group gap="sm">
                <Avatar color="abbott" radius="xl" size="md" variant="filled">
                  {initialsFromName(user.name)}
                </Avatar>
                <div>
                  <Text fw={600} size="sm">
                    {user.name}
                  </Text>
                  <Group gap={4}>
                    <IconClock size={11} />
                    <Text size="xs" c="dimmed">
                      {nivelLabel[decision.item.step.nivel]}
                    </Text>
                  </Group>
                </div>
              </Group>
            </Paper>
            <Textarea
              label={t("comment")}
              autosize
              minRows={2}
              placeholder={t("apr_justify")}
              value={decision.comentario}
              onChange={(e) =>
                setDecision({ ...decision, comentario: e.currentTarget.value })
              }
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setDecision(null)}>
                {t("cancel")}
              </Button>
              <Button
                color={decision.action === "aprovado" ? "teal" : "red"}
                leftSection={
                  decision.action === "aprovado" ? (
                    <IconCheck size={16} />
                  ) : (
                    <IconX size={16} />
                  )
                }
                onClick={decidir}
              >
                {decision.action === "aprovado" ? t("approve") : t("reject")}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

