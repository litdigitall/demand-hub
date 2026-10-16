/* ============================================================
   ScoringPanel — versão SIMPLES (3 critérios).

   Antes: 7 critérios, pesos quebrados, um modal de validação por
   critério, painel de ~580 linhas. Ninguém entendia de onde vinha
   o número.

   Agora: o score é calculado sozinho a partir do que o solicitante
   já respondeu. A tela só EXPLICA a conta e deixa o PMO / Time
   Técnico ajustar uma nota quando a realidade for diferente.
   ============================================================ */
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Progress,
  Slider,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCheck, IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import {
  AUTO_AVALIADOR,
  SCORE_HELP,
  SCORE_LABELS,
  SCORE_ORIGEM,
  SCORE_WEIGHTS,
  scoreAutomatico,
  weightedScore,
  type AvaliacaoCriterio,
  type Demand,
  type Score,
} from "../data/types";
import { Role } from "../domain/roles";
import { formatDate } from "../lib/format";

interface Props {
  demand: Demand;
  roles: Role[];
  ator: string;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
}

const CRITERIOS = Object.keys(SCORE_WEIGHTS) as (keyof Score)[];

function corDoTotal(total: number): string {
  if (total >= 4) return "red";
  if (total >= 3) return "orange";
  return "gray";
}

export function ScoringPanel({ demand, roles, ator, onSave }: Props) {
  const [salvando, setSalvando] = useState(false);

  /* Quem pode ajustar: PMO, Time Técnico ou Admin. O solicitante só lê. */
  const podeAjustar =
    roles.includes(Role.PMO) || roles.includes(Role.TechLead) || roles.includes(Role.Admin);

  const total = weightedScore(demand.score);
  const automatico = scoreAutomatico(demand);
  const validados = new Map<keyof Score, AvaliacaoCriterio>(
    demand.avaliacoes.map((a) => [a.criterio, a]),
  );
  const confirmado = CRITERIOS.every((c) => validados.has(c));
  const ajustado = CRITERIOS.some((c) => demand.score[c] !== automatico[c]);

  async function ajustarNota(criterio: keyof Score, valor: number) {
    await onSave({ score: { ...demand.score, [criterio]: valor } });
  }

  /** Volta as três notas para o cálculo automático do intake. */
  async function recalcular() {
    setSalvando(true);
    try {
      await onSave({ score: automatico });
      notifications.show({
        color: "teal",
        title: "Score recalculated",
        message: "The three ratings were restored from the intake answers.",
      });
    } finally {
      setSalvando(false);
    }
  }

  /** Um único botão confirma a avaliação inteira (era 1 modal por critério). */
  async function confirmar() {
    setSalvando(true);
    try {
      const agora = new Date().toISOString();
      const novas: AvaliacaoCriterio[] = CRITERIOS.map((criterio) => ({
        criterio,
        validadoPor: demand.score[criterio] === automatico[criterio] ? AUTO_AVALIADOR : ator,
        validadoEm: agora,
        comentario: "",
      }));
      await onSave({ avaliacoes: novas });
      notifications.show({
        color: "teal",
        title: "Evaluation confirmed",
        message: `Priority score ${total.toFixed(2)} / 5.00`,
      });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Stack gap="lg">
      {/* ---------- Total + explicação da conta ---------- */}
      <Card withBorder padding="lg" bg="abbott.0">
        <Group justify="space-between" align="flex-start" wrap="wrap">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={600} lts={1}>
              Priority score
            </Text>
            <Group gap="sm" align="baseline">
              <Text fz={44} fw={600} lh={1} c={`${corDoTotal(total)}.7`}>
                {total.toFixed(2)}
              </Text>
              <Text c="dimmed" fw={600}>
                / 5.00
              </Text>
              {confirmado && (
                <Badge color="teal" variant="light" leftSection={<IconCheck size={12} />}>
                  Confirmed
                </Badge>
              )}
              {ajustado && (
                <Badge color="violet" variant="light">
                  Manually adjusted
                </Badge>
              )}
            </Group>
            <Text size="sm" c="dimmed" mt={4}>
              Business impact 50% · Urgency &amp; risk 30% · Expected return 20%
            </Text>
          </div>
          <Group gap="xs">
            {podeAjustar && ajustado && (
              <Button
                variant="default"
                leftSection={<IconRefresh size={15} />}
                onClick={recalcular}
                loading={salvando}
              >
                Recalculate
              </Button>
            )}
            {podeAjustar && (
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={confirmar}
                loading={salvando}
                variant={confirmado ? "default" : "filled"}
              >
                {confirmado ? "Re-confirm" : "Confirm evaluation"}
              </Button>
            )}
          </Group>
        </Group>
        <Progress
          value={(total / 5) * 100}
          color={corDoTotal(total)}
          radius="xl"
          size="lg"
          mt="md"
        />
      </Card>

      {/* ---------- Os três critérios ---------- */}
      <Stack gap="sm">
        {CRITERIOS.map((criterio) => {
          const nota = demand.score[criterio];
          const peso = SCORE_WEIGHTS[criterio];
          const auto = automatico[criterio];
          const val = validados.get(criterio);
          return (
            <Paper key={criterio} withBorder radius="md" p="md">
              <Group justify="space-between" align="flex-start" wrap="nowrap" gap="md">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Group gap={8}>
                    <Text fw={600}>{SCORE_LABELS[criterio]}</Text>
                    <Badge variant="light" color="gray" size="sm">
                      {(peso * 100).toFixed(0)}%
                    </Badge>
                    <Tooltip label={`Calculated from: ${SCORE_ORIGEM[criterio]}`} withArrow>
                      <Badge
                        variant="dot"
                        color={nota === auto ? "teal" : "violet"}
                        size="sm"
                        style={{ cursor: "help" }}
                      >
                        {nota === auto ? "Automatic" : `Adjusted (auto: ${auto})`}
                      </Badge>
                    </Tooltip>
                  </Group>
                  <Text size="sm" c="dimmed" mt={2}>
                    {SCORE_HELP[criterio]}
                  </Text>
                  {val && (
                    <Text size="xs" c="dimmed" mt={6}>
                      Confirmed by {val.validadoPor} · {formatDate(val.validadoEm)}
                    </Text>
                  )}
                </div>

                <Stack gap={4} align="center" w={190}>
                  <Text fz={30} fw={600} lh={1}>
                    {nota}
                  </Text>
                  <Text size="xs" c="dimmed">
                    contributes {(nota * peso).toFixed(2)}
                  </Text>
                  <Slider
                    w="100%"
                    min={1}
                    max={5}
                    step={1}
                    value={nota}
                    marks={[1, 2, 3, 4, 5].map((v) => ({ value: v }))}
                    disabled={!podeAjustar}
                    onChangeEnd={(v) => ajustarNota(criterio, v)}
                    mt={4}
                  />
                </Stack>
              </Group>
            </Paper>
          );
        })}
      </Stack>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm">
          The score measures <strong>value for the business</strong> and is filled
          automatically from the request form — nobody has to know how to grade it. The{" "}
          <strong>effort</strong> (hours and delivery team) is the other side of the
          equation and lives in <em>Capacity</em>: the PMO ranks the queue by crossing
          score against available hours.
        </Text>
      </Alert>
    </Stack>
  );
}
