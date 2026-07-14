# Deploy to Power Apps (Code App) — commands to run

> The GitHub Pages demo keeps working normally. This is the **Power Apps** target.
> These steps require an **interactive login to your Abbott tenant** — run them
> yourself in a terminal (they can't be run from an automated session).

App is a **Power Apps Code App** — see `power.config.json`:
- App: **Demand Hub** (`785908fe-958b-43fa-87fc-0ba475bdba81`)
- Environment: `aa9aa103-53ae-e549-8f11-8e79e2d2bfec` (region: prod)
- Dataverse table: `ardx_demanda` (`ardx_demandas`)

## 1. Install the Power Platform CLI (once)
```powershell
# Standalone MSI/winget:
winget install Microsoft.PowerPlatformCLI
# or as a .NET global tool:
dotnet tool install --global Microsoft.PowerApps.CLI.Tool
pac install latest
```

## 2. Authenticate to the environment (interactive)
```powershell
pac auth create --environment aa9aa103-53ae-e549-8f11-8e79e2d2bfec
pac auth list         # confirm the active profile points to that environment
```

## 3. Build the REAL app (Dataverse, not the demo)
```powershell
npm install
npm run build         # tsc -b && vite build  ->  ./dist  (uses @microsoft/power-apps SDK)
```
> `npm run build:demo` is the mock-only GitHub Pages build. For Power Apps use `npm run build` (outputs to `./dist`, the `buildPath` in power.config.json).

## 4. Push to Power Apps
```powershell
pac code push
```
This uploads `./dist` to the Demand Hub Code App in the configured environment.
Open it from **make.powerapps.com → Apps → Demand Hub**, or `pac code run` for local test against Dataverse.

## Notes
- If `pac code push` reports a missing/renamed data source, run `pac code add-data-source` or re-check `databaseReferences` in `power.config.json`.
- The current demo uses mock data (localStorage). In Power Apps the app talks to the `ardx_demanda` table via the generated Dataverse service (`src/data/dataverseDemandService.ts`).
- New model fields added in the demo (category, clasificacion, rce, appId, criticality, abbottProjectType, etc.) must exist as **columns** on `ardx_demanda` in Dataverse before they persist — otherwise they are ignored by the Dataverse service. See `dataverse/schema-info.json`.
