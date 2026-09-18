/* ============================================================
   perfilService.demo.ts
   ------------------------------------------------------------
   Vite usa este arquivo no lugar de perfilService.ts quando
   VITE_DEMO_MODE=true. Assim o build do GitHub Pages não importa o
   serviço gerado do Dataverse (que depende do SDK e de .power/schemas).
   ============================================================ */
export type { Perfil, PerfilService } from "./perfilBase";
export { papeisDe, frentesDe } from "./perfilBase";
export { demoPerfilService as perfilService } from "./perfilBase";
