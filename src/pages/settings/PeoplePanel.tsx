/* ============================================================
   Settings → People — o módulo administrativo de acesso.

   Aqui o administrador diz QUEM é o quê. A identidade continua vindo
   do host do Power Apps (M365) — este cadastro não guarda senha nem
   autentica ninguém; ele só responde "esta pessoa é PMO? decide qual
   frente?".

   Por que existe: antes o papel morava num arquivo .ts e cadastrar um
   decisor exigia editar código, buildar e republicar o app.
   ============================================================ */
import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Stack,
  Switch,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { Role, ROLE_COLOR, ROLE_LABEL } from "../../domain/roles";
import {
  CATEGORIA_COR_VIEW,
  CATEGORIA_VIEW_LABEL,
  type Categoria,
} from "../../data/types";
import { perfilService, type Perfil } from "../../data/perfilService";
import { haCadastro } from "../../auth/papeis";

const TRACKS: Categoria[] = ["infra", "ia", "app", "otro"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Solicitante não entra na lista: todo mundo já é, por padrão. Oferecer a
   opção sugeriria que dá para tirar — e não dá. */
const PAPEIS_ATRIBUIVEIS: Role[] = [Role.PMO, Role.TechLead, Role.Decisor, Role.Admin];

interface Rascunho {
  id?: string;
  upn: string;
  nome: string;
  papeis: Role[];
  frentes: Categoria[];
  ativo: boolean;
}

const VAZIO: Rascunho = { upn: "", nome: "", papeis: [], frentes: [], ativo: true };

export function PeoplePanel() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<Rascunho | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  const editavel = perfilService.editavel;

  /* Busca sem mexer no estado de carregamento: quem chama decide se é a
     carga inicial (já nasce carregando) ou um refresh depois de salvar. */
  async function buscar() {
    try {
      setPerfis(await perfilService.listar());
      setErro(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Could not load profiles.");
    }
  }

  async function recarregar() {
    await buscar();
  }

  useEffect(() => {
    let vivo = true;
    perfilService
      .listar()
      .then((lista) => vivo && setPerfis(lista))
      .catch(
        (e: unknown) =>
          vivo && setErro(e instanceof Error ? e.message : "Could not load profiles."),
      )
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, []);

  const duplicado = useMemo(() => {
    if (!edicao?.upn.trim()) return false;
    return perfis.some(
      (p) =>
        p.id !== edicao.id &&
        p.upn.trim().toLowerCase() === edicao.upn.trim().toLowerCase(),
    );
  }, [edicao, perfis]);

  const emailInvalido = !!edicao?.upn.trim() && !EMAIL_RE.test(edicao.upn.trim());
  const precisaFrente =
    !!edicao?.papeis.includes(Role.Decisor) && edicao.frentes.length === 0;
  const podeSalvar =
    !!edicao &&
    !!edicao.upn.trim() &&
    !emailInvalido &&
    !duplicado &&
    edicao.papeis.length > 0 &&
    !precisaFrente;

  async function salvar() {
    if (!edicao || !podeSalvar) return;
    setSalvando(true);
    try {
      await perfilService.salvar({
        id: edicao.id,
        upn: edicao.upn.trim().toLowerCase(),
        nome: edicao.nome.trim(),
        papeis: edicao.papeis,
        /* Frente só faz sentido para decisor: guardar para os outros deixaria
           lixo que volta a aparecer se o papel mudar depois. */
        frentes: edicao.papeis.includes(Role.Decisor) ? edicao.frentes : [],
        ativo: edicao.ativo,
      });
      setEdicao(null);
      await recarregar();
      notifications.show({ color: "teal", title: "Profile saved", message: edicao.upn });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not save",
        message: e instanceof Error ? e.message : "Unexpected error.",
      });
    } finally {
      setSalvando(false);
    }
  }

  async function remover(p: Perfil) {
    setRemovendo(p.id);
    try {
      await perfilService.remover(p.id);
      await recarregar();
      notifications.show({ color: "teal", title: "Profile removed", message: p.upn });
    } catch (e) {
      notifications.show({
        color: "red",
        title: "Could not remove",
        message: e instanceof Error ? e.message : "Unexpected error.",
      });
    } finally {
      setRemovendo(null);
    }
  }

  if (carregando) {
    return (
      <Group justify="center" py="xl">
        <Loader size="sm" />
      </Group>
    );
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Box>
          <Text fw={700}>Who is who</Text>
          <Text size="sm" c="dimmed">
            Sign-in comes from Microsoft 365 — there is no password here. This is where
            you say what each person can do in the process.
          </Text>
        </Box>
        {editavel && (
          <Button leftSection={<IconPlus size={16} />} onClick={() => setEdicao({ ...VAZIO })}>
            Add person
          </Button>
        )}
      </Group>

      {erro && (
        <Alert color="red" variant="light" icon={<IconAlertTriangle size={18} />}>
          {erro}
        </Alert>
      )}

      {!erro && !haCadastro(perfis) && (
        <Alert color="orange" variant="light" icon={<IconAlertTriangle size={18} />}>
          <Text fw={600} size="sm">
            Nobody is registered yet
          </Text>
          <Text size="sm">
            Everyone signing in is treated as a Requester and sees only their own
            requests. Add at least the PMO and the area decisors.
          </Text>
        </Alert>
      )}

      {!editavel && (
        <Text size="sm" c="dimmed">
          Read-only in demo mode — the list below is the sample used by the personas.
        </Text>
      )}

      <Card withBorder radius="lg" padding={0} style={{ overflow: "hidden" }}>
        <Table highlightOnHover verticalSpacing={8} horizontalSpacing="md" layout="fixed">
          <Table.Thead bg="var(--mantine-color-gray-0)">
            <Table.Tr>
              <Table.Th>Person</Table.Th>
              <Table.Th w={280}>Roles</Table.Th>
              <Table.Th w={220}>Decides</Table.Th>
              <Table.Th w={90}>Status</Table.Th>
              <Table.Th w={80} />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {perfis.length === 0 && (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text size="sm" c="dimmed" py="sm">
                    No profiles registered.
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
            {perfis.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>
                  <Text size="sm" fw={600} truncate>
                    {p.nome || p.upn}
                  </Text>
                  {p.nome && (
                    <Text size="xs" c="dimmed" truncate>
                      {p.upn}
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {p.papeis.map((r) => (
                      <Badge key={r} size="sm" variant="light" color={ROLE_COLOR[r]}>
                        {ROLE_LABEL[r]}
                      </Badge>
                    ))}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Group gap={4} wrap="wrap">
                    {p.frentes.length === 0 ? (
                      <Text size="xs" c="dimmed">
                        —
                      </Text>
                    ) : (
                      p.frentes.map((c) => (
                        <Badge key={c} size="sm" variant="light" color={CATEGORIA_COR_VIEW[c]}>
                          {CATEGORIA_VIEW_LABEL[c]}
                        </Badge>
                      ))
                    )}
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge size="sm" variant="light" color={p.ativo ? "teal" : "gray"}>
                    {p.ativo ? "Active" : "Inactive"}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  {editavel && (
                    <Group gap={2} justify="flex-end" wrap="nowrap">
                      <Tooltip label="Edit" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          onClick={() =>
                            setEdicao({
                              id: p.id,
                              upn: p.upn,
                              nome: p.nome,
                              papeis: p.papeis,
                              frentes: p.frentes,
                              ativo: p.ativo,
                            })
                          }
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Remove" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="red"
                          loading={removendo === p.id}
                          onClick={() => void remover(p)}
                        >
                          <IconTrash size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Card>

      <Modal
        opened={!!edicao}
        onClose={() => setEdicao(null)}
        title={edicao?.id ? "Edit profile" : "Add person"}
      >
        {edicao && (
          <Stack gap="sm">
            <TextInput
              label="Work e-mail (UPN)"
              description="Must match the Microsoft 365 account the person signs in with."
              withAsterisk
              value={edicao.upn}
              error={
                emailInvalido
                  ? "Not a valid e-mail"
                  : duplicado
                    ? "Already registered"
                    : undefined
              }
              onChange={(e) => setEdicao({ ...edicao, upn: e.currentTarget.value })}
            />
            <TextInput
              label="Name"
              value={edicao.nome}
              onChange={(e) => setEdicao({ ...edicao, nome: e.currentTarget.value })}
            />
            <MultiSelect
              label="Roles"
              description="Everyone can open requests; these add what else they can do."
              withAsterisk
              data={PAPEIS_ATRIBUIVEIS.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
              value={edicao.papeis}
              onChange={(v) => setEdicao({ ...edicao, papeis: v as Role[] })}
            />
            {edicao.papeis.includes(Role.Decisor) && (
              <MultiSelect
                label="Decides which tracks"
                withAsterisk
                error={precisaFrente ? "An area decisor needs at least one track" : undefined}
                data={TRACKS.map((c) => ({ value: c, label: CATEGORIA_VIEW_LABEL[c] }))}
                value={edicao.frentes}
                onChange={(v) => setEdicao({ ...edicao, frentes: v as Categoria[] })}
              />
            )}
            <Switch
              label="Active"
              description="Turn off to revoke access without losing the record of who held it."
              checked={edicao.ativo}
              onChange={(e) => setEdicao({ ...edicao, ativo: e.currentTarget.checked })}
            />
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setEdicao(null)}>
                Cancel
              </Button>
              <Button loading={salvando} disabled={!podeSalvar} onClick={() => void salvar()}>
                Save
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}
