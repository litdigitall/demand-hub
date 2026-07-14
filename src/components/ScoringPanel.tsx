/* ============================================================
   ScoringPanel — workflow de validação do score por critério.
   Substitui o "descritivo literal" por uma estrutura por categoria
   (Negócio / Técnico / PMO) com botão "Validar" por critério.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Modal,
  Paper,
  Progress,
  RingProgress,
  Select,
  SimpleGrid,
  Slider,
  Stack,
  Text,
  Textarea,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconArrowBackUp,
  IconCheck,
  IconClockHour4,
  IconCpu,
  IconExternalLink,
  IconInfoCircle,
  IconRocket,
  IconShieldCheck,
  IconUserCheck,
} from "@tabler/icons-react";
import {
  CATEGORIA_COR,
  CATEGORIA_DESCRICAO,
  CATEGORIA_LABEL,
  CRITERIO_CATEGORIA,
  AUTO_AVALIADOR,
  SCORE_LABELS,
  SCORE_WEIGHTS,
  weightedScore,
  type AdminLookup,
  type AvaliacaoCriterio,
  type CategoriaAvaliacao,
  type Demand,
  type Score,
} from "../data/types";
import { adminLookupService } from "../data/adminLookupService";
import { Role, ROLE_LABEL } from "../domain/roles";
import { formatDate } from "../lib/format";

const CATEGORIA_ICON: Record<CategoriaAvaliacao, typeof IconRocket> = {
  negocio: IconRocket,
  tecnico: IconCpu,
  pmo: IconShieldCheck,
};

/* Quem pode pontuar cada estação de avaliação. */
const CATEGORIA_PAPEL: Record<CategoriaAvaliacao, Role> = {
  negocio: Role.Sponsor,
  tecnico: Role.TechLead,
  pmo: Role.PMO,
};

interface Props {
  demand: Demand;
  roles: Role[];
  ator: string;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
}

