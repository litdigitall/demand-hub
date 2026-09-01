/* ============================================================
   Inbox — rota index. "O que precisa de mim agora".

   Uma única fila, dividida em seções condicionais (seção vazia
   não renderiza). Toda transição sai do motor de ciclo de vida
   (proximasAcoes → aplicarAcao); nada muda status por fora.
   ============================================================ */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  Box,
  Button,
  Card,
  Group,
  Skeleton,
  Stack,
  Text,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconArrowRight, IconPlus } from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  CATEGORIA_COR_VIEW,
  CATEGORIA_VIEW_LABEL,
  StatusDemanda,
  clasificacionEfetiva,
  weightedScore,
  type Demand,
} from "../data/types";
import {
  aguardando,
  aplicarAcao,
  pipelineIndex,
  precisaDeMim,
  proximasAcoes,
  type Acao,
} from "../domain/workflow";
import { Role } from "../domain/roles";
import { StatusBadge } from "../components/Badges";
import { formatDate } from "../lib/format";
import { useCurrentUser } from "../lib/useCurrentUser";

const BORDER = "1px solid var(--mantine-color-gray-2)";
const WAITING_PREVIEW = 6;

/** Linha pronta para render: a demanda + o contexto que a seção dá a ela. */
interface InboxItem {
  d: Demand;
  /** O que a pessoa precisa fazer (label da 1ª ação disponível). */
  emphasis?: string;
  /** Área + em quem a demanda está parada. */
  muted: string;
  /** Ação de um clique (sem campos extras) — executada pelo motor. */
  acao?: Acao;
}

function isOverdue(d: Demand): boolean {
  if (!d.deadline) return false;
  if (d.status === StatusDemanda.Concluida || d.status === StatusDemanda.Recusada) return false;
  const t = new Date(d.deadline).getTime();
  return !Number.isNaN(t) && t < Date.now();
}

