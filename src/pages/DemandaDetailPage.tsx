import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Divider,
  FileButton,
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  Textarea,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconChecks,
  IconClipboardCheck,
  IconDownload,
  IconFile,
  IconMessage2,
  IconNotebook,
  IconPaperclip,
  IconShieldCheck,
  IconStar,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { useCurrentUser } from "../lib/useCurrentUser";
import { ScoringPanel } from "../components/ScoringPanel";
import { ApprovalsPanel } from "../components/ApprovalsPanel";
import { WorkflowTimeline } from "../components/WorkflowTimeline";
import { FluxoPanel } from "../components/FluxoPanel";
import { useT } from "../i18n";
import {
  statusOptions,
  weightedScore,
  type Demand,
} from "../data/types";
import {
  EsforcoBadge,
  ImpactoBadge,
  StatusBadge,
  TipoBadge,
  UrgenciaBadge,
} from "../components/Badges";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  initialsFromName,
} from "../lib/format";

const STAGE_OPTIONS = ["Discovery", "Build", "UAT", "Go-Live", "On-Hold"];

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

export function DemandaDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { t } = useT();

  const [loading, setLoading] = useState(true);
  const [demand, setDemand] = useState<Demand | null>(null);
  const [, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeTab, setActiveTab] = useState<string | null>("overview");

  useEffect(() => {
    if (!id) return;
    demandService
      .get(id)
      .then((d) => setDemand(d ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading)
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );

  if (!demand)
    return (
      <Center h="60vh">
        <Stack align="center" gap="sm">
          <Text fw={600}>{t("detail_notFound")}</Text>
          <Button component={Link} to="/demandas" variant="default">
            {t("detail_backToList")}
          </Button>
        </Stack>
      </Center>
    );

  function persist(changes: Partial<Demand>, opts?: { silent?: boolean }) {
    if (!demand) return;
    setSaving(true);
    return demandService
      .update(demand.id, changes)
      .then((d) => {
        setDemand(d);
        if (!opts?.silent) {
          notifications.show({
            color: "teal",
            title: t("detail_saved"),
            message: t("detail_savedChanges"),
          });
        }
      })
      .finally(() => setSaving(false));
  }

  async function handleDelete() {
    if (!demand) return;
    await demandService.remove(demand.id);
    notifications.show({
      color: "red",
      title: t("detail_demandRemoved"),
      message: demand.numero,
    });
    navigate("/demandas");
  }

  async function handleAddComment() {
    if (!demand || !newComment.trim()) return;
    const updated = await demandService.addComment(demand.id, user.name, newComment.trim());
    setDemand(updated);
    setNewComment("");
  }

  async function handleUpload(file: File | null) {
    if (!file || !demand) return;
    const updated = await demandService.addAnexo(demand.id, file.name, file.size);
    setDemand(updated);
    notifications.show({
      color: "teal",
      title: t("detail_files_uploaded"),
      message: file.name,
    });
  }

  async function handleRemoveAnexo(anexoId: string) {
    if (!demand) return;
    const updated = await demandService.removeAnexo(demand.id, anexoId);
    setDemand(updated);
  }


  const wScore = weightedScore(demand.score);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          <Group gap="sm">
            <Badge color="abbott" size="lg" radius="sm" variant="filled">
              {demand.numero}
            </Badge>
            <StatusBadge value={demand.status} />
            <TipoBadge value={demand.tipo} />
            <UrgenciaBadge value={demand.urgencia} />
            <ImpactoBadge value={demand.impactoNivel} />
          </Group>
          <Title order={2} mt="xs">
            {demand.titulo}
          </Title>
          <Text c="dimmed" mt={4}>
            {demand.areaSolicitante} · solicitado por {demand.solicitante} ·{" "}
            {formatDate(demand.dataSolicitacao)}
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            component={Link}
            to="/demandas"
            leftSection={<IconArrowLeft size={17} />}
          >
            {t("back")}
          </Button>
          <Button
            color="red"
            variant="outline"
            leftSection={<IconTrash size={16} />}
            onClick={() => setDeleteOpen(true)}
          >
            {t("delete")}
          </Button>
        </Group>
      </Group>

      {/* Banner do score ponderado */}
      <Paper withBorder radius="lg" p="md" bg="abbott.0">
        <Group justify="space-between" wrap="wrap">
          <Group gap="sm">
            <IconShieldCheck size={26} color="var(--mantine-color-abbott-7)" />
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                {t("detail_score_label")}
              </Text>
              <Text fz={28} fw={800}>
                {wScore.toFixed(2)} <Text component="span" size="sm" c="dimmed">/ 5,00</Text>
              </Text>
            </div>
          </Group>
          <Group gap="sm">
            <Select
              label={t("status")}
              data={statusOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              value={String(demand.status)}
              allowDeselect={false}
              onChange={(v) => v && persist({ status: Number(v) })}
              w={180}
            />
            <Select
              label={t("detail_project_stage")}
              data={STAGE_OPTIONS}
              value={demand.projectStage}
              allowDeselect={false}
              onChange={(v) => v && persist({ projectStage: v })}
              w={160}
            />
          </Group>
        </Group>
      </Paper>

      <WorkflowTimeline demand={demand} />

      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconNotebook size={16} />}>
            {t("detail_overview")}
          </Tabs.Tab>
          <Tabs.Tab value="fluxo" leftSection={<IconShieldCheck size={16} />}>
            {t("detail_fluxo")}
          </Tabs.Tab>
          <Tabs.Tab value="scoring" leftSection={<IconStar size={16} />}>
            {t("detail_scoring")}
          </Tabs.Tab>
          <Tabs.Tab
            value="approvals"
            leftSection={<IconClipboardCheck size={16} />}
            rightSection={
              demand.aprovacoes.some((a) => a.status === "pendente") ? (
                <Badge size="xs" color="orange" variant="filled">
                  {demand.aprovacoes.filter((a) => a.status === "pendente").length}
                </Badge>
              ) : null
            }
          >
            {t("detail_approvals")}
          </Tabs.Tab>
          <Tabs.Tab value="comments" leftSection={<IconMessage2 size={16} />}>
            {t("detail_comments")} ({demand.comentarios.length})
          </Tabs.Tab>
          <Tabs.Tab value="files" leftSection={<IconPaperclip size={16} />}>
            {t("detail_files")} ({demand.anexos.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* ---------- Visão geral ---------- */}
        <Tabs.Panel value="overview" pt="lg">
          <Grid>
            <Grid.Col span={{ base: 12, md: 8 }}>
              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={1} title={t("detail_section_basic")} />
                <KV k={t("detail_label_title")} v={demand.titulo} />
                <KV k={t("detail_label_description")} v={demand.descricao} multiline />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
                  <KV k={t("detail_label_area")} v={demand.areaSolicitante} />
                  <KV k={t("detail_label_requester")} v={demand.solicitante} />
                  <KV k={t("detail_label_email")} v={demand.email} />
                  <KV k={t("detail_label_phone")} v={demand.telefone || "—"} />
                </SimpleGrid>
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={2} title={t("detail_section_objective")} />
                <KV k={t("detail_label_problem")} v={demand.problemaResolve} multiline />
                <KV k={t("detail_label_objective")} v={demand.objetivoPrincipal} multiline />
                <KV k={t("detail_label_processes")} v={demand.processosImpactados} multiline />
                <KV k={t("detail_label_consequence")} v={demand.consequenciaNaoExecucao} multiline />
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={6} title={t("detail_section_scope")} />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                  <KV k={t("detail_label_systems")} v={demand.sistemasEnvolvidos} multiline />
                  <KV k={t("detail_label_integrations")} v={demand.integracoesNecessarias} multiline />
                  <KV k={t("detail_label_reqs")} v={demand.requisitosPrincipais} multiline />
                  <KV k={t("detail_label_solution")} v={demand.solucaoProposta} multiline />
                </SimpleGrid>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 4 }}>
              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={4} title={t("detail_section_impact")} />
                <KV k={t("detail_label_impactLevel")} v={<ImpactoBadge value={demand.impactoNivel} />} />
                <KV k={t("detail_label_estimatedValue")} v={formatCurrency(demand.valorEstimado)} />
                <Text size="xs" c="dimmed" mt={4}>
                  {t("detail_label_impactTypes")}
                </Text>
                <Group gap={6} mt={4}>
                  {demand.tiposImpacto.map((t) => (
                    <Badge key={t} variant="dot" color="cyan">
                      {t === 1
                        ? "Receita"
                        : t === 2
                          ? "Redução de custos"
                          : t === 3
                            ? "Eficiência"
                            : t === 4
                              ? "Risco / compliance"
                              : "Experiência do cliente"}
                    </Badge>
                  ))}
                  {demand.tiposImpacto.length === 0 && (
                    <Text size="xs" c="dimmed">
                      —
                    </Text>
                  )}
                </Group>
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={5} title={t("detail_section_urgency")} />
                <KV k={t("detail_label_urgency")} v={<UrgenciaBadge value={demand.urgencia} />} />
                <KV k={t("detail_label_deadline")} v={demand.deadline ? formatDate(demand.deadline) : "—"} />
                <KV k={t("detail_label_effort")} v={<EsforcoBadge value={demand.esforcoEstimado} />} />
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel n={7} title={t("detail_section_stakeholders")} />
                <KV k={t("detail_label_sponsor")} v={demand.sponsor} />
                <KV k={t("detail_label_processOwner")} v={demand.donoProcesso || "—"} />
                <KV k={t("detail_label_areasInvolved")} v={demand.areasEnvolvidas || "—"} />
              </Card>

              <Card withBorder radius="lg" padding="lg">
                <SectionLabel n={8} title={t("detail_section_compliance")} />
                <Stack gap={6}>
                  <ChipRow label={t("detail_label_pii")} on={demand.dadosSensiveis} yes={t("yes")} no={t("no")} />
                  <ChipRow label={t("detail_label_security")} on={demand.impactaSeguranca} yes={t("yes")} no={t("no")} />
                  <ChipRow label={t("detail_label_audit")} on={demand.requerAuditoria} yes={t("yes")} no={t("no")} />
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* ---------- Fluxo (edição dos campos end-to-end) ---------- */}
        <Tabs.Panel value="fluxo" pt="lg">
          <FluxoPanel
            demand={demand}
            onSave={(changes) => persist(changes, { silent: true })}
          />
        </Tabs.Panel>

        {/* ---------- Scoring (workflow de validação) ---------- */}
        <Tabs.Panel value="scoring" pt="lg">
          <ScoringPanel
            demand={demand}
            onSave={(changes) => persist(changes, { silent: true })}
          />
        </Tabs.Panel>

        {/* ---------- Aprovações (workflow 3 níveis) ---------- */}
        <Tabs.Panel value="approvals" pt="lg">
          <ApprovalsPanel
            demand={demand}
            onSave={(changes) => persist(changes, { silent: true })}
          />
        </Tabs.Panel>

        {/* ---------- Comentários ---------- */}
        <Tabs.Panel value="comments" pt="lg">
          <Card withBorder radius="lg" padding="lg">
            <Stack gap="md">
              <Stack gap={4}>
                <Text fw={600} size="sm">
                  {t("detail_comments_addLabel")}
                </Text>
                <Textarea
                  autosize
                  minRows={2}
                  value={newComment}
                  placeholder={t("detail_comments_placeholder")}
                  onChange={(e) => setNewComment(e.currentTarget.value)}
                />
                <Group justify="flex-end">
                  <Button
                    size="sm"
                    leftSection={<IconChecks size={14} />}
                    disabled={!newComment.trim()}
                    onClick={handleAddComment}
                  >
                    {t("detail_comments_post")}
                  </Button>
                </Group>
              </Stack>

              <Divider />

              {demand.comentarios.length === 0 ? (
                <Text size="sm" c="dimmed" ta="center" py="md">
                  {t("detail_comments_none")}
                </Text>
              ) : (
                <Stack gap="sm">
                  {[...demand.comentarios]
                    .sort((a, b) => b.data.localeCompare(a.data))
                    .map((c) => (
                      <Paper key={c.id} withBorder radius="md" p="md">
                        <Group justify="space-between" mb={4}>
                          <Group gap={8}>
                            <Badge color="abbott" variant="light">
                              {initialsFromName(c.autor)}
                            </Badge>
                            <Text fw={600} size="sm">
                              {c.autor}
                            </Text>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {formatDateTime(c.data)}
                          </Text>
                        </Group>
                        <Text size="sm" style={{ whiteSpace: "pre-wrap" }}>
                          {c.texto}
                        </Text>
                      </Paper>
                    ))}
                </Stack>
              )}
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* ---------- Anexos ---------- */}
        <Tabs.Panel value="files" pt="lg">
          <Card withBorder radius="lg" padding="lg">
            <Group justify="space-between" mb="md">
              <Text fw={700}>{t("detail_files_count", { n: demand.anexos.length })}</Text>
              <FileButton onChange={handleUpload}>
                {(props) => (
                  <Button leftSection={<IconUpload size={16} />} {...props}>
                    {t("upload")}
                  </Button>
                )}
              </FileButton>
            </Group>
            {demand.anexos.length === 0 ? (
              <Center py="xl">
                <Stack align="center" gap="xs">
                  <IconFile size={32} color="var(--mantine-color-gray-5)" />
                  <Text size="sm" c="dimmed">
                    {t("detail_files_none")}
                  </Text>
                </Stack>
              </Center>
            ) : (
              <Table verticalSpacing="sm">
                <Table.Tbody>
                  {demand.anexos.map((a) => (
                    <Table.Tr key={a.id}>
                      <Table.Td>
                        <Group gap={8}>
                          <IconFile size={18} />
                          <Text fw={500}>{a.nomeArquivo}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td c="dimmed" w={120}>
                        {fmtBytes(a.tamanhoBytes)}
                      </Table.Td>
                      <Table.Td c="dimmed" w={140}>
                        {formatDate(a.uploadEm)}
                      </Table.Td>
                      <Table.Td w={80} ta="right">
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() =>
                            notifications.show({
                              color: "abbott",
                              title: t("detail_files_downloadSimulated"),
                              message: `${a.nomeArquivo} (mock)`,
                            })
                          }
                        >
                          <IconDownload size={16} />
                        </ActionIcon>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          onClick={() => handleRemoveAnexo(a.id)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Tabs.Panel>
      </Tabs>

      <Text size="xs" c="dimmed">
        {t("detail_lastUpdate")}: {formatDateTime(demand.modificadoEm)}
      </Text>

      <Modal opened={deleteOpen} onClose={() => setDeleteOpen(false)} title={t("detail_deleteTitle")}>
        <Stack>
          <Alert color="red" icon={<IconTrash size={16} />}>
            {t("detail_deleteWarn", { numero: demand.numero })}
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setDeleteOpen(false)}>
              {t("cancel")}
            </Button>
            <Button color="red" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
              {t("delete")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

function SectionLabel({ n, title }: { n: number; title: string }) {
  return (
    <Group gap={8} mb="sm">
      <Badge color="abbott" variant="light" radius="sm" size="sm">
        {n}
      </Badge>
      <Text fw={700}>{title}</Text>
    </Group>
  );
}

function KV({
  k,
  v,
  multiline,
}: {
  k: string;
  v: React.ReactNode;
  multiline?: boolean;
}) {
  return (
    <Box mb="sm">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
        {k}
      </Text>
      {typeof v === "string" ? (
        <Text style={multiline ? { whiteSpace: "pre-wrap" } : undefined}>{v || "—"}</Text>
      ) : (
        <Box mt={4}>{v}</Box>
      )}
    </Box>
  );
}

function ChipRow({
  label,
  on,
  yes,
  no,
}: {
  label: string;
  on: boolean;
  yes: string;
  no: string;
}) {
  return (
    <Group gap={8}>
      <Badge color={on ? "red" : "gray"} variant={on ? "filled" : "outline"} radius="sm">
        {on ? yes : no}
      </Badge>
      <Text size="sm">{label}</Text>
    </Group>
  );
}
