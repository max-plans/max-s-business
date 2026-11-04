// Espace pro (compte connecté) : encaissement des acomptes via Stripe Connect (compte Stripe du professionnel,
// sans commission Fripe), abonnement Fripe Pro (12 €/mois ou 120 €/an), vérification des acomptes en attente.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const SITE = Deno.env.get('SITE_URL') ?? 'https://fripe-iota.vercel.app';
let SK = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const ORIGINS = new Set([SITE, 'http://localhost:3100']);
const PRICES = { month: { amount: 1200, key: 'fripe_bureau_month' }, year: { amount: 12000, key: 'fripe_bureau_year' } };
const LIMITS: Record<string, number> = { connect_start: 10, connect_sync: 60, connect_dashboard: 20, billing_sync: 60, billing_checkout: 10, billing_portal: 10, payments_sync: 60, delete_account: 5 };
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
  if (!r.ok) { const e = new Error(d?.error?.message ?? 'stripe'); (e as any).code = d?.error?.code; throw e; }
  return d;
}

async function priceFor(interval: 'month' | 'year') {
  const p = PRICES[interval];
  const found = await stripe(`prices?lookup_keys[]=${p.key}&active=true&limit=1`, undefined, 'GET');
  if (found.data.length) return found.data[0].id;
  let exists = true;
  try { await stripe('products/fripe_bureau', undefined, 'GET'); } catch { exists = false; }
  if (!exists) await stripe('products', { id: 'fripe_bureau', name: 'Fripe Pro', description: 'Rendez-vous et factures illimités, acomptes, tableau de bord.', tax_code: 'txcd_10103000' });
  const c = await stripe('prices', { product: 'fripe_bureau', currency: 'eur', unit_amount: p.amount, recurring: { interval }, lookup_key: p.key, nickname: `Fripe Pro ${interval === 'month' ? 'mensuel' : 'annuel'}` });
  return c.id;
}

