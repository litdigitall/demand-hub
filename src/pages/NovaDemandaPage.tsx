import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Alert,
  Anchor,
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
  IconRocket,
} from "@tabler/icons-react";
import { adminLookupService, demandService } from "../data/demandService";
import {
  Impacto,
  TipoDemanda,
  Urgencia,
  esforcoOptions,
  impactoOptions,
  tipoImpactoOptions,
  tipoOptions,
  urgenciaOptions,
  type AdminLookup,
  type DemandInput,
} from "../data/types";
import { useCurrentUser } from "../lib/useCurrentUser";
import { useT } from "../i18n";
import { useLabels } from "../i18n/useLabels";

/* O formulário do solicitante NÃO coleta time/horas (capacity) — isso é
   definido pelo time técnico na etapa de Avaliação. Esforço é opcional. */
type DraftForm = Omit<
  DemandInput,
  "valorEstimado" | "esforcoEstimado" | "horasEstimadas" | "time"
> & {
  valorEstimado: number | "";
  esforcoEstimado: number | null;
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
    impactoNivel: Impacto.Medio,
    tiposImpacto: [],
    valorEstimado: "",
    esforcoEstimado: null,
    urgencia: Urgencia.Medio,
    deadline: "",
    sistemasEnvolvidos: "",
    integracoesNecessarias: "",
    requisitosPrincipais: "",
    solucaoProposta: "",
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
  const [form, setForm] = useState<DraftForm>(emptyDraft());
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
        esforcoEstimado: form.esforcoEstimado,
        // Capacity (time/horas) é definido pelo time técnico na Avaliação.
        time: "",
        horasEstimadas: 0,
      };
      const created = await demandService.create(payload);
      notifications.show({
        color: "teal",
        title: t("detail_created"),
        message: `${created.numero} — ${created.titulo}`,
      });
      navigate(`/demandas/${created.id}`);
    } catch (err) {
      notifications.show({
        color: "red",
        title: "Erro",
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
        <Button
          variant="default"
          component={Link}
          to="/demandas"
          leftSection={<IconArrowLeft size={17} />}
        >
          {t("cancel")}
        </Button>
      </Group>

      <Card withBorder radius="lg" padding="xl">
        <Stepper active={step} onStepClick={setStep} size="sm" iconSize={32} mb="xl">
          <Stepper.Step label={t("step_basico")} />
          <Stepper.Step label={t("step_objetivo")} />
          <Stepper.Step label={t("step_impacto")} />
          <Stepper.Step label={t("step_escopo")} />
          <Stepper.Step label={t("step_compliance")} />
        </Stepper>

        {/* ============ Passo 1 — Informações Básicas ============ */}
        {step === 0 && (
          <Stack gap="md">
            <SectionTitle index={1} title={t("nova_section1")} />
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
                onChange={(v) => set("areaSolicitante", v ?? "")}
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
              <Textarea
                label={t("nova_consequence_label")}
                autosize
                minRows={2}
                value={form.consequenciaNaoExecucao}
                onChange={(e) => set("consequenciaNaoExecucao", e.currentTarget.value)}
              />
            </SimpleGrid>

            <SectionTitle index={3} title={t("nova_section3")} />
            <Select
              label={t("nova_category")}
              withAsterisk
              data={tipoOptions.map((o) => ({ value: String(o.value), label: L.tipo[o.value] }))}
              allowDeselect={false}
              value={String(form.tipo)}
              onChange={(v) => v && set("tipo", Number(v))}
            />
          </Stack>
        )}

        {/* ============ Passo 3 — Impacto + Urgência ============ */}
        {step === 2 && (
          <Stack gap="md">
            <SectionTitle index={4} title={t("nova_section4")} />
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Select
                label={t("nova_impactLevel")}
                withAsterisk
                data={impactoOptions.map((o) => ({ value: String(o.value), label: L.impacto[o.value] }))}
                allowDeselect={false}
                value={String(form.impactoNivel)}
                onChange={(v) => v && set("impactoNivel", Number(v))}
              />
              <NumberInput
                label={t("nova_valueLabel")}
                decimalScale={0}
                thousandSeparator="."
                decimalSeparator=","
                value={form.valorEstimado}
                onChange={(v) => set("valorEstimado", typeof v === "number" ? v : "")}
              />
            </SimpleGrid>
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
                Esforço, time e horas (capacity) são definidos pelo time técnico na
                etapa de Avaliação. Aqui é opcional — preencha só se tiver uma noção.
              </Text>
            </Alert>
            <Select
              label={t("nova_effort")}
              description="Opcional — estimativa do solicitante"
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
                Esta seção é opcional. Se você não conhece os detalhes técnicos,
                deixe em branco — o time técnico complementa durante a Avaliação.
              </Text>
            </Alert>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Textarea
                label={t("nova_systems_label")}
                autosize
                minRows={2}
                value={form.sistemasEnvolvidos}
                onChange={(e) => set("sistemasEnvolvidos", e.currentTarget.value)}
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
              <Textarea
                label={t("nova_solution_label")}
                autosize
                minRows={2}
                placeholder={t("nova_solution_placeholder")}
                value={form.solucaoProposta}
                onChange={(e) => set("solucaoProposta", e.currentTarget.value)}
              />
            </SimpleGrid>

            <SectionTitle index={7} title={t("nova_section7")} />
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
              <Select
                label={t("nova_sponsor")}
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
              <TextInput
                label={t("nova_areasInvolved")}
                placeholder={t("nova_areasInvolved_placeholder")}
                value={form.areasEnvolvidas}
                onChange={(e) => set("areasEnvolvidas", e.currentTarget.value)}
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

function SectionTitle({ index, title }: { index: number; title: string }) {
  return (
    <Group gap={8}>
      <Text c="abbott.6" fw={800} fz="lg" w={26} ta="right">
        {index}.
      </Text>
      <Text fw={700} fz="lg">
        {title}
      </Text>
    </Group>
  );
}
