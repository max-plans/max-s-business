-- Sécurité avant lancement : limites de débit, validation des données côté serveur, sauvegardes quotidiennes.

-- 1. limite de débit : compteur par compte et par action, lu par la fonction billing (service_role uniquement)
create table if not exists public.rate_hits (
  user_id uuid not null,
  bucket text not null,
  at timestamptz not null default now()
);
create index if not exists rate_hits_lookup on public.rate_hits (user_id, bucket, at);
alter table public.rate_hits enable row level security;
revoke all on public.rate_hits from anon, authenticated;

create or replace function public.rate_hit(uid uuid, bucket text, max_hits int, win_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.rate_hits r where r.at < now() - interval '1 day';
  select count(*) into n from public.rate_hits r
    where r.user_id = uid and r.bucket = rate_hit.bucket and r.at > now() - make_interval(secs => win_seconds);
  if n >= max_hits then return false; end if;
  insert into public.rate_hits (user_id, bucket) values (uid, rate_hit.bucket);
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

-- 4. sauvegarde automatique : copie quotidienne des données de chaque compte, gardée 14 jours,
--    dans un schéma privé que l'API ne publie pas
create extension if not exists pg_cron;
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.user_data_daily (
  day date not null,
  user_id uuid not null,
  data jsonb not null,
  at bigint not null,
  primary key (day, user_id)
);
create table if not exists backup.accounts_daily (like public.accounts);
alter table backup.accounts_daily add column if not exists day date not null default current_date;

create or replace function backup.run() returns void
language plpgsql security definer set search_path = '' as $$
begin
  insert into backup.user_data_daily (day, user_id, data, at)
    select current_date, u.user_id, u.data, u.at from public.user_data u
  on conflict (day, user_id) do update set data = excluded.data, at = excluded.at;
  delete from backup.accounts_daily where day = current_date;
  insert into backup.accounts_daily select a.*, current_date from public.accounts a;
  delete from backup.user_data_daily where day < current_date - 14;
  delete from backup.accounts_daily where day < current_date - 14;
end $$;
revoke execute on function backup.run() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'fripe-backup';
select cron.schedule('fripe-backup', '17 3 * * *', 'select backup.run()');
select backup.run();
