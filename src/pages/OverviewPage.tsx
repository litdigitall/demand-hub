/* ============================================================
   Overview — a tela de leitura do funil, para PMO e decisores.

   Reescrita para densidade de desktop. A versão anterior gastava
   metade de um monitor 1920x1080 com seis caixas de um número cada
   e um gráfico de barras; não respondia as perguntas que quem olha
   esta tela faz.

   Agora responde, e só com campo que existe no modelo:
     - Onde a fila está travada?      funil por etapa + quantas passaram da meta
     - Quem está devendo decisão?     gates pendentes por decisor de área
     - O que está apodrecendo?        as mais antigas paradas, por etapa
     - O que deveria sair primeiro?   fila por score, com idade e urgência à vista
     - Quanto isso pesa?              horas por frente contra a capacidade do mês

   Nada de série temporal (meses vazios numa base nova) e nada de
   métrica que dependa de campo que ninguém preenche.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Grid,
  Group,
  Loader,
  Progress,
  Stack,
  Table,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconPresentation } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  CAPACIDADE_PADRAO_HORAS,
  CATEGORIA_COR_VIEW,
  CATEGORIA_RESPONSAVEL,
  CATEGORIA_VIEW_LABEL,
  CONSOME_CAPACIDADE,
  StatusDemanda,
  clasificacionEfetiva,
  weightedScore,
  type Categoria,
  type Demand,
} from "../data/types";
import { PIPELINE } from "../domain/workflow";
import { diasNoEstado, isOverdue, sla } from "../domain/sla";
import { StatusBadge, UrgenciaBadge } from "../components/Badges";
import { formatNumber } from "../lib/format";
import { useCurrentUser } from "../lib/useCurrentUser";
import { Role } from "../domain/roles";

const TRACKS: Categoria[] = ["infra", "ia", "app", "otro"];

/** Etapas vivas: o que ainda está no funil. */
function ativa(d: Demand): boolean {
  return d.status !== StatusDemanda.Concluida && d.status !== StatusDemanda.Recusada;
}

/* ---------------- Faixa de métricas ------------------------- */

interface MetricaProps {
  label: string;
  valor: number;
  /** Destino já filtrado — o número e a lista têm que casar. */
  to: string;
  tone?: string;
}

function Metrica({ label, valor, to, tone }: MetricaProps) {
  return (
    <Anchor
      component={Link}
      to={to}
      underline="never"
      style={{ color: "inherit", flex: 1, minWidth: 0 }}
    >
      <Box px="md" py={10}>
        <Text fz={10} fw={700} tt="uppercase" lts={0.7} c="dimmed" truncate>
          {label}
        </Text>
        <Text fz={26} fw={800} lh={1.15} c={valor === 0 ? "dimmed" : tone}>
          {valor}
        </Text>
      </Box>
    </Anchor>
  );
}

/* ---------------- Página ------------------------------------ */

