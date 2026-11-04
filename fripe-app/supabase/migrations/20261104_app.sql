-- Fripe, bureau de poche des indépendants : activité, prestations, horaires, clients, rendez-vous,
-- encaissements, factures et devis, dépenses. Chaque ligne appartient à une activité (business) ;
-- seul son propriétaire la lit et l'écrit (RLS). La page publique passe par des fonctions dédiées.
create extension if not exists btree_gist;

-- ---------- activité ----------
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null unique references auth.users(id) on delete cascade,
  name text not null default '' check (length(name) <= 80),
  slug text unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  metier text not null default '' check (length(metier) <= 40),
  bio text not null default '' check (length(bio) <= 400),
  legal_name text not null default '' check (length(legal_name) <= 120),
  address text not null default '' check (length(address) <= 200),
  siret text not null default '' check (siret ~ '^([0-9]{14})?$'),
  email text not null default '' check (length(email) <= 200),
  phone text not null default '' check (length(phone) <= 30),
  activity text not null default 'bic_services' check (activity in ('bic_services', 'bnc', 'bic_vente')),
  urssaf_rate numeric(5,2) not null default 21.2 check (urssaf_rate between 0 and 60),
  deposit_percent int not null default 30 check (deposit_percent between 0 and 100),
  min_notice_hours int not null default 12 check (min_notice_hours between 0 and 336),
  window_days int not null default 60 check (window_days between 1 and 365),
  buffer_min int not null default 0 check (buffer_min between 0 and 240),
  cancel_hours int not null default 24 check (cancel_hours between 0 and 336),
  stripe_account_id text,
  stripe_ready boolean not null default false,
  invoice_seq int not null default 0,
  quote_seq int not null default 0,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.my_business() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.businesses where owner = (select auth.uid())
$$;
revoke execute on function public.my_business() from public, anon;
grant execute on function public.my_business() to authenticated;

alter table public.businesses enable row level security;
create policy "biz_select_own" on public.businesses for select to authenticated using (owner = (select auth.uid()));
create policy "biz_update_own" on public.businesses for update to authenticated using (owner = (select auth.uid())) with check (owner = (select auth.uid()));
revoke all on public.businesses from anon;
revoke insert, delete on public.businesses from authenticated;
-- les colonnes gérées par le serveur ne sont pas modifiables depuis le navigateur
revoke update on public.businesses from authenticated;
grant update (name, slug, metier, bio, legal_name, address, siret, email, phone, activity, urssaf_rate, deposit_percent,
  min_notice_hours, window_days, buffer_min, cancel_hours, onboarded) on public.businesses to authenticated;

-- crée l'activité au premier passage dans l'espace pro
create or replace function public.ensure_business() returns public.businesses
language plpgsql security definer set search_path = '' as $$
declare b public.businesses; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'unauthorized'; end if;
  select * into b from public.businesses where owner = uid;
  if found then return b; end if;
  insert into public.accounts (user_id) values (uid) on conflict do nothing;
  insert into public.businesses (owner, email) select uid, coalesce(u.email, '') from auth.users u where u.id = uid returning * into b;
  insert into public.hours (business_id, weekday, start_min, end_min)
    select b.id, d, 540, 1140 from generate_series(1, 5) d;
  return b;
end $$;
revoke execute on function public.ensure_business() from public, anon;
grant execute on function public.ensure_business() to authenticated;

-- ---------- prestations et horaires ----------
create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  description text not null default '' check (length(description) <= 300),
  duration_min int not null check (duration_min between 5 and 720),
  price_cents int not null check (price_cents between 0 and 10000000),
  deposit_cents int check (deposit_cents is null or deposit_cents between 0 and 10000000),
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index on public.services (business_id);

create table public.hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6), -- 0 = dimanche
  start_min int not null check (start_min between 0 and 1440),
  end_min int not null check (end_min between 0 and 1440),
  check (end_min > start_min)
);
create index on public.hours (business_id);

