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
    clasificacionOtro: "",
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
    if (!f.solicitante.trim()) e.solicitante = "Required";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "Invalid email";
    if (!f.areaSolicitante.trim()) e.areaSolicitante = "Required";
    if (!f.titulo.trim()) e.titulo = "Required";
    if (!f.descricao.trim()) e.descricao = "Required";
    if (!f.objetivoPrincipal.trim()) e.objetivoPrincipal = "Required";
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
        clasificacionOtro: f.clasificacion === "otro" ? f.clasificacionOtro : "",
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
              <Title order={3}>Demand Request — IT</Title>
              <Text size="sm" c="dimmed">
                Any employee can open a demand. Fill in the form; the team will evaluate it.
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
                <Title order={3}>Request submitted!</Title>
                <Text ta="center">
                  Your demand was created with number{" "}
                  <Text component="span" fw={800} c="abbott.7">
                    {enviado.numero}
                  </Text>
                  . The PMO team will triage it and you'll be able to track its status.
                </Text>
                <Group mt="sm">
                  <Button variant="light" onClick={() => { setEnviado(null); }}>
                    Submit another request
                  </Button>
                  <Button component={Link} to="/login" variant="subtle">
                    Go to the system
                  </Button>
                </Group>
              </Stack>
            </Center>
          </Card>
        ) : (
          <Stack gap="md">
            <FormCard title="1. Your details">
              <Group grow>
                <TextInput label="Name" withAsterisk value={f.solicitante} error={errors.solicitante} onChange={(e) => set("solicitante", e.currentTarget.value)} />
                <TextInput label="Email" withAsterisk value={f.email} error={errors.email} onChange={(e) => set("email", e.currentTarget.value)} />
              </Group>
              <Group grow mt="sm">
                <TextInput label="Phone" value={f.telefone} onChange={(e) => set("telefone", e.currentTarget.value)} />
                <Select
                  label="Requesting area"
                  withAsterisk
                  data={areas.map((a) => a.nome)}
                  searchable
                  value={f.areaSolicitante || null}
                  error={errors.areaSolicitante}
                  onChange={(v) => set("areaSolicitante", v ?? "")}
                />
              </Group>
            </FormCard>

            <FormCard title="2. About the demand">
              <TextInput label="Title" withAsterisk value={f.titulo} error={errors.titulo} onChange={(e) => set("titulo", e.currentTarget.value)} />
              <Textarea label="Description" withAsterisk autosize minRows={3} mt="sm" value={f.descricao} error={errors.descricao} onChange={(e) => set("descricao", e.currentTarget.value)} />
              <Group grow mt="sm">
                <Select label="Category" data={categoryOptions} allowDeselect={false} value={f.category} onChange={(v) => v && set("category", v)} />
                <Select label="Demand type" data={tipoOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.tipo)} onChange={(v) => v && set("tipo", Number(v))} />
              </Group>
              <Group grow mt="sm">
                <Select
                  label="Project classification"
                  data={clasificacionOptions}
                  allowDeselect={false}
                  value={f.clasificacion}
                  onChange={(v) => v && set("clasificacion", v)}
                />
                {f.clasificacion === "otro" && (
                  <TextInput label="Specify" value={f.clasificacionOtro} onChange={(e) => set("clasificacionOtro", e.currentTarget.value)} />
                )}
              </Group>
            </FormCard>

            <FormCard title="3. Objective">
              <Textarea label="What problem or opportunity does it solve?" autosize minRows={2} value={f.problemaResolve} onChange={(e) => set("problemaResolve", e.currentTarget.value)} />
              <Textarea label="Main objective" withAsterisk autosize minRows={2} mt="sm" value={f.objetivoPrincipal} error={errors.objetivoPrincipal} onChange={(e) => set("objetivoPrincipal", e.currentTarget.value)} />
              <Textarea label="Consequence of not executing" autosize minRows={2} mt="sm" value={f.consequenciaNaoExecucao} onChange={(e) => set("consequenciaNaoExecucao", e.currentTarget.value)} />
            </FormCard>

            <FormCard title="4. Impact and urgency">
              <Select
                label="How far does it reach?"
                description={`Business Impact (automatic): ${ABRANGENCIA_SCORE[f.impactoAbrangencia]}/5`}
                data={abrangenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                allowDeselect={false}
                value={String(f.impactoAbrangencia)}
                onChange={(v) => v && set("impactoAbrangencia", Number(v))}
              />
              <Group grow mt="sm">
                <Select label="Impact level" data={impactoOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.impactoNivel)} onChange={(v) => v && set("impactoNivel", Number(v))} />
                <Select label="Urgency" data={urgenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))} allowDeselect={false} value={String(f.urgencia)} onChange={(v) => v && set("urgencia", Number(v))} />
              </Group>
              <MultiSelect
                label="Impact type"
                mt="sm"
                data={tipoImpactoOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                value={f.tiposImpacto.map(String)}
                error={errors.tiposImpacto}
                onChange={(v) => set("tiposImpacto", v.map(Number))}
              />
              <Group grow mt="sm">
                <NumberInput label="Estimated value (USD)" min={0} value={f.valorEstimado} onChange={(v) => set("valorEstimado", typeof v === "number" ? v : "")} />
                <NumberInput label="Estimated ROI (%)" min={0} suffix="%" value={f.roiEstimado} onChange={(v) => set("roiEstimado", typeof v === "number" ? v : "")} />
                <DateInput label="Deadline" valueFormat="DD/MM/YYYY" clearable value={f.deadline || null} onChange={(v) => set("deadline", v ?? "")} />
              </Group>
              <TextInput label="APP ID (optional)" mt="sm" placeholder="e.g.: APP-0456" value={f.appId} onChange={(e) => set("appId", e.currentTarget.value)} />
            </FormCard>

            <Alert color="gray" variant="light">
              <Text size="sm">
                You don't need to know effort, team or technical details — the technical team defines that during the evaluation.
              </Text>
            </Alert>

            <Group justify="space-between">
              <Anchor component={Link} to="/login" size="sm" c="dimmed">
                Access the system
              </Anchor>
              <Button size="md" leftSection={<IconSend size={18} />} loading={saving} onClick={submit}>
                Submit request
              </Button>
            </Group>
            <Divider my="xs" />
            <Text ta="center" size="xs" c="dimmed">
              Demand Hub · LIT Digitall — Free entry point (demo)
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
