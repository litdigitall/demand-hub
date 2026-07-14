/* ============================================================
   LifecycleTimeline — a ÚNICA timeline da demanda.
   Mostra as 7 etapas do pipeline linear, marcando concluídas,
   atual e futuras a partir do status. Estados laterais
   (Devolvida / Recusada) aparecem como aviso destacado.
   ============================================================ */
import { Badge, Card, Group, Stack, Text, ThemeIcon } from "@mantine/core";
import { IconCheck, IconPointFilled, IconArrowBackUp, IconX } from "@tabler/icons-react";
import { StatusDemanda, type Demand } from "../data/types";
import { PIPELINE, pipelineIndex, aguardando } from "../domain/workflow";

export function LifecycleTimeline({ demand }: { demand: Demand }) {
  const devolvida = demand.status === StatusDemanda.Devolvida;
  const recusada = demand.status === StatusDemanda.Recusada;

  // Em estados laterais, a etapa "ativa" mostrada é a última do fluxo linear
  // por onde a demanda passou (triagem para devolvida; onde parou p/ recusada).
  const idxAtual = recusada || devolvida ? -1 : pipelineIndex(demand.status);

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700}>Lifecycle</Text>
        <Badge variant="light" color={recusada ? "red" : devolvida ? "yellow" : "gray"}>
          {aguardando(demand)}
        </Badge>
      </Group>
      {/* (textos abaixo em español) */}

      {(devolvida || recusada) && (
        <Group
          gap="xs"
          mb="md"
          p="sm"
          style={{
            background: recusada ? "var(--mantine-color-red-0)" : "var(--mantine-color-yellow-0)",
            borderRadius: 8,
          }}
        >
          <ThemeIcon color={recusada ? "red" : "yellow"} variant="light" radius="xl" size="sm">
            {recusada ? <IconX size={12} /> : <IconArrowBackUp size={12} />}
          </ThemeIcon>
          <Text size="sm" fw={500}>
            {recusada
              ? "Request rejected — out of the flow."
              : "Returned to the requester to complete and resubmit."}
          </Text>
        </Group>
      )}

      <Stack gap={0}>
        {PIPELINE.map((etapa, i) => {
          const concluida = idxAtual >= 0 && i < idxAtual;
          const atual = i === idxAtual;
          const cor = concluida ? "teal" : atual ? "abbott" : "gray";
          return (
            <Group key={etapa.status} gap="sm" wrap="nowrap" align="flex-start" py={6}>
              <Stack gap={0} align="center" style={{ width: 28 }}>
                <ThemeIcon
                  size={26}
                  radius="xl"
                  variant={concluida || atual ? "filled" : "light"}
                  color={cor}
                >
                  {concluida ? <IconCheck size={14} /> : <IconPointFilled size={14} />}
                </ThemeIcon>
                {i < PIPELINE.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      height: 22,
                      background: concluida
                        ? "var(--mantine-color-teal-4)"
                        : "var(--mantine-color-gray-3)",
                    }}
                  />
                )}
              </Stack>
              <div style={{ flex: 1, minWidth: 0, paddingBottom: 6 }}>
                <Group gap={6}>
                  <Text fw={atual ? 700 : 500} c={atual ? "abbott.7" : concluida ? "dark" : "dimmed"}>
                    {etapa.label}
                  </Text>
                  {atual && (
                    <Badge size="xs" color="abbott" variant="filled">
                      current
                    </Badge>
                  )}
                </Group>
                <Text size="xs" c="dimmed">
                  {etapa.descricao}
                </Text>
              </div>
            </Group>
          );
        })}
      </Stack>
    </Card>
  );
}
