/* ============================================================
   FluxoPanel — edição dos campos do workflow end-to-end:
   - Resposta do Business
   - Decisão do DMC (Demand Management Committee)
   - IDs de integração (ServiceNow, Projeto)
   ============================================================ */
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Grid,
  Group,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconBriefcase,
  IconBuilding,
  IconCheck,
  IconClipboardCheck,
  IconDeviceFloppy,
  IconExternalLink,
  IconHash,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react";
import { WorkflowTimeline } from "./WorkflowTimeline";
import type { Demand } from "../data/types";
import { formatDate } from "../lib/format";

interface Props {
  demand: Demand;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
}

export function FluxoPanel({ demand, onSave }: Props) {
  const [respostaBusiness, setRespostaBusiness] = useState(demand.respostaBusiness);
  const [idServiceNow, setIdServiceNow] = useState(demand.idServiceNow);
  const [idProjeto, setIdProjeto] = useState(demand.idProjeto);
  const [dmcComentario, setDmcComentario] = useState(demand.dmcComentario);
  const [dmcData, setDmcData] = useState<string | null>(demand.dmcData || null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setRespostaBusiness(demand.respostaBusiness);
    setIdServiceNow(demand.idServiceNow);
    setIdProjeto(demand.idProjeto);
    setDmcComentario(demand.dmcComentario);
    setDmcData(demand.dmcData || null);
    setDirty(false);
  }, [demand.id, demand.modificadoEm]);

  async function salvarBusiness() {
    await onSave({ respostaBusiness });
    notifications.show({
      color: "teal",
      title: "Resposta registrada",
      message: "Business validou e respondeu a demanda.",
    });
    setDirty(false);
  }

  async function decidirDMC(aprovado: boolean) {
    await onSave({
      dmcAprovado: aprovado,
      dmcData: new Date().toISOString(),
      dmcComentario,
    });
    notifications.show({
      color: aprovado ? "teal" : "red",
      title: aprovado ? "DMC aprovou" : "DMC recusou",
      message: aprovado
        ? "Demanda liberada para execução."
        : "Demanda devolvida ao solicitante.",
    });
  }

  async function reverterDMC() {
    await onSave({ dmcAprovado: null, dmcData: "", dmcComentario: "" });
  }

  async function salvarIds() {
    await onSave({ idServiceNow, idProjeto });
    notifications.show({
      color: "abbott",
      title: "IDs atualizados",
      message:
        [idServiceNow && `ServiceNow ${idServiceNow}`, idProjeto && `Projeto ${idProjeto}`]
          .filter(Boolean)
          .join(" · ") || "Limpos.",
    });
    setDirty(false);
  }

  return (
    <Stack gap="lg">
      <WorkflowTimeline demand={demand} compact />

      {/* ============== 2. Resposta do Business ============== */}
      <Card withBorder radius="lg" padding="lg">
        <Group gap="sm" mb="xs">
          <ThemeIcon color="blue" variant="light" size={38} radius="md">
            <IconBriefcase size={20} />
          </ThemeIcon>
          <div>
            <Title order={5}>Resposta do Business</Title>
            <Text size="sm" c="dimmed">
              Resposta formal da área solicitante após análise inicial
            </Text>
          </div>
          {demand.respostaBusiness && (
            <Badge color="teal" variant="light" ml="auto">
              Concluído
            </Badge>
          )}
        </Group>
        <Textarea
          autosize
          minRows={3}
          placeholder="Escreva a resposta do business..."
          value={respostaBusiness}
          onChange={(e) => {
            setRespostaBusiness(e.currentTarget.value);
            setDirty(true);
          }}
        />
        <Group justify="flex-end" mt="sm">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            disabled={respostaBusiness === demand.respostaBusiness}
            onClick={salvarBusiness}
          >
            Salvar resposta
          </Button>
        </Group>
      </Card>

      {/* ============== 5. DMC (Demand Management Committee) ============== */}
      <Card withBorder radius="lg" padding="lg">
        <Group gap="sm" mb="xs">
          <ThemeIcon color="violet" variant="light" size={38} radius="md">
            <IconClipboardCheck size={20} />
          </ThemeIcon>
          <div>
            <Title order={5}>DMC — Demand Management Committee</Title>
            <Text size="sm" c="dimmed">
              Comitê de avaliação final que libera a execução do projeto
            </Text>
          </div>
          {demand.dmcAprovado === true && (
            <Badge color="teal" variant="filled" ml="auto" leftSection={<IconCheck size={12} />}>
              Aprovado pelo DMC
            </Badge>
          )}
          {demand.dmcAprovado === false && (
            <Badge color="red" variant="filled" ml="auto" leftSection={<IconX size={12} />}>
              Recusado pelo DMC
            </Badge>
          )}
          {demand.dmcAprovado === null && (
            <Badge color="orange" variant="light" ml="auto">
              Pendente
            </Badge>
          )}
        </Group>

        {demand.dmcAprovado !== null ? (
          <Paper withBorder radius="md" p="md" bg={demand.dmcAprovado ? "teal.0" : "red.0"}>
            <Group justify="space-between">
              <div>
                <Text fw={600}>
                  {demand.dmcAprovado ? "Aprovado" : "Recusado"} em{" "}
                  {formatDate(demand.dmcData)}
                </Text>
                {demand.dmcComentario && (
                  <Text size="sm" mt={4} style={{ whiteSpace: "pre-wrap" }}>
                    "{demand.dmcComentario}"
                  </Text>
                )}
              </div>
              <Button variant="subtle" color="gray" size="xs" onClick={reverterDMC}>
                Reabrir
              </Button>
            </Group>
          </Paper>
        ) : (
          <Stack gap="sm">
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
              <DateInput
                label="Data da decisão"
                valueFormat="DD/MM/YYYY"
                value={dmcData}
                onChange={setDmcData}
                placeholder="Hoje"
                clearable
              />
              <div />
            </SimpleGrid>
            <Textarea
              label="Comentário do DMC"
              autosize
              minRows={2}
              placeholder="Decisão e justificativa do comitê..."
              value={dmcComentario}
              onChange={(e) => setDmcComentario(e.currentTarget.value)}
            />
            <Group justify="flex-end" mt="xs">
              <Button
                color="red"
                variant="outline"
                leftSection={<IconX size={16} />}
                onClick={() => decidirDMC(false)}
              >
                Recusar
              </Button>
              <Button
                color="teal"
                leftSection={<IconCheck size={16} />}
                onClick={() => decidirDMC(true)}
              >
                Aprovar
              </Button>
            </Group>
          </Stack>
        )}
      </Card>

      {/* ============== 7. IDs de integração ============== */}
      <Card withBorder radius="lg" padding="lg">
        <Group gap="sm" mb="xs">
          <ThemeIcon color="grape" variant="light" size={38} radius="md">
            <IconBuilding size={20} />
          </ThemeIcon>
          <div>
            <Title order={5}>Integrações & Identificadores</Title>
            <Text size="sm" c="dimmed">
              Vincule a demanda ao ticket do ServiceNow e ao código do projeto
            </Text>
          </div>
        </Group>
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="ServiceNow ID"
              placeholder="Ex.: INC1234567"
              leftSection={<IconHash size={14} />}
              value={idServiceNow}
              onChange={(e) => {
                setIdServiceNow(e.currentTarget.value);
                setDirty(true);
              }}
              description="Ticket original aberto pelo solicitante"
            />
          </Grid.Col>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <TextInput
              label="ID Projeto"
              placeholder="Ex.: PRJ-2026-001"
              leftSection={<IconHash size={14} />}
              value={idProjeto}
              onChange={(e) => {
                setIdProjeto(e.currentTarget.value);
                setDirty(true);
              }}
              description="Código no portfólio de projetos (definido após DMC)"
            />
          </Grid.Col>
        </Grid>
        <Group justify="flex-end" mt="md">
          <Button
            leftSection={<IconDeviceFloppy size={16} />}
            disabled={
              idServiceNow === demand.idServiceNow && idProjeto === demand.idProjeto
            }
            onClick={salvarIds}
          >
            Salvar IDs
          </Button>
        </Group>
      </Card>

      <Alert color="abbott" variant="light" icon={<IconInfoCircle size={18} />}>
        <Text size="sm">
          <strong>Como o fluxo acende a timeline:</strong> Intake é sempre concluído; Resposta
          Business acende quando o texto é salvo; Matriz quando ≥4 critérios são validados;
          Nível quando a posição é definida no Score Board; DMC quando o comitê aprova;
          Execução quando o status passa a <em>Em execução</em>; Implementação quando o ID
          de Projeto é preenchido ou status <em>Concluída</em>.
        </Text>
      </Alert>

      {dirty && (
        <Alert color="orange" icon={<IconExternalLink size={18} />}>
          Você tem alterações não salvas neste painel.
        </Alert>
      )}
    </Stack>
  );
}
