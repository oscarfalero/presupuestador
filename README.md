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

Without Supabase credentials the app runs local-only (exactly as
before). To enable the closed-beta cloud backend:

1. Create a free project at https://supabase.com, then run
   `supabase/migrations/0001_beta.sql` in its SQL editor.
2. Authentication → Sign In / Sign Ups → turn OFF "Allow new users
   to sign up".
3. Invite beta users via Authentication → Users → Invite user. The
   invite link lands on `/auth/confirm` and drops them at `/account`,
   where they set their password.
4. Copy the project URL + anon key into `.env.local` (never commit
   secrets; the service role key is not needed anywhere):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

First login reconciles once: cloud data wins when present (edits made
while offline on a fresh device are discarded — single writer per
account), otherwise a pre-cloud local snapshot uploads; a foreign
account's cache is dropped locally and never uploaded. Signing out
clears the on-device cache. Afterwards every edit syncs with a short
debounce (last write wins).

## Deploy (Vercel, issue #47)

1. https://vercel.com → Add New → Project → import
   `oscarfalero/presupuestador` (production branch `main`).
2. Environment Variables (Production **and** Preview, so PR previews
   can log in too):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

3. Deploy. With the env vars set, the whole app sits behind the
   Supabase login (`proxy.ts` redirects everything to `/login`) —
   that gate IS the beta protection and works on every Vercel plan.
   Optionally enable Vercel Deployment Protection as a second layer
   if your plan includes it.
4. Without env vars a deployment runs local-only and ungated — never
   use that for the public beta URL.

Custom domain: out of scope for now.

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
