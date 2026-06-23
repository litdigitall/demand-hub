import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Card,
  Center,
  Group,
  Loader,
  MultiSelect,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconCalendar,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { demandService } from "../data/demandService";
import {
  StatusDemanda,
  statusLabel,
  tipoOptions,
  weightedScore,
  type Demand,
} from "../data/types";
import { TipoBadge, UrgenciaBadge } from "../components/Badges";
import { formatDate, formatRelative } from "../lib/format";
import { useT } from "../i18n";
import { useLabels } from "../i18n/useLabels";

/* Cores das colunas — labels vêm do dict pelo status code */
const COL_COLORS: Record<number, string> = {
  [StatusDemanda.Nova]: "gray",
  [StatusDemanda.EmAnalise]: "blue",
  [StatusDemanda.EmAprovacao]: "grape",
  [StatusDemanda.Priorizada]: "indigo",
  [StatusDemanda.EmExecucao]: "yellow",
  [StatusDemanda.Concluida]: "teal",
  [StatusDemanda.Devolvida]: "orange",
  [StatusDemanda.Recusada]: "red",
};
const COL_ORDER = [
  StatusDemanda.Nova,
  StatusDemanda.EmAnalise,
  StatusDemanda.EmAprovacao,
  StatusDemanda.Priorizada,
  StatusDemanda.EmExecucao,
  StatusDemanda.Concluida,
  StatusDemanda.Devolvida,
  StatusDemanda.Recusada,
];

