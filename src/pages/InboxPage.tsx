/* ============================================================
   Inbox — rota index. "O que precisa de mim agora".

   Densidade de desktop: uma linha por demanda, colunas de verdade
   e cabeçalho, em vez de dois textos empilhados com 700px de branco
   no meio. A ação fica SEMPRE visível — em desktop com mouse, ação
   escondida no hover esconde justamente o ponto da tela.

   Toda transição sai do motor de ciclo de vida (proximasAcoes →
   aplicarAcao); nada muda status por fora.
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
import { isOverdue, porPrioridadeDeTrabalho, sla } from "../domain/sla";
import { Role } from "../domain/roles";
import { StatusBadge, UrgenciaBadge } from "../components/Badges";
import { formatDate } from "../lib/format";
import { useCurrentUser } from "../lib/useCurrentUser";

const BORDER = "1px solid var(--mantine-color-gray-2)";
const WAITING_PREVIEW = 8;

/* Larguras das colunas num lugar só: cabeçalho e linha não podem divergir. */
const COL = {
  num: 76,
  urgencia: 86,
  area: 128,
  idade: 62,
  horas: 54,
  score: 46,
  prazo: 84,
  status: 112,
  acao: 236,
} as const;

/** Linha pronta para render: a demanda + o contexto que a seção dá a ela. */
interface InboxItem {
  d: Demand;
  /** Ação de um clique (sem campos extras) — executada aqui pelo motor. */
  acao?: Acao;
  /** Rótulo da pendência, mesmo quando ela exige abrir o detalhe. */
  acaoLabel?: string;
  /** Texto da coluna de ação quando não há nada a fazer aqui. */
  contexto?: string;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ---------------- Cabeçalho de colunas ---------------------- */

function ColHead({ children, w, ta = "left", from }: {
  children: ReactNode;
  w: number;
  ta?: "left" | "right" | "center";
  from?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <Text
      fz={10}
      fw={700}
      tt="uppercase"
      lts={0.6}
      c="dimmed"
      w={w}
      ta={ta}
      visibleFrom={from}
      style={{ flexShrink: 0 }}
    >
      {children}
    </Text>
  );
}

function HeaderRow({ acaoLabel }: { acaoLabel: string }) {
  return (
    <Group
      wrap="nowrap"
      gap="sm"
      px="md"
      py={7}
      bg="var(--mantine-color-gray-0)"
      /* Gruda abaixo do header do app: com 30 linhas, rolar sem cabeçalho é
         perder a referência de qual coluna é qual. */
      style={{
        borderBottom: BORDER,
        position: "sticky",
        top: 62,
        zIndex: 2,
        borderTopLeftRadius: "var(--mantine-radius-lg)",
        borderTopRightRadius: "var(--mantine-radius-lg)",
      }}
    >
      <Box w={7} style={{ flexShrink: 0 }} />
      <ColHead w={COL.num} from="sm">
        No.
      </ColHead>
      <Text fz={10} fw={700} tt="uppercase" lts={0.6} c="dimmed" style={{ flex: 1, minWidth: 0 }}>
        Request
      </Text>
      <ColHead w={COL.urgencia} from="lg">
        Urgency
      </ColHead>
      <ColHead w={COL.area} from="xl">
        Area
      </ColHead>
      <ColHead w={COL.idade} ta="right" from="md">
        Age
      </ColHead>
      <ColHead w={COL.horas} ta="right" from="xl">
        Hours
      </ColHead>
      <ColHead w={COL.prazo} from="xl">
        Due
      </ColHead>
      <ColHead w={COL.score} ta="right">
        Score
      </ColHead>
      <ColHead w={COL.status} from="sm">
        Status
      </ColHead>
      <ColHead w={COL.acao} from="sm">
        {acaoLabel}
      </ColHead>
      <Box w={26} style={{ flexShrink: 0 }} visibleFrom="sm" />
    </Group>
  );
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
  const { d, acao, acaoLabel, contexto } = item;
  const cat = clasificacionEfetiva(d);
  const atrasada = isOverdue(d);
  const { dias, alvo, tom } = sla(d);

  const corIdade = tom === "estourado" ? "red.7" : tom === "atencao" ? "orange.7" : "dimmed";
  const tituloIdade =
    alvo === undefined
      ? `In this stage for ${dias} day${dias === 1 ? "" : "s"}`
      : `In this stage for ${dias} of ${alvo} target days`;

  return (
    <Group
      wrap="nowrap"
      gap="sm"
      px="md"
      py={6}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        borderTop: divider ? BORDER : undefined,
        backgroundColor: hover ? "var(--mantine-color-gray-0)" : undefined,
        minHeight: 38,
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
        w={COL.num}
        visibleFrom="sm"
        style={{ flexShrink: 0 }}
      >
        {d.numero}
      </Text>

      <Anchor
        component={Link}
        to={`/demandas/${d.id}`}
        c="dark.8"
        fw={500}
        fz="sm"
        truncate="end"
        style={{ flex: 1, minWidth: 0 }}
      >
        {d.titulo}
      </Anchor>

      <Box w={COL.urgencia} visibleFrom="lg" style={{ flexShrink: 0 }}>
        <UrgenciaBadge value={d.urgencia} />
      </Box>

      <Text fz="xs" c="dimmed" w={COL.area} visibleFrom="xl" truncate style={{ flexShrink: 0 }}>
        {d.areaSolicitante || CATEGORIA_VIEW_LABEL[cat]}
      </Text>

      <Tooltip label={tituloIdade} openDelay={300} withArrow>
        <Text
          fz="xs"
          fw={tom === "ok" ? 400 : 700}
          c={corIdade}
          w={COL.idade}
          ta="right"
          visibleFrom="md"
          style={{ flexShrink: 0 }}
        >
          {dias}d
        </Text>
      </Tooltip>

      <Text fz="xs" c="dimmed" w={COL.horas} ta="right" visibleFrom="xl" style={{ flexShrink: 0 }}>
        {d.horasEstimadas ? `${d.horasEstimadas}h` : "—"}
      </Text>

      <Text
        fz="xs"
        w={COL.prazo}
        c={atrasada ? "red.7" : "dimmed"}
        fw={atrasada ? 700 : 400}
        visibleFrom="xl"
        style={{ flexShrink: 0 }}
      >
        {d.deadline ? formatDate(d.deadline) : "—"}
      </Text>

      <Tooltip label="Priority score" openDelay={400} withArrow>
        <Text fz="xs" fw={700} c="abbott.7" w={COL.score} ta="right" style={{ flexShrink: 0 }}>
          {weightedScore(d.score).toFixed(2)}
        </Text>
      </Tooltip>

      <Box w={COL.status} visibleFrom="sm" style={{ flexShrink: 0 }}>
        <StatusBadge value={d.status} />
      </Box>

      {/* Coluna de ação: sempre visível. Se a pendência exige preencher campos,
          o botão leva ao detalhe em vez de fingir que resolve com um clique. */}
      <Box w={COL.acao} visibleFrom="sm" style={{ flexShrink: 0 }}>
        {acao ? (
          <Button
            size="compact-xs"
            variant="light"
            color={acao.cor}
            loading={busy}
            fullWidth
            onClick={() => onRun(d, acao)}
          >
            {acao.label}
          </Button>
        ) : acaoLabel ? (
          <Button
            size="compact-xs"
            variant="light"
            color="gray"
            component={Link}
            to={`/demandas/${d.id}`}
            fullWidth
          >
            {acaoLabel}
          </Button>
        ) : contexto ? (
          <Text fz="xs" c="dimmed" truncate>
            {contexto}
          </Text>
        ) : null}
      </Box>

      <Box w={26} visibleFrom="sm" style={{ flexShrink: 0, textAlign: "right" }}>
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
      </Box>
    </Group>
  );
}

/* ---------------- Seção ------------------------------------- */

interface SectionProps {
  label: string;
  acaoLabel: string;
  items: InboxItem[];
  busyId: string | null;
  onRun: (d: Demand, acao: Acao) => void;
  footer?: ReactNode;
}

function Section({ label, acaoLabel, items, busyId, onRun, footer }: SectionProps) {
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
      <Card withBorder radius="lg" padding={0} style={{ overflow: "visible" }}>
        <HeaderRow acaoLabel={acaoLabel} />
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

    /* Ordem de trabalho: prazo estourado, depois SLA da etapa, depois score. */
    const ordem = (a: Demand, b: Demand) =>
      porPrioridadeDeTrabalho(a, b, (d) => weightedScore(d.score));
    devolvidas.sort(ordem);
    precisam.sort(ordem);
    executando.sort(ordem);
    esperando.sort(ordem);

    const needsYou: InboxItem[] = precisam.map((d) => {
      const acoes = pendentes(d);
      return {
        d,
        acao: umClique(acoes[0]),
        acaoLabel: acoes[0]?.label,
      };
    });

    const returned: InboxItem[] = devolvidas.map((d) => {
      const acoes = pendentes(d);
      return {
        d,
        acao: umClique(acoes[0]),
        acaoLabel: acoes[0]?.label ?? "Review and resend",
      };
    });

    /* A coluna já se chama "Waiting on": repetir o prefixo em cada linha só
       gasta largura. */
    const semPrefixo = (d: Demand) => {
      const raw = aguardando(d);
      return raw.startsWith("Waiting on ") ? raw.slice(11) : raw;
    };

    const waiting: InboxItem[] = esperando.map((d) => ({
      d,
      contexto: semPrefixo(d),
    }));

    const running: InboxItem[] = executando.map((d) => ({
      d,
      contexto: d.time || semPrefixo(d),
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
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Group
                key={i}
                wrap="nowrap"
                gap="sm"
                px="md"
                py={11}
                style={{ borderTop: i ? BORDER : undefined }}
              >
                <Skeleton h={10} w={60} radius="sm" />
                <Skeleton h={10} radius="sm" style={{ flex: 1 }} />
                <Skeleton h={10} w={90} radius="sm" />
                <Skeleton h={10} w={180} radius="sm" />
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

      <Section
        label="Needs you now"
        acaoLabel="Next action"
        items={secoes.needsYou}
        busyId={busyId}
        onRun={run}
      />
      <Section
        label="Returned to you"
        acaoLabel="Next action"
        items={secoes.returned}
        busyId={busyId}
        onRun={run}
      />
      <Section
        label="Waiting on others"
        acaoLabel="Waiting on"
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
      <Section
        label="In execution"
        acaoLabel="Delivery team"
        items={secoes.running}
        busyId={busyId}
        onRun={run}
      />
    </Stack>
  );
}