/** Mais urgente primeiro: atrasadas, depois score, depois mais antigas. */
function porUrgencia(a: Demand, b: Demand): number {
  const atraso = Number(isOverdue(b)) - Number(isOverdue(a));
  if (atraso !== 0) return atraso;
  const score = weightedScore(b.score) - weightedScore(a.score);
  if (score !== 0) return score;
  return a.dataSolicitacao.localeCompare(b.dataSolicitacao);
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------------- Linha da caixa de entrada ----------------- */

interface RowProps {
  item: InboxItem;
  divider: boolean;
  busy: boolean;
  onRun: (d: Demand, acao: Acao) => void;
}

function InboxRow({ item, divider, busy, onRun }: RowProps) {
  const [hover, setHover] = useState(false);
  const { d, emphasis, muted, acao } = item;
  const cat = clasificacionEfetiva(d);
  const atrasada = isOverdue(d);

  return (
    <Group
      wrap="nowrap"
      gap="sm"
      px="md"
      py={9}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        borderTop: divider ? BORDER : undefined,
        backgroundColor: hover ? "var(--mantine-color-gray-0)" : undefined,
      }}
    >
      <Tooltip label={CATEGORIA_VIEW_LABEL[cat]} openDelay={400} withArrow>
        <Box
          w={7}
          h={7}
          bg={`${CATEGORIA_COR_VIEW[cat]}.6`}
          style={{ borderRadius: "50%", flexShrink: 0 }}
        />
      </Tooltip>

      <Text
        ff="monospace"
        fz={11}
        c="dimmed"
        w={64}
        visibleFrom="sm"
        style={{ flexShrink: 0 }}
      >
        {d.numero}
      </Text>

      <Box style={{ flex: 1, minWidth: 0 }}>
        <Anchor
          component={Link}
          to={`/demandas/${d.id}`}
          c="dark.8"
          fw={600}
          fz="sm"
          display="block"
          truncate="end"
        >
          {d.titulo}
        </Anchor>
        <Text fz={11} c="dimmed" truncate="end">
          {emphasis ? (
            <Text span inherit fw={600} c="abbott.7">
              {emphasis}
              {" · "}
            </Text>
          ) : null}
          {muted}
        </Text>
      </Box>

      <Text
        fz={11}
        w={76}
        ta="right"
        c={atrasada ? "red.7" : "dimmed"}
        fw={atrasada ? 700 : 400}
        visibleFrom="md"
        style={{ flexShrink: 0 }}
      >
        {d.deadline ? formatDate(d.deadline) : ""}
      </Text>

      <Tooltip label="Priority score" openDelay={400} withArrow>
        <Text fz={11} fw={700} c="abbott.7" w={32} ta="right" style={{ flexShrink: 0 }}>
          {weightedScore(d.score).toFixed(2)}
        </Text>
      </Tooltip>

      <Box className="inbox-status">
        <StatusBadge value={d.status} />
      </Box>

      <Group
        gap={4}
        wrap="nowrap"
        justify="flex-end"
        visibleFrom="sm"
        className="inbox-actions"
        style={{ opacity: hover ? 1 : 0, transition: "opacity 120ms ease" }}
      >
        {acao ? (
          <Button
            size="compact-xs"
            variant="light"
            color={acao.cor}
            loading={busy}
            onClick={() => onRun(d, acao)}
          >
            {acao.label}
          </Button>
        ) : null}
        <ActionIcon
          component={Link}
          to={`/demandas/${d.id}`}
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Open ${d.numero}`}
        >
          <IconArrowRight size={15} />
        </ActionIcon>
      </Group>
    </Group>
  );
}

/* ---------------- Seção ------------------------------------- */

interface SectionProps {
  label: string;
  items: InboxItem[];
  busyId: string | null;
  onRun: (d: Demand, acao: Acao) => void;
  footer?: ReactNode;
}

function Section({ label, items, busyId, onRun, footer }: SectionProps) {
  if (items.length === 0) return null;
  return (
    <Box>
      <Group gap={8} mb={6}>
        <Text fz={11} fw={700} tt="uppercase" lts={0.8} c="dimmed">
          {label}
        </Text>
        <Text fz={11} fw={700} c="dimmed">
          {items.length}
        </Text>
      </Group>
      <Card withBorder radius="lg" padding={0}>
        {items.map((it, i) => (
          <InboxRow
            key={it.d.id}
            item={it}
            divider={i > 0}
            busy={busyId === it.d.id}
            onRun={onRun}
          />
        ))}
        {footer ? (
          <Box px="md" py={8} style={{ borderTop: BORDER }}>
            {footer}
          </Box>
        ) : null}
      </Card>
    </Box>
  );
}

/* ---------------- Página ------------------------------------ */

export function InboxPage() {
  const user = useCurrentUser();
  const roles = user.roles;
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [verTodasEsperando, setVerTodasEsperando] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let vivo = true;
    demandService.list().then(
      (lista) => {
        if (!vivo) return;
        setItems(lista);
        setLoading(false);
      },
      (e: unknown) => {
        if (!vivo) return;
        setErro(e instanceof Error ? e.message : "Could not load requests.");
        setLoading(false);
      },
    );
    return () => {
      vivo = false;
    };
  }, [reloadKey]);

  function retry() {
    setLoading(true);
    setErro(null);
    setReloadKey((k) => k + 1);
  }

  const secoes = useMemo(() => {
    const decisorDe = user.decisorDe;
    const meu = (d: Demand) => !!user.email && d.email === user.email;
    const podeTecnico =
      roles.includes(Role.TechLead) || roles.includes(Role.PMO) || roles.includes(Role.Admin);
    const ativa = (d: Demand) =>
      d.status !== StatusDemanda.Concluida && d.status !== StatusDemanda.Recusada;

    /* Envolvido = é o solicitante, ou tem papel no fluxo desta demanda. */
    const envolvido = (d: Demand) => {
      if (meu(d)) return true;
      if (roles.includes(Role.Admin) || roles.includes(Role.PMO)) return true;
      if (roles.includes(Role.Decisor) && decisorDe.includes(clasificacionEfetiva(d))) return true;
      if (
        roles.includes(Role.TechLead) &&
        pipelineIndex(d.status) >= pipelineIndex(StatusDemanda.EmAnalise)
      ) {
        return true;
      }
      return false;
    };

    /* Pendências reais: mesma regra do precisaDeMim (guarda liberada E
       marcada como pendência). Sem o filtro de pendência a linha anunciava
       a 1ª ação disponível — "Set ranking priority" numa demanda que já tem
       prioridade — em vez da que de fato está esperando a pessoa. */
    const pendentes = (d: Demand) =>
      proximasAcoes(d, roles, decisorDe).filter(
        (a) => a.guarda(d) === true && (a.pendencia ? a.pendencia(d) : true),
      );
    /* Um clique só para ações que não coletam campos; o resto abre no detalhe. */
    const umClique = (a: Acao | undefined) =>
      a && !a.exigeComentario && (a.campos?.length ?? 0) === 0 ? a : undefined;

    const devolvidas: Demand[] = [];
    const precisam: Demand[] = [];
    const executando: Demand[] = [];
    const esperando: Demand[] = [];

    for (const d of items) {
      if (d.status === StatusDemanda.Devolvida && meu(d)) {
        devolvidas.push(d);
      } else if (d.status === StatusDemanda.EmExecucao && podeTecnico) {
        executando.push(d);
      } else if (precisaDeMim(d, roles, decisorDe)) {
        precisam.push(d);
      } else if (ativa(d) && envolvido(d)) {
        esperando.push(d);
      }
    }

    devolvidas.sort(porUrgencia);
    precisam.sort(porUrgencia);
    executando.sort(porUrgencia);
    esperando.sort(porUrgencia);

    const area = (d: Demand) => d.areaSolicitante || CATEGORIA_VIEW_LABEL[clasificacionEfetiva(d)];

    const needsYou: InboxItem[] = precisam.map((d) => {
      const acoes = pendentes(d);
      return {
        d,
        emphasis: acoes[0]?.label,
        muted: `${area(d)} · ${aguardando(d)}`,
        acao: umClique(acoes[0]),
      };
    });

    const returned: InboxItem[] = devolvidas.map((d) => {
      const motivo = d.comentarios[d.comentarios.length - 1]?.texto;
      return {
        d,
        muted: motivo ? `${area(d)} · “${motivo}”` : area(d),
        acao: umClique(pendentes(d)[0]),
      };
    });

    const waiting: InboxItem[] = esperando.map((d) => ({
      d,
      muted: `${area(d)} · ${aguardando(d)}`,
    }));

    const running: InboxItem[] = executando.map((d) => ({
      d,
      muted: d.time ? `${area(d)} · ${d.time}` : area(d),
    }));

    return { needsYou, returned, waiting, running, total: needsYou.length + returned.length };
  }, [items, roles, user.decisorDe, user.email]);

  /* Transição sempre pelo motor: aplicarAcao carimba statusDesde (base de
     SLA/aging) — chamar acao.apply direto pularia esse carimbo. */
  async function run(d: Demand, acao: Acao) {
    setBusyId(d.id);
    try {
      const changes = aplicarAcao(acao, d, user.name, {
        comentario: "",
        time: d.time,
        horasEstimadas: d.horasEstimadas,
        finalPriority: d.finalPriority,
        idServiceNow: d.idServiceNow,
        idProjeto: d.idProjeto,
        rce: d.rce ?? "",
      });
      await demandService.update(d.id, changes);
      setItems(await demandService.list());
      notifications.show({
        color: "teal",
        title: "Action applied",
        message: `${d.numero} · ${acao.label}`,
      });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Action failed",
        message: e instanceof Error ? e.message : `${d.numero} · ${acao.label}`,
      });
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <Stack gap="xl">
        <Box>
          <Skeleton h={26} w={260} radius="sm" />
          <Skeleton h={12} w={150} radius="sm" mt={10} />
        </Box>
        <Box>
          <Skeleton h={10} w={110} radius="sm" mb={10} />
          <Card withBorder radius="lg" padding={0}>
            {[0, 1, 2, 3].map((i) => (
              <Group
                key={i}
                wrap="nowrap"
                gap="sm"
                px="md"
                py={14}
                style={{ borderTop: i ? BORDER : undefined }}
              >
                <Skeleton h={10} w={60} radius="sm" />
                <Skeleton h={10} radius="sm" style={{ flex: 1 }} />
                <Skeleton h={10} w={90} radius="sm" />
              </Group>
            ))}
          </Card>
        </Box>
      </Stack>
    );
  }

  if (erro) {
    return (
      <Group gap="sm">
        <Text size="sm" c="red.7">
          {erro}
        </Text>
        <Button size="compact-sm" variant="light" onClick={retry}>
          Retry
        </Button>
      </Group>
    );
  }

  const podeCriar = roles.includes(Role.Solicitante) || roles.includes(Role.Admin);
  const primeiroNome = user.name.split(" ")[0];
  const escondidas = secoes.waiting.length - WAITING_PREVIEW;
  const waitingVisivel =
    verTodasEsperando || escondidas <= 0 ? secoes.waiting : secoes.waiting.slice(0, WAITING_PREVIEW);

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <Box>
          <Title order={2}>
            {greeting()}, {primeiroNome}
          </Title>
          <Text c="dimmed" mt={4} fz="sm">
            {secoes.total === 0
              ? "You're all caught up."
              : `${secoes.total} request${secoes.total === 1 ? "" : "s"} need${
                  secoes.total === 1 ? "s" : ""
                } you`}
          </Text>
        </Box>
        {podeCriar ? (
          <Button component={Link} to="/demandas/nova" leftSection={<IconPlus size={16} />}>
            New request
          </Button>
        ) : null}
      </Group>

      <Section label="Needs you now" items={secoes.needsYou} busyId={busyId} onRun={run} />
      <Section label="Returned to you" items={secoes.returned} busyId={busyId} onRun={run} />
      <Section
        label="Waiting on others"
        items={waitingVisivel}
        busyId={busyId}
        onRun={run}
        footer={
          escondidas > 0 && !verTodasEsperando ? (
            <Anchor
              component="button"
              type="button"
              fz={11}
              c="dimmed"
              onClick={() => setVerTodasEsperando(true)}
            >
              Show {escondidas} more
            </Anchor>
          ) : undefined
        }
      />
      <Section label="In execution" items={secoes.running} busyId={busyId} onRun={run} />
    </Stack>
  );
}