-- ---------- clients ----------
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  email text not null default '' check (length(email) <= 200),
  phone text not null default '' check (length(phone) <= 30),
  address text not null default '' check (length(address) <= 200),
  notes text not null default '' check (length(notes) <= 1000),
  created_at timestamptz not null default now()
);
create index on public.clients (business_id);

-- ---------- rendez-vous ----------
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  title text not null default '' check (length(title) <= 120),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_cents int not null default 0 check (price_cents >= 0),
  deposit_cents int not null default 0 check (deposit_cents >= 0),
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'done', 'cancelled', 'no_show')),
  deposit_status text not null default 'none' check (deposit_status in ('none', 'pending', 'paid', 'refunded', 'kept')),
  source text not null default 'manual' check (source in ('page', 'manual', 'ai')),
  notes text not null default '' check (length(notes) <= 1000),
  stripe_session_id text,
  stripe_payment_intent text,
  public_token uuid not null default gen_random_uuid(),
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- deux rendez-vous actifs ne peuvent pas se chevaucher
  constraint bookings_no_overlap exclude using gist (business_id with =, tstzrange(starts_at, ends_at) with &&)
    where (status in ('pending', 'confirmed'))
);
create index on public.bookings (business_id, starts_at);

-- ---------- factures et devis ----------
create table public.documents (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  kind text not null check (kind in ('invoice', 'quote')),
  number text,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'cancelled', 'accepted', 'refused')),
  client_id uuid references public.clients(id) on delete set null,
  booking_id uuid references public.bookings(id) on delete set null,
  client_snapshot jsonb not null default '{}'::jsonb,
  seller_snapshot jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  total_cents int not null default 0 check (total_cents >= 0),
  issued_on date,
  due_on date,
  notes text not null default '' check (length(notes) <= 1000),
  public_token uuid not null default gen_random_uuid(),
  last_reminder_at timestamptz,
  created_at timestamptz not null default now(),
  unique (business_id, kind, number)
);
create index on public.documents (business_id, created_at desc);

-- ---------- encaissements et dépenses ----------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  document_id uuid references public.documents(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  label text not null default '' check (length(label) <= 160),
  amount_cents int not null check (amount_cents <> 0),
  method text not null default 'card' check (method in ('card', 'cash', 'transfer', 'stripe', 'other')),
  paid_on date not null default current_date,
  stripe_ref text unique,
  created_at timestamptz not null default now()
);
create index on public.payments (business_id, paid_on);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null check (length(label) between 1 and 160),
  category text not null default 'materiel' check (category in ('materiel', 'deplacement', 'logiciel', 'formation', 'local', 'pub', 'autre')),
  amount_cents int not null check (amount_cents > 0),
  spent_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index on public.expenses (business_id, spent_on);

-- ---------- RLS commune : propriétaire de l'activité ----------
do $$
declare t text;
begin
  foreach t in array array['services', 'hours', 'clients', 'bookings', 'documents', 'payments', 'expenses'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "%s_own" on public.%I for all to authenticated using (business_id = (select public.my_business())) with check (business_id = (select public.my_business()))', t, t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;
-- champs gérés par le serveur (Stripe, lien privé, rappel) : le navigateur ne peut pas les changer
create or replace function public.bookings_protect() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    new.stripe_session_id := old.stripe_session_id; new.stripe_payment_intent := old.stripe_payment_intent;
    new.public_token := old.public_token; new.reminder_sent_at := old.reminder_sent_at; new.business_id := old.business_id;
  end if;
  return new;
end $$;
create trigger bookings_protect before update on public.bookings for each row execute function public.bookings_protect();
revoke execute on function public.bookings_protect() from public, anon, authenticated;

-- ---------- formule gratuite : 10 rendez-vous et 5 factures par mois ----------
create or replace function public.business_is_pro(bid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select a.is_admin or (a.plan = 'pro' and (a.pro_until is null or a.pro_until > now()))
    from public.businesses b join public.accounts a on a.user_id = b.owner where b.id = bid), false)
$$;
revoke execute on function public.business_is_pro(uuid) from public, anon;
grant execute on function public.business_is_pro(uuid) to authenticated;

