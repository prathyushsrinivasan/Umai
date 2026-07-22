# UmaiFrontend

React + TypeScript + Vite frontend for Umai. All user-facing text is in Japanese;
code, identifiers and comments are in English.

See the [root README](../README.md) for full setup instructions.

## Quick start

```bash
cp .env.example .env.local
npm install
npm run dev
```

The dev server runs on <http://localhost:5173> and proxies `/api` to the backend
on port 8080, so the browser stays same-origin.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Type-check (`tsc -b`) then production build |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Oxlint |

## Structure

```
src/
  api/          API service layer — all backend calls go through client.ts
  components/
    layout/     Page frame (header, footer, routed outlet)
    ui/         Reusable presentational components
  hooks/        Custom React hooks
  pages/        Route-level components
  types/        Shared TypeScript types for API payloads
  index.css     Tailwind import + design tokens (@theme)
```

## Design tokens

The visual language — green, natural, soft, cozy — is defined once as Tailwind v4
theme variables in `src/index.css` and consumed as normal utilities:

- Colors: `leaf-*` (primary green), `cream-*` / `bark-*` (warm neutrals),
  `apricot-*` / `berry-*` (accents)
- Radii: `rounded-cozy`, `rounded-pill`
- Shadows: `shadow-soft`, `shadow-lifted`

Prefer these over one-off hex values so the UI stays consistent.

Animations use [Motion](https://motion.dev). Keep them subtle, and note that
`prefers-reduced-motion` is respected globally in `index.css`.
