// Réservation publique (page fripe…/r/<slug>) : création du rendez-vous, paiement de l'acompte sur le compte Stripe
// du professionnel (Stripe Connect, aucune commission Fripe), suivi et annulation par le client avec son lien privé.
// Appelée sans compte : tout est vérifié ici (prestation, horaires, délai, chevauchement en base).
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const SITE = Deno.env.get('SITE_URL') ?? 'https://fripe-iota.vercel.app';
const TZ = 'Europe/Paris';
let SK = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const ORIGINS = new Set([SITE, 'http://localhost:3100']);
const cors = (req: Request) => {
  const o = req.headers.get('Origin') ?? '';
  return { 'Access-Control-Allow-Origin': ORIGINS.has(o) ? o : SITE, 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' };
};

function form(obj: Record<string, unknown>, pre = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === 'object') form(v as Record<string, unknown>, key, out); else out.append(key, String(v));
  }
  return out;
}
async function stripe(path: string, params?: Record<string, unknown>, method = 'POST', account?: string) {
  const headers: Record<string, string> = { Authorization: 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-03-31.basil' };
  if (account) headers['Stripe-Account'] = account;
  const r = await fetch('https://api.stripe.com/v1/' + path, { method, headers, body: method === 'GET' || !params ? undefined : form(params) });
  const d = await r.json();
  if (!r.ok) throw new Error(d?.error?.message ?? 'stripe');
  return d;
}

// heure locale (Paris) d'un instant : jour de la semaine (0 = dimanche) et minutes depuis minuit
function local(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
  return { wd, min: +p.hour * 60 + +p.minute, day: `${p.year}-${p.month}-${p.day}` };
}
const fmtWhen = (d: Date) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(d);
const clean = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  if (!SK) { const { data } = await db.rpc('stripe_secret_key'); SK = typeof data === 'string' ? data : ''; }
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* vide */ }

  try {
    // ---------- créer un rendez-vous ----------
    if (body.action === 'create') {
      if (body.site) return json({ error: 'invalid' }, 400); // champ piège anti-robots
      const slug = clean(body.slug, 40).toLowerCase();
      const name = clean(body.name, 120), email = clean(body.email, 200).toLowerCase(), phone = clean(body.phone, 30), notes = clean(body.notes, 500);
      if (!name || !EMAIL.test(email)) return json({ error: 'contact' }, 400);
      const { data: biz } = await db.from('businesses').select('*').eq('slug', slug).eq('onboarded', true).maybeSingle();
      if (!biz) return json({ error: 'not_found' }, 404);
      const { data: ok } = await db.rpc('rate_hit', { uid: biz.owner, bucket: 'page_booking', max_hits: 30, win_seconds: 3600 });
      if (ok === false) return json({ error: 'busy' }, 429);
      const { data: svc } = await db.from('services').select('*').eq('id', String(body.service_id ?? '')).eq('business_id', biz.id).eq('active', true).maybeSingle();
      if (!svc) return json({ error: 'service' }, 400);

      const start = new Date(String(body.starts_at ?? ''));
      if (isNaN(+start) || start.getUTCSeconds() || start.getUTCMinutes() % 15) return json({ error: 'slot' }, 400);
      const end = new Date(+start + svc.duration_min * 60000);
      const now = Date.now();
      if (+start < now + biz.min_notice_hours * 3600000 || +start > now + biz.window_days * 86400000) return json({ error: 'slot' }, 400);
      const ls = local(start), le = local(new Date(+end - 1));
      const { data: hours } = await db.from('hours').select('*').eq('business_id', biz.id).eq('weekday', ls.wd);
      const fits = ls.day === le.day && (hours ?? []).some((r) => r.start_min <= ls.min && ls.min + svc.duration_min <= r.end_min);
      if (!fits) return json({ error: 'slot' }, 400);

      // les demandes non payées depuis plus de 35 min (session Stripe expirée à 31 min) libèrent leur créneau
      await db.from('bookings').update({ status: 'cancelled', deposit_status: 'none' }).eq('business_id', biz.id).eq('status', 'pending').lt('created_at', new Date(now - 35 * 60000).toISOString());

      // marge entre deux rendez-vous
      if (biz.buffer_min > 0) {
        const { data: near } = await db.from('bookings').select('id').eq('business_id', biz.id).in('status', ['pending', 'confirmed'])
          .lt('starts_at', new Date(+end + biz.buffer_min * 60000).toISOString()).gt('ends_at', new Date(+start - biz.buffer_min * 60000).toISOString()).limit(1);
        if (near?.length) return json({ error: 'taken' }, 409);
      }

      let { data: client } = await db.from('clients').select('id').eq('business_id', biz.id).eq('email', email).limit(1).maybeSingle();
      if (!client) {
        const r = await db.from('clients').insert({ business_id: biz.id, name, email, phone }).select('id').single();
        client = r.data;
      } else if (phone) await db.from('clients').update({ phone }).eq('id', client.id);

      const deposit = svc.deposit_cents ?? Math.round((svc.price_cents * biz.deposit_percent) / 100);
      const pay = biz.stripe_ready && biz.stripe_account_id && deposit >= 50 && !!SK;
      const ins = await db.from('bookings').insert({
        business_id: biz.id, service_id: svc.id, client_id: client!.id, title: svc.name, starts_at: start.toISOString(), ends_at: end.toISOString(),
        price_cents: svc.price_cents, deposit_cents: pay ? deposit : 0, status: pay ? 'pending' : 'confirmed', deposit_status: pay ? 'pending' : 'none', source: 'page', notes,
      }).select('id, public_token').single();
      if (ins.error) {
        if (ins.error.code === '23P01') return json({ error: 'taken' }, 409);
        if (ins.error.message.includes('free_limit')) return json({ error: 'full' }, 409);
        throw new Error(ins.error.message);
      }
      const bk = ins.data;
      if (!pay) return json({ token: bk.public_token });

      const s = await stripe('checkout/sessions', {
        mode: 'payment', locale: 'fr', customer_email: email,
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: deposit, product_data: { name: `Acompte · ${svc.name}`, description: `${biz.name} · ${fmtWhen(start)}` } } }],
        payment_intent_data: { description: `Acompte ${svc.name} · ${fmtWhen(start)}`, metadata: { booking_id: bk.id } },
        metadata: { booking_id: bk.id },
        expires_at: Math.floor(now / 1000) + 31 * 60,
        success_url: `${SITE}/r/${slug}/rdv?t=${bk.public_token}`, cancel_url: `${SITE}/r/${slug}?annule=1`,
      }, 'POST', biz.stripe_account_id);
      await db.from('bookings').update({ stripe_session_id: s.id }).eq('id', bk.id);
      return json({ url: s.url, token: bk.public_token });
    }

    // ---------- payer l'acompte d'un rendez-vous existant (lien envoyé par le pro) ----------
    if (body.action === 'pay') {
      const token = clean(body.token, 40);
      if (!/^[0-9a-f-]{36}$/.test(token)) return json({ error: 'not_found' }, 404);
      const { data: bk } = await db.from('bookings').select('*, businesses(name, slug, stripe_account_id, stripe_ready), services(name), clients(email)').eq('public_token', token).maybeSingle();
      if (!bk) return json({ error: 'not_found' }, 404);
      const biz = bk.businesses;
      if (bk.stripe_session_id) await confirmPayment(db, bk, biz.stripe_account_id);
      const { data: cur } = await db.from('bookings').select('*').eq('id', bk.id).single();
      if (cur.deposit_status !== 'pending' || cur.deposit_cents < 50 || !['pending', 'confirmed'].includes(cur.status) || +new Date(cur.starts_at) < Date.now()) return json({ error: 'state' }, 409);
      if (!biz.stripe_ready || !biz.stripe_account_id || !SK) return json({ error: 'payments_off' }, 409);
      const name = bk.services?.name ?? cur.title;
      const s = await stripe('checkout/sessions', {
        mode: 'payment', locale: 'fr', customer_email: bk.clients?.email || undefined,
        line_items: [{ quantity: 1, price_data: { currency: 'eur', unit_amount: cur.deposit_cents, product_data: { name: `Acompte · ${name}`, description: `${biz.name} · ${fmtWhen(new Date(cur.starts_at))}` } } }],
        payment_intent_data: { description: `Acompte ${name} · ${fmtWhen(new Date(cur.starts_at))}`, metadata: { booking_id: cur.id } },
        metadata: { booking_id: cur.id }, expires_at: Math.floor(Date.now() / 1000) + 31 * 60,
        success_url: `${SITE}/r/${biz.slug}/rdv?t=${token}`, cancel_url: `${SITE}/r/${biz.slug}/rdv?t=${token}`,
      }, 'POST', biz.stripe_account_id);
      await db.from('bookings').update({ stripe_session_id: s.id }).eq('id', cur.id);
      return json({ url: s.url });
    }

    // ---------- suivi (et confirmation du paiement au retour de Stripe) ----------
    if (body.action === 'status' || body.action === 'cancel') {
      const token = clean(body.token, 40);
      if (!/^[0-9a-f-]{36}$/.test(token)) return json({ error: 'not_found' }, 404);
      const { data: bk } = await db.from('bookings').select('*, businesses(name, slug, cancel_hours, stripe_account_id, phone, email), services(name)').eq('public_token', token).maybeSingle();
      if (!bk) return json({ error: 'not_found' }, 404);
      const biz = bk.businesses;
      if (bk.deposit_status === 'pending' && bk.stripe_session_id) await confirmPayment(db, bk, biz.stripe_account_id);
      const { data: cur } = await db.from('bookings').select('*').eq('id', bk.id).single();
      const deadline = +new Date(cur.starts_at) - biz.cancel_hours * 3600000;

      if (body.action === 'cancel') {
        if (!['pending', 'confirmed'].includes(cur.status)) return json({ error: 'state' }, 409);
        if (Date.now() > deadline) return json({ error: 'too_late' }, 409);
        let deposit_status = cur.deposit_status === 'pending' ? 'none' : cur.deposit_status;
        if (cur.deposit_status === 'paid' && cur.stripe_payment_intent) {
          await stripe('refunds', { payment_intent: cur.stripe_payment_intent }, 'POST', biz.stripe_account_id);
          await db.from('payments').insert({ business_id: cur.business_id, booking_id: cur.id, client_id: cur.client_id, label: `Remboursement acompte · ${bk.services?.name ?? cur.title}`, amount_cents: -cur.deposit_cents, method: 'stripe', stripe_ref: 'refund_' + cur.stripe_payment_intent });
          deposit_status = 'refunded';
        }
        await db.from('bookings').update({ status: 'cancelled', deposit_status }).eq('id', cur.id);
        cur.status = 'cancelled'; cur.deposit_status = deposit_status;
      }
      return json({
        business: biz.name, slug: biz.slug, contact: { phone: biz.phone, email: biz.email }, service: bk.services?.name ?? cur.title,
        starts_at: cur.starts_at, ends_at: cur.ends_at, price_cents: cur.price_cents, deposit_cents: cur.deposit_cents,
        status: cur.status, deposit_status: cur.deposit_status, cancel_until: new Date(deadline).toISOString(),
      });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error('book', (e as Error).message);
    return json({ error: 'server' }, 502);
  }
});

// relit la session Stripe : si l'acompte est payé, le rendez-vous est confirmé et l'encaissement enregistré
// deno-lint-ignore no-explicit-any
async function confirmPayment(db: any, bk: any, account: string) {
  const s = await stripe(`checkout/sessions/${bk.stripe_session_id}`, undefined, 'GET', account);
  if (s.payment_status === 'paid') {
    const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
    const r = await db.from('bookings').update({ status: 'confirmed', deposit_status: 'paid', stripe_payment_intent: pi }).eq('id', bk.id).eq('deposit_status', 'pending').select('id');
    if (r.data?.length) {
      await db.from('payments').insert({ business_id: bk.business_id, booking_id: bk.id, client_id: bk.client_id, label: `Acompte · ${bk.services?.name ?? bk.title}`, amount_cents: bk.deposit_cents, method: 'stripe', stripe_ref: pi });
    }
  } else if (s.status === 'expired' && bk.status === 'pending') {
    // réservation en ligne non payée : le créneau est libéré (un rendez-vous ajouté par le pro reste, acompte toujours à payer)
    await db.from('bookings').update({ status: 'cancelled', deposit_status: 'none' }).eq('id', bk.id).eq('status', 'pending').eq('deposit_status', 'pending');
  }
}
