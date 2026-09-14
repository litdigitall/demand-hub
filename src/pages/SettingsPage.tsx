import { useEffect, useState } from "react";
import {
  Box,
  ActionIcon,
  Badge,
  Button,
  Card,
  Group,
  Loader,
  SimpleGrid,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconCheck, IconPlus, IconTrash, IconX } from "@tabler/icons-react";
import { adminLookupService } from "../data/adminLookupService";
import { MODO_DEMO } from "../auth/identity";
import { PeoplePanel } from "./settings/PeoplePanel";
import { formatNumber } from "../lib/format";
import {
  AREA_STAKEHOLDER,  CAPACIDADE_PADRAO_HORAS,
  CATEGORIA_COR_VIEW,
  CATEGORIA_RESPONSAVEL,
  CATEGORIA_VIEW_LABEL,
  TIMES_IMPLANTACAO,
  type AdminLookup,
  type Categoria,
} from "../data/types";

/* Frentes do portfólio com decisor próprio (gate único). */
const TRACKS: Categoria[] = ["infra", "ia", "app"];

/* ============================================================
   Catalog — lista compacta com adicionar / remover inline.
   ============================================================ */
interface CatalogProps {
  label: string;
  placeholder: string;
  items: AdminLookup[];
  loading: boolean;
  /** Produção: a lista mora no navegador, então não se edita aqui. */
  somenteLeitura?: boolean;
  onAdd: (nome: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}

function Catalog({
  label,
  placeholder,
  items,
  loading,
  somenteLeitura = false,
  onAdd,
  onRemove,
}: CatalogProps) {
  const [nome, setNome] = useState("");
  const [adding, setAdding] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const trimmed = nome.trim();
  const duplicate =
    trimmed.length > 0 &&
    items.some((i) => i.nome.trim().toLowerCase() === trimmed.toLowerCase());

  async function add() {
    if (!trimmed || duplicate || adding) return;
    setAdding(true);
    try {
      await onAdd(trimmed);
      setNome("");
    } finally {
      setAdding(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      await onRemove(id);
    } finally {
      setRemoving(null);
      setConfirming(null);
    }
  }

  return (
    <Card withBorder radius="lg" padding="lg">
      <Group justify="space-between" mb="md">
        <Text fw={700}>{label}</Text>
        <Text size="sm" c="dimmed">
          {items.length}
        </Text>
      </Group>

      {!somenteLeitura && (
      <Group gap="xs" align="flex-start" wrap="nowrap" mb="xs">
          <TextInput
            size="sm"
            style={{ flex: 1 }}
            placeholder={placeholder}
            value={nome}
            error={duplicate ? "Already in the list" : undefined}
            onChange={(e) => setNome(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Button
            size="sm"
            leftSection={<IconPlus size={15} />}
            loading={adding}
            disabled={!trimmed || duplicate}
            onClick={() => void add()}
          >
            Add
          </Button>
        </Group>
        )}

      {loading ? (
        <Group py="sm" gap="xs">
          <Loader size="xs" />
        </Group>
      ) : items.length === 0 ? (
        <Text size="sm" c="dimmed" py={8}>
          No {label.toLowerCase()} yet.
        </Text>
      ) : (
        <Table verticalSpacing={7} horizontalSpacing={0} withRowBorders={false}>
          <Table.Tbody>
            {items.map((it) => (
              <Table.Tr
                key={it.id}
                onMouseEnter={() => setHovered(it.id)}
                onMouseLeave={() => setHovered(null)}
              >
                <Table.Td>
                  <Text size="sm">{it.nome}</Text>
                </Table.Td>
                <Table.Td w={70} ta="right">
                  {confirming === it.id ? (
                    <Group gap={2} justify="flex-end" wrap="nowrap">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        color="red"
                        loading={removing === it.id}
                        aria-label={`Confirm removal of ${it.nome}`}
                        onClick={() => void remove(it.id)}
                      >
                        <IconCheck size={14} />
                      </ActionIcon>
                      <ActionIcon
                        size="sm"
                        variant="subtle"
                        color="gray"
                        aria-label="Cancel"
                        onClick={() => setConfirming(null)}
                      >
                        <IconX size={14} />
                      </ActionIcon>
                    </Group>
                  ) : (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="gray"
                      aria-label={`Remove ${it.nome}`}
                      style={{
                        opacity: hovered === it.id ? 1 : 0,
                        transition: "opacity 120ms ease",
                      }}
                      onFocus={() => setHovered(it.id)}
                      onBlur={() => setHovered(null)}
                      onClick={() => setConfirming(it.id)}
                    >
                      <IconTrash size={14} />
                    </ActionIcon>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}

/* ============================================================
   SettingsPage
   ============================================================ */
export function SettingsPage() {
  const [areas, setAreas] = useState<AdminLookup[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);

  useEffect(() => {
    adminLookupService
      .listAreas()
      .then(setAreas)
      .catch(() => setAreas([]))
      .finally(() => setLoadingAreas(false));
  }, []);

  const capacidadeTotal = TIMES_IMPLANTACAO.reduce(
    (acc, time) => acc + CAPACIDADE_PADRAO_HORAS[time],
    0,
  );

  return (
    <Stack gap="lg">
      <Title order={2}>Settings</Title>

      <Tabs defaultValue="people" variant="outline" keepMounted={false}>
        <Tabs.List mb="lg">
          <Tabs.Tab value="people">People</Tabs.Tab>
          <Tabs.Tab value="catalogs">Catalogs</Tabs.Tab>
          <Tabs.Tab value="routing">Routing</Tabs.Tab>
        </Tabs.List>

        {/* ---------------- People (módulo administrativo) ----------------
            Identidade vem do M365; aqui se diz o PAPEL de cada pessoa. */}
        <Tabs.Panel value="people">
          <PeoplePanel />
        </Tabs.Panel>

        {/* ---------------- Catalogs ----------------
            A edição destas listas grava no navegador (adminLookupService).
            Em produção isso NÃO é compartilhado entre usuários, então a
            edição fica desligada — melhor read-only honesto do que um
            "Add" que só funciona para quem clicou. */}
        <Tabs.Panel value="catalogs">
          {!MODO_DEMO && (
            <Text size="sm" c="dimmed" mb="md">
              Read-only in this environment. These lists become editable when the
              catalog tables exist in Dataverse — see docs/GO-LIVE.md.
            </Text>
          )}
          {/* Um catálogo só: grade de 2 colunas deixaria metade da tela vazia. */}
          <Box maw={620}>
            <Catalog
              label="Requesting areas"
              placeholder="New area"
              items={areas}
              loading={loadingAreas}
              somenteLeitura={!MODO_DEMO}
              onAdd={async (n) => {
                await adminLookupService.addArea(n);
                setAreas(await adminLookupService.listAreas());
              }}
              onRemove={async (id) => {
                await adminLookupService.removeArea(id);
                setAreas(await adminLookupService.listAreas());
              }}
            />
          </Box>
        </Tabs.Panel>

        {/* ---------------- Routing ---------------- */}
        <Tabs.Panel value="routing">
          {/* alignItems:start — sem isso o card curto estica até a altura do maior. */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ alignItems: "start" }}>
            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Text fw={700}>Approval gate</Text>
                <Badge variant="light" color="gray" radius="sm">
                  Read-only
                </Badge>
              </Group>
              <Table verticalSpacing={9} horizontalSpacing={0}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Portfolio track
                      </Text>
                    </Table.Th>
                    <Table.Th ta="right">
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Area decisor
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {TRACKS.map((cat) => (
                    <Table.Tr key={cat}>
                      <Table.Td>
                        <Badge
                          variant="light"
                          radius="sm"
                          color={CATEGORIA_COR_VIEW[cat]}
                        >
                          {CATEGORIA_VIEW_LABEL[cat]}
                        </Badge>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={600}>
                          {CATEGORIA_RESPONSAVEL[cat]}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Text fw={700}>Business stakeholder</Text>
                <Badge variant="light" color="gray" radius="sm">
                  Read-only
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" mb="sm">
                Filled in automatically from the requesting area.
              </Text>
              <Table verticalSpacing={9} horizontalSpacing={0}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Area
                      </Text>
                    </Table.Th>
                    <Table.Th ta="right">
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Stakeholder
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {Object.entries(AREA_STAKEHOLDER).map(([area, nome]) => (
                    <Table.Tr key={area}>
                      <Table.Td>
                        <Text size="sm">{area}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={600}>
                          {nome}
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>

            <Card withBorder radius="lg" padding="lg">
              <Group justify="space-between" mb="md">
                <Text fw={700}>Monthly capacity</Text>
                <Badge variant="light" color="gray" radius="sm">
                  Read-only
                </Badge>
              </Group>
              <Table verticalSpacing={9} horizontalSpacing={0}>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Delivery team
                      </Text>
                    </Table.Th>
                    <Table.Th ta="right">
                      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={1}>
                        Hours / month
                      </Text>
                    </Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {TIMES_IMPLANTACAO.map((time) => (
                    <Table.Tr key={time}>
                      <Table.Td>
                        <Text size="sm">{time}</Text>
                      </Table.Td>
                      <Table.Td ta="right">
                        <Text size="sm" fw={600}>
                          {formatNumber(CAPACIDADE_PADRAO_HORAS[time])} h
                        </Text>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  <Table.Tr>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        Total
                      </Text>
                    </Table.Td>
                    <Table.Td ta="right">
                      <Text size="sm" fw={700}>
                        {formatNumber(capacidadeTotal)} h
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </Card>
          </SimpleGrid>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  );
}