create or replace function public.bookings_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if not public.business_is_pro(new.business_id) then
    select count(*) into n from public.bookings
      where business_id = new.business_id and status <> 'cancelled'
        and date_trunc('month', created_at) = date_trunc('month', now());
    if n >= 10 then raise exception 'free_limit_bookings'; end if;
  end if;
  return new;
end $$;
create trigger bookings_guard before insert on public.bookings for each row execute function public.bookings_guard();
revoke execute on function public.bookings_guard() from public, anon, authenticated;

-- ---------- émission d'une facture ou d'un devis : numéro chronologique, document figé ----------
create or replace function public.issue_document(doc uuid) returns public.documents
language plpgsql security definer set search_path = '' as $$
declare d public.documents; b public.businesses; c public.clients; n int; total int; yr text := to_char(now() at time zone 'Europe/Paris', 'YYYY');
begin
  select * into d from public.documents where id = doc and business_id = public.my_business() for update;
  if not found then raise exception 'not_found'; end if;
  if d.status <> 'draft' then raise exception 'already_issued'; end if;
  if jsonb_array_length(d.items) = 0 then raise exception 'empty'; end if;
  select * into b from public.businesses where id = d.business_id for update;
  if b.name = '' or b.address = '' or b.siret = '' then raise exception 'seller_incomplete'; end if;
  if d.client_id is null then raise exception 'no_client'; end if;
  if d.kind = 'invoice' and not public.business_is_pro(b.id) then
    select count(*) into n from public.documents where business_id = b.id and kind = 'invoice' and status <> 'draft'
      and date_trunc('month', issued_on) = date_trunc('month', current_date);
    if n >= 5 then raise exception 'free_limit_invoices'; end if;
  end if;
  select * into c from public.clients where id = d.client_id;
  select coalesce(sum(round((coalesce((i->>'qty')::numeric, 1)) * (i->>'unit_cents')::numeric)), 0)::int into total from jsonb_array_elements(d.items) i;
  if d.kind = 'invoice' then
    update public.businesses set invoice_seq = invoice_seq + 1 where id = b.id returning invoice_seq into n;
  else
    update public.businesses set quote_seq = quote_seq + 1 where id = b.id returning quote_seq into n;
  end if;
  update public.documents set
    number = (case when d.kind = 'invoice' then 'F' else 'D' end) || yr || '-' || lpad(n::text, 4, '0'),
    status = 'issued', total_cents = total,
    issued_on = coalesce(d.issued_on, current_date),
    due_on = coalesce(d.due_on, current_date + 30),
    client_snapshot = jsonb_build_object('name', c.name, 'email', c.email, 'address', c.address, 'phone', c.phone),
    seller_snapshot = jsonb_build_object('name', b.name, 'legal_name', b.legal_name, 'address', b.address, 'siret', b.siret, 'email', b.email, 'phone', b.phone, 'activity', b.activity)
  where id = d.id returning * into d;
  return d;
end $$;
revoke execute on function public.issue_document(uuid) from public, anon;
grant execute on function public.issue_document(uuid) to authenticated;

-- une fois émis, un document ne change plus que de statut (payé, annulé, accepté, refusé)
-- fonction « invoker » : current_user est bien le rôle de l'appelant (authenticated ou service_role)
create or replace function public.documents_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then raise exception 'issued_locked'; end if;
    return old;
  end if;
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    new.public_token := old.public_token; new.number := old.number; new.seller_snapshot := old.seller_snapshot; new.business_id := old.business_id;
  end if;
  if old.status <> 'draft' and current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if new.items is distinct from old.items or new.client_id is distinct from old.client_id or new.total_cents <> old.total_cents
       or new.issued_on is distinct from old.issued_on or new.kind <> old.kind or new.client_snapshot is distinct from old.client_snapshot then
      raise exception 'issued_locked';
    end if;
    if new.status = 'draft' then raise exception 'issued_locked'; end if;
  end if;
  if old.status = 'draft' and new.status not in ('draft') and current_user not in ('postgres', 'service_role', 'supabase_admin')
     and new.number is null then raise exception 'use_issue_document'; end if;
  return new;
