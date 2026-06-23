import { useEffect, useState } from "react";
import {
  ActionIcon,
  Alert,
  Button,
  Card,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconBuildingFactory2,
  IconDatabase,
  IconPlus,
  IconRefresh,
  IconRestore,
  IconStar,
  IconTrash,
  IconUserCheck,
  IconUsersGroup,
  type Icon,
} from "@tabler/icons-react";
import { adminLookupService } from "../data/adminLookupService";
import { demandService } from "../data/demandService";
import { seedDemands } from "../data/mockData";
import type { AdminLookup, DemandInput } from "../data/types";
import { useT } from "../i18n";

interface SectionProps {
  title: string;
  subtitle: string;
  icon: Icon;
  items: AdminLookup[];
  loading: boolean;
  addPlaceholder: string;
  addButton: string;
  emptyLabel: string;
  onAdd: (name: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function LookupSection({
  title,
  subtitle,
  icon: Icon,
  items,
  loading,
  addPlaceholder,
  addButton,
  emptyLabel,
  onAdd,
  onRemove,
}: SectionProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onAdd(name.trim());
      setName("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg" h="100%">
      <Group gap={8} mb="xs">
        <Icon size={20} color="var(--mantine-color-abbott-7)" />
        <Text fw={700}>{title}</Text>
      </Group>
      <Text size="sm" c="dimmed" mb="md">
        {subtitle}
      </Text>
      <Group gap="sm" mb="md">
        <TextInput
          placeholder={addPlaceholder}
          value={name}
          onChange={(e) => setName(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ flex: 1 }}
        />
        <Button leftSection={<IconPlus size={16} />} onClick={submit} loading={submitting}>
          {addButton}
        </Button>
      </Group>
      {loading ? (
        <Center py="md">
          <Loader size="sm" />
        </Center>
      ) : items.length === 0 ? (
        <Text c="dimmed" size="sm" ta="center" py="md">
          {emptyLabel}
        </Text>
      ) : (
        <Table verticalSpacing="xs">
          <Table.Tbody>
            {items.map((it) => (
              <Table.Tr key={it.id}>
                <Table.Td>{it.nome}</Table.Td>
                <Table.Td w={40} ta="right">
                  <ActionIcon variant="subtle" color="red" onClick={() => onRemove(it.id)}>
                    <IconTrash size={15} />
                  </ActionIcon>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}

export function AdminPage() {
  const { t } = useT();
  const [areas, setAreas] = useState<AdminLookup[]>([]);
  const [sponsors, setSponsors] = useState<AdminLookup[]>([]);
  const [avaliadores, setAvaliadores] = useState<AdminLookup[]>([]);
  const [loadingA, setLoadingA] = useState(true);
  const [loadingS, setLoadingS] = useState(true);
  const [loadingV, setLoadingV] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [seedOpen, setSeedOpen] = useState(false);
  const [seeding, setSeeding] = useState<{ done: number; total: number } | null>(
    null,
  );

  useEffect(() => {
    refreshAreas();
    refreshSponsors();
    refreshAvaliadores();
  }, []);

  async function refreshAreas() {
    setLoadingA(true);
    try {
      setAreas(await adminLookupService.listAreas());
    } finally {
      setLoadingA(false);
    }
  }
  async function refreshSponsors() {
    setLoadingS(true);
    try {
      setSponsors(await adminLookupService.listSponsors());
    } finally {
      setLoadingS(false);
    }
  }
  async function refreshAvaliadores() {
    setLoadingV(true);
    try {
      setAvaliadores(await adminLookupService.listAvaliadores());
    } finally {
      setLoadingV(false);
    }
  }

  async function handleResetMocks() {
    await demandService.reset();
    notifications.show({
      color: "abbott",
      title: t("admin_resetDone"),
      message: t("admin_resetDoneDesc"),
    });
    setResetOpen(false);
    window.location.hash = "#/demandas";
  }

  async function handleSeedDataverse() {
    const data = seedDemands();
    setSeeding({ done: 0, total: data.length });
    try {
      for (let i = 0; i < data.length; i++) {
        const d = data[i];
        const input = toInput(d);
        try {
          await demandService.create(input);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn("Falha em demanda", d.numero, err);
        }
        setSeeding({ done: i + 1, total: data.length });
      }
      notifications.show({
        color: "teal",
        title: t("admin_seedDone"),
        message: t("admin_seedDoneDesc", { n: data.length }),
      });
      setSeedOpen(false);
      setSeeding(null);
      window.location.hash = "#/demandas";
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Error al poblar",
        message: (err as Error).message,
      });
      setSeeding(null);
    }
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("admin_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("admin_subtitle")}
          </Text>
        </div>
        <Group>
          <Button
            variant="default"
            leftSection={<IconRefresh size={16} />}
            onClick={() => {
              refreshAreas();
              refreshSponsors();
              refreshAvaliadores();
            }}
          >
            {t("refresh")}
          </Button>
          <Button
            color="abbott"
            variant="outline"
            leftSection={<IconDatabase size={16} />}
            onClick={() => setSeedOpen(true)}
          >
            {t("admin_seed_btn")}
          </Button>
          <Button
            color="orange"
            variant="outline"
            leftSection={<IconRestore size={16} />}
            onClick={() => setResetOpen(true)}
          >
            {t("admin_reset_btn")}
          </Button>
        </Group>
      </Group>

      <SimpleGrid cols={{ base: 1, md: 3 }} spacing="md">
        <LookupSection
          title={t("admin_section_areas")}
          subtitle={t("admin_section_areas_desc")}
          icon={IconBuildingFactory2}
          items={areas}
          loading={loadingA}
          addPlaceholder={t("admin_add_placeholder")}
          addButton={t("add")}
          emptyLabel={t("empty")}
          onAdd={async (n) => {
            await adminLookupService.addArea(n);
            await refreshAreas();
          }}
          onRemove={async (id) => {
            await adminLookupService.removeArea(id);
            await refreshAreas();
          }}
        />
        <LookupSection
          title={t("admin_section_sponsors")}
          subtitle={t("admin_section_sponsors_desc")}
          icon={IconUsersGroup}
          items={sponsors}
          loading={loadingS}
          addPlaceholder={t("admin_add_placeholder")}
          addButton={t("add")}
          emptyLabel={t("empty")}
          onAdd={async (n) => {
            await adminLookupService.addSponsor(n);
            await refreshSponsors();
          }}
          onRemove={async (id) => {
            await adminLookupService.removeSponsor(id);
            await refreshSponsors();
          }}
        />
        <LookupSection
          title={t("admin_section_evaluators")}
          subtitle={t("admin_section_evaluators_desc")}
          icon={IconUserCheck}
          items={avaliadores}
          loading={loadingV}
          addPlaceholder={t("admin_add_placeholder")}
          addButton={t("add")}
          emptyLabel={t("empty")}
          onAdd={async (n) => {
            await adminLookupService.addAvaliador(n);
            await refreshAvaliadores();
          }}
          onRemove={async (id) => {
            await adminLookupService.removeAvaliador(id);
            await refreshAvaliadores();
          }}
        />
      </SimpleGrid>

      <Alert color="gray" variant="light" icon={<IconStar size={16} />}>
        <Text size="sm">{t("admin_persistInfo")}</Text>
      </Alert>

      {/* ----- Modal: Reset local ----- */}
      <Modal
        opened={resetOpen}
        onClose={() => setResetOpen(false)}
        title={t("admin_resetTitle")}
      >
        <Stack>
          <Alert color="orange" icon={<IconAlertTriangle size={16} />}>
            {t("admin_resetHelp")}
          </Alert>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResetOpen(false)}>
              {t("cancel")}
            </Button>
            <Button
              color="orange"
              leftSection={<IconRestore size={16} />}
              onClick={handleResetMocks}
            >
              {t("admin_resetBtn")}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* ----- Modal: Popular base ----- */}
      <Modal
        opened={seedOpen}
        onClose={() => !seeding && setSeedOpen(false)}
        title={t("admin_seedTitle")}
        closeOnClickOutside={!seeding}
        withCloseButton={!seeding}
      >
        <Stack>
          <Alert color="abbott" icon={<IconDatabase size={16} />}>
            {t("admin_seedHelp")}
          </Alert>
          {seeding && (
            <Stack gap={4}>
              <Text size="sm">
                {t("admin_seedCreating", { done: seeding.done, total: seeding.total })}
              </Text>
              <div
                style={{
                  background: "var(--mantine-color-gray-2)",
                  borderRadius: 8,
                  height: 8,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "var(--mantine-color-abbott-6)",
                    height: "100%",
                    width: `${(seeding.done / seeding.total) * 100}%`,
                    transition: "width 120ms ease",
                  }}
                />
              </div>
            </Stack>
          )}
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!!seeding}
              onClick={() => setSeedOpen(false)}
            >
              {t("cancel")}
            </Button>
            <Button
              color="abbott"
              leftSection={<IconDatabase size={16} />}
              loading={!!seeding}
              onClick={handleSeedDataverse}
            >
              {t("admin_seedCreate")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}

/** Converte o objeto Demand do seed em DemandInput (campos editáveis). */
function toInput(d: ReturnType<typeof seedDemands>[number]): DemandInput {
  return {
    titulo: d.titulo,
    descricao: d.descricao,
    areaSolicitante: d.areaSolicitante,
    solicitante: d.solicitante,
    email: d.email,
    telefone: d.telefone,
    problemaResolve: d.problemaResolve,
    objetivoPrincipal: d.objetivoPrincipal,
    processosImpactados: d.processosImpactados,
    consequenciaNaoExecucao: d.consequenciaNaoExecucao,
    tipo: d.tipo,
    impactoNivel: d.impactoNivel,
    tiposImpacto: d.tiposImpacto,
    valorEstimado: d.valorEstimado,
    urgencia: d.urgencia,
    deadline: d.deadline,
    sistemasEnvolvidos: d.sistemasEnvolvidos,
    integracoesNecessarias: d.integracoesNecessarias,
    requisitosPrincipais: d.requisitosPrincipais,
    solucaoProposta: d.solucaoProposta,
    sponsor: d.sponsor,
    donoProcesso: d.donoProcesso,
    areasEnvolvidas: d.areasEnvolvidas,
    dadosSensiveis: d.dadosSensiveis,
    impactaSeguranca: d.impactaSeguranca,
    requerAuditoria: d.requerAuditoria,
    esforcoEstimado: d.esforcoEstimado,
    time: d.time,
    horasEstimadas: d.horasEstimadas,
  };
}
