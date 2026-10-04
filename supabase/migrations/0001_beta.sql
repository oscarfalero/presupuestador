-- Beta backend for presupuestador (issue #46).
--
-- Document model: one JSONB row per user per store, mirroring the exact
-- zustand shapes (`{budgets, order, activeId}` and `CompanyProfile`).
-- Nested budget graphs with a single writer per account don't benefit
-- from relational tables yet; revisit if sharing/querying needs arise.
--
-- Run in Supabase Dashboard → SQL editor (or `supabase db push`).
-- Then: Authentication → Sign In / Sign Ups → DISABLE "Allow new users
-- to sign up", and invite beta users via Authentication → Users → Invite.

create table if not exists public.budget_store (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{"budgets":{},"order":[],"activeId":null}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.company_store (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.budget_store enable row level security;
alter table public.company_store enable row level security;

-- RLS alone is not enough: authenticated users need table grants.
-- (anon gets nothing; every access requires a session.)
grant all on public.budget_store to authenticated;
grant all on public.company_store to authenticated;

-- Users only ever touch their own rows (closed beta: no shared data).
drop policy if exists "own budget store" on public.budget_store;
create policy "own budget store" on public.budget_store
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own company store" on public.company_store;
create policy "own company store" on public.company_store
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Keep updated_at fresh on writes.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists budget_store_touch on public.budget_store;
create trigger budget_store_touch
  before update on public.budget_store
  for each row execute function public.touch_updated_at();

drop trigger if exists company_store_touch on public.company_store;
create trigger company_store_touch
  before update on public.company_store
  for each row execute function public.touch_updated_at();
