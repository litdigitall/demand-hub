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
  Grid,
  Group,
  Loader,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  Textarea,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconArrowLeft,
  IconChecks,
  IconClipboardCheck,
  IconMessage2,
  IconNotebook,
  IconShieldCheck,
  IconStar,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import { useCurrentUser } from "../lib/useCurrentUser";
import { ScoringPanel } from "../components/ScoringPanel";
import { ApprovalsPanel } from "../components/ApprovalsPanel";
import { LifecycleTimeline } from "../components/LifecycleTimeline";
import { NextActionCard } from "../components/NextActionCard";
import { useT } from "../i18n";
import { Role } from "../domain/roles";
import { aguardando } from "../domain/workflow";
import { sla } from "../domain/sla";
import {
  abrangenciaLabel,
  tipoImpactoLabel,
  appName,
  CATEGORIA_COR_VIEW,
  CATEGORIA_VIEW_LABEL,
  clasificacionEfetiva,
  processoRecomendado,
  weightedScore,
  TIME_DESCRICAO,
  type Demand,
  type TimeImplantacao,
} from "../data/types";
import {
  EsforcoBadge,
  ImpactoBadge,
  StatusBadge,
  UrgenciaBadge,
} from "../components/Badges";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  initialsFromName,
} from "../lib/format";

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




  const wScore = weightedScore(demand.score);
  /* Idade no estado: a outra metade da decisão. Score diz o que importa,
     isto diz há quanto tempo está parado esperando alguém. */
  const idade = sla(demand);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* 3 sinais: identidade, onde está e de quem é a decisão.
              Tipo/urgência/impacto/project type vivem no card Impact ao lado —
              repetir aqui era ruído (eram 9 badges na mesma linha). */}
          <Group gap="sm">
            <Badge color="abbott" size="lg" radius="sm" variant="filled">
              {demand.numero}
            </Badge>
            <StatusBadge value={demand.status} />
            <Badge variant="light" color={CATEGORIA_COR_VIEW[clasificacionEfetiva(demand)]} radius="sm">
              {clasificacionEfetiva(demand) === "otro" && demand.clasificacionOtro
                ? demand.clasificacionOtro
                : CATEGORIA_VIEW_LABEL[clasificacionEfetiva(demand)]}
            </Badge>
          </Group>
          <Title order={2} mt="xs">
            {demand.titulo}
          </Title>
          <Text c="dimmed" mt={4}>
            {demand.areaSolicitante} · requested by {demand.solicitante} ·{" "}
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
          <Tooltip label={t("delete")} withArrow>
            <ActionIcon
              variant="subtle"
              color="red"
              size="lg"
              aria-label={t("delete")}
              onClick={() => setDeleteOpen(true)}
            >
              <IconTrash size={17} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      {/* CTA + faixa de fatos na MESMA banda: eram duas faixas, cada uma com
          ~1.400px de branco. Agora a ação fica à esquerda e os números que a
          decisão exige ocupam a direita. */}
      <NextActionCard
        demand={demand}
        roles={user.roles}
        ator={user.name}
        onSave={(changes) => persist(changes, { silent: true })}
        fatos={
          <Group gap="xl" wrap="nowrap" align="flex-start">
            <Fato label={t("detail_score_label")}>
              {wScore.toFixed(2)}
              <Text component="span" size="sm" c="dimmed" fw={500}>
                {" "}
                / 5.00
              </Text>
            </Fato>
            <Fato
              label="In this stage"
              tone={
                idade.tom === "estourado"
                  ? "red.7"
                  : idade.tom === "atencao"
                    ? "orange.7"
                    : undefined
              }
            >
              {idade.dias}d
              {idade.alvo !== undefined && (
                <Text component="span" size="sm" c="dimmed" fw={500}>
                  {" "}
                  / {idade.alvo}
                </Text>
              )}
            </Fato>
            <Fato label={t("detail_project_stage")}>{demand.projectStage || "—"}</Fato>
            {demand.finalPriority != null && demand.finalPriority > 0 && (
              <Fato label="Priority">#{demand.finalPriority}</Fato>
            )}
            {demand.rce && <Fato label="RCE">{demand.rce}</Fato>}
            {demand.appId && (
              <Fato label="App">
                {demand.appName || appName(demand.appId) || demand.appId}
              </Fato>
            )}
            <Fato label="Waiting on">
              <Text component="span" fz="sm" fw={600}>
                {aguardando(demand).replace("Waiting on ", "")}
              </Text>
            </Fato>
          </Group>
        }
      />

      <Grid align="flex-start">
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Stack gap="md">
          <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List>
          <Tabs.Tab value="overview" leftSection={<IconNotebook size={16} />}>
            {t("detail_overview")}
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
        </Tabs.List>

        {/* ---------- Visão geral ---------- */}
        <Tabs.Panel value="overview" pt="lg">
          <Grid>
            <Grid.Col span={{ base: 12, lg: 7 }}>
              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel title={t("detail_section_basic")} />
                <KV k={t("detail_label_title")} v={demand.titulo} />
                <KV k={t("detail_label_description")} v={demand.descricao} multiline />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
                  <KV k={t("detail_label_area")} v={demand.areaSolicitante} />
                  <KV k={t("detail_label_requester")} v={demand.solicitante} />
                  <KV k={t("detail_label_email")} v={demand.email} />
                  <KV k={t("detail_label_phone")} v={demand.telefone} />
                </SimpleGrid>
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel title={t("detail_section_objective")} />
                <KV k={t("detail_label_problem")} v={demand.problemaResolve} multiline />
                <KV k={t("detail_label_objective")} v={demand.objetivoPrincipal} multiline />
                <KV k={t("detail_label_processes")} v={demand.processosImpactados} multiline />
                <KV k={t("detail_label_consequence")} v={demand.consequenciaNaoExecucao} multiline />
              </Card>

              {/* Detalhe técnico: o solicitante não preenche (não sabe) — quem
                  completa é o Time Técnico durante a Avaliação. Em leitura,
                  campos vazios não aparecem: card sem nada preenchido some. */}
              <ScopeCard
                demand={demand}
                podeEditar={
                  user.roles.includes(Role.TechLead) ||
                  user.roles.includes(Role.PMO) ||
                  user.roles.includes(Role.Admin)
                }
                onSave={(changes) => persist(changes)}
              />
            </Grid.Col>

            <Grid.Col span={{ base: 12, lg: 5 }}>
              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel title={t("detail_section_impact")} />
                {demand.impactoAbrangencia ? (
                  <KV k="Reach (automatic score)" v={abrangenciaLabel[demand.impactoAbrangencia]} />
                ) : null}
                <KV k={t("detail_label_impactLevel")} v={<ImpactoBadge value={demand.impactoNivel} />} />
                <KV k={t("detail_label_estimatedValue")} v={formatCurrency(demand.valorEstimado)} />
                {demand.roiEstimado != null && (
                  <KV k="Estimated ROI" v={`${demand.roiEstimado}%`} />
                )}
                {demand.tiposImpacto.length > 0 && (
                  <KV
                    k={t("detail_label_impactTypes")}
                    v={
                      <Group gap={6}>
                        {demand.tiposImpacto.map((ti) => (
                          <Badge key={ti} variant="dot" color="cyan">
                            {tipoImpactoLabel[ti]}
                          </Badge>
                        ))}
                      </Group>
                    }
                  />
                )}
              </Card>

              <Card withBorder radius="lg" padding="lg" mb="md">
                <SectionLabel title={t("detail_section_urgency")} />
                <KV k={t("detail_label_urgency")} v={<UrgenciaBadge value={demand.urgencia} />} />
                <KV k={t("detail_label_deadline")} v={demand.deadline ? formatDate(demand.deadline) : ""} />
                <KV k={t("detail_label_effort")} v={<EsforcoBadge value={demand.esforcoEstimado} />} />
                {(() => {
                  const p = processoRecomendado(demand);
                  return (
                    <KV
                      k="Recommended process"
                      v={
                        <Badge color={p.color} variant="light" radius="sm">
                          {p.processo} · {p.motivo}
                        </Badge>
                      }
                    />
                  );
                })()}
                {demand.time && (
                  <KV
                    k="Team (capacity)"
                    v={`${demand.time} · ${TIME_DESCRICAO[demand.time as TimeImplantacao]}${demand.horasEstimadas ? ` · ${demand.horasEstimadas}h` : ""}`}
                  />
                )}
              </Card>

              {/* Card só aparece se houver alguém para mostrar. */}
              {(demand.sponsor || demand.donoProcesso || demand.areasEnvolvidas) && (
                <Card withBorder radius="lg" padding="lg" mb="md">
                  <SectionLabel title={t("detail_section_stakeholders")} />
                  <KV k={t("detail_label_sponsor")} v={demand.sponsor} />
                  <KV k={t("detail_label_processOwner")} v={demand.donoProcesso} />
                  <KV k={t("detail_label_areasInvolved")} v={demand.areasEnvolvidas} />
                </Card>
              )}

              <Card withBorder radius="lg" padding="lg">
                <SectionLabel title={t("detail_section_compliance")} />
                <Stack gap={6}>
                  <ChipRow label={t("detail_label_pii")} on={demand.dadosSensiveis} yes={t("yes")} no={t("no")} />
                  <ChipRow label={t("detail_label_security")} on={demand.impactaSeguranca} yes={t("yes")} no={t("no")} />
                  <ChipRow label={t("detail_label_audit")} on={demand.requerAuditoria} yes={t("yes")} no={t("no")} />
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        </Tabs.Panel>

        {/* ---------- Scoring (workflow de validação) ---------- */}
        <Tabs.Panel value="scoring" pt="lg">
          <ScoringPanel
            demand={demand}
            roles={user.roles}
            ator={user.name}
            onSave={(changes) => persist(changes, { silent: true })}
          />
        </Tabs.Panel>

        {/* ---------- Aprovações (somente leitura; decisões via motor) ---------- */}
        <Tabs.Panel value="approvals" pt="lg">
          <ApprovalsPanel
            demand={demand}
            interactive={false}
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
          </Tabs>
          </Stack>
        </Grid.Col>

        {/* Coluna de contexto: quem decide e onde a demanda está. */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md" style={{ position: "sticky", top: 78 }}>
            {/* Gate único: uma linha diz quem decide e em que pé está.
                Antes era um stepper de 44px com linhas conectoras para UM passo. */}
            {demand.aprovacoes.length > 0 && (() => {
              const gate = demand.aprovacoes[demand.aprovacoes.length - 1];
              const aprovado = gate.status === "aprovado";
              const recusado = gate.status === "recusado";
              const cor = aprovado ? "teal" : recusado ? "red" : "abbott";
              return (
                <Card withBorder radius="lg" padding="md" style={{ borderColor: `var(--mantine-color-${cor}-3)` }}>
                  <Group justify="space-between" wrap="wrap" gap="sm">
                    <Group gap="sm">
                      <ThemeIcon size={32} radius="md" variant="light" color={cor}>
                        {aprovado ? <IconChecks size={18} /> : recusado ? <IconX size={18} /> : <IconShieldCheck size={18} />}
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                          Area decision
                        </Text>
                        <Text fw={700}>{gate.responsavel}</Text>
                      </div>
                    </Group>
                    <Group gap="sm">
                      {gate.acaoEm && (
                        <Text size="sm" c="dimmed">{formatDate(gate.acaoEm)}</Text>
                      )}
                      <Badge color={cor} variant={aprovado || recusado ? "filled" : "light"} size="lg">
                        {aprovado ? "Approved" : recusado ? "Rejected" : "Waiting for decision"}
                      </Badge>
                    </Group>
                  </Group>
                  {gate.comentario && (
                    <Text size="sm" c="dimmed" mt="sm" style={{ whiteSpace: "pre-wrap" }}>
                      "{gate.comentario}"
                    </Text>
                  )}
                </Card>
              );
            })()}
            <LifecycleTimeline demand={demand} />
          </Stack>
        </Grid.Col>
      </Grid>

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

/** Um número da faixa de fatos: rótulo pequeno em cima, valor grande embaixo. */
function Fato({
  label,
  children,
  tone,
}: {
  label: string;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <Box ta="right">
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1} style={{ whiteSpace: "nowrap" }}>
        {label}
      </Text>
      <Text fw={700} fz="lg" c={tone} style={{ whiteSpace: "nowrap" }}>
        {children}
      </Text>
    </Box>
  );
}

