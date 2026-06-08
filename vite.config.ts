import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { powerApps } from "@microsoft/power-apps-vite/plugin";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// VITE_DEMO_MODE=true ativa o build standalone (GitHub Pages):
//   - usa base relativa (funciona em qualquer subpath)
//   - desliga o plugin Power Apps
//   - troca demandService.ts pelo demandService.demo.ts (força mock)
const isDemo = process.env.VITE_DEMO_MODE === "true";

export default defineConfig({
  base: isDemo ? "./" : "/",
  plugins: [react(), ...(isDemo ? [] : [powerApps()])],
  resolve: {
    alias: isDemo
      ? [
          {
            find: path.resolve(__dirname, "src/data/demandService.ts"),
            replacement: path.resolve(
              __dirname,
              "src/data/demandService.demo.ts",
            ),
          },
        ]
      : [],
  },
  define: {
    __DEMO_MODE__: JSON.stringify(isDemo),
  },
  build: {
    // Quebra os vendors em chunks separados — main fica leve, primeiro paint
    // muito mais rápido. O browser carrega só o que a rota precisa.
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
