import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDemo = process.env.VITE_DEMO_MODE === "true";

// Plugin que substitui src/data/demandService.ts por demandService.demo.ts
// no modo demo. Independente de qual import path foi usado, garante que o
// módulo resolvido é o demo (sem dependência do SDK Power Apps / generated).
function demoSwapPlugin(): Plugin {
  const target = path.resolve(__dirname, "src/data/demandService.ts");
  const replacement = path.resolve(__dirname, "src/data/demandService.demo.ts");
  return {
    name: "demand-system:demo-swap",
    enforce: "pre",
    async resolveId(source, importer) {
      // Tenta resolver normalmente, depois compara o path final
      if (!importer) return null;
      const resolved = await this.resolve(source, importer, { skipSelf: true });
      if (!resolved) return null;
      const id = resolved.id.split("?")[0];
      if (path.normalize(id) === path.normalize(target)) {
        return replacement;
      }
      return null;
    },
  };
}

export default defineConfig({
  base: isDemo ? "./" : "/",
  plugins: [
    react(),
    ...(isDemo ? [demoSwapPlugin()] : [powerApps()]),
  ],
  define: {
    __DEMO_MODE__: JSON.stringify(isDemo),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-dom") || id.includes("/react/") || id.includes("react-router")) {
            return "react";
          }
          if (id.includes("@mantine/charts") || id.includes("recharts")) {
            return "charts";
          }
          if (id.includes("@mantine/")) return "mantine";
          if (id.includes("@dnd-kit/")) return "dnd";
          if (id.includes("@tabler/icons-react")) return "icons";
          return undefined;
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
});
