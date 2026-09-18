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
  Paper,
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
  Impacto,
  ImpactoAbrangencia,
  TipoDemanda,
  Urgencia,
  abrangenciaOptions,
  categoriaDe,
  scoreAutomatico,
  stakeholderDaArea,
  tipoOptions,
  urgenciaOptions,
  weightedScore,
  type AdminLookup,
  type DemandInput,
} from "../data/types";
import abbottLogo from "../assets/abbott-logo.png";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* Faixas de valor: o solicitante escolhe uma faixa; o sistema guarda o ponto
   medio dela, que e o que alimenta a nota de retorno. */
const FAIXAS_VALOR: { label: string; valor: number | null }[] = [
  { label: "I can't estimate", valor: null },
  { label: "Up to US$ 50k", valor: 25_000 },
  { label: "US$ 50k - 200k", valor: 125_000 },
  { label: "US$ 200k - 500k", valor: 350_000 },
  { label: "Above US$ 500k", valor: 750_000 },
];
const valorDaFaixa = (i: number) => FAIXAS_VALOR[i]?.valor ?? null;

/* O "nivel de impacto" (Alto/Medio/Baixo) sai do alcance informado: perguntar
   os dois seria pedir a mesma coisa duas vezes. */
function nivelPorAbrangencia(abrangencia: number): number {
  if (abrangencia === ImpactoAbrangencia.Infraestrutura) return Impacto.Alto;
  if (abrangencia === ImpactoAbrangencia.Departamento) return Impacto.Alto;
  if (abrangencia === ImpactoAbrangencia.Processo) return Impacto.Medio;
  return Impacto.Baixo;
}

/* Consequencia: lista fechada. Texto livre aqui nao e comparavel entre demandas. */
const CONSEQUENCIAS = [
  "Increased costs",
  "Regulatory risk",
  "Operational risk",
  "Customer impact",
  "Reputational impact",
  "Security exposure",
];

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
    tipo: TipoDemanda.ProjetoNovo as number,
    problemaResolve: "",
    objetivoPrincipal: "",
    consequenciaNaoExecucao: "",
    impactoAbrangencia: ImpactoAbrangencia.Processo as number,
    /* Faixa de valor: caixa numérica livre gera chute. O índice aponta para
       FAIXAS_RETORNO, e a nota de retorno sai daí. */
    faixaValor: 0,
    urgencia: Urgencia.Medio as number,
    deadline: "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    adminLookupService.listAreas().then(setAreas);
  }, []);

  /* Mesma funcao de score usada pelo motor: o numero que o solicitante ve aqui
     e exatamente o que a demanda leva para a triagem. */
  const prioridadeEstimada = weightedScore(
    scoreAutomatico({
      impactoAbrangencia: f.impactoAbrangencia,
      urgencia: f.urgencia,
      valorEstimado: valorDaFaixa(f.faixaValor),
    }),
  );

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
        /* Derivados do que foi respondido — o solicitante não precisa saber
           classificar portfólio nem calibrar "nível de impacto". */
        category: "strategic",
        clasificacion: categoriaDe(f.tipo),
        clasificacionOtro: "",
        impactoNivel: nivelPorAbrangencia(f.impactoAbrangencia),
        impactoAbrangencia: f.impactoAbrangencia,
        tiposImpacto: [],
        valorEstimado: valorDaFaixa(f.faixaValor),
        roiEstimado: null,
        urgencia: f.urgencia,
        deadline: f.deadline,
        sistemasEnvolvidos: "",
        integracoesNecessarias: "",
        requisitosPrincipais: "",
        solucaoProposta: "",
        appId: "",
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
              <Title order={3}>IT request</Title>
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
              <Select
                label="Demand type"
                mt="sm"
                data={tipoOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                allowDeselect={false}
                value={String(f.tipo)}
                onChange={(v) => v && set("tipo", Number(v))}
              />
            </FormCard>

            <FormCard title="3. Objective">
              <Textarea label="What problem or opportunity does it solve?" autosize minRows={2} value={f.problemaResolve} onChange={(e) => set("problemaResolve", e.currentTarget.value)} />
              <Textarea label="Main objective" withAsterisk autosize minRows={2} mt="sm" value={f.objetivoPrincipal} error={errors.objetivoPrincipal} onChange={(e) => set("objetivoPrincipal", e.currentTarget.value)} />
              <Select
                label="What happens if we don't do it?"
                mt="sm"
                data={CONSEQUENCIAS}
                clearable
                value={f.consequenciaNaoExecucao || null}
                onChange={(v) => set("consequenciaNaoExecucao", v ?? "")}
              />
            </FormCard>

            <FormCard title="4. Impact and urgency">
              <Select
                label="How far does it reach?"
                data={abrangenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                allowDeselect={false}
                value={String(f.impactoAbrangencia)}
                onChange={(v) => v && set("impactoAbrangencia", Number(v))}
              />
              <Group grow mt="sm">
                <Select
                  label="Urgency"
                  data={urgenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))}
                  allowDeselect={false}
                  value={String(f.urgencia)}
                  onChange={(v) => v && set("urgencia", Number(v))}
                />
                <DateInput
                  label="Deadline"
                  description="Audit, contract or legal date, if any"
                  valueFormat="DD MMM YYYY"
                  clearable
                  value={f.deadline || null}
                  onChange={(v) => set("deadline", v ?? "")}
                />
              </Group>
              <Select
                label="Estimated value for the business"
                mt="sm"
                data={FAIXAS_VALOR.map((x, i) => ({ value: String(i), label: x.label }))}
                allowDeselect={false}
                value={String(f.faixaValor)}
                onChange={(v) => v && set("faixaValor", Number(v))}
              />

              {/* O solicitante ve a nota que as proprias respostas geraram. */}
              <Paper withBorder radius="md" p="sm" mt="md" bg="abbott.0">
                <Group justify="space-between">
                  <Text size="sm" fw={600}>
                    Estimated priority
                  </Text>
                  <Text fw={800} fz="lg">
                    {prioridadeEstimada.toFixed(2)}{" "}
                    <Text component="span" size="sm" c="dimmed">
                      / 5.00
                    </Text>
                  </Text>
                </Group>
                <Text size="xs" c="dimmed" mt={2}>
                  Calculated from reach, urgency and estimated value. The PMO reviews it during triage.
                </Text>
              </Paper>
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
              Intake Forms · LIT Digitall
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
