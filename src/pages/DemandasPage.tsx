import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Card,
  Center,
  Group,
  Loader,
  MultiSelect,
  SegmentedControl,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
  Tooltip,
} from "@mantine/core";
import {
  IconExternalLink,
  IconRefresh,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { demandService } from "../data/demandService";
import {
  CATEGORIA_RESPONSAVEL,
  CATEGORIA_VIEW_LABEL,
  categoriaDe,
  statusOptions,
  tipoOptions,
  urgenciaOptions,
  weightedScore,
  type Categoria,
  type Demand,
} from "../data/types";
import {
  ImpactoBadge,
  StatusBadge,
  TipoBadge,
  UrgenciaBadge,
} from "../components/Badges";
import { formatDate, formatCurrency } from "../lib/format";
import { useT } from "../i18n";
import { useLabels } from "../i18n/useLabels";

export function DemandasPage() {
  const { t } = useT();
  const L = useLabels();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Demand[]>([]);
  const [q, setQ] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string[]>([]);
  const [statusFiltro, setStatusFiltro] = useState<string[]>([]);
  const [urgenciaFiltro, setUrgenciaFiltro] = useState<string | null>(null);
  const [view, setView] = useState<Categoria | "todas">("todas");

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
        const hay = `${d.numero} ${d.titulo} ${d.descricao} ${d.areaSolicitante} ${d.solicitante} ${d.sponsor}`.toLowerCase();
        if (!hay.includes(qn)) return false;
      }
      if (view !== "todas" && categoriaDe(d.tipo) !== view) return false;
      if (tipoFiltro.length > 0 && !tipoFiltro.includes(String(d.tipo))) return false;
      if (statusFiltro.length > 0 && !statusFiltro.includes(String(d.status))) return false;
      if (urgenciaFiltro && String(d.urgencia) !== urgenciaFiltro) return false;
      return true;
    });
  }, [items, q, view, tipoFiltro, statusFiltro, urgenciaFiltro]);

  function clearFilters() {
    setQ("");
    setTipoFiltro([]);
    setStatusFiltro([]);
    setUrgenciaFiltro(null);
    setView("todas");
  }

  const hasFilter =
    !!q || tipoFiltro.length > 0 || statusFiltro.length > 0 || !!urgenciaFiltro;

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("demand_list_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("demand_list_summary", { shown: filtered.length, total: items.length })}
          </Text>
        </div>
        <Group>
          <Tooltip label={t("refresh")}>
            <ActionIcon variant="default" size="lg" onClick={refresh}>
              <IconRefresh size={18} />
            </ActionIcon>
          </Tooltip>
          <Button component={Link} to="/demandas/nova">
            + {t("newDemand")}
          </Button>
        </Group>
      </Group>

      <SegmentedControl
        value={view}
        onChange={(v) => setView(v as Categoria | "todas")}
        data={[
          { label: "Todas", value: "todas" },
          { label: `${CATEGORIA_VIEW_LABEL.infra} · ${CATEGORIA_RESPONSAVEL.infra}`, value: "infra" },
          { label: `${CATEGORIA_VIEW_LABEL.app} · ${CATEGORIA_RESPONSAVEL.app}`, value: "app" },
        ]}
      />

      <Card withBorder radius="lg" padding="md">
        <Group gap="sm" wrap="wrap">
          <TextInput
            leftSection={<IconSearch size={16} />}
            placeholder={t("demand_search_placeholder")}
            value={q}
            onChange={(e) => setQ(e.currentTarget.value)}
            style={{ flex: 1, minWidth: 240 }}
          />
          <MultiSelect
            placeholder={t("list_type")}
            data={tipoOptions.map((o) => ({ value: String(o.value), label: L.tipo[o.value] }))}
            value={tipoFiltro}
            onChange={setTipoFiltro}
            clearable
            w={200}
          />
          <MultiSelect
            placeholder={t("status")}
            data={statusOptions.map((o) => ({ value: String(o.value), label: L.status[o.value] }))}
            value={statusFiltro}
            onChange={setStatusFiltro}
            clearable
            w={180}
          />
          <Select
            placeholder={t("list_urgency")}
            data={urgenciaOptions.map((o) => ({ value: String(o.value), label: L.urgencia[o.value] }))}
            value={urgenciaFiltro}
            onChange={setUrgenciaFiltro}
            clearable
            w={150}
          />
          {hasFilter && (
            <Button
              variant="subtle"
              leftSection={<IconX size={14} />}
              onClick={clearFilters}
            >
              {t("clear")}
            </Button>
          )}
        </Group>
      </Card>

      <Card withBorder radius="lg" padding={0}>
        {loading ? (
          <Center py="xl">
            <Loader />
          </Center>
        ) : filtered.length === 0 ? (
          <Center py="xl">
            <Stack gap="xs" align="center">
              <Text c="dimmed">{t("list_noneFound")}</Text>
              {hasFilter && (
                <Anchor onClick={clearFilters} size="sm">
                  {t("list_clearFilters")}
                </Anchor>
              )}
            </Stack>
          </Center>
        ) : (
          <Table.ScrollContainer minWidth={920}>
            <Table verticalSpacing="sm" highlightOnHover horizontalSpacing="lg">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>{t("list_demand")}</Table.Th>
                  <Table.Th>{t("list_area")}</Table.Th>
                  <Table.Th>Categoria</Table.Th>
                  <Table.Th>{t("list_type")}</Table.Th>
                  <Table.Th>{t("list_impact")}</Table.Th>
                  <Table.Th>{t("list_urgency")}</Table.Th>
                  <Table.Th>{t("list_value")}</Table.Th>
                  <Table.Th>{t("list_score")}</Table.Th>
                  <Table.Th>{t("status")}</Table.Th>
                  <Table.Th>{t("list_requested")}</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map((d) => (
                  <Table.Tr key={d.id}>
                    <Table.Td>
                      <Anchor component={Link} to={`/demandas/${d.id}`} fw={600}>
                        {d.titulo}
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {d.numero} · {d.solicitante}
                      </Text>
                    </Table.Td>
                    <Table.Td>{d.areaSolicitante}</Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={categoriaDe(d.tipo) === "infra" ? "gray" : "cyan"}
                        radius="sm"
                      >
                        {CATEGORIA_VIEW_LABEL[categoriaDe(d.tipo)]}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <TipoBadge value={d.tipo} />
                    </Table.Td>
                    <Table.Td>
                      <ImpactoBadge value={d.impactoNivel} />
                    </Table.Td>
                    <Table.Td>
                      <UrgenciaBadge value={d.urgencia} />
                    </Table.Td>
                    <Table.Td>{formatCurrency(d.valorEstimado)}</Table.Td>
                    <Table.Td>
                      <Box ta="center" fw={700} c="abbott.7">
                        {weightedScore(d.score).toFixed(2)}
                      </Box>
                    </Table.Td>
                    <Table.Td>
                      <StatusBadge value={d.status} />
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(d.dataSolicitacao)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon
                        variant="subtle"
                        component={Link}
                        to={`/demandas/${d.id}`}
                      >
                        <IconExternalLink size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>

    </Stack>
  );
}