export function OverviewPage() {
  const user = useCurrentUser();
  /* O deck consolida a base inteira — mesmo escopo da antiga ReportPage,
     que era admin-only. Fora de PMO/Admin o botão não existe. */
  const podeExportar = user.roles.includes(Role.PMO) || user.roles.includes(Role.Admin);
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let vivo = true;
    demandService
      .list()
      .then((data) => {
        if (vivo) setItems(data);
      })
      .catch((err: unknown) => {
        notifications.show({
          color: "red",
          title: "Could not load requests",
          message: err instanceof Error ? err.message : "Unexpected error.",
        });
      })
      .finally(() => {
        if (vivo) setLoading(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const m = useMemo(() => {
    const vivas = items.filter(ativa);
    const by = (s: number) => items.filter((d) => d.status === s).length;

    /* Funil: uma linha por etapa do pipeline, com quantas passaram da meta. */
    const funil = PIPELINE.filter((e) => e.status !== StatusDemanda.Concluida).map((etapa) => {
      const doEstado = items.filter((d) => d.status === etapa.status);
      return {
        label: etapa.label,
        status: etapa.status,
        total: doEstado.length,
        estouradas: doEstado.filter((d) => sla(d).tom === "estourado").length,
        maisAntiga: doEstado.reduce((acc, d) => Math.max(acc, diasNoEstado(d)), 0),
      };
    });
    const maxFunil = Math.max(1, ...funil.map((f) => f.total));

    /* Fora do fluxo linear: devolvidas (bola com o solicitante), recusadas e
       concluídas. Sem isso a soma das etapas não fecha com o total. */
    const devolvidas = items.filter((d) => d.status === StatusDemanda.Devolvida);
    const foraDoFluxo = [
      {
        label: "Returned to requester",
        total: devolvidas.length,
        tone: "orange.7",
        nota: devolvidas.length
          ? `oldest ${devolvidas.reduce((a, d) => Math.max(a, diasNoEstado(d)), 0)}d`
          : "",
      },
      {
        label: "Rejected",
        total: items.filter((d) => d.status === StatusDemanda.Recusada).length,
        tone: "red.7",
        nota: "",
      },
      {
        label: "Completed",
        total: items.filter((d) => d.status === StatusDemanda.Concluida).length,
        tone: "teal.7",
        nota: "",
      },
    ];

    /* Gates pendentes por decisor da frente — quem está segurando a fila. */
    const decisoes = TRACKS.map((cat) => {
      const esperando = items.filter(
        (d) => d.status === StatusDemanda.EmAprovacao && clasificacionEfetiva(d) === cat,
      );
      return {
        cat,
        decisor: CATEGORIA_RESPONSAVEL[cat],
        total: esperando.length,
        maisAntiga: esperando.reduce((acc, d) => Math.max(acc, diasNoEstado(d)), 0),
      };
    }).filter((x) => x.total > 0 || x.decisor !== "—");

    /* Carga por frente: quantas demandas e quantas horas já comprometidas. */
    const carga = TRACKS.map((cat) => {
      const doTrack = vivas.filter((d) => clasificacionEfetiva(d) === cat);
      return {
        cat,
        total: doTrack.length,
        horas: doTrack
          .filter((d) => CONSOME_CAPACIDADE.includes(d.status))
          .reduce((s, d) => s + (d.horasEstimadas || 0), 0),
      };
    }).filter((x) => x.total > 0);
    const capacidadeMes = Object.values(CAPACIDADE_PADRAO_HORAS).reduce((a, b) => a + b, 0);
    const horasComprometidas = carga.reduce((s, c) => s + c.horas, 0);

    /* O que deveria sair primeiro: score, desempatado por prioridade manual. */
    const topPriority = [...vivas]
      .sort((a, b) => {
        const diff = weightedScore(b.score) - weightedScore(a.score);
        if (diff !== 0) return diff;
        return (a.finalPriority ?? 999) - (b.finalPriority ?? 999);
      })
      .slice(0, 8);

    /* O que está apodrecendo: mais tempo parado no estado atual. */
    const maisAntigas = [...vivas]
      .sort((a, b) => diasNoEstado(b) - diasNoEstado(a))
      .slice(0, 8);

    return {
      total: items.length,
      novas: by(StatusDemanda.Nova),
      emAnalise: by(StatusDemanda.EmAnalise),
      emAprovacao: by(StatusDemanda.EmAprovacao),
      priorizadas: by(StatusDemanda.Priorizada),
      emExecucao: by(StatusDemanda.EmExecucao),
      atrasadas: items.filter(isOverdue).length,
      funil,
      maxFunil,
      foraDoFluxo,
      decisoes,
      carga,
      capacidadeMes,
      horasComprometidas,
      topPriority,
      maisAntigas,
    };
  }, [items]);

  async function exportDeck() {
    setExporting(true);
    try {
      // import dinâmico: pptxgenjs (~370 kB) só entra quando o deck é pedido
      const { generateMonthlyReport } = await import("../lib/monthlyReport");
      await generateMonthlyReport(items);
    } catch (err: unknown) {
      notifications.show({
        color: "red",
        title: "Export failed",
        message: err instanceof Error ? err.message : "Could not generate the deck.",
      });
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  const usoCapacidade = m.capacidadeMes
    ? Math.round((m.horasComprometidas / m.capacidadeMes) * 100)
    : 0;

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center">
        <Title order={2}>Overview</Title>
        {podeExportar && (
          <Button
            radius="md"
            leftSection={<IconPresentation size={17} />}
            loading={exporting}
            onClick={exportDeck}
          >
            Export monthly deck
          </Button>
        )}
      </Group>

      {/* Faixa única em vez de seis cartões: o mesmo dado em 1/3 da altura. */}
      <Card withBorder radius="lg" padding={0}>
        <Group gap={0} wrap="nowrap" style={{ overflow: "hidden" }}>
          <Metrica label="In triage" valor={m.novas} to="/demandas?status=nova" />
          <Metrica label="In evaluation" valor={m.emAnalise} to="/demandas?status=analise" />
          <Metrica
            label="Needs decision"
            valor={m.emAprovacao}
            to="/demandas?status=aprovacao"
            tone="grape.7"
          />
          <Metrica label="Prioritized" valor={m.priorizadas} to="/demandas?status=priorizada" />
          <Metrica label="In execution" valor={m.emExecucao} to="/demandas?status=execucao" />
          <Metrica label="Overdue" valor={m.atrasadas} to="/demandas?overdue=1" tone="red.7" />
          <Metrica label="Total" valor={m.total} to="/demandas" />
        </Group>
      </Card>

      <Grid align="stretch">
        {/* ---- Onde a fila está travada ---- */}
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>Pipeline</Text>
              <Text fz="xs" c="dimmed">
                red = past the stage target
              </Text>
            </Group>
            <Stack gap={10}>
              {m.funil.map((f) => (
                <Group key={f.status} gap="sm" wrap="nowrap">
                  <Text fz="sm" w={116} c="dimmed" style={{ flexShrink: 0 }}>
                    {f.label}
                  </Text>
                  <Box
                    style={{
                      flex: 1,
                      height: 14,
                      borderRadius: 999,
                      background: "var(--mantine-color-gray-1)",
                      overflow: "hidden",
                      display: "flex",
                    }}
                  >
                    <Box
                      style={{
                        width: `${Math.round(((f.total - f.estouradas) / m.maxFunil) * 100)}%`,
                        background: "var(--mantine-color-abbott-6)",
                      }}
                    />
                    <Box
                      style={{
                        width: `${Math.round((f.estouradas / m.maxFunil) * 100)}%`,
                        background: "var(--mantine-color-red-6)",
                      }}
                    />
                  </Box>
                  <Text fz="sm" fw={700} w={32} ta="right" style={{ flexShrink: 0 }}>
                    {f.total}
                  </Text>
                  <Tooltip
                    label={`${f.estouradas} past target · oldest ${f.maisAntiga} days`}
                    withArrow
                  >
                    <Text
                      fz="xs"
                      w={92}
                      ta="right"
                      c={f.estouradas > 0 ? "red.7" : "dimmed"}
                      fw={f.estouradas > 0 ? 700 : 400}
                      style={{ flexShrink: 0 }}
                    >
                      {f.estouradas > 0 ? `${f.estouradas} late` : "on target"}
                    </Text>
                  </Tooltip>
                </Group>
              ))}
            </Stack>

            {/* Estados fora do fluxo linear: fecham a conta de para onde a fila
                escoou, e é o que sobrava de espaço vazio no cartão. */}
            <Group gap="xl" mt="lg" pt="md" style={{ borderTop: "1px solid var(--mantine-color-gray-2)" }}>
              {m.foraDoFluxo.map((x) => (
                <Box key={x.label}>
                  <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                    {x.label}
                  </Text>
                  <Group gap={6} align="baseline">
                    <Text fz="xl" fw={800} c={x.total === 0 ? "dimmed" : x.tone}>
                      {x.total}
                    </Text>
                    {x.nota ? (
                      <Text fz="xs" c="dimmed">
                        {x.nota}
                      </Text>
                    ) : null}
                  </Group>
                </Box>
              ))}
            </Group>
          </Card>
        </Grid.Col>

        {/* ---- Quem está devendo decisão ---- */}
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Text fw={700} mb="sm">
              Waiting on a decision
            </Text>
            <Table verticalSpacing={7} horizontalSpacing={0}>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                      Track · decisor
                    </Text>
                  </Table.Th>
                  <Table.Th w={54} ta="right">
                    <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                      Open
                    </Text>
                  </Table.Th>
                  <Table.Th w={72} ta="right">
                    <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                      Oldest
                    </Text>
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {m.decisoes.map((x) => (
                  <Table.Tr key={x.cat}>
                    <Table.Td>
                      <Group gap={8} wrap="nowrap">
                        <Box
                          w={7}
                          h={7}
                          bg={`${CATEGORIA_COR_VIEW[x.cat]}.6`}
                          style={{ borderRadius: "50%", flexShrink: 0 }}
                        />
                        <Text fz="sm" truncate>
                          {CATEGORIA_VIEW_LABEL[x.cat]}
                          <Text component="span" c="dimmed">
                            {" · "}
                            {x.decisor}
                          </Text>
                        </Text>
                      </Group>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fz="sm" fw={700} c={x.total > 0 ? undefined : "dimmed"}>
                        {x.total}
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text fz="sm" c={x.maisAntiga > 3 ? "red.7" : "dimmed"} fw={x.maisAntiga > 3 ? 700 : 400}>
                        {x.total > 0 ? `${x.maisAntiga}d` : "—"}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {/* Carga contra a capacidade do mês: o outro lado da priorização. */}
            <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed" mt="lg" mb={6}>
              Committed hours this month
            </Text>
            <Group justify="space-between" mb={4}>
              <Text fz="sm" fw={700}>
                {formatNumber(m.horasComprometidas)} / {formatNumber(m.capacidadeMes)} h
              </Text>
              <Text fz="sm" fw={700} c={usoCapacidade > 100 ? "red.7" : undefined}>
                {usoCapacidade}%
              </Text>
            </Group>
            <Progress
              value={Math.min(100, usoCapacidade)}
              color={usoCapacidade > 100 ? "red" : usoCapacidade > 90 ? "orange" : "abbott"}
              size="lg"
              radius="xl"
            />
            <Text fz="xs" c="dimmed" mt={8}>
              {m.carga
                .map(
                  (c) =>
                    `${CATEGORIA_VIEW_LABEL[c.cat]}: ${c.total} req` +
                    (c.horas > 0 ? `, ${formatNumber(c.horas)}h` : ""),
                )
                .join("  ·  ")}
            </Text>
          </Card>
        </Grid.Col>

        {/* ---- O que deveria sair primeiro ---- */}
        <Grid.Col span={{ base: 12, lg: 7 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>Top priority</Text>
              <Anchor component={Link} to="/demandas?view=priority" fz="xs">
                Open ranking
              </Anchor>
            </Group>
            {m.topPriority.length === 0 ? (
              <Text fz="sm" c="dimmed">
                No open requests.
              </Text>
            ) : (
              <Table verticalSpacing={6} horizontalSpacing="xs" highlightOnHover layout="fixed">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th w={82}>
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        No.
                      </Text>
                    </Table.Th>
                    <Table.Th>
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        Request
                      </Text>
                    </Table.Th>
                    <Table.Th w={98} visibleFrom="xl">
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        Urgency
                      </Text>
                    </Table.Th>
                    <Table.Th w={126}>
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        Status
                      </Text>
                    </Table.Th>
                    <Table.Th w={48} ta="right">
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        Age
                      </Text>
                    </Table.Th>
                    <Table.Th w={52} ta="right">
                      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed">
                        Score
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {m.topPriority.map((d) => {
                    const idade = sla(d);
                    return (
                      <Table.Tr key={d.id}>
                        <Table.Td>
                          <Text fz={11} c="dimmed" ff="monospace" style={{ whiteSpace: "nowrap" }}>
                            {d.numero}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Anchor component={Link} to={`/demandas/${d.id}`} fz="sm" fw={500} truncate>
                            {d.titulo}
                          </Anchor>
                        </Table.Td>
                        <Table.Td visibleFrom="xl">
                          <UrgenciaBadge value={d.urgencia} />
                        </Table.Td>
                        <Table.Td>
                          <StatusBadge value={d.status} />
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text
                            fz="xs"
                            fw={idade.tom === "ok" ? 400 : 700}
                            c={idade.tom === "estourado" ? "red.7" : "dimmed"}
                          >
                            {idade.dias}d
                          </Text>
                        </Table.Td>
                        <Table.Td ta="right">
                          <Text fz="sm" fw={700} c="abbott.7">
                            {weightedScore(d.score).toFixed(2)}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>

        {/* ---- O que está apodrecendo ---- */}
        <Grid.Col span={{ base: 12, lg: 5 }}>
          <Card withBorder radius="lg" padding="lg" h="100%">
            <Group justify="space-between" mb="sm">
              <Text fw={700}>Sitting the longest</Text>
              <Text fz="xs" c="dimmed">
                days in the current stage
              </Text>
            </Group>
            {m.maisAntigas.length === 0 ? (
              <Text fz="sm" c="dimmed">
                Nothing waiting.
              </Text>
            ) : (
              <Table verticalSpacing={6} horizontalSpacing="xs" highlightOnHover layout="fixed">
                <Table.Tbody>
                  {m.maisAntigas.map((d) => {
                    const idade = sla(d);
                    return (
                      <Table.Tr key={d.id}>
                        <Table.Td>
                          <Anchor component={Link} to={`/demandas/${d.id}`} fz="sm" fw={500} truncate>
                            {d.titulo}
                          </Anchor>
                        </Table.Td>
                        <Table.Td w={126}>
                          <StatusBadge value={d.status} />
                        </Table.Td>
                        <Table.Td w={52} ta="right">
                          <Text
                            fz="sm"
                            fw={700}
                            c={idade.tom === "estourado" ? "red.7" : idade.tom === "atencao" ? "orange.7" : "dimmed"}
                          >
                            {idade.dias}d
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            )}
          </Card>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
