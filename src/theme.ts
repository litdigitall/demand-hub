import { createTheme, type MantineColorsTuple } from "@mantine/core";

/* Filtro de combobox à prova de `search`/`label` indefinidos.
   Substitui o defaultOptionsFilter do Mantine, que faz
   `search.toLowerCase()` e quebra quando search vem undefined
   (Select/MultiSelect/Autocomplete com `searchable`). */
type AnyOption = { label?: string; items?: AnyOption[] } & Record<string, unknown>;
function safeOptionsFilter(input: { options: AnyOption[]; search: string }): AnyOption[] {
  const s = (input.search ?? "").toLowerCase().trim();
  const walk = (items: AnyOption[]): AnyOption[] =>
    items.reduce<AnyOption[]>((acc, item) => {
      if (item && Array.isArray(item.items)) {
        const inner = walk(item.items);
        if (inner.length) acc.push({ ...item, items: inner });
      } else {
        const label = String(item?.label ?? "").toLowerCase();
        if (!s || label.includes(s)) acc.push(item);
      }
      return acc;
    }, []);
  return walk(input.options ?? []);
}

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

/* Acento vibrante (violeta) para gradientes / realces. */
const grape: MantineColorsTuple = [
  "#f5edff", "#e7d6ff", "#cbadff", "#ad80ff", "#935bff",
  "#8443ff", "#7c35ff", "#6a27e6", "#5e21cd", "#5018b5",
];

export const theme = createTheme({
  primaryColor: "abbott",
  primaryShade: 6,
  colors: { abbott, grape },
  autoContrast: true,
  luminanceThreshold: 0.35,
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  headings: {
    fontFamily: "Inter, system-ui, sans-serif",
    fontWeight: "800",
    sizes: {
      h1: { fontWeight: "800", fontSize: "2rem", lineHeight: "1.15" },
      h2: { fontWeight: "800", fontSize: "1.6rem", lineHeight: "1.2" },
    },
  },
  defaultRadius: "lg",
  defaultGradient: { from: "abbott.7", to: "grape.6", deg: 60 },
  cursorType: "pointer",
  shadows: {
    xs: "0 1px 3px rgba(16,24,40,.06), 0 1px 2px rgba(16,24,40,.04)",
    sm: "0 2px 8px rgba(16,24,40,.06)",
    md: "0 8px 24px rgba(16,24,40,.08)",
    lg: "0 16px 40px rgba(16,24,40,.10)",
    xl: "0 24px 60px rgba(16,24,40,.14)",
  },
  components: {
    Card: { defaultProps: { shadow: "sm", radius: "lg" } },
    Paper: { defaultProps: { radius: "lg" } },
    Button: { defaultProps: { radius: "md" } },
    Modal: { defaultProps: { radius: "lg", centered: true, overlayProps: { blur: 3, backgroundOpacity: 0.5 } } },
    Badge: { defaultProps: { radius: "sm" } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Select: { defaultProps: { filter: safeOptionsFilter as any } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MultiSelect: { defaultProps: { filter: safeOptionsFilter as any } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Autocomplete: { defaultProps: { filter: safeOptionsFilter as any } },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TagsInput: { defaultProps: { filter: safeOptionsFilter as any } },
  },
});
