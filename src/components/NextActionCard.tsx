/* ============================================================
   NextActionCard — o "o que precisa de mim agora" da demanda.

   Fonte única de transições do ciclo de vida: lê o motor
   (proximasAcoes) e renderiza os botões que o usuário atual pode
   acionar no estado em que a demanda está. Cada ação coleta os
   campos que precisa (comentário, capacity, prioridade, ServiceNow)
   antes de aplicar. Nada de status é alterado fora daqui.
   ============================================================ */
import { useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconBolt, IconInfoCircle, IconLock } from "@tabler/icons-react";
import {
  StatusDemanda,
  TIMES_IMPLANTACAO,
  TIME_DESCRICAO,
  ESFUERZO_TRIGGER_NOTA,
  statusLabel,
  type Demand,
  type TimeImplantacao,
} from "../data/types";
import {
  acoesDoEstado,
  aguardando,
  proximasAcoes,
  type Acao,
  type AcaoContexto,
} from "../domain/workflow";
import { ROLE_LABEL, type Role } from "../domain/roles";

interface Props {
  demand: Demand;
  roles: Role[];
  ator: string;
  onSave: (changes: Partial<Demand>) => Promise<void> | void;
}

export function NextActionCard({ demand, roles, ator, onSave }: Props) {
  const minhas = proximasAcoes(demand, roles);
  const haEstado = acoesDoEstado(demand.status).length > 0;
  const [modal, setModal] = useState<{ acao: Acao; ctx: AcaoContexto } | null>(null);

  const terminal = demand.status === StatusDemanda.Concluida || demand.status === StatusDemanda.Recusada;

  function iniciar(acao: Acao) {
    const precisaCampos = !!acao.exigeComentario || (acao.campos?.length ?? 0) > 0;
    const ctx0: AcaoContexto = {
      comentario: "",
      time: demand.time,
      horasEstimadas: demand.horasEstimadas,
      finalPriority: demand.finalPriority,
      idServiceNow: demand.idServiceNow,
      idProjeto: demand.idProjeto,
      rce: demand.rce ?? "",
    };
    if (precisaCampos) setModal({ acao, ctx: ctx0 });
    else aplicar(acao, ctx0);
  }

  async function aplicar(acao: Acao, ctx: AcaoContexto) {
    const changes = acao.apply(demand, ator, ctx);
    await onSave(changes);
    notifications.show({ color: "teal", title: "Action applied", message: acao.label });
    setModal(null);
  }

  return (
    <Card
      withBorder
      radius="lg"
      padding="lg"
      style={{ borderColor: minhas.length ? "var(--mantine-color-abbott-4)" : undefined, borderWidth: minhas.length ? 2 : 1 }}
    >
      <Group justify="space-between" wrap="wrap" mb="sm">
        <Group gap="sm">
          <ThemeIcon size={38} radius="md" variant="light" color={minhas.length ? "abbott" : "gray"}>
            {minhas.length ? <IconBolt size={20} /> : <IconLock size={18} />}
          </ThemeIcon>
          <div>
            <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
              Current stage
            </Text>
            <Text fw={700}>{statusLabel[demand.status]}</Text>
          </div>
        </Group>
        <Badge size="lg" variant="light" color="gray">
          {aguardando(demand)}
        </Badge>
      </Group>

      {minhas.length > 0 ? (
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            As <strong>{rolesAtuantes(minhas)}</strong>, you can:
          </Text>
          <Group gap="sm">
            {minhas.map((acao) => {
              const guarda = acao.guarda(demand);
              const bloqueado = guarda !== true;
              return (
                <Button
                  key={acao.id}
                  color={acao.cor}
                  variant={bloqueado ? "light" : "filled"}
                  disabled={bloqueado}
                  onClick={() => iniciar(acao)}
                  title={bloqueado ? (guarda as string) : undefined}
                >
                  {acao.label}
                </Button>
              );
            })}
          </Group>
          {minhas.map((acao) => {
            const guarda = acao.guarda(demand);
            return guarda !== true ? (
              <Text key={acao.id} size="xs" c="orange">
                {acao.label}: {guarda}
              </Text>
            ) : null;
          })}
        </Stack>
      ) : (
        <Alert color="gray" variant="light" icon={<IconInfoCircle size={16} />}>
          {terminal
            ? `Request ${statusLabel[demand.status].toLowerCase()} — no pending actions.`
            : haEstado
              ? `No action for you at this stage. ${aguardando(demand)}.`
              : "No actions configured for this stage."}
        </Alert>
      )}

      {/* Modal de coleta de campos da ação */}
      <Modal
        opened={!!modal}
        onClose={() => setModal(null)}
        title={modal?.acao.label}
        size="md"
      >
        {modal && (
          <Stack>
            {modal.acao.exigeComentario && (
              <Textarea
                label="Justification"
                withAsterisk
                autosize
                minRows={2}
                placeholder="Record the reason for this decision..."
                value={modal.ctx.comentario ?? ""}
                onChange={(e) => setModal({ ...modal, ctx: { ...modal.ctx, comentario: e.currentTarget.value } })}
              />
            )}

            {modal.acao.campos?.includes("capacity") && (
              <>
                <Select
                  label="Implementation team"
                  withAsterisk
                  data={TIMES_IMPLANTACAO.map((tm) => ({
                    value: tm,
                    label: `${tm} — ${TIME_DESCRICAO[tm as TimeImplantacao]}`,
                  }))}
                  value={modal.ctx.time || null}
                  onChange={(v) => setModal({ ...modal, ctx: { ...modal.ctx, time: v ?? "" } })}
                />
                <NumberInput
                  label="Estimated hours"
                  description={ESFUERZO_TRIGGER_NOTA}
                  min={0}
                  max={10000}
                  value={modal.ctx.horasEstimadas || undefined}
                  onChange={(v) => setModal({ ...modal, ctx: { ...modal.ctx, horasEstimadas: typeof v === "number" ? v : 0 } })}
                />
              </>
            )}

            {modal.acao.campos?.includes("prioridade") && (
              <NumberInput
                label="Ranking position (final priority)"
                description="1 = highest priority"
                min={1}
                max={999}
                value={modal.ctx.finalPriority ?? undefined}
                onChange={(v) => setModal({ ...modal, ctx: { ...modal.ctx, finalPriority: typeof v === "number" ? v : null } })}
              />
            )}

            {modal.acao.campos?.includes("serviceNow") && (
              <>
                {/* RCE é capturado no intake (análise UX) — aqui é só informativo,
                    com input apenas se estiver faltando. */}
                {demand.rce ? (
                  <Alert color="gray" variant="light" p="xs">
                    <Text size="sm">
                      RCE (from intake): <strong>{demand.rce}</strong>
                    </Text>
                  </Alert>
                ) : (
                  <TextInput
                    label="RCE — project no. approved by Management"
                    description="Not provided at intake — enter it now"
                    placeholder="e.g.: RCE-2026-0099"
                    value={modal.ctx.rce ?? ""}
                    onChange={(e) => setModal({ ...modal, ctx: { ...modal.ctx, rce: e.currentTarget.value } })}
                  />
                )}
                <TextInput
                  label="Project no. (ServiceNow)"
                  placeholder="e.g.: PRJ0012345"
                  value={modal.ctx.idServiceNow ?? ""}
                  onChange={(e) => setModal({ ...modal, ctx: { ...modal.ctx, idServiceNow: e.currentTarget.value } })}
                />
                <TextInput
                  label="Internal project ID (optional)"
                  value={modal.ctx.idProjeto ?? ""}
                  onChange={(e) => setModal({ ...modal, ctx: { ...modal.ctx, idProjeto: e.currentTarget.value } })}
                />
              </>
            )}

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button
                color={modal.acao.cor}
                disabled={modal.acao.exigeComentario && !modal.ctx.comentario?.trim()}
                onClick={() => aplicar(modal.acao, modal.ctx)}
              >
                Confirm
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Card>
  );
}

function rolesAtuantes(acoes: Acao[]): string {
  const set = new Set(acoes.flatMap((a) => a.papeis));
  return [...set].map((p) => ROLE_LABEL[p]).join(" / ");
}
