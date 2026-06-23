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
  components: {
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
