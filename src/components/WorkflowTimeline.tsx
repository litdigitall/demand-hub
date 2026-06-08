/* ============================================================
   WorkflowTimeline — barra horizontal com 7 estágios do fluxo
   end-to-end da demanda. Cada estágio mostra: ícone, label,
   estado (concluído/atual/futuro/bloqueado) e hint.
   ============================================================ */
import {
  Badge,
  Box,
  Card,
  Group,
  Paper,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from "@mantine/core";
import {
  IconArrowRight,
  IconBriefcase,
  IconChartBar,
  IconCheck,
  IconClipboardCheck,
  IconClock,
  IconHammer,
  IconInbox,
  IconRocket,
  IconTarget,
  IconX,
  type Icon,
} from "@tabler/icons-react";
import {
  ESTAGIOS_FLUXO,
  estagioLabel,
  estagioLabelEN,
  fluxoEstagios,
  type Demand,
  type EstagioFluxo,
  type EstagioInfo,
} from "../data/types";
import { useT } from "../i18n";

const ICONS: Record<EstagioFluxo, Icon> = {
  intake: IconInbox,
  businessResponse: IconBriefcase,
  priorityMatrix: IconChartBar,
  priorityLevel: IconTarget,
  dmcApproval: IconClipboardCheck,
  execution: IconRocket,
  implementation: IconHammer,
};

function colorFor(status: EstagioInfo["status"]): string {
  switch (status) {
    case "concluido":
      return "teal";
    case "atual":
      return "abbott";
    case "bloqueado":
      return "red";
    case "futuro":
    default:
      return "gray";
  }
}

interface Props {
  demand: Demand;
  compact?: boolean;
}

export function WorkflowTimeline({ demand, compact = false }: Props) {
  const { lang } = useT();
  const labels = lang === "en" ? estagioLabelEN : estagioLabel;
  const stages = fluxoEstagios(demand);
  const concluidos = stages.filter((s) => s.status === "concluido").length;

  return (
    <Card withBorder radius="lg" padding={compact ? "md" : "lg"} bg="abbott.0">
      <Group justify="space-between" mb="sm" wrap="wrap">
        <div>
          <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts={1}>
            {lang === "en" ? "End-to-end workflow" : "Fluxo end-to-end"}
          </Text>
          <Text fw={700} fz="lg">
            {concluidos}/{stages.length}{" "}
            {lang === "en" ? "stages completed" : "estágios concluídos"}
          </Text>
        </div>
        <Group gap="xs">
          {demand.idServiceNow && (
            <Badge color="violet" variant="light" size="lg" radius="sm">
              ServiceNow: {demand.idServiceNow}
            </Badge>
          )}
          {demand.idProjeto && (
            <Badge color="teal" variant="filled" size="lg" radius="sm">
              {demand.idProjeto}
            </Badge>
          )}
        </Group>
      </Group>

      <ScrollArea scrollbarSize={6} type="auto">
        <Group gap={0} wrap="nowrap" align="flex-start" mt="md" mb="xs">
          {stages.map((s, i) => {
            const Ic = ICONS[s.estagio];
            const color = colorFor(s.status);
            const isLast = i === stages.length - 1;
            return (
              <Group key={s.estagio} gap={0} wrap="nowrap" align="flex-start" style={{ flex: 1, minWidth: 110 }}>
                <Stack gap={4} align="center" style={{ flex: 1 }}>
                  <Tooltip label={s.hint} multiline maw={240} withArrow>
                    <ThemeIcon
                      size={compact ? 36 : 44}
                      radius="xl"
                      color={color}
                      variant={s.status === "futuro" || s.status === "bloqueado" ? "light" : "filled"}
                      style={{
                        boxShadow:
                          s.status === "atual"
                            ? "0 0 0 4px var(--mantine-color-abbott-2)"
                            : undefined,
                      }}
                    >
                      {s.status === "concluido" ? (
                        <IconCheck size={compact ? 18 : 22} />
                      ) : s.status === "bloqueado" ? (
                        <IconX size={compact ? 18 : 22} />
                      ) : s.status === "atual" ? (
                        <Ic size={compact ? 18 : 22} />
                      ) : (
                        <Ic size={compact ? 18 : 22} />
                      )}
                    </ThemeIcon>
                  </Tooltip>
                  <Text
                    size="xs"
                    fw={s.status === "atual" || s.status === "concluido" ? 700 : 500}
                    ta="center"
                    c={s.status === "futuro" ? "dimmed" : undefined}
                    style={{ lineHeight: 1.2, maxWidth: 110 }}
                  >
                    {labels[s.estagio]}
                  </Text>
                  {s.status === "atual" && (
                    <Badge size="xs" color="abbott" variant="filled" leftSection={<IconClock size={9} />}>
                      {lang === "en" ? "Now" : "Agora"}
                    </Badge>
                  )}
                </Stack>
                {!isLast && (
                  <Box style={{ paddingTop: compact ? 16 : 20, color: `var(--mantine-color-${color}-5)` }}>
                    <IconArrowRight size={16} stroke={2.5} />
                  </Box>
                )}
              </Group>
            );
          })}
        </Group>
      </ScrollArea>

      {!compact && (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" mt="md">
          {stages.map((s) => (
            <Paper key={s.estagio} withBorder radius="sm" p="xs">
              <Group gap="xs" wrap="nowrap">
                <Badge color={colorFor(s.status)} variant="dot" size="sm" miw={90}>
                  {labels[s.estagio]}
                </Badge>
                <Text size="xs" c="dimmed" style={{ flex: 1 }}>
                  {s.hint}
                </Text>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}
    </Card>
  );
}

// re-export pra evitar tree-shake error
export const _stages = ESTAGIOS_FLUXO;
