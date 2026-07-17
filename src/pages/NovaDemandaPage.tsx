import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Anchor,
  Badge,
  Button,
  Card,
  Checkbox,
  Group,
  MultiSelect,
  NumberInput,
  Paper,
  Select,
  SimpleGrid,
  Stack,
  Stepper,
  Text,
  Textarea,
  TextInput,
  Title,
} from "@mantine/core";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconArrowRight,
  IconChecks,
  IconDeviceFloppy,
  IconHelpCircle,
  IconRocket,
} from "@tabler/icons-react";
import { Tooltip } from "@mantine/core";
import { adminLookupService, demandService } from "../data/demandService";
import {
  ABRANGENCIA_SCORE,
  APP_REGISTRY,
  Impacto,
  ImpactoAbrangencia,
  TipoDemanda,
  Urgencia,
  abrangenciaOptions,
  appName,
  categoryOptions,
  clasificacionOptions,
  esforcoOptions,
  impactoOptions,
  stakeholderDaArea,
  tipoImpactoOptions,
  tipoOptions,
  urgenciaOptions,
  type AdminLookup,
  type DemandInput,
} from "../data/types";

/* Evaluación guiada (análise UX): consecuencias de no ejecutar. */
const CONSEQUENCE_OPTIONS = [
  "Cost increase",
  "Regulatory risk",
  "Operational risk",
  "Customer impact",
  "Reputational impact",
];

/* Beneficio económico esperado en rangos (análise UX). O valor numérico
   (ponto médio) alimenta o roteamento de processo (Phase 0 / RAPID / ME). */
const VALUE_RANGES: { label: string; value: number }[] = [
  { label: "< US$ 10k", value: 5_000 },
  { label: "US$ 10k – 50k", value: 30_000 },
  { label: "US$ 50k – 100k", value: 75_000 },
  { label: "US$ 100k – 500k", value: 300_000 },
  { label: "> US$ 500k", value: 750_000 },
];

/* Áreas afectadas (selección múltiple — análise UX). */
const AFFECTED_AREAS = ["Commercial", "IT", "Purchasing", "HR", "Finance", "Operations"];

const DRAFT_KEY = "demand-system.newdraft.v1";
import { useCurrentUser } from "../lib/useCurrentUser";
import { useT } from "../i18n";
import { useLabels } from "../i18n/useLabels";

/* O formulário do solicitante NÃO coleta time/horas (capacity) — isso é
   definido pelo time técnico na etapa de Avaliação. Esforço é opcional. */
type DraftForm = Omit<
  DemandInput,
  "valorEstimado" | "esforcoEstimado" | "horasEstimadas" | "time" | "roiEstimado" | "impactoAbrangencia"
> & {
  valorEstimado: number | "";
  esforcoEstimado: number | null;
  impactoAbrangencia: number;
  roiEstimado: number | "";
  appId: string;
  category: string;
  clasificacion: string;
  clasificacionOtro: string;
  temSolucaoProposta: boolean;
  rce: string;
};