Deno.serve(async (req) => {
  const h = cors(req);
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...h, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: h });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  if (!SK) { const { data } = await db.rpc('stripe_secret_key'); SK = typeof data === 'string' ? data : ''; }
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await db.auth.getUser(token);
  if (!user) return json({ error: 'unauthorized' }, 401);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* vide */ }
  const action = String(body.action ?? '');
  if (!Object.hasOwn(LIMITS, action)) return json({ error: 'unknown_action' }, 400);
  const { data: allowed } = await db.rpc('rate_hit', { uid: user.id, bucket: 'pro_' + action, max_hits: LIMITS[action], win_seconds: 600 });
  if (allowed === false) return json({ error: 'rate_limited' }, 429);

  const { data: biz } = await db.from('businesses').select('*').eq('owner', user.id).maybeSingle();
  let { data: acct } = await db.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (!acct) { await db.from('accounts').insert({ user_id: user.id }); acct = { user_id: user.id, plan: 'free', is_admin: false }; }
  const mode = SK.startsWith('sk_live') ? 'live' : 'test';

  try {
    if (action === 'delete_account') {
      if (acct.is_admin) return json({ error: 'admin_account' }, 400);
      if (SK && acct.stripe_subscription_id && acct.stripe_mode === mode) { try { await stripe(`subscriptions/${acct.stripe_subscription_id}`, undefined, 'DELETE'); } catch { /* déjà annulé */ } }
      const { error } = await db.auth.admin.deleteUser(user.id);
      return error ? json({ error: 'delete_failed' }, 500) : json({ ok: true });
    }
    if (!SK) return json({ error: 'stripe_not_configured' }, 503);

    // ---------- Stripe Connect : le compte qui reçoit les acomptes ----------
    if (action.startsWith('connect_')) {
      if (!biz) return json({ error: 'no_business' }, 400);
      let accountId = biz.stripe_account_id as string | null;
      if (action === 'connect_start') {
        if (!accountId) {
          const a = await stripe('accounts', {
            type: 'express', country: 'FR', email: user.email, business_type: 'individual', default_currency: 'eur',
            capabilities: { card_payments: { requested: 'true' }, transfers: { requested: 'true' } },
            business_profile: { name: biz.name || undefined, product_description: biz.metier ? `Prestations : ${biz.metier}` : undefined, url: biz.slug ? `${SITE}/r/${biz.slug}` : undefined },
            metadata: { business_id: biz.id },
          });
          accountId = a.id;
          await db.from('businesses').update({ stripe_account_id: accountId }).eq('id', biz.id);
        }
        const link = await stripe('account_links', { account: accountId, type: 'account_onboarding', refresh_url: `${SITE}/app/reglages?stripe=relance`, return_url: `${SITE}/app/reglages?stripe=retour` });
        return json({ url: link.url });
      }
      if (!accountId) return json({ ready: false, connected: false });
      if (action === 'connect_sync') {
        const a = await stripe(`accounts/${accountId}`, undefined, 'GET');
        const ready = !!a.charges_enabled;
        if (ready !== biz.stripe_ready) await db.from('businesses').update({ stripe_ready: ready }).eq('id', biz.id);
        return json({ connected: true, ready, details_submitted: !!a.details_submitted, payouts: !!a.payouts_enabled });
      }
      if (action === 'connect_dashboard') {
        const l = await stripe(`accounts/${accountId}/login_links`, {});
        return json({ url: l.url });
      }
    }

    // ---------- acomptes en attente : relecture chez Stripe ----------
    if (action === 'payments_sync') {
      if (!biz?.stripe_account_id) return json({ updated: 0 });
      const { data: pend } = await db.from('bookings').select('*, services(name)').eq('business_id', biz.id).eq('deposit_status', 'pending').not('stripe_session_id', 'is', null).limit(20);
      let updated = 0;
      for (const bk of pend ?? []) {
        const s = await stripe(`checkout/sessions/${bk.stripe_session_id}`, undefined, 'GET', biz.stripe_account_id);
        if (s.payment_status === 'paid') {
          const pi = typeof s.payment_intent === 'string' ? s.payment_intent : s.payment_intent?.id;
          const r = await db.from('bookings').update({ status: 'confirmed', deposit_status: 'paid', stripe_payment_intent: pi }).eq('id', bk.id).eq('deposit_status', 'pending').select('id');
          if (r.data?.length) { await db.from('payments').insert({ business_id: biz.id, booking_id: bk.id, client_id: bk.client_id, label: `Acompte · ${bk.services?.name ?? bk.title}`, amount_cents: bk.deposit_cents, method: 'stripe', stripe_ref: pi }); updated++; }
        } else if (s.status === 'expired' && bk.status === 'pending') {
          await db.from('bookings').update({ status: 'cancelled', deposit_status: 'none' }).eq('id', bk.id).eq('status', 'pending').eq('deposit_status', 'pending');
          updated++;
        }
      }
      return json({ updated });
    }

    // ---------- abonnement Fripe Pro ----------
    if (acct.is_admin) return action === 'billing_sync' ? json({ plan: 'pro', pro_until: null, admin: true }) : json({ error: 'admin_account' }, 400);
    const customerOk = acct.stripe_customer_id && acct.stripe_mode === mode;
    if (action === 'billing_sync') {
      if (!customerOk) {
        if (acct.plan !== 'free') await db.from('accounts').update({ plan: 'free', pro_until: null, cancel_at_period_end: false }).eq('user_id', user.id);
        return json({ plan: 'free', pro_until: null });
      }
      const subs = await stripe(`subscriptions?customer=${acct.stripe_customer_id}&status=all&limit=10`, undefined, 'GET');
      const sub = subs.data.find((s: any) => ['active', 'trialing', 'past_due'].includes(s.status));
      const end = sub ? sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end : null;
      const row = { plan: sub ? 'pro' : 'free', pro_until: end ? new Date(end * 1000).toISOString() : null, cancel_at_period_end: !!sub?.cancel_at_period_end, stripe_subscription_id: sub?.id ?? null };
      await db.from('accounts').update(row).eq('user_id', user.id);
      return json(row);
    }
    let customer = customerOk ? acct.stripe_customer_id : null;
    if (!customer) {
      const c = await stripe('customers', { email: user.email, metadata: { user_id: user.id } });
      customer = c.id;
      await db.from('accounts').update({ stripe_customer_id: customer, stripe_mode: mode }).eq('user_id', user.id);
    }
    if (action === 'billing_checkout') {
      const price = await priceFor(body.interval === 'year' ? 'year' : 'month');
      const s = await stripe('checkout/sessions', {
        mode: 'subscription', customer, client_reference_id: user.id, locale: 'fr', allow_promotion_codes: 'true',
        line_items: [{ price, quantity: 1 }], subscription_data: { metadata: { user_id: user.id } },
        success_url: `${SITE}/app/reglages?pro=ok`, cancel_url: `${SITE}/app/reglages`,
        custom_text: { submit: { message: `Résiliable à tout moment depuis Réglages. Conditions : ${SITE}/cgv` } },
      });
      return json({ url: s.url });
    }
    if (action === 'billing_portal') {
      const cfg = await stripe('billing_portal/configurations?limit=1', undefined, 'GET');
      if (!cfg.data.length) {
        await stripe('billing_portal/configurations', { business_profile: { headline: 'Fripe Pro' }, features: { subscription_cancel: { enabled: 'true', mode: 'at_period_end' }, payment_method_update: { enabled: 'true' }, invoice_history: { enabled: 'true' } } });
      }
      const s = await stripe('billing_portal/sessions', { customer, return_url: `${SITE}/app/reglages`, locale: 'fr' });
      return json({ url: s.url });
    }
    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    console.error(action, (e as Error).message);
    const msg = (e as Error).message || '';
    if (msg.includes('signed up for Connect')) return json({ error: 'connect_disabled' }, 503);
    return json({ error: 'stripe_error' }, 502);
  }
});
