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
        title: "Stack validada",
        message: `Validado por ${modal.avaliador}`,
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
        title: "Critério validado",
        message: `${SCORE_LABELS[modal.criterio]} por ${modal.avaliador}`,
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
      title: "Critério reaberto",
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
                Status da avaliação
              </Text>
              <Text fw={700} fz="lg">
                {validados === total
                  ? "Avaliação concluída"
                  : `${total - validados} critério(s) pendentes`}
              </Text>
              <Text size="sm" c="dimmed">
                Cada critério precisa ser validado por um avaliador antes do
                score entrar no Score Board oficial.
              </Text>
            </div>
          </Group>
          <Box ta="right">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Score ponderado
            </Text>
            <Text fz={36} fw={800} c="abbott.7" lh={1}>
              {wScore.toFixed(2)}
            </Text>
            <Text size="xs" c="dimmed">
              / 5,00
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
                {validadosCat}/{criterios.length} validados
              </Badge>
            </Group>

            {!canScore(cat) && (
              <Text size="xs" c="dimmed" mt="xs">
                Somente {ROLE_LABEL[CATEGORIA_PAPEL[cat]]} (ou Admin) pontua esta estação.
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
              <Text fw={700}>Validação da Stack Tecnológica</Text>
              <Text size="xs" c="dimmed">
                O Tech Lead aprova os sistemas, integrações e tecnologias propostas
              </Text>
            </div>
          </Group>
          {stackValidada ? (
            <Badge color="teal" variant="light" size="lg" radius="sm">
              Aprovada
            </Badge>
          ) : (
            <Badge color="orange" variant="light" size="lg" radius="sm">
              Pendente
            </Badge>
          )}
        </Group>

        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" mt="sm">
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Sistemas envolvidos
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.sistemasEnvolvidos || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Integrações
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.integracoesNecessarias || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Solução proposta
            </Text>
            <Text size="sm" mt={2} style={{ whiteSpace: "pre-wrap" }}>
              {demand.solucaoProposta || "—"}
            </Text>
          </Paper>
          <Paper withBorder radius="md" p="sm" bg="gray.0">
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Requisitos principais
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
                Aprovada por <strong>{demand.stackValidadaPor}</strong>
                {demand.stackValidadaEm && ` em ${formatDate(demand.stackValidadaEm)}`}
              </Text>
            </Group>
          ) : (
            <Text size="sm" c="dimmed">
              Aguardando validação do Tech Lead.
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
                Reabrir
              </Button>
            ) : null
          ) : canScoreStack ? (
            <Button
              variant="filled"
              color="grape"
              leftSection={<IconUserCheck size={16} />}
              onClick={() => openValidar("stack")}
            >
              Validar stack
            </Button>
          ) : (
            <Badge color="gray" variant="light">
              Aguardando Tech Lead
            </Badge>
          )}
        </Group>
      </Card>

      {/* ---------- Caixa explicativa ---------- */}
      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm" fw={600} mb={4}>
          Como funciona
        </Text>
        <Text size="sm">
          Os 7 critérios são divididos em <strong>3 estações de avaliação</strong>.
          Cada avaliador valida apenas os critérios sob sua alçada. Notas só são
          consideradas no Score Board quando os 7 critérios estiverem validados.
          Para incluir avaliadores, vá em <em>Administração → Avaliadores</em>.
        </Text>
      </Alert>

      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title={
          modal?.criterio === "stack"
            ? "Validar stack tecnológica"
            : modal
              ? `Validar: ${SCORE_LABELS[modal.criterio]}`
              : ""
        }
      >
        {modal && (
          <Stack>
            <Select
              label="Avaliador"
              withAsterisk
              data={avaliadores.map((a) => a.nome)}
              value={modal.avaliador || null}
              onChange={(v) => setModal({ ...modal, avaliador: v ?? "" })}
              searchable
              nothingFoundMessage="Cadastre em Administração → Avaliadores"
            />
            <DateInput
              label="Data da validação"
              valueFormat="DD/MM/YYYY"
              value={modal.data}
              onChange={(v) => v && setModal({ ...modal, data: v })}
            />
            <Textarea
              label="Comentário (opcional)"
              autosize
              minRows={2}
              placeholder="Justifique a nota ou registre observações..."
              value={modal.comentario}
              onChange={(e) => setModal({ ...modal, comentario: e.currentTarget.value })}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setModal(null)}>
                Cancelar
              </Button>
              <Button
                color="teal"
                leftSection={<IconCheck size={16} />}
                disabled={!modal.avaliador.trim()}
                onClick={confirmarValidacao}
              >
                Confirmar validação
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
          <Tooltip label={`Peso ${(peso * 100).toFixed(0)}% no score final`}>
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
                automático
              </Badge>
            ) : canScore ? (
              <Tooltip label="Reabrir critério">
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
              Validar
            </Button>
          ) : (
            <Badge color="gray" variant="light" size="sm">
              aguardando
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
              Validado por{" "}
              <Text component="span" fw={600} c="dark">
                {avaliacao.validadoPor}
              </Text>{" "}
              em {formatDate(avaliacao.validadoEm)}
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
