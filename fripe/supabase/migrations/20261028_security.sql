-- Sécurité avant lancement : limites de débit, validation des données côté serveur, sauvegardes quotidiennes.

-- 1. limite de débit : horodatages récents par compte et par action, lus par la fonction billing (service_role uniquement).
--    Une seule ligne par compte et action, réécrite à chaque appel : rien à purger.
create table if not exists public.rate_hits (
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket text not null,
  hits timestamptz[] not null default '{}',
  primary key (user_id, bucket)
);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.rate_hit(uid uuid, bucket text, max_hits int, win_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare recent timestamptz[];
begin
  select coalesce(array_agg(h), '{}') into recent
    from public.rate_hits r, unnest(r.hits) h
    where r.user_id = uid and r.bucket = rate_hit.bucket and h > now() - make_interval(secs => win_seconds);
  if cardinality(recent) >= max_hits then return false; end if;
  insert into public.rate_hits (user_id, bucket, hits) values (uid, rate_hit.bucket, recent || now())
  on conflict on constraint rate_hits_pkey do update set hits = excluded.hits;
  return true;
end $$;
revoke execute on function public.rate_hit(uuid, text, int, int) from public, anon, authenticated;
grant execute on function public.rate_hit(uuid, text, int, int) to service_role;

-- 2. données d'un compte : forme vérifiée et limite gratuite sans contournement
--    (les 28 exemples marqués « demo » ne comptent pas ; au-delà, un article « demo » compte comme un vrai)
create or replace function public.user_data_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int; prev int := 0;
begin
  if jsonb_typeof(new.data) <> 'object' then raise exception 'invalid_data'; end if;
  if pg_column_size(new.data) > 3000000 then raise exception 'data_too_large'; end if;
  if coalesce(jsonb_typeof(new.data->'items'), 'array') <> 'array'
    or coalesce(jsonb_typeof(new.data->'orders'), 'array') <> 'array'
    or coalesce(jsonb_typeof(new.data->'threads'), 'array') <> 'array' then raise exception 'invalid_data'; end if;
  if jsonb_array_length(coalesce(new.data->'items', '[]'::jsonb)) > 20000
    or jsonb_array_length(coalesce(new.data->'orders', '[]'::jsonb)) > 50000
    or jsonb_array_length(coalesce(new.data->'threads', '[]'::jsonb)) > 5000 then raise exception 'data_too_large'; end if;
  n := public.real_items(new.data);
  if tg_op = 'UPDATE' then prev := public.real_items(old.data); end if;
  if n > 20 and n > prev and not public.is_pro(new.user_id) then raise exception 'free_limit'; end if;
  new.updated_at := now();
  return new;
end $$;

create or replace function public.real_items(d jsonb) returns int
language sql immutable set search_path = '' as $$
  select count(*) filter (where coalesce(e->>'demo', '0') not in ('1', 'true'))::int
       + greatest(0, count(*) filter (where coalesce(e->>'demo', '0') in ('1', 'true')) - 28)::int
  from jsonb_array_elements(case when jsonb_typeof(d->'items') = 'array' then d->'items' else '[]'::jsonb end) e
$$;
revoke execute on function public.real_items(jsonb) from public, anon, authenticated;
revoke execute on function public.user_data_guard() from public, anon, authenticated;

-- 3. jumelage par clé de la version Claude : appelable sans compte (clé secrète de 20 à 64 caractères, stockée hachée),
--    mais plafonné pour qu'on ne puisse pas remplir la base
create or replace function public.fripe_push(k text, d jsonb, at bigint) returns bigint
language plpgsql security definer set search_path = 'public' as $$
declare h text; cur bigint;
begin
  if k is null or length(k) < 20 or length(k) > 64 then raise exception 'cle invalide'; end if;
  if d is null or jsonb_typeof(d) <> 'object' or pg_column_size(d) > 3000000 then raise exception 'donnees invalides'; end if;
  h := encode(sha256(convert_to(k, 'UTF8')), 'hex');
  if not exists (select 1 from public.fripe_sync where key_hash = h) and (select count(*) from public.fripe_sync) >= 2000 then
    raise exception 'capacite atteinte';
  end if;
  insert into public.fripe_sync (key_hash, data, updated_at) values (h, d, at)
  on conflict (key_hash) do update set data = excluded.data, updated_at = excluded.updated_at
    where public.fripe_sync.updated_at <= excluded.updated_at;
  select updated_at into cur from public.fripe_sync where key_hash = h;
  return cur;
end $$;

-- 4. sauvegarde automatique : copie quotidienne des données de chaque compte sur 14 emplacements tournants
--    (le jour J écrase le jour J-14), dans un schéma privé que l'API ne publie pas ; supprimée avec le compte
create extension if not exists pg_cron;
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.user_data_daily (
  slot int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  data jsonb not null,
  at bigint not null,
  primary key (slot, user_id)
);
create table if not exists backup.accounts_daily (
  slot int not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  row jsonb not null,
  primary key (slot, user_id)
);

create or replace function backup.run() returns void
language plpgsql security definer set search_path = '' as $$
declare s int := (current_date - date '2026-01-01') % 14;
begin
  insert into backup.user_data_daily (slot, user_id, day, data, at)
    select s, u.user_id, current_date, u.data, u.at from public.user_data u
  on conflict (slot, user_id) do update set day = excluded.day, data = excluded.data, at = excluded.at;
  insert into backup.accounts_daily (slot, user_id, day, row)
    select s, a.user_id, current_date, to_jsonb(a) from public.accounts a
  on conflict (slot, user_id) do update set day = excluded.day, row = excluded.row;
end $$;
revoke execute on function backup.run() from public, anon, authenticated;

select cron.schedule('fripe-backup', '17 3 * * *', 'select backup.run()');
select backup.run();
