/* ============================================================
   demandService — ponto único de acesso a dados.
   ------------------------------------------------------------
   - Dev local (npm run dev): usa mockDemandService (localStorage).
   - App publicado (build de produção): usa Dataverse real.
   ============================================================ */
import type { DemandService } from "./types";
import { mockDemandService } from "./mockDemandService";
import { dataverseDemandService } from "./dataverseDemandService";

export type { DemandService } from "./types";
export { adminLookupService } from "./adminLookupService";

const FORCE_DATAVERSE = false;

export const demandService: DemandService =
  FORCE_DATAVERSE || import.meta.env.PROD
    ? dataverseDemandService
    : mockDemandService;
