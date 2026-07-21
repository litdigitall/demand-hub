# Brand Identity Prompt — "LIT Digitall Enterprise"

> Copie o bloco abaixo no início de qualquer pedido a um modelo de design/código.
> Anexe as logos: `public/plan/assets/abbott-logo.png` (cliente) e `public/plan/assets/lit-mark.png` (LIT).
> Tokens extraídos do design aprovado do plano executivo (Abbott DemandFlow).

```text
# VISUAL IDENTITY — "LIT Digitall Enterprise" design system
Apply this identity to EVERYTHING you produce for me (apps, pages, documents, dashboards, decks). Do not invent a new style. Where this spec conflicts with your defaults, this spec wins.

## Brand & logos
- Studio: **LIT Digitall** (builder). Client of record varies per project (current: **Abbott**).
- Header lockup, left side, in this exact order: [Client logo] · thin 1px vertical divider · [LIT mark] · caption.
  - Client logo: image, ~118×20 px, contain.
  - LIT mark: square image, 34×34 px.
  - Caption: 11.5px, uppercase, letter-spacing .16em, weight 600, muted color. Pattern: "CONTEXT — LIT DIGITALL" (e.g. "IT HUB (DMC) — LIT DIGITALL").
- I will attach the logo files (client logo + lit-mark). If not attached, render neutral placeholder boxes with the same dimensions — never make up a logo.
- Page top: a 3px solid accent line (--blue) above the header. Footer: small muted text "Product · version — date" left, "LIT Digitall — Confidencial" right.

## Color tokens (use CSS custom properties EXACTLY; never hardcode)
LIGHT:
--bg:#f3f7fa --surface:#ffffff --ink:#16293a --heading:#0a2e4c --muted:#587085
--line:#d8e2eb --blue:#0072bc --navy:#003e66 --blue-soft:#e9f3fb
--amber:#c27a10 --amber-soft:#fbf1df
--band:#04263e --band-ink:#eaf2f9 --band-muted:#84a5c0
--band-line:rgba(255,255,255,.14) --gline:rgba(255,255,255,.09) --bar:#2f9de0 --chip:#f0f6fb
DARK (must be provided; auto via prefers-color-scheme AND overridable via :root[data-theme]):
--bg:#0a141e --surface:#101f2e --ink:#dbe7f1 --heading:#eef5fb --muted:#8ba6bd
--line:#1e3347 --blue:#4aa8e0 --navy:#9ecdec --blue-soft:#0f2b42
--amber:#e0a044 --amber-soft:#271d0c --band:#020f1a --chip:#0e2434
Rules: --blue is THE accent (links, active nav, section kickers, primary bars/buttons). --amber is reserved for milestones, warnings-of-note and go-live moments only — use sparingly. --band is the dark navy "feature band" background for hero-level or roadmap sections; inside it use band-ink/band-muted/gline. Success = teal family (#0E7F6E light / #43C0AA dark) only for status, never as decoration.

## Typography
- Family: 'Segoe UI Variable Text','Segoe UI',-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif. No webfont CDNs; system stack or embedded data-URI only.
- H1: clamp(30px,4.5vw,44px), weight 650, letter-spacing -0.02em, color --heading, preceded by a 44×3px --blue rule.
- H2: 26px / 650 / -0.01em. Section kicker above every H2: 12px, uppercase, .16em tracking, weight 600, color --blue, numbered ("01 · SECTION NAME") only when sections form a real sequence.
- Body 14–15px, line-height 1.55–1.6; long text max ~70ch, muted for secondary.
- Numbers/data: font-variant-numeric: tabular-nums, big stats 32px weight 650 in --navy.
- Code/IDs: Consolas/SF Mono, chip background --chip.

## Signature components (reuse these patterns)
- Stat band: full-width row of large numbers separated by 1px --line verticals, top+bottom hairlines (no cards).
- Cards: --surface, 1px --line border, radius 6px, padding 26px. FLAT — no drop shadows, no gradients on cards. Optional 4px left/top accent border only when it encodes a category.
- Pills/tags: 11px uppercase 700, radius 999px, soft background (blue-soft/amber-soft) + strong text color.
- Tables: uppercase 11px letter-spaced muted headers, 1px row hairlines, right-aligned tabular numbers, wrapped in an overflow-x:auto container.
- Timeline/Gantt (roadmaps): dark --band section; grid with month group headers, week columns, --bar rounded bars (radius 3px, height 20px), amber diamond for milestones, hatched bar for hypercare/continuations, faint --gline vertical week lines (stronger --band-line at month boundaries).
- Numbered lists ("steps"): grid of columns with "STEP n" in --blue 12px 700 tracked, hairline separators.
- Theme toggle: 28px circle button "◐", persists via localStorage("…-theme") writing data-theme on <html>.

## Layout & tone
- Content max-width 1120px, 32px side padding, generous 72px section spacing. Left-aligned, editorial, executive; whitespace over boxes.
- Look = premium consulting one-pager: quiet, precise, confident. NOT: purple-blue gradient heroes, emoji as icons, rounded-card soup, cream+serif+terracotta, everything centered.
- Copy: short, active, specific; no lorem; pt-BR/es/en per my request, with an ES|EN|PT language row when the deliverable is multilingual.

## Technical (non-negotiable)
- Self-contained single HTML (or the project's existing stack if I say so): inline CSS, zero external requests.
- Both themes wired token-level: media query + :root[data-theme="dark"|"light"] overrides.
- Responsive (mobile→1440); wide content scrolls in its own container; print-friendly (print-color-adjust:exact, hide chrome with [data-noprint]).
- Accessible: real <img alt>, visible focus, contrast ≥ 4.5:1 in BOTH themes, prefers-reduced-motion respected.

## Now build
[DESCREVA AQUI O APP/PÁGINA: conteúdo, seções, idioma]
```
