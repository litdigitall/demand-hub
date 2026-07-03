/* ============================================================
   Formulario público de entrada — "Solicitud Free" (sin login).
   Estilo Microsoft Forms: página única que alimenta el sistema
   de gestión de demandas (punto de entrada de la solución híbrida).
   ============================================================ */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Center,
  Divider,
  Group,
  MultiSelect,
  NumberInput,
  Select,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { IconChecks, IconSend } from "@tabler/icons-react";
import { adminLookupService, demandService } from "../data/demandService";
import {
  ABRANGENCIA_SCORE,
  Impacto,
  ImpactoAbrangencia,
  TipoDemanda,
  Urgencia,
  abrangenciaOptions,
  categoryOptions,
  clasificacionOptions,
  impactoOptions,
  stakeholderDaArea,
  tipoImpactoOptions,
  tipoOptions,
  urgenciaOptions,
  type AdminLookup,
  type DemandInput,
} from "../data/types";
import abbottLogo from "../assets/abbott-logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SolicitarPage() {
  const [areas, setAreas] = useState<AdminLookup[]>([]);
  const [enviado, setEnviado] = useState<{ numero: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [f, setF] = useState({
    solicitante: "",
    email: "",
    telefone: "",
    areaSolicitante: "",
    titulo: "",
    descricao: "",
    category: "strategic",
    clasificacion: "app",
    tipo: TipoDemanda.ProjetoNovo as number,
    problemaResolve: "",
    objetivoPrincipal: "",
    consequenciaNaoExecucao: "",
    impactoAbrangencia: ImpactoAbrangencia.Processo as number,
    impactoNivel: Impacto.Medio as number,
    tiposImpacto: [] as number[],
    valorEstimado: "" as number | "",
    roiEstimado: "" as number | "",
    urgencia: Urgencia.Medio as number,
    deadline: "",
    appId: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    adminLookupService.listAreas().then(setAreas);
  }, []);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!f.solicitante.trim()) e.solicitante = "Requerido";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "Email inválido";
    if (!f.areaSolicitante.trim()) e.areaSolicitante = "Requerido";
    if (!f.titulo.trim()) e.titulo = "Requerido";
    if (!f.descricao.trim()) e.descricao = "Requerido";
    if (!f.objetivoPrincipal.trim()) e.objetivoPrincipal = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload: DemandInput = {
        titulo: f.titulo,
        descricao: f.descricao,
        areaSolicitante: f.areaSolicitante,
        solicitante: f.solicitante,
        email: f.email,
        telefone: f.telefone,
        problemaResolve: f.problemaResolve,
        objetivoPrincipal: f.objetivoPrincipal,
        processosImpactados: "",
        consequenciaNaoExecucao: f.consequenciaNaoExecucao,
        tipo: f.tipo,
        category: f.category,
        clasificacion: f.clasificacion,
        impactoNivel: f.impactoNivel,
        impactoAbrangencia: f.impactoAbrangencia,
        tiposImpacto: f.tiposImpacto,
        valorEstimado: typeof f.valorEstimado === "number" ? f.valorEstimado : null,
        roiEstimado: typeof f.roiEstimado === "number" ? f.roiEstimado : null,
        urgencia: f.urgencia,
        deadline: f.deadline,
        sistemasEnvolvidos: "",
        integracoesNecessarias: "",
        requisitosPrincipais: "",
        solucaoProposta: "",
        appId: f.appId,
        sponsor: stakeholderDaArea(f.areaSolicitante),
        donoProcesso: "",
        areasEnvolvidas: "",
        dadosSensiveis: false,
        impactaSeguranca: false,
        requerAuditoria: false,
        esforcoEstimado: null,
        time: "",
        horasEstimadas: 0,
      };
      const created = await demandService.create(payload);
      setEnviado({ numero: created.numero });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box style={{ minHeight: "100vh", background: "var(--mantine-color-gray-1)", padding: "2rem 1rem" }}>
      <Box style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Cabezal estilo Form */}
        <Card withBorder radius="lg" p="lg" mb="md" style={{ borderTop: "6px solid var(--mantine-color-abbott-6)" }}>
          <Group gap="sm">
            <Box style={{ background: "#fff", borderRadius: 8, padding: "6px 10px" }}>
              <img src={abbottLogo} alt="Abbott" style={{ maxWidth: 96, display: "block" }} />
            </Box>
            <div>
              <Title order={3}>Solicitud de Demanda — IT</Title>
              <Text size="sm" c="dimmed">
                Cualquier colaborador puede abrir una demanda. Completá el formulario; el equipo la evaluará.
              </Text>
            </div>
          </Group>
        </Card>

        {enviado ? (
          <Card withBorder radius="lg" p="xl">
            <Center>
              <Stack align="center" gap="sm">
                <ThemeIcon size={64} radius="xl" color="teal" variant="light">
                  <IconChecks size={32} />
                </ThemeIcon>
                <Title order={3}>¡Solicitud registrada!</Title>
                <Text ta="center">
                  Tu demanda fue creada con el número{" "}
                  <Text component="span" fw={800} c="abbott.7">
                    {enviado.numero}
                  </Text>
                  . El equipo de PMO hará el triaje y podrás seguir su estado.
                </Text>
                <Group mt="sm">
                  <Button variant="light" onClick={() => { setEnviado(null); }}>
                    Enviar otra solicitud
                  </Button>
                  <Button component={Link} to="/login" variant="subtle">
                    Ir al sistema
                  </Button>
                </Group>
              </Stack>
            </Center>
          </Card>
        ) : (
          <Stack gap="md">
            <FormCard title="1. Tus datos">
              <Group grow>
                <TextInput label="Nombre" withAsterisk value={f.solicitante} error={errors.solicitante} onChange={(e) => set("solicitante", e.currentTarget.value)} />
                <TextInput label="Email" withAsterisk value={f.email} error={errors.email} onChange={(e) => set("email", e.currentTarget.value)} />
              </Group>
              <Group grow mt="sm">
                <TextInput label="Teléfono" value={f.telefone} onChange={(e) => set("telefone", e.currentTarget.value)} />
                <Select
                  label="Área solicitante"
                  withAsterisk
                  data={areas.map((a) => a.nome)}
                  searchable
                  value={f.areaSolicitante || null}
                  error={errors.areaSolicitante}
                  onChange={(v) => set("areaSolicitante", v ?? "")}
                />
              </Group>
            </FormCard>

            <FormCard title="2. Sobre la demanda">
              <TextInput label="Título" withAsterisk value={f.titulo} error={errors.titulo} onChange={(e) => set("titulo", e.currentTarget.value)} />
              <Textarea label="Descripción" withAsterisk autosize minRows={3} mt="sm" value={f.descricao} error={errors.descricao} onChange={(e) => set("descricao", e.currentTarget.value)} />
              <Group grow mt="sm">
                <Select label="Category" data={categoryOptions} allowDeselect={false} value={f.category} onChange={(v) => v && set("category", v)} />
                <Select label="Tipo de demanda" data={tipoOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.tipo)} onChange={(v) => v && set("tipo", Number(v))} />
              </Group>
              <Select
                label="Clasificación de proyecto"
                mt="sm"
                data={clasificacionOptions}
                allowDeselect={false}
                value={f.clasificacion}
                onChange={(v) => v && set("clasificacion", v)}
              />
            </FormCard>

            <FormCard title="3. Objetivo">
              <Textarea label="¿Qué problema u oportunidad resuelve?" autosize minRows={2} value={f.problemaResolve} onChange={(e) => set("problemaResolve", e.currentTarget.value)} />
              <Textarea label="Objetivo principal" withAsterisk autosize minRows={2} mt="sm" value={f.objetivoPrincipal} error={errors.objetivoPrincipal} onChange={(e) => set("objetivoPrincipal", e.currentTarget.value)} />
              <Textarea label="Consecuencia de no ejecutar" autosize minRows={2} mt="sm" value={f.consequenciaNaoExecucao} onChange={(e) => set("consequenciaNaoExecucao", e.currentTarget.value)} />
            </FormCard>

            <FormCard title="4. Impacto y urgencia">
              <Select
                label="¿Hasta dónde impacta?"
                description={`Impacto en el Negocio (automático): ${ABRANGENCIA_SCORE[f.impactoAbrangencia]}/5`}
                data={abrangenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                allowDeselect={false}
                value={String(f.impactoAbrangencia)}
                onChange={(v) => v && set("impactoAbrangencia", Number(v))}
              />
              <Group grow mt="sm">
                <Select label="Nivel de impacto" data={impactoOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.impactoNivel)} onChange={(v) => v && set("impactoNivel", Number(v))} />
                <Select label="Urgencia" data={urgenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.urgencia)} onChange={(v) => v && set("urgencia", Number(v))} />
              </Group>
              <MultiSelect
                label="Tipo de impacto"
                mt="sm"
                data={tipoImpactoOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                value={f.tiposImpacto.map(String)}
                error={errors.tiposImpacto}
                onChange={(v) => set("tiposImpacto", v.map(Number))}
              />
              <Group grow mt="sm">
                <NumberInput label="Valor estimado (USD)" min={0} value={f.valorEstimado} onChange={(v) => set("valorEstimado", typeof v === "number" ? v : "")} />
                <NumberInput label="ROI estimado (%)" min={0} suffix="%" value={f.roiEstimado} onChange={(v) => set("roiEstimado", typeof v === "number" ? v : "")} />
                <DateInput label="Deadline" valueFormat="DD/MM/YYYY" clearable value={f.deadline || null} onChange={(v) => set("deadline", v ?? "")} />
              </Group>
              <TextInput label="APP ID (opcional)" mt="sm" placeholder="ej.: APP-0456" value={f.appId} onChange={(e) => set("appId", e.currentTarget.value)} />
            </FormCard>

            <Alert color="gray" variant="light">
              <Text size="sm">
                No necesitás conocer esfuerzo, equipo ni detalles técnicos — eso lo define el equipo técnico en la evaluación.
              </Text>
            </Alert>

            <Group justify="space-between">
              <Anchor component={Link} to="/login" size="sm" c="dimmed">
                Acceder al sistema
              </Anchor>
              <Button size="md" leftSection={<IconSend size={18} />} loading={saving} onClick={submit}>
                Enviar solicitud
              </Button>
            </Group>
            <Divider my="xs" />
            <Text ta="center" size="xs" c="dimmed">
              Demand Hub · LIT Digitall — punto de entrada Free (demo)
            </Text>
          </Stack>
        )}
      </Box>
    </Box>
  );
}

function FormCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card withBorder radius="lg" p="lg">
      <Text fw={700} mb="sm">
        {title}
      </Text>
      {children}
    </Card>
  );
}