export function KanbanPage() {
  const { t } = useT();
  const L = useLabels();
  const [items, setItems] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
  const [dragging, setDragging] = useState<Demand | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  useEffect(() => {
    refresh();
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setItems(await demandService.list());
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return items.filter((d) => {
      if (qn) {
        const hay = `${d.numero} ${d.titulo} ${d.descricao} ${d.areaSolicitante} ${d.sponsor}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      if (tipoFiltro.length > 0 && !tipoFiltro.includes(String(d.tipo))) return false;
      return true;
    });
  }, [items, q, tipoFiltro]);

  const byStatus = useMemo(() => {
    const map = new Map<number, Demand[]>();
    COL_ORDER.forEach((s) => map.set(s, []));
    filtered.forEach((d) => {
      const list = map.get(d.status) ?? [];
      list.push(d);
      map.set(d.status, list);
    });
    map.forEach((list) => list.sort((a, b) => weightedScore(b.score) - weightedScore(a.score)));
    return map;
  }, [filtered]);

  function onDragStart(e: DragStartEvent) {
    const d = items.find((x) => x.id === e.active.id);
    setDragging(d ?? null);
  }

  async function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const { active, over } = e;
    if (!over) return;
    const id = String(active.id);
    const newStatus = Number(over.id);
    const atual = items.find((d) => d.id === id);
    if (!atual || atual.status === newStatus) return;
    // otimista
    setItems((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d)),
    );
    try {
      await demandService.update(id, { status: newStatus });
      notifications.show({
        color: "abbott",
        title: t("kanban_status_changed"),
        message: `${atual.numero} → ${L.status[newStatus] ?? statusLabel[newStatus]}`,
      });
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro",
        message: (err as Error).message,
      });
      refresh();
    }
  }

  if (loading) {
    return (
      <Center h="60vh">
        <Loader />
      </Center>
    );
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end" wrap="wrap">
        <div>
          <Title order={2}>{t("kanban_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("kanban_subtitle")}
          </Text>
        </div>
        <Tooltip label={t("refresh")}>
          <ActionIcon size="lg" variant="default" onClick={refresh}>
            <IconRefresh size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      <Card withBorder radius="lg" padding="md">
        <Group gap="sm" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={`${t("search")}...`}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <MultiSelect
            placeholder={t("list_type")}
            data={tipoOptions.map((o) => ({ value: String(o.value), label: L.tipo[o.value] }))}
            value={tipoFiltro}
            onChange={setTipoFiltro}
            clearable
            w={220}
          />
          <Text size="sm" c="dimmed">
            {filtered.length} {t("of")} {items.length}
          </Text>
        </Group>
      </Card>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <Box style={{ overflowX: "auto", paddingBottom: 12 }}>
          <Group gap="md" wrap="nowrap" align="flex-start">
            {COL_ORDER.map((s) => (
              <KanbanColumn
                key={s}
                status={s}
                titulo={L.status[s] ?? statusLabel[s]}
                cor={COL_COLORS[s]}
                items={byStatus.get(s) ?? []}
                dropLabel={t("kanban_drop")}
              />
            ))}
          </Group>
        </Box>
        <DragOverlay>{dragging && <KanbanCard d={dragging} overlay />}</DragOverlay>
      </DndContext>
    </Stack>
  );
}

/* ============================================================
   Coluna (droppable)
   ============================================================ */
interface ColProps {
  status: number;
  titulo: string;
  cor: string;
  items: Demand[];
  dropLabel: string;
}
function KanbanColumn({ status, titulo, cor, items, dropLabel }: ColProps) {
  const { setNodeRef, isOver } = useDroppable({ id: String(status) });
  return (
    <Paper
      ref={setNodeRef}
      withBorder
      radius="lg"
      p="sm"
      style={{
        width: 290,
        minHeight: 200,
        background: isOver ? `var(--mantine-color-${cor}-0)` : "var(--mantine-color-gray-0)",
        borderColor: isOver ? `var(--mantine-color-${cor}-4)` : undefined,
        transition: "background 120ms, border-color 120ms",
      }}
    >
      <Group justify="space-between" mb="sm" px={4}>
        <Group gap={8}>
          <Box
            w={8}
            h={8}
            style={{
              borderRadius: 999,
              background: `var(--mantine-color-${cor}-6)`,
            }}
          />
          <Text fw={700} size="sm">
            {titulo}
          </Text>
        </Group>
        <Badge variant="light" color={cor} size="sm">
          {items.length}
        </Badge>
      </Group>
      <Stack gap="xs">
        {items.length === 0 && (
          <Text c="dimmed" size="xs" ta="center" py="md">
            {dropLabel}
          </Text>
        )}
        {items.map((d) => (
          <KanbanCard key={d.id} d={d} />
        ))}
      </Stack>
    </Paper>
  );
}

/* ============================================================
   Card (draggable)
   ============================================================ */
function KanbanCard({ d, overlay = false }: { d: Demand; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
    id: d.id,
  });
  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging && !overlay ? 0.4 : 1,
    cursor: "grab",
  };
  const wScore = weightedScore(d.score);
  const validados = d.avaliacoes.length;
  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      withBorder
      radius="md"
      padding="sm"
      shadow={overlay ? "md" : undefined}
      style={style}
    >
      <Group justify="space-between" mb={4}>
        <Anchor
          component={Link}
          to={`/demandas/${d.id}`}
          fw={700}
          size="sm"
          onPointerDown={(e) => e.stopPropagation()}
          style={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}
        >
          {d.titulo}
        </Anchor>
      </Group>
      <Text size="xs" c="dimmed" mb={6}>
        {d.numero} · {d.areaSolicitante}
      </Text>
      <Group gap={6} mb={6} wrap="wrap">
        <TipoBadge value={d.tipo} />
        <UrgenciaBadge value={d.urgencia} />
      </Group>
      <Group justify="space-between" mt="sm">
        <Group gap={4}>
          <IconShieldCheck size={13} color="var(--mantine-color-abbott-7)" />
          <Text size="xs" fw={700} c="abbott.7">
            {wScore.toFixed(2)}
          </Text>
          <Text size="xs" c="dimmed">
            · {validados}/7
          </Text>
        </Group>
        {d.deadline && (
          <Group gap={3}>
            <IconCalendar size={12} />
            <Text size="xs" c="dimmed">
              {formatDate(d.deadline)}
            </Text>
          </Group>
        )}
      </Group>
      {d.sponsor && (
        <Group gap={3} mt={4}>
          <IconUsers size={11} color="var(--mantine-color-gray-6)" />
          <Text size="xs" c="dimmed" truncate>
            {d.sponsor}
          </Text>
        </Group>
      )}
      <Text size="xs" c="dimmed" mt={4}>
        {formatRelative(d.dataSolicitacao)}
      </Text>
    </Card>
  );
}
