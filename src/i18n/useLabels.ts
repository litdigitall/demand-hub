/* Hook que devolve os dicionários traduzidos dos enums de domínio.
   Útil pra renderizar StatusBadge, TipoBadge etc no idioma corrente. */
import { useT } from ".";
import {
  EsforcoEstimado,
  Impacto,
  StatusDemanda,
  TipoDemanda,
  TipoImpacto,
  Urgencia,
} from "../data/types";

export function useLabels() {
  const { t } = useT();
  return {
    status: {
      [StatusDemanda.Nova]: t("status_nova"),
      [StatusDemanda.EmAnalise]: t("status_emAnalise"),
      [StatusDemanda.Priorizada]: t("status_priorizada"),
      [StatusDemanda.EmExecucao]: t("status_emExecucao"),
      [StatusDemanda.Concluida]: t("status_concluida"),
      [StatusDemanda.Recusada]: t("status_recusada"),
    } as Record<number, string>,
    tipo: {
      [TipoDemanda.ProjetoNovo]: t("tipo_projeto"),
      [TipoDemanda.MelhoriaSistema]: t("tipo_melhoria"),
      [TipoDemanda.CorrecaoBug]: t("tipo_bug"),
      [TipoDemanda.Compliance]: t("tipo_compliance"),
      [TipoDemanda.Infraestrutura]: t("tipo_infra"),
      [TipoDemanda.Seguranca]: t("tipo_seguranca"),
      [TipoDemanda.Automacao]: t("tipo_automacao"),
    } as Record<number, string>,
    impacto: {
      [Impacto.Alto]: t("impacto_alto"),
      [Impacto.Medio]: t("impacto_medio"),
      [Impacto.Baixo]: t("impacto_baixo"),
    } as Record<number, string>,
    tipoImpacto: {
      [TipoImpacto.Receita]: t("ti_receita"),
      [TipoImpacto.ReducaoCustos]: t("ti_custos"),
      [TipoImpacto.Eficiencia]: t("ti_eficiencia"),
      [TipoImpacto.Risco]: t("ti_risco"),
      [TipoImpacto.ExperienciaCliente]: t("ti_cx"),
    } as Record<number, string>,
    urgencia: {
      [Urgencia.Critico]: t("urg_critico"),
      [Urgencia.Alto]: t("urg_alto"),
      [Urgencia.Medio]: t("urg_medio"),
      [Urgencia.Baixo]: t("urg_baixo"),
    } as Record<number, string>,
    esforco: {
      [EsforcoEstimado.Pequeno]: t("esf_pequeno"),
      [EsforcoEstimado.Medio]: t("esf_medio"),
      [EsforcoEstimado.Grande]: t("esf_grande"),
    } as Record<number, string>,
    nivelAprovacao: {
      sponsor: t("niv_sponsor"),
      techlead: t("niv_techlead"),
      diretor: t("niv_diretor"),
    } as Record<string, string>,
  };
}
