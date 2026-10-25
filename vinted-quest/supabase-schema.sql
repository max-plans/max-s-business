-- Vinted Quest : tables préfixées "vinted_" pour ne rien mélanger avec d'autres tables du projet.
create table if not exists public.vinted_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title         text not null,
  category      text not null default 'autre',
  buy_price     numeric(10,2) not null default 0,
  buy_date      date,
  location      text not null default '',
  status        text not null default 'stock' check (status in ('stock','en_vente','vendu')),
  list_price    numeric(10,2) not null default 0,
  listed_at     date,
  sold_price    numeric(10,2) not null default 0,
  sold_at       date,
  shipping_cost numeric(10,2) not null default 0,
  other_fees    numeric(10,2) not null default 0,
  notes         text not null default '',
  created_at    timestamptz not null default now()
);
create index if not exists vinted_items_user_status_idx on public.vinted_items (user_id, status);

create table if not exists public.vinted_settings (
  user_id      uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  monthly_goal numeric(10,2) not null default 100
);

alter table public.vinted_items enable row level security;
alter table public.vinted_settings enable row level security;

create policy "vinted_items_select" on public.vinted_items for select using ((select auth.uid()) = user_id);
create policy "vinted_items_insert" on public.vinted_items for insert with check ((select auth.uid()) = user_id);
create policy "vinted_items_update" on public.vinted_items for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vinted_items_delete" on public.vinted_items for delete using ((select auth.uid()) = user_id);

create policy "vinted_settings_select" on public.vinted_settings for select using ((select auth.uid()) = user_id);
create policy "vinted_settings_insert" on public.vinted_settings for insert with check ((select auth.uid()) = user_id);
create policy "vinted_settings_update" on public.vinted_settings for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "vinted_settings_delete" on public.vinted_settings for delete using ((select auth.uid()) = user_id);

-- Jeu : état de la boutique virtuelle (objets achetés, quêtes réclamées, clients du jour)
alter table public.vinted_settings add column if not exists game jsonb not null default '{}'::jsonb;