export function ScoringPanel({ demand, roles, ator, onSave }: Props) {
  const isAdmin = roles.includes(Role.Admin);
  const canScore = (cat: CategoriaAvaliacao) => isAdmin || roles.includes(CATEGORIA_PAPEL[cat]);
  const canScoreStack = isAdmin || roles.includes(Role.TechLead);
  const [avaliadores, setAvaliadores] = useState<AdminLookup[]>([]);
  const [modal, setModal] = useState<{
    criterio: keyof Score | "stack";
    avaliador: string;
    comentario: string;
    data: string;
  } | null>(null);

  useEffect(() => {
    adminLookupService.listAvaliadores().then(setAvaliadores);
  }, []);

  const criteriosPorCategoria = useMemo(() => {
    const groups: Record<CategoriaAvaliacao, (keyof Score)[]> = {
      negocio: [],
      tecnico: [],
      pmo: [],
    };
    (Object.keys(CRITERIO_CATEGORIA) as (keyof Score)[]).forEach((k) => {
      groups[CRITERIO_CATEGORIA[k]].push(k);
    });
    return groups;
  }, []);

  const avaliacoesPorCriterio = useMemo(() => {
    const map = new Map<keyof Score, AvaliacaoCriterio>();
    demand.avaliacoes.forEach((a) => map.set(a.criterio, a));
    return map;
  }, [demand.avaliacoes]);

  const total = 7;
  const validados = demand.avaliacoes.length;
  const completude = Math.round((validados / total) * 100);
  const stackValidada = !!demand.stackValidadaPor;

  function openValidar(criterio: keyof Score | "stack") {
    setModal({
      criterio,
      avaliador: ator || avaliadores[0]?.nome || "",
      comentario: "",
      data: new Date().toISOString().slice(0, 10),
    });
  }

  async function confirmarValidacao() {
    if (!modal || !modal.avaliador.trim()) return;
    if (modal.criterio === "stack") {
      await onSave({
        stackValidadaPor: modal.avaliador,
        stackValidadaEm: new Date(`${modal.data}T00:00:00Z`).toISOString(),
      });
      notifications.show({
        color: "teal",
        title: "Stack validated",
        message: `Validated by ${modal.avaliador}`,
      });
    } else {
      const restantes = demand.avaliacoes.filter(
        (a) => a.criterio !== modal.criterio,
      );
      const nova: AvaliacaoCriterio = {
        criterio: modal.criterio,
        validadoPor: modal.avaliador,
        validadoEm: new Date(`${modal.data}T00:00:00Z`).toISOString(),
        comentario: modal.comentario,
      };
      await onSave({ avaliacoes: [...restantes, nova] });
      notifications.show({
        color: "teal",
        title: "Criterion validated",
        message: `${SCORE_LABELS[modal.criterio]} by ${modal.avaliador}`,
      });
    }
    setModal(null);
  }

  async function reabrir(criterio: keyof Score) {
    await onSave({
      avaliacoes: demand.avaliacoes.filter((a) => a.criterio !== criterio),
    });
    notifications.show({
      color: "yellow",
      title: "Criterion reopened",
      message: SCORE_LABELS[criterio],
    });
  }

  async function reabrirStack() {
    await onSave({ stackValidadaPor: "", stackValidadaEm: "" });
  }

  async function atualizarNota(criterio: keyof Score, value: number) {
    await onSave({ score: { ...demand.score, [criterio]: value } });
  }

  const wScore = weightedScore(demand.score);

  return (
    <Stack gap="lg">
      {/* ---------- Header / Progresso geral ---------- */}
      <Card withBorder radius="lg" padding="lg" bg="abbott.0">
        <Group justify="space-between" wrap="wrap">
          <Group gap="lg">
            <RingProgress
              size={88}
              thickness={9}
              roundCaps
              sections={[{ value: completude, color: "abbott.6" }]}
              label={
                <Center>
                  <Text fz={18} fw={800}>
                    {validados}/{total}
                  </Text>
                </Center>
              }
            />
            <div>
              <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                Evaluation status
              </Text>
              <Text fw={700} fz="lg">
                {validados === total
                  ? "Evaluation complete"
                  : `${total - validados} criterion(s) pending`}
              </Text>
              <Text size="sm" c="dimmed">
                Each criterion must be validated by an evaluator before the
                score enters the official Score Board.
              </Text>
            </div>
          </Group>
          <Box ta="right">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Weighted score
            </Text>
            <Text fz={36} fw={800} c="abbott.7" lh={1}>
              {wScore.toFixed(2)}
            </Text>
            <Text size="xs" c="dimmed">
              / 5.00 (100%)
            </Text>
          </Box>
        </Group>
        <Progress value={completude} mt="md" color="abbott.6" radius="xl" size="sm" />
      </Card>

      {/* ---------- Categorias ---------- */}
      {(["negocio", "tecnico", "pmo"] as CategoriaAvaliacao[]).map((cat) => {
        const Icon = CATEGORIA_ICON[cat];
        const criterios = criteriosPorCategoria[cat];
        const validadosCat = criterios.filter((k) =>
          avaliacoesPorCriterio.has(k),
        ).length;
        const color = CATEGORIA_COR[cat];
        return (
          <Card key={cat} withBorder radius="lg" padding="lg">
            <Group justify="space-between" mb="xs">
              <Group gap="sm">
                <ThemeIcon size={36} radius="md" color={color} variant="light">
                  <Icon size={20} />
                </ThemeIcon>
                <div>
                  <Text fw={700}>{CATEGORIA_LABEL[cat]}</Text>
                  <Text size="xs" c="dimmed">
                    {CATEGORIA_DESCRICAO[cat]}
                  </Text>
                </div>
              </Group>
              <Badge color={color} variant="light" size="lg" radius="sm">
                {validadosCat}/{criterios.length} validated
              </Badge>
            </Group>

            {!canScore(cat) && (
              <Text size="xs" c="dimmed" mt="xs">
                Only {ROLE_LABEL[CATEGORIA_PAPEL[cat]]} (or Admin) scores this station.
              </Text>
            )}
            <Stack gap="md" mt="md">
              {criterios.map((k) => {
                const avaliacao = avaliacoesPorCriterio.get(k);
                const isValidado = !!avaliacao;
                return (
                  <CriterioRow
                    key={k}
                    criterio={k}
                    valor={demand.score[k]}
                    peso={SCORE_WEIGHTS[k]}
                    avaliacao={avaliacao}
                    color={color}
                    canScore={canScore(cat)}
                    onValorChange={(v) => atualizarNota(k, v)}
                    onValidar={() => openValidar(k)}
                    onReabrir={() => reabrir(k)}
                    disabled={isValidado || !canScore(cat)}
                  />
                );
              })}
            </Stack>
          </Card>
        );
      })}

      {/* ---------- Validação da Stack Técnica ---------- */}
      <Card withBorder radius="lg" padding="lg">
        <Group justify="space-between" mb="xs">
          <Group gap="sm">
            <ThemeIcon size={36} radius="md" color="grape" variant="light">
              <IconCpu size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700}>Technology Stack Validation</Text>
              <Text size="xs" c="dimmed">
                The Tech Lead approves the proposed systems, integrations and technologies
              </Text>
            </div>
          </Group>
          {stackValidada ? (
            <Badge color="teal" variant="light" size="lg" radius="sm">
              Approved
            </Badge>
          ) : (
            <Badge color="orange" variant="light" size="lg" radius="sm">
              Pending
            </Badge>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Systems involved
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.sistemasEnvolvidos || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Integrations
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.integracoesNecessarias || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Proposed solution
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.solucaoProposta || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Main requirements
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.requisitosPrincipais || "—"}
            </Text>
          </Paper>
        </SimpleGrid>

        <Group justify="space-between" mt="md">
          {stackValidada ? (
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" radius="xl" size="sm">
                <IconCheck size={12} />
              </ThemeIcon>
              <Text size="sm">
                Approved by <strong>{demand.stackValidadaPor}</strong>
                {demand.stackValidadaEm && ` on ${formatDate(demand.stackValidadaEm)}`}
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Waiting on the Tech Lead's validation.
            </Text>
          )}
          {stackValidada ? (
            canScoreStack ? (
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                leftSection={<IconArrowBackUp size={14} />}
                onClick={reabrirStack}
              >
                Reopen
              </Button>
            ) : null
          ) : canScoreStack ? (
            <Button
              variant="filled"
              color="grape"
              leftSection={<IconUserCheck size={16} />}
              onClick={() => openValidar("stack")}
            >
              Validate stack
            </Button>
          ) : (
            <Badge color="gray" variant="light">
              Waiting on Tech Lead
            </Badge>
          )}
        </Group>
      </Card>

      {/* ---------- Caixa explicativa ---------- */}
      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm" fw={600} mb={4}>
          How it works
        </Text>
        <Text size="sm">
          The 7 criteria are split across <strong>3 evaluation stations</strong>.
          Each evaluator validates only the criteria under their responsibility. Scores are
          only counted on the Score Board once all 7 criteria are validated.
          To add evaluators, go to <em>Administration → Evaluators</em>.
        </Text>
      </Alert>

      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.criterio === "stack"
            ? "Validate technology stack"
            : modal
              ? `Validate: ${SCORE_LABELS[modal.criterio]}`
              : ""
        }
      >
        {modal && (
          <Stack>
            <Select
              label="Evaluator"
              withAsterisk
              data={avaliadores.map((a) => a.nome)}
              value={modal.avaliador || null}
              onChange={(v) => setModal({ ...modal, avaliador: v ?? "" })}
              searchable
              nothingFoundMessage="Register them in Administration → Evaluators"
            />
            <DateInput
              label="Validation date"
              valueFormat="DD/MM/YYYY"
              value={modal.data}
              onChange={(v) => v && setModal({ ...modal, data: v })}
            />
            <Textarea
              label="Comment (optional)"
              autosize
              minRows={2}
              placeholder="Justify the score or record observations..."
              value={modal.comentario}
              onChange={(e) => setModal({ ...modal, comentario: e.currentTarget.value })}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                color="teal"
                leftSection={<IconCheck size={16} />}
                disabled={!modal.avaliador.trim()}
                onClick={confirmarValidacao}
              >
                Confirm validation
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

/* ============================================================
   Linha de 1 critério — slider + estado de validação + ações
   ============================================================ */
interface CritProps {
  criterio: keyof Score;
  valor: number;
  peso: number;
  color: string;
  canScore: boolean;
  avaliacao: AvaliacaoCriterio | undefined;
  onValorChange: (v: number) => void;
  onValidar: () => void;
  onReabrir: () => void;
  disabled: boolean;
}

function CriterioRow({
  criterio,
  valor,
  peso,
  color,
  canScore,
  avaliacao,
  onValorChange,
  onValidar,
  onReabrir,
  disabled,
}: CritProps) {
  return (
    <Paper
      withBorder
      radius="md"
      p="md"
      bg={avaliacao ? `var(--mantine-color-${color}-0)` : undefined}
    >
      <Group justify="space-between" mb={6} wrap="wrap">
        <Group gap="xs">
          {avaliacao ? (
            <ThemeIcon color={color} variant="filled" radius="xl" size="sm">
              <IconCheck size={12} />
            </ThemeIcon>
          ) : (
            <ThemeIcon color="gray" variant="light" radius="xl" size="sm">
              <IconClockHour4 size={12} />
            </ThemeIcon>
          )}
          <Text fw={600}>{SCORE_LABELS[criterio]}</Text>
          <Tooltip label={`Weight ${(peso * 100).toFixed(0)}% of the final score`}>
            <Badge variant="outline" color="gray" size="sm">
              {(peso * 100).toFixed(0)}%
            </Badge>
          </Tooltip>
        </Group>
        <Group gap="xs">
          <Badge size="lg" color={color} variant="filled" radius="sm">
            {valor}
          </Badge>
          {avaliacao ? (
            avaliacao.validadoPor === AUTO_AVALIADOR ? (
              <Badge color="blue" variant="light" size="sm">
                automatic
              </Badge>
            ) : canScore ? (
              <Tooltip label="Reopen criterion">
                <ActionIcon variant="subtle" color="gray" onClick={onReabrir}>
                  <IconArrowBackUp size={16} />
                </ActionIcon>
              </Tooltip>
            ) : null
          ) : canScore ? (
            <Button
              size="xs"
              color={color}
              leftSection={<IconUserCheck size={14} />}
              onClick={onValidar}
            >
              Validate
            </Button>
          ) : (
            <Badge color="gray" variant="light" size="sm">
              waiting
            </Badge>
          )}
        </Group>
      </Group>

      <Slider
        min={1}
        max={5}
        step={1}
        marks={[1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }))}
        value={valor}
        onChange={onValorChange}
        disabled={disabled}
        color={color}
      />

      {avaliacao && (
        <Group gap="xs" mt="md" wrap="nowrap" align="flex-start">
          <ThemeIcon size="sm" color={color} variant="light" radius="xl">
            <IconExternalLink size={11} />
          </ThemeIcon>
          <div style={{ flex: 1 }}>
            <Text size="xs" c="dimmed">
              Validated by{" "}
              <Text component="span" fw={600} c="dark">
                {avaliacao.validadoPor}
              </Text>{" "}
              on {formatDate(avaliacao.validadoEm)}
            </Text>
            {avaliacao.comentario && (
              <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
                {avaliacao.comentario}
              </Text>
            )}
          </div>
        </Group>
      )}
    </Paper>
  );
}
