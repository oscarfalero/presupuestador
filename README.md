# Presupuestador

Local-first budget builder for renovation / construction work, with AI assistance on the roadmap.

## Vision

A simple localhost web app to create beautiful, well-structured budgets:

- Budget with name, details, client, date, and a **global editable VAT %** (presets **10% / 21%**).
- Chapters/sections grouping items, auto-numbered (`1`, `1.1`, `1.2`, `2.1`…).
- Items with title, description, UM (`ud, m, m2, m3, ml, kg, h, pa, %`), quantity, price, amount (`qty × price`).
- Web-style table with **inline editing** (no modals/popups) and **drag & drop** reordering.
- Per-item **internal price breakdown** (materials + source links, labor hours × rate, other costs, notes). **Editor-only: never shown to the client or included in client exports.**
- Client **Excel and PDF export** (chapters, numbering, subtotals, VAT, total — no breakdown).

Phase 2 (after MVP validation): collapsible right-side AI chat that edits the budget, searches prices online, and follows configurable instructions (preferred suppliers, labor criteria, etc.).

## Tech stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Zustand (persisted to localStorage for the MVP) — see `lib/store.ts`
- dnd-kit (drag & drop), ExcelJS (Excel export), @react-pdf/renderer (PDF export)
- Domain core: `lib/budget-types.ts` (model), `lib/calc.ts` (amounts, totals, renumbering)
- SQLite + Drizzle and `/api/chat` (Vercel AI SDK) reserved for later phases — not wired yet

## Getting started

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000.

```bash
pnpm build
pnpm lint
```

## Project layout

```
app/page.tsx                          -> budget editor entry
components/budget/BudgetEditor.tsx    -> v0 placeholder editor (read + meta edit + export)
components/budget/BudgetPdfDocument.tsx -> client PDF (no breakdown)
lib/budget-types.ts                   -> Budget / Chapter / Item / Breakdown model
lib/calc.ts                           -> amounts, subtotals, VAT total, renumber()
lib/store.ts                          -> Zustand store + localStorage persistence
lib/exportExcel.ts                    -> client Excel export (no breakdown)
```

## Roadmap (see GitHub Issues)

- v0.1 editor: inline editing, chapters/items CRUD, dnd-kit reorder, breakdown panel
- v0.2 polish: budgets list, duplicate, Excel/PDF design parity, validation
- v1 AI: side chat, budget tools, web price search, AI settings sections
- v2 accounts: users, onboarding/setup, favourite suppliers
