/* ============================================================
   demandService.demo.ts
   ------------------------------------------------------------
   Vite faz alias deste arquivo no lugar de demandService.ts quando
   VITE_DEMO_MODE=true. Assim o build do GitHub Pages NÃO importa
   o dataverseDemandService (que depende do Power Apps SDK).
   ============================================================ */
export type { DemandService } from "./types";
export { mockDemandService as demandService } from "./mockDemandService";
export { adminLookupService } from "./adminLookupService";
