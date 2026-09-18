/* Fonte ÚNICA dos rótulos de enum da UI.
   Os mapas moram em data/types.ts (mesmo lugar dos valores do Dataverse), então
   badge, filtro e relatório nunca divergem — antes havia um segundo dicionário
   aqui que não conhecia Draft/Approval/Returned e deixava buracos na UI. */
import {
  esforcoLabel,
  impactoLabel,
  nivelAprovacaoLabelEN,
  statusLabel,
  tipoImpactoLabel,
  tipoLabel,
  urgenciaLabel,
} from "../data/types";

export function useLabels() {
  return {
    status: statusLabel,
    tipo: tipoLabel,
    impacto: impactoLabel,
    tipoImpacto: tipoImpactoLabel,
    urgencia: urgenciaLabel,
    esforco: esforcoLabel,
    nivelAprovacao: nivelAprovacaoLabelEN,
  };
}
