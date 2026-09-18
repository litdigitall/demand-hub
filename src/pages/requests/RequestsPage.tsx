/* ============================================================
   Requests — tela única de acompanhamento das demandas.

   Substitui Demandas (tabela), Kanban (board), Score Board
   (priorização) e Approvers Status (quem está segurando).
   A view escolhida vai para a URL (?view=board) — link
   compartilhável e alvo dos redirects das rotas antigas.
   ============================================================ */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ActionIcon,
  Box,
  Button,
  Card,
  Center,
  Chip,
  Group,
  Loader,
  MultiSelect,
  Popover,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconAdjustmentsHorizontal,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import {
  clasificacionOptions,
  statusLabel,
  statusOptions,
  tipoLabel,
  tipoOptions,
  urgenciaLabel,
  urgenciaOptions,
} from "../../data/types";
import { useLabels } from "../../i18n/useLabels";
import { RequestsBoard } from "./RequestsBoard";
import { RequestsPriority } from "./RequestsPriority";
import { RequestsTable } from "./RequestsTable";
import { RequestsCards } from "./RequestsCards";
import { SORT_OPTIONS, parseView, useRequests, type GroupBy, type SortKey } from "./useRequests";

const VIEW_DATA = [
  { value: "table", label: "Table" },
  { value: "board", label: "Board" },
  { value: "priority", label: "Priority" },
];

const GROUP_DATA = [
  { value: "none", label: "None" },
  { value: "status", label: "Status" },
  { value: "area", label: "Area" },
  { value: "waiting", label: "Waiting on" },
];

export function RequestsPage() {
  const [params, setParams] = useSearchParams();
  const [groupBy, setGroupBy] = useState<GroupBy>("none");
  const L = useLabels();
  const r = useRequests();

  const view = parseView(params.get("view"));

  function changeView(next: string) {
    const p = new URLSearchParams(params);
    if (next === "table") p.delete("view");
    else p.set("view", next);
    setParams(p, { replace: true });
  }

  const statusData = statusOptions.map((o) => ({
    value: String(o.value),
    label: L.status[o.value] ?? statusLabel[o.value],
  }));
  const tipoData = tipoOptions.map((o) => ({
    value: String(o.value),
    label: L.tipo[o.value] ?? tipoLabel[o.value],
  }));
  const urgenciaData = urgenciaOptions.map((o) => ({
    value: String(o.value),
    label: L.urgencia[o.value] ?? urgenciaLabel[o.value],
  }));

  return (
    <Stack gap="md">
      <Group justify="space-between" align="center" wrap="wrap" gap="sm">
        <Group gap="sm" align="baseline">
          <Title order={2}>Requests</Title>
          <Text size="sm" c="dimmed">
            {r.counts.shown === r.counts.total
              ? r.counts.total
              : `${r.counts.shown} of ${r.counts.total}`}
          </Text>
        </Group>

        <Group gap="xs">
          <SegmentedControl size="xs" value={view} onChange={changeView} data={VIEW_DATA} />

          {view !== "priority" && (
            <Popover position="bottom-end" shadow="md" width={210} withinPortal>
              <Popover.Target>
                <Button
                  size="xs"
                  variant="default"
                  leftSection={<IconAdjustmentsHorizontal size={14} />}
                >
                  Display
                </Button>
              </Popover.Target>
              <Popover.Dropdown>
                <Stack gap="md">
                  {view === "table" && (
                    <Stack gap={6}>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.4}>
                        Group by
                      </Text>
                      <SegmentedControl
                        fullWidth
                        size="xs"
                        orientation="vertical"
                        value={groupBy}
                        onChange={(v) => setGroupBy(v as GroupBy)}
                        data={GROUP_DATA}
                      />
                    </Stack>
                  )}
                  <Stack gap={6}>
                    <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.4}>
                      Ordering
                    </Text>
                    <SegmentedControl
                      fullWidth
                      size="xs"
                      orientation="vertical"
                      value={r.sort}
                      onChange={(v) => r.setSort(v as SortKey)}
                      data={SORT_OPTIONS}
                    />
                  </Stack>
                </Stack>
              </Popover.Dropdown>
            </Popover>
          )}

          <Tooltip label="Refresh">
            <ActionIcon
              variant="default"
              size="md"
              loading={r.refreshing}
              onClick={() => void r.refresh()}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>

          <Button component={Link} to="/demandas/nova" size="xs" leftSection={<IconPlus size={14} />}>
            New request
          </Button>
        </Group>
      </Group>

      <Group gap="xs" wrap="wrap">
        <TextInput
          size="xs"
          leftSection={<IconSearch size={14} />}
          placeholder="Search"
          value={r.q}
          onChange={(e) => r.setQ(e.currentTarget.value)}
          style={{ flex: 1, minWidth: 200 }}
        />
        <MultiSelect
          size="xs"
          w={160}
          placeholder="Status"
          data={statusData}
          value={r.status}
          onChange={r.setStatus}
          clearable
          searchable
        />
        <MultiSelect
          size="xs"
          w={160}
          placeholder="Type"
          data={tipoData}
          value={r.tipo}
          onChange={r.setTipo}
          clearable
          searchable
        />
        <Select
          size="xs"
          w={130}
          placeholder="Urgency"
          data={urgenciaData}
          value={r.urgencia}
          onChange={r.setUrgencia}
          clearable
        />
        <Select
          size="xs"
          w={150}
          placeholder="Area"
          data={clasificacionOptions}
          value={r.area}
          onChange={r.setArea}
          clearable
        />
        <Chip
          size="xs"
          variant="outline"
          color="orange"
          checked={r.overdue}
          onChange={r.setOverdue}
        >
          Overdue {r.counts.overdue}
        </Chip>
        {r.hasFilter && (
          <Tooltip label="Clear filters">
            <ActionIcon variant="subtle" color="gray" size="md" onClick={r.clear}>
              <IconX size={15} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>

      {r.error && (
        <Text size="sm" c="red.7">
          {r.error}
        </Text>
      )}

      {r.loading ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : view === "board" ? (
        <RequestsBoard items={r.items} />
      ) : (
        /* overflow visible: o Card do Mantine recorta por padrão, e um
           ancestral recortado captura o position:sticky do cabeçalho. */
        <Card withBorder radius="lg" padding={0} style={{ overflow: "visible" }}>
          {view === "priority" ? (
            <RequestsPriority items={r.items} onChanged={() => void r.refresh()} />
          ) : (
            <>
              {/* Tabela no desktop (lg+, onde as 12 colunas cabem), cartões
                  abaixo disso — a mesma lista, sem scroll lateral. */}
              <Box visibleFrom="lg">
                <RequestsTable items={r.items} groupBy={groupBy} />
              </Box>
              <Box hiddenFrom="lg">
                <RequestsCards items={r.items} />
              </Box>
            </>
          )}
        </Card>
      )}
    </Stack>
  );
}
