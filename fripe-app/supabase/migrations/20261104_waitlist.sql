-- Liste d'attente du nouveau Fripe.
-- La table n'est lisible par personne côté navigateur : on y ajoute une inscription uniquement via join_waitlist(),
-- qui vérifie l'e-mail, ignore les doublons et freine le spam.
create table if not exists public.waitlist (
  id bigserial primary key,
  email text not null unique check (length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  metier text check (metier is null or length(metier) <= 60),
  source text check (source is null or length(source) <= 80),
  created_at timestamptz not null default now()
);
alter table public.waitlist enable row level security;
revoke all on public.waitlist from anon, authenticated;

create or replace function public.join_waitlist(p_email text, p_metier text default null, p_source text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare e text := lower(trim(p_email));
begin
  if e is null or length(e) > 254 or e !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then return 'invalid'; end if;
  -- frein anti-spam global : au plus 60 inscriptions par minute
  if (select count(*) from public.waitlist where created_at > now() - interval '1 minute') >= 60 then return 'busy'; end if;
  insert into public.waitlist (email, metier, source) values (e, left(nullif(trim(p_metier), ''), 60), left(nullif(trim(p_source), ''), 80))
  on conflict (email) do nothing;
  return 'ok';
end $$;
revoke all on function public.join_waitlist(text, text, text) from public;
grant execute on function public.join_waitlist(text, text, text) to anon, authenticated;
