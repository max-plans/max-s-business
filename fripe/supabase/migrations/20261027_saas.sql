-- Fripe SaaS : comptes, données par utilisateur, limite de la formule gratuite (appliqué sur le projet tlmfldqzdptzylfkuyhz)
create table public.accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  pro_until timestamptz,
  cancel_at_period_end boolean not null default false,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_mode text,
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
create policy "accounts_select_own" on public.accounts for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.accounts from anon, authenticated;

create table public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  at bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.user_data enable row level security;
create policy "user_data_select_own" on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data_insert_own" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data_update_own" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.user_data from anon;

create or replace function public.is_pro(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.accounts a where a.user_id = uid and a.plan = 'pro' and (a.pro_until is null or a.pro_until > now()));
$$;
revoke execute on function public.is_pro(uuid) from public, anon, authenticated;

-- au-delà de 20 articles (hors exemples), la formule gratuite peut modifier ou supprimer, pas en ajouter
create or replace function public.user_data_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; prev int := 0;
begin
  if pg_column_size(new.data) > 3000000 then raise exception 'data_too_large'; end if;
  select count(*) into n from jsonb_array_elements(coalesce(new.data->'items', '[]'::jsonb)) e
    where coalesce(e->>'demo', '0') not in ('1', 'true');
  if tg_op = 'UPDATE' then
    select count(*) into prev from jsonb_array_elements(coalesce(old.data->'items', '[]'::jsonb)) e
      where coalesce(e->>'demo', '0') not in ('1', 'true');
  end if;
  if n > 20 and n > prev and not public.is_pro(new.user_id) then raise exception 'free_limit'; end if;
  new.updated_at := now();
  return new;
end $$;
create trigger user_data_guard before insert or update on public.user_data for each row execute function public.user_data_guard();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.accounts (user_id) values (new.id) on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
revoke execute on function public.user_data_guard() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