function emptyDraft(): DraftForm {
  return {
    titulo: "",
    descricao: "",
    areaSolicitante: "",
    solicitante: "",
    email: "",
    telefone: "",
    problemaResolve: "",
    objetivoPrincipal: "",
    processosImpactados: "",
    consequenciaNaoExecucao: "",
    tipo: TipoDemanda.ProjetoNovo,
    category: "strategic",
    clasificacion: "app",
    clasificacionOtro: "",
    impactoNivel: Impacto.Medio,
    impactoAbrangencia: ImpactoAbrangencia.Processo,
    tiposImpacto: [],
    valorEstimado: "",
    roiEstimado: "",
    esforcoEstimado: null,
    urgencia: Urgencia.Medio,
    deadline: "",
    sistemasEnvolvidos: "",
    integracoesNecessarias: "",
    requisitosPrincipais: "",
    solucaoProposta: "",
    temSolucaoProposta: false,
    appId: "",
    rce: "",
    sponsor: "",
    donoProcesso: "",
    areasEnvolvidas: "",
    dadosSensiveis: false,
    impactaSeguranca: false,
    requerAuditoria: false,
  };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateStep(step: number, f: DraftForm): Record<string, string> {
  const e: Record<string, string> = {};
  if (step === 0) {
    if (!f.titulo.trim()) e.titulo = "!";
    if (!f.descricao.trim()) e.descricao = "!";
    if (!f.areaSolicitante.trim()) e.areaSolicitante = "!";
    if (!f.solicitante.trim()) e.solicitante = "!";
    if (!EMAIL_RE.test(f.email.trim())) e.email = "!";
  }
  if (step === 1) {
    if (!f.problemaResolve.trim()) e.problemaResolve = "!";
    if (!f.objetivoPrincipal.trim()) e.objetivoPrincipal = "!";
  }
  if (step === 2) {
    if (f.tiposImpacto.length === 0) e.tiposImpacto = "!";
  }
  if (step === 3) {
    if (!f.sponsor.trim()) e.sponsor = "!";
  }
  return e;
}

const TOTAL_STEPS = 5;

export function NovaDemandaPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const L = useLabels();
  const me = useCurrentUser();
  const [step, setStep] = useState(0);
  // Restaura o rascunho salvo ("Save draft" — análise UX)
  const [form, setForm] = useState<DraftForm>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return { ...emptyDraft(), ...(JSON.parse(raw) as Partial<DraftForm>) };
    } catch { /* fresh */ }
    return emptyDraft();
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [areas, setAreas] = useState<AdminLookup[]>([]);
  const [sponsors, setSponsors] = useState<AdminLookup[]>([]);

  useEffect(() => {
    adminLookupService.listAreas().then(setAreas);
    adminLookupService.listSponsors().then(setSponsors);
  }, []);

  // Pré-preenche solicitante/email com a persona logada (quem abre a demanda).
  useEffect(() => {
    setForm((f) =>
      f.solicitante || f.email
        ? f
        : { ...f, solicitante: me.name, email: me.email },
    );
  }, [me.name, me.email]);

  const set = <K extends keyof DraftForm>(k: K, v: DraftForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  function next() {
    const errs = validateStep(step, form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  function saveDraft() {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    notifications.show({
      color: "abbott",
      title: "Draft saved",
      message: "You can come back and finish this request later.",
    });
  }

  async function submit() {
    const errs = { ...validateStep(0, form), ...validateStep(1, form), ...validateStep(2, form), ...validateStep(3, form) };
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      // volta para o primeiro step com erro
      for (let s = 0; s < TOTAL_STEPS - 1; s++) {
        if (Object.keys(validateStep(s, form)).length > 0) {
          setStep(s);
          return;
        }
      }
      return;
    }
    setSaving(true);
    try {
      const payload: DemandInput = {
        ...form,
        valorEstimado:
          typeof form.valorEstimado === "number" ? form.valorEstimado : null,
        roiEstimado: typeof form.roiEstimado === "number" ? form.roiEstimado : null,
        impactoAbrangencia: form.impactoAbrangencia,
        appId: form.appId,
        category: form.category,
        clasificacion: form.clasificacion,
        clasificacionOtro: form.clasificacion === "otro" ? form.clasificacionOtro : "",
        temSolucaoProposta: form.temSolucaoProposta,
        appName: appName(form.appId),
        rce: form.rce,
        esforcoEstimado: form.esforcoEstimado,
        // Capacity (time/horas) é definido pelo time técnico na Avaliação.
        time: "",
        horasEstimadas: 0,
      };
      const created = await demandService.create(payload);
      localStorage.removeItem(DRAFT_KEY); // rascunho consumido
      notifications.show({
        color: "teal",
        title: t("detail_created"),
        message: `${created.numero} — ${created.titulo}`,
      });
      navigate(`/demandas/${created.id}`);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Error",
        message: (err as Error).message,
      });
      setSaving(false);
    }
  }

  const areaOptions = areas.map((a) => a.nome);
  const sponsorOptions = sponsors.map((s) => s.nome);

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2}>{t("nova_title")}</Title>
          <Text c="dimmed" mt={4}>
            {t("nova_subtitle")}
          </Text>
        </div>
        <Group>
          <Button
            variant="light"
            leftSection={<IconDeviceFloppy size={17} />}
            onClick={saveDraft}
          >
            Save draft
          </Button>
          <Button
            variant="default"
            component={Link}
            to="/demandas"
            leftSection={<IconArrowLeft size={17} />}
          >
            {t("cancel")}
          </Button>
        </Group>
      </Group>

      <Card withBorder radius="lg" padding="xl">
        {/* Indicador claro de progresso (análise UX): "Step X of 5" + stepper maior */}
        <Group justify="space-between" mb="sm">
          <Badge size="lg" variant="light" color="abbott">
            Step {step + 1} of {TOTAL_STEPS}
          </Badge>
        </Group>
        <Stepper active={step} onStepClick={setStep} size="md" iconSize={40} mb="xl">
          <Stepper.Step label={t("step_basico")} />
          <Stepper.Step label={t("step_objetivo")} />
          <Stepper.Step label={t("step_impacto")} />
          <Stepper.Step label={t("step_escopo")} />
          <Stepper.Step label={t("step_compliance")} />
        </Stepper>

        {/* ============ Passo 1 — Informações Básicas ============ */}
        {step === 0 && (
          <Stack gap="md">
            <SectionTitle
              index={1}
              title={t("nova_section1")}
              help="A demand is any request for IT work: a new project, an enhancement, a fix. Describe the business need — IT expects the what and the why; the technical how comes later."
            />
            <TextInput
              label={t("nova_demand_title_label")}
              withAsterisk
              placeholder={t("nova_demand_title_placeholder")}
              value={form.titulo}
              error={errors.titulo}
              onChange={(e) => set("titulo", e.currentTarget.value)}
            />
            <Textarea
              label={t("nova_description_label")}
              withAsterisk
              autosize
              minRows={3}
              placeholder={t("nova_description_placeholder")}
              value={form.descricao}
              error={errors.descricao}
              onChange={(e) => set("descricao", e.currentTarget.value)}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label={t("nova_area_label")}
                withAsterisk
                placeholder={t("nova_area_placeholder")}
                data={areaOptions}
                searchable
                value={form.areaSolicitante || null}
                error={errors.areaSolicitante}
                onChange={(v) =>
                  setForm((f) => {
                    const area = v ?? "";
                    const auto = stakeholderDaArea(area);
                    // Preenche o stakeholder/sponsor automaticamente pela área
                    return { ...f, areaSolicitante: area, sponsor: auto || f.sponsor };
                  })
                }
                nothingFoundMessage={t("nova_area_notFound")}
              />
              <TextInput
                label={t("nova_solicitante_label")}
                withAsterisk
                value={form.solicitante}
                error={errors.solicitante}
                onChange={(e) => set("solicitante", e.currentTarget.value)}
              />
              <TextInput
                label={t("nova_email_label")}
                withAsterisk
                type="email"
                value={form.email}
                error={errors.email}
                onChange={(e) => set("email", e.currentTarget.value)}
              />
              <TextInput
                label={t("nova_phone_label")}
                placeholder={t("nova_phone_placeholder")}
                value={form.telefone}
                onChange={(e) => set("telefone", e.currentTarget.value)}
              />
            </SimpleGrid>
          </Stack>
        )}

        {/* ============ Passo 2 — Objetivo & Justificativa + Tipo ============ */}
        {step === 1 && (
          <Stack gap="md">
            <SectionTitle index={2} title={t("nova_section2")} />
            <Textarea
              label={t("nova_problem_label")}
              withAsterisk
              autosize
              minRows={2}
              value={form.problemaResolve}
              error={errors.problemaResolve}
              onChange={(e) => set("problemaResolve", e.currentTarget.value)}
            />
            <Textarea
              label={t("nova_objective_label")}
              withAsterisk
              autosize
              minRows={2}
              value={form.objetivoPrincipal}
              error={errors.objetivoPrincipal}
              onChange={(e) => set("objetivoPrincipal", e.currentTarget.value)}
            />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Textarea
                label={t("nova_processes_label")}
                autosize
                minRows={2}
                value={form.processosImpactados}
                onChange={(e) => set("processosImpactados", e.currentTarget.value)}
              />
              <MultiSelect
                label={t("nova_consequence_label")}
                description="Guided evaluation — pick what happens if this is not executed"
                data={CONSEQUENCE_OPTIONS}
                value={form.consequenciaNaoExecucao ? form.consequenciaNaoExecucao.split("; ").filter((x) => CONSEQUENCE_OPTIONS.includes(x)) : []}
                onChange={(v) => set("consequenciaNaoExecucao", v.join("; "))}
              />
            </SimpleGrid>

            <SectionTitle index={3} title={t("nova_section3")} />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Select
                label="Category"
                description="SPM classification"
                withAsterisk
                data={categoryOptions}
                allowDeselect={false}
                value={form.category}
                onChange={(v) => v && set("category", v)}
              />
              <TextInput label="Type" value="Project" readOnly description="Every demand is a Project" />
              <Select
                label={t("nova_category")}
                withAsterisk
                data={tipoOptions.map((o) => ({ value: String(o.value), label: L.tipo[o.value] }))}
                allowDeselect={false}
                value={String(form.tipo)}
                onChange={(v) => v && set("tipo", Number(v))}
              />
            </SimpleGrid>
            <Group align="flex-end" grow>
              <Select
                label="Project classification"
                description="Infrastructure (Sambini) · Artificial Intelligence · Applications (Gabriela) · Other"
                withAsterisk
                data={clasificacionOptions}
                allowDeselect={false}
                value={form.clasificacion}
                onChange={(v) => v && set("clasificacion", v)}
              />
              {form.clasificacion === "otro" && (
                <TextInput
                  label="Specify"
                  placeholder="Classification not listed"
                  value={form.clasificacionOtro}
                  onChange={(e) => set("clasificacionOtro", e.currentTarget.value)}
                />
              )}
            </Group>
          </Stack>
        )}

        {/* ============ Passo 3 — Impacto + Urgência ============ */}
        {step === 2 && (
          <Stack gap="md">
            <SectionTitle index={4} title={t("nova_section4")} />
            <Select
              label="How far does this request reach?"
              description="Automatically sets the 'Business Impact' score criterion — no need to score it."
              withAsterisk
              data={abrangenciaOptions.map((o) => ({ value: String(o.value), label: o.label }))}
              allowDeselect={false}
              value={String(form.impactoAbrangencia)}
              onChange={(v) => v && set("impactoAbrangencia", Number(v))}
            />
            <Alert color="blue" variant="light">
              <Text size="sm">
                Business Impact (automatic):{" "}
                <strong>{ABRANGENCIA_SCORE[form.impactoAbrangencia]} / 5</strong> — 25% weight in the score.
              </Text>
            </Alert>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label={t("nova_impactLevel")}
                description="Qualitative perception (not part of the score)"
                withAsterisk
                data={impactoOptions.map((o) => ({ value: String(o.value), label: L.impacto[o.value] }))}
                allowDeselect={false}
                value={String(form.impactoNivel)}
                onChange={(v) => v && set("impactoNivel", Number(v))}
              />
              <Select
                label="Expected economic benefit"
                description="Pick a range — also drives the delivery process (Phase 0 / RAPID / ME)"
                clearable
                data={VALUE_RANGES.map((r) => ({ value: String(r.value), label: r.label }))}
                value={typeof form.valorEstimado === "number" ? String(form.valorEstimado) : null}
                onChange={(v) => set("valorEstimado", v ? Number(v) : "")}
              />
            </SimpleGrid>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <MultiSelect
                label={t("nova_impactTypes_label")}
                withAsterisk
                data={tipoImpactoOptions.map((o) => ({
                  value: String(o.value),
                  label: L.tipoImpacto[o.value],
                }))}
                value={form.tiposImpacto.map(String)}
                error={errors.tiposImpacto}
                onChange={(v) => set("tiposImpacto", v.map(Number))}
              />
              <NumberInput
                label="Estimated ROI (%)"
                description="Expected return on investment (optional)"
                min={0}
                max={100000}
                suffix="%"
                value={form.roiEstimado}
                onChange={(v) => set("roiEstimado", typeof v === "number" ? v : "")}
              />
            </SimpleGrid>
            {/* RCE capturado no intake (análise UX) — o solicitante conhece o número */}
            <TextInput
              label="RCE — project no. approved by Management"
              description="Shown as informational in the approval flow"
              placeholder="e.g.: RCE-2026-0099"
              maw={360}
              value={form.rce}
              onChange={(e) => set("rce", e.currentTarget.value)}
            />

            <SectionTitle index={5} title={t("nova_section5")} />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label={t("nova_urgency")}
                withAsterisk
                data={urgenciaOptions.map((o) => ({ value: String(o.value), label: L.urgencia[o.value] }))}
                allowDeselect={false}
                value={String(form.urgencia)}
                onChange={(v) => v && set("urgencia", Number(v))}
              />
              <DateInput
                label={t("nova_deadline")}
                valueFormat="DD/MM/YYYY"
                clearable
                placeholder={t("nova_deadline_placeholder")}
                value={form.deadline || null}
                onChange={(v) => set("deadline", v ?? "")}
              />
            </SimpleGrid>

            <SectionTitle index={9} title={t("nova_section9")} />
            <Alert color="gray" variant="light" mb="xs">
              <Text size="sm">
                Effort, team and hours (capacity) are defined by the technical team in the
                Evaluation stage. It's optional here — fill it in only if you have an idea.
              </Text>
            </Alert>
            <Select
              label={t("nova_effort")}
              description="Optional — requester's estimate"
              clearable
              maw={340}
              data={esforcoOptions.map((o) => ({ value: String(o.value), label: L.esforco[o.value] }))}
              value={form.esforcoEstimado != null ? String(form.esforcoEstimado) : null}
              onChange={(v) => set("esforcoEstimado", v ? Number(v) : null)}
            />
          </Stack>
        )}

        {/* ============ Passo 4 — Escopo + Stakeholders ============ */}
        {step === 3 && (
          <Stack gap="md">
            <SectionTitle index={6} title={t("nova_section6")} />
            <Alert color="gray" variant="light">
              <Text size="sm">
                This section is optional. If you don't know the technical details,
                leave it blank — the technical team completes it during the Evaluation.
              </Text>
            </Alert>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <MultiSelect
                label="Affected applications"
                description="Search by code or name"
                searchable
                data={Object.entries(APP_REGISTRY).map(([code, name]) => ({
                  value: code,
                  label: `${code} — ${name}`,
                }))}
                value={form.sistemasEnvolvidos ? form.sistemasEnvolvidos.split("; ").filter((x) => APP_REGISTRY[x]) : []}
                onChange={(v) => set("sistemasEnvolvidos", v.join("; "))}
              />
              <Textarea
                label={t("nova_integrations_label")}
                autosize
                minRows={2}
                value={form.integracoesNecessarias}
                onChange={(e) => set("integracoesNecessarias", e.currentTarget.value)}
              />
              <Textarea
                label={t("nova_reqs_label")}
                autosize
                minRows={2}
                value={form.requisitosPrincipais}
                onChange={(e) => set("requisitosPrincipais", e.currentTarget.value)}
              />
              <div>
                <Checkbox
                  label="Is there already a proposed solution?"
                  checked={form.temSolucaoProposta}
                  onChange={(e) => set("temSolucaoProposta", e.currentTarget.checked)}
                />
                {form.temSolucaoProposta && (
                  <Textarea
                    mt="xs"
                    label={t("nova_solution_label")}
                    autosize
                    minRows={2}
                    placeholder="Describe the proposed solution..."
                    value={form.solucaoProposta}
                    onChange={(e) => set("solucaoProposta", e.currentTarget.value)}
                  />
                )}
              </div>
            </SimpleGrid>

            <TextInput
              label="APP ID (application code)"
              description={
                appName(form.appId)
                  ? `Application: ${appName(form.appId)}`
                  : "For system demands — the name appears automatically (e.g.: APP-0456)"
              }
              placeholder="e.g.: APP-0456"
              maw={360}
              value={form.appId}
              onChange={(e) => set("appId", e.currentTarget.value)}
            />

            <SectionTitle index={7} title={t("nova_section7")} />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Select
                label={t("nova_sponsor")}
                description="Filled in automatically based on the area"
                withAsterisk
                data={sponsorOptions}
                searchable
                value={form.sponsor || null}
                error={errors.sponsor}
                onChange={(v) => set("sponsor", v ?? "")}
                nothingFoundMessage={t("nova_area_notFound")}
              />
              <TextInput
                label={t("nova_processOwner")}
                value={form.donoProcesso}
                onChange={(e) => set("donoProcesso", e.currentTarget.value)}
              />
              <MultiSelect
                label={t("nova_areasInvolved")}
                description="Multiple selection"
                data={AFFECTED_AREAS}
                value={form.areasEnvolvidas ? form.areasEnvolvidas.split("; ").filter((x) => AFFECTED_AREAS.includes(x)) : []}
                onChange={(v) => set("areasEnvolvidas", v.join("; "))}
              />
            </SimpleGrid>
          </Stack>
        )}

        {/* ============ Passo 5 — Compliance + Resumo ============ */}
        {step === 4 && (
          <Stack gap="md">
            <SectionTitle index={8} title={t("nova_section8")} />
            <Stack gap="xs">
              <Checkbox
                label={t("nova_pii")}
                checked={form.dadosSensiveis}
                onChange={(e) => set("dadosSensiveis", e.currentTarget.checked)}
              />
              <Checkbox
                label={t("nova_security")}
                checked={form.impactaSeguranca}
                onChange={(e) => set("impactaSeguranca", e.currentTarget.checked)}
              />
              <Checkbox
                label={t("nova_audit")}
                checked={form.requerAuditoria}
                onChange={(e) => set("requerAuditoria", e.currentTarget.checked)}
              />
            </Stack>

            <SectionTitle index={10} title={t("nova_section10")} />
            <Paper withBorder radius="md" p="md" bg="gray.0">
              <Text size="sm" c="dimmed">
                {t("nova_files_help")}
              </Text>
            </Paper>

            {/* ---- Resumo estruturado antes de enviar (análise UX): seções
                 GENERAL / PRIORITIZATION / CLASSIFICATION com [Edit] rápido ---- */}
            <SectionTitle index={11} title="Review before submitting" />
            <Paper withBorder radius="md" p="md">
              <Stack gap="md">
                <SummarySection title="GENERAL INFORMATION" onEdit={() => setStep(0)}>
                  <Resumo k="Title" v={form.titulo || "—"} />
                  <Resumo k="Requester" v={`${form.solicitante || "—"} · ${form.email || "—"}`} />
                  <Resumo k="Area" v={form.areaSolicitante || "—"} />
                  <Resumo k="Sponsor (auto)" v={form.sponsor || "—"} />
                </SummarySection>
                <SummarySection title="PRIORITIZATION" onEdit={() => setStep(2)}>
                  <Resumo k="Impact" v={`${ABRANGENCIA_SCORE[form.impactoAbrangencia]}/5 (${abrangenciaOptions.find((o) => String(o.value) === String(form.impactoAbrangencia))?.label ?? "—"})`} />
                  <Resumo k="Urgency" v={L.urgencia[form.urgencia]} />
                  <Resumo k="Value" v={typeof form.valorEstimado === "number" ? (VALUE_RANGES.find((r) => r.value === form.valorEstimado)?.label ?? `US$ ${form.valorEstimado.toLocaleString()}`) : "—"} />
                  <Resumo k="ROI" v={typeof form.roiEstimado === "number" ? `${form.roiEstimado}%` : "—"} />
                  <Resumo k="RCE" v={form.rce || "—"} />
                </SummarySection>
                <SummarySection title="CLASSIFICATION" onEdit={() => setStep(1)}>
                  <Resumo k="Type" v={L.tipo[form.tipo]} />
                  <Resumo k="Category" v={categoryOptions.find((o) => o.value === form.category)?.label ?? "—"} />
                  <Resumo k="Project classification" v={form.clasificacion === "otro" ? (form.clasificacionOtro || "Other") : (clasificacionOptions.find((o) => o.value === form.clasificacion)?.label ?? "—")} />
                  <Resumo k="APP ID" v={form.appId ? `${form.appId}${appName(form.appId) ? ` — ${appName(form.appId)}` : ""}` : "—"} />
                </SummarySection>
                <SummarySection title="STAKEHOLDERS" onEdit={() => setStep(3)}>
                  <Resumo k="Process owner" v={form.donoProcesso || "—"} />
                  <Resumo k="Areas involved" v={form.areasEnvolvidas || "—"} />
                  <Resumo k="Affected apps" v={form.sistemasEnvolvidos || "—"} />
                </SummarySection>
              </Stack>
            </Paper>

            <Alert color="abbott" icon={<IconRocket size={18} />}>
              <Text fw={600} mb={4}>
                {t("nova_ready_title")}
              </Text>
              <Text size="sm">{t("nova_ready_help")}</Text>
            </Alert>
          </Stack>
        )}

        <Group justify="space-between" mt="xl">
          <Button
            variant="default"
            disabled={step === 0}
            leftSection={<IconArrowLeft size={16} />}
            onClick={prev}
          >
            {t("previous")}
          </Button>
          {step < TOTAL_STEPS - 1 ? (
            <Button rightSection={<IconArrowRight size={16} />} onClick={next}>
              {t("next")}
            </Button>
          ) : (
            <Button
              color="teal"
              leftSection={<IconChecks size={17} />}
              loading={saving}
              onClick={submit}
            >
              {t("nova_createBtn")}
            </Button>
          )}
        </Group>
      </Card>

      {Object.keys(errors).length > 0 && (
        <Alert color="orange" icon={<IconAlertTriangle size={18} />}>
          {t("nova_errorsHint")}{" "}
          <Anchor onClick={() => setStep(0)} size="sm">
            {t("nova_goBack")}
          </Anchor>
        </Alert>
      )}
    </Stack>
  );
}

function SummarySection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Group justify="space-between" mb={6}>
        <Text size="xs" fw={800} lts={1} c="abbott.7">
          {title}
        </Text>
        <Button size="compact-xs" variant="subtle" onClick={onEdit}>
          Edit
        </Button>
      </Group>
      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs" verticalSpacing={6}>
        {children}
      </SimpleGrid>
    </div>
  );
}

function Resumo({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed" fw={600} tt="uppercase" lts={0.5}>
        {k}
      </Text>
      <Text size="sm">{v}</Text>
    </div>
  );
}

function SectionTitle({ index, title, help }: { index: number; title: string; help?: string }) {
  return (
    <Group gap={8}>
      <Text c="abbott.6" fw={800} fz="lg" w={26} ta="right">
        {index}.
      </Text>
      <Text fw={700} fz="lg">
        {title}
      </Text>
      {help && (
        <Tooltip label={help} multiline maw={320} withArrow>
          <Text component="span" c="dimmed" style={{ display: "inline-flex", cursor: "help" }}>
            <IconHelpCircle size={18} />
          </Text>
        </Tooltip>
      )}
    </Group>
  );
}