end $$;
create trigger documents_guard before update or delete on public.documents for each row execute function public.documents_guard();
revoke execute on function public.documents_guard() from public, anon, authenticated;

-- ---------- page publique ----------
create or replace function public.public_page(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'name', b.name, 'slug', b.slug, 'metier', b.metier, 'bio', b.bio,
    'deposit_percent', b.deposit_percent, 'min_notice_hours', b.min_notice_hours, 'window_days', b.window_days,
    'buffer_min', b.buffer_min, 'cancel_hours', b.cancel_hours, 'payments', b.stripe_ready,
    'services', coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'description', s.description,
        'duration_min', s.duration_min, 'price_cents', s.price_cents, 'deposit_cents', s.deposit_cents) order by s.position, s.created_at)
      from public.services s where s.business_id = b.id and s.active), '[]'::jsonb),
    'hours', coalesce((select jsonb_agg(jsonb_build_object('weekday', h.weekday, 'start_min', h.start_min, 'end_min', h.end_min))
      from public.hours h where h.business_id = b.id), '[]'::jsonb))
  from public.businesses b where b.slug = lower(p_slug) and b.onboarded
$$;
revoke execute on function public.public_page(text) from public;
grant execute on function public.public_page(text) to anon, authenticated;

-- créneaux déjà pris (sans aucune information sur les clients)
create or replace function public.public_busy(p_slug text, p_from timestamptz, p_to timestamptz) returns table (starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select k.starts_at, k.ends_at from public.bookings k join public.businesses b on b.id = k.business_id
  where b.slug = lower(p_slug) and k.status in ('pending', 'confirmed') and k.ends_at > p_from and k.starts_at < p_to
    and p_to - p_from <= interval '120 days'
$$;
revoke execute on function public.public_busy(text, timestamptz, timestamptz) from public;
grant execute on function public.public_busy(text, timestamptz, timestamptz) to anon, authenticated;

-- facture ou devis consultable par le client grâce à son lien privé
create or replace function public.public_document(p_token uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('kind', d.kind, 'number', d.number, 'status', d.status, 'items', d.items, 'total_cents', d.total_cents,
    'issued_on', d.issued_on, 'due_on', d.due_on, 'notes', d.notes, 'client', d.client_snapshot, 'seller', d.seller_snapshot)
  from public.documents d where d.public_token = p_token and d.status <> 'draft'
$$;
revoke execute on function public.public_document(uuid) from public;
grant execute on function public.public_document(uuid) to anon, authenticated;

-- ---------- admin : statistiques ----------
create or replace function public.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.accounts where user_id = auth.uid() and is_admin) then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'waitlist', (select count(*) from public.waitlist),
    'waitlist_7d', (select count(*) from public.waitlist where created_at > now() - interval '7 days'),
    'waitlist_by_metier', coalesce((select jsonb_object_agg(m, n) from (select coalesce(nullif(metier, ''), '—') m, count(*) n from public.waitlist group by 1) x), '{}'::jsonb),
    'waitlist_recent', coalesce((select jsonb_agg(jsonb_build_object('email', email, 'metier', metier, 'at', created_at) order by created_at desc) from (select * from public.waitlist order by created_at desc limit 30) w), '[]'::jsonb),
    'users', (select count(*) from auth.users),
    'businesses', (select count(*) from public.businesses where onboarded),
    'pro', (select count(*) from public.accounts where plan = 'pro' and not is_admin and (pro_until is null or pro_until > now())),
    'bookings_30d', (select count(*) from public.bookings where created_at > now() - interval '30 days'));
end $$;
revoke execute on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

-- un document se crée toujours en brouillon, sans numéro
-- fonction « invoker » : current_user est bien le rôle de l'appelant (authenticated ou service_role)
create or replace function public.documents_insert_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    new.status := 'draft'; new.number := null; new.seller_snapshot := '{}'::jsonb; new.client_snapshot := '{}'::jsonb;
  end if;
  return new;
end $$;
create trigger documents_insert_guard before insert on public.documents for each row execute function public.documents_insert_guard();
revoke execute on function public.documents_insert_guard() from public, anon, authenticated;