function SectionLabel({ title }: { title: string }) {
  return (
    <Text fw={700} mb="sm">
      {title}
    </Text>
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
  /* Campo vazio não vira linha: uma ficha cheia de "—" só ocupa espaço e
     esconde o que de fato foi informado. */
  if (v == null || (typeof v === "string" && !v.trim())) return null;
  return (
    <Box mb="sm" style={{ minWidth: 0 }}>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
        {k}
      </Text>
      {typeof v === "string" ? (
        <Text
          style={
            multiline
              ? { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }
              : { overflowWrap: "anywhere" }
          }
        >
          {v}
        </Text>
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

/* ---------- Detalhe técnico, preenchido pelo Time Técnico ---------- */
function ScopeCard({
  demand,
  podeEditar,
  onSave,
}: {
  demand: Demand;
  podeEditar: boolean;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
}) {
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [form, setForm] = useState({
    sistemasEnvolvidos: demand.sistemasEnvolvidos,
    integracoesNecessarias: demand.integracoesNecessarias,
    requisitosPrincipais: demand.requisitosPrincipais,
    solucaoProposta: demand.solucaoProposta,
  });

  const campos = [
    ["sistemasEnvolvidos", "Systems involved"],
    ["integracoesNecessarias", "Required integrations"],
    ["requisitosPrincipais", "Main requirements"],
    ["solucaoProposta", "Proposed solution"],
  ] as const;

  const preenchidos = campos.filter(([k]) => (demand[k] ?? "").trim().length > 0);
  // Nada preenchido e sem permissão de editar: o card não existe.
  if (preenchidos.length === 0 && !podeEditar) return null;

  async function salvar() {
    setSalvando(true);
    try {
      await onSave(form);
      setEditando(false);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg" mb="md">
      <Group justify="space-between" align="center" mb="xs">
        <SectionLabel title="Technical detail" />
        {podeEditar &&
          (editando ? (
            <Group gap="xs">
              <Button size="xs" variant="default" onClick={() => setEditando(false)}>
                Cancel
              </Button>
              <Button size="xs" loading={salvando} onClick={salvar}>
                Save
              </Button>
            </Group>
          ) : (
            <Button size="xs" variant="light" onClick={() => setEditando(true)}>
              {preenchidos.length ? "Edit" : "Add technical detail"}
            </Button>
          ))}
      </Group>

      {editando ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {campos.map(([chave, rotulo]) => (
            <Textarea
              key={chave}
              label={rotulo}
              autosize
              minRows={2}
              value={form[chave]}
              onChange={(e) => setForm({ ...form, [chave]: e.currentTarget.value })}
            />
          ))}
        </SimpleGrid>
      ) : preenchidos.length ? (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
          {preenchidos.map(([chave, rotulo]) => (
            <KV key={chave} k={rotulo} v={demand[chave]} multiline />
          ))}
        </SimpleGrid>
      ) : (
        <Text size="sm" c="dimmed">
          Filled in by the technical team during the evaluation.
        </Text>
      )}
    </Card>
  );
}
