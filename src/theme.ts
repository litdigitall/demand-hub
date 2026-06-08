import { createTheme, type MantineColorsTuple } from "@mantine/core";

/* Escala da marca Abbott — Primary Blue #007ACC no índice 6,
   Medium Blue #004982 no índice 9. */
const abbott: MantineColorsTuple = [
  "#e6f3fb",
  "#cde6f5",
  "#99cdeb",
  "#66b3e0",
  "#3399d6",
  "#1a88d1",
  "#007acc",
  "#006bb3",
  "#005c99",
  "#004982",
];

export const theme = createTheme({
  primaryColor: "abbott",
  primaryShade: 6,
  colors: { abbott },
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "700",
  },
  defaultRadius: "md",
  cursorType: "pointer",
});
