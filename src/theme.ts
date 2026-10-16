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
  /* xxl: monitor de 1700px+. O app é de uso desktop, e entre 1408 e 1920 há
     espaço para mais duas colunas sem espremer o título. */
  breakpoints: { xs: "36em", sm: "48em", md: "62em", lg: "75em", xl: "88em", xxl: "106.25em" },
  primaryColor: "abbott",
  primaryShade: 6,
  colors: { abbott, grape },
  autoContrast: true,
  luminanceThreshold: 0.35,
  fontFamily:
    "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
  /* 14px de base. Interface de trabalho se lê em corpo pequeno e linha curta;
     16px é tamanho de texto corrido, não de tabela. */
  fontSizes: {
    xs: "0.6875rem",  // 11 — rótulos de coluna
    sm: "0.8125rem",  // 13 — texto secundário
    md: "0.875rem",   // 14 — base
    lg: "1rem",       // 16
    xl: "1.125rem",   // 18
  },
  lineHeights: { xs: "1.4", sm: "1.45", md: "1.5", lg: "1.5", xl: "1.45" },
  headings: {
    fontFamily: "Inter, system-ui, sans-serif",
    /* 800 com tracking neutro dá ar de cartaz. Título de produto é 600 com
       tracking negativo: lê compacto e preciso. */
    fontWeight: "600",
    sizes: {
      h1: { fontWeight: "600", fontSize: "1.5rem", lineHeight: "1.25" },
      h2: { fontWeight: "600", fontSize: "1.25rem", lineHeight: "1.3" },
      h3: { fontWeight: "600", fontSize: "1rem", lineHeight: "1.35" },
    },
  },
  /* xl nao e um raio de caixa: neste app so aparece em avatar, ThemeIcon e
     barra de progresso, que precisam ser circulo/pilula. */
  radius: { xs: "4px", sm: "6px", md: "8px", lg: "10px", xl: "999px" },
  defaultRadius: "md",
  defaultGradient: { from: "abbott.7", to: "grape.6", deg: 60 },
  cursorType: "pointer",
  /* Hierarquia por fio de 1px, não por elevação. Sombra fica só para o que
     de fato flutua sobre a página (menu, modal, popover). */
  shadows: {
    xs: "none",
    sm: "none",
    md: "0 4px 12px rgba(16,24,40,.08), 0 0 0 1px rgba(16,24,40,.04)",
    lg: "0 12px 32px rgba(16,24,40,.12)",
    xl: "0 20px 48px rgba(16,24,40,.16)",
  },
  components: {
    /* withBorder por padrão: a borda É a hierarquia. */
    Card: { defaultProps: { shadow: "none", radius: "md", withBorder: true } },
    Paper: { defaultProps: { radius: "md" } },
    Button: { defaultProps: { radius: "sm" } },
    TextInput: { defaultProps: { radius: "sm" } },
    Textarea: { defaultProps: { radius: "sm" } },
    NumberInput: { defaultProps: { radius: "sm" } },
    Table: { defaultProps: { horizontalSpacing: "sm" } },
    Modal: { defaultProps: { radius: "lg", centered: true, overlayProps: { blur: 3, backgroundOpacity: 0.5 } } },
    /* Sentence case: CAIXA ALTA + letter-spacing engordava a badge e truncava
       ("SYSTEM ENHANCEME…"). Sem isso o rótulo cabe e continua legível. */
    Badge: {
      defaultProps: { radius: "xs", tt: "none", fw: 500 },
      /* A badge do Mantine tem max-width:100% do pai, então dentro de um flex
         apertado ela cortava o próprio rótulo ("24…", "O."). Rótulo de badge é
         curto por definição: nunca deve encolher. */
      styles: { root: { maxWidth: "none", flexShrink: 0 } },
    },
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
