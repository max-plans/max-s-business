// Abonnement Fripe Pro : paiement Stripe, gestion de l'abonnement, état du compte et suppression du compte.
// Pas de webhook : l'état est relu chez Stripe au retour du paiement et à chaque ouverture de l'espace.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

// clé Stripe : variable d'environnement, sinon coffre chiffré Supabase (Vault) via stripe_secret_key()
let SK = Deno.env.get('STRIPE_SECRET_KEY') ?? '';
const SITE = Deno.env.get('SITE_URL') ?? 'https://fripe-iota.vercel.app';
const TAX_CODE = 'txcd_10103000';
const PRICES = { month: { amount: 699, key: 'fripe_pro_month' }, year: { amount: 5900, key: 'fripe_pro_year' } };
// CORS : seul le site Fripe peut appeler la fonction depuis un navigateur
const ORIGINS = new Set([SITE, 'https://fripe-max-82d8.vercel.app']);
const corsFor = (req: Request) => {
  const o = req.headers.get('Origin') ?? '';
  return {
    'Access-Control-Allow-Origin': ORIGINS.has(o) ? o : SITE,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};
// limites par compte sur 10 minutes : la synchro est fréquente, le paiement et la suppression non
const LIMITS: Record<string, number> = { sync: 60, checkout: 10, portal: 10, delete_account: 5 };

/* paramètres Stripe imbriqués au format formulaire : a[b]=1, items[0][price]=x */
function form(obj: Record<string, unknown>, pre = '', out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = pre ? `${pre}[${k}]` : k;
    if (typeof v === 'object') form(v as Record<string, unknown>, key, out); else out.append(key, String(v));
  }
  return out;
}
async function stripe(path: string, params?: Record<string, unknown>, method = 'POST') {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method,
    headers: { Authorization: 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-03-31.basil' },
    body: method === 'GET' || !params ? undefined : form(params),
  });
  const d = await r.json();
  if (!r.ok) { const e = new Error(d?.error?.message ?? 'stripe'); (e as any).status = r.status; (e as any).code = d?.error?.code; throw e; }
  return d;
}

// code fiscal « logiciel en ligne (SaaS), usage personnel » : exigé quand Stripe gère la TVA (Managed Payments)
let taxOk = false;
async function ensureTaxCode() {
  if (taxOk) return;
  const prod = await stripe('products/fripe_pro', undefined, 'GET');
  if (prod.tax_code !== TAX_CODE) await stripe('products/fripe_pro', { tax_code: TAX_CODE });
  taxOk = true;
}

async function priceFor(interval: 'month' | 'year') {
  const p = PRICES[interval];
  const found = await stripe(`prices?lookup_keys[]=${p.key}&active=true&limit=1`, undefined, 'GET');
  if (found.data.length) { await ensureTaxCode(); return found.data[0].id; }
  let exists = true;
  try { await stripe('products/fripe_pro', undefined, 'GET'); } catch { exists = false; }
  if (exists) await ensureTaxCode();
  else { await stripe('products', { id: 'fripe_pro', name: 'Fripe Pro', description: 'Articles illimités et import Vinted complet.', tax_code: TAX_CODE }); taxOk = true; }
  const created = await stripe('prices', { product: 'fripe_pro', currency: 'eur', unit_amount: p.amount, recurring: { interval }, lookup_key: p.key, nickname: `Fripe Pro ${interval === 'month' ? 'mensuel' : 'annuel'}` });
  return created.id;
}

Deno.serve(async (req) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  if (!SK) { const { data } = await admin.rpc('stripe_secret_key'); SK = typeof data === 'string' ? data : ''; }
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return json({ error: 'unauthorized' }, 401);

  let body: { action?: string; interval?: string } = {};
  try { body = await req.json(); } catch { /* corps vide */ }
  const action = body.action ?? 'sync';
  if (!Object.hasOwn(LIMITS, action)) return json({ error: 'unknown_action' }, 400);
  const { data: allowed } = await admin.rpc('rate_hit', { uid: user.id, bucket: 'billing_' + action, max_hits: LIMITS[action], win_seconds: 600 });
  if (allowed === false) return json({ error: 'rate_limited' }, 429);

  let { data: acct } = await admin.from('accounts').select('*').eq('user_id', user.id).maybeSingle();
  if (!acct) { await admin.from('accounts').insert({ user_id: user.id }); acct = { user_id: user.id, plan: 'free' }; }
  const mode = SK.startsWith('sk_live') ? 'live' : 'test';
  const customerOk = acct.stripe_customer_id && acct.stripe_mode === mode;

  try {
    if (action === 'delete_account') {
      if (SK && customerOk && acct.stripe_subscription_id) { try { await stripe(`subscriptions/${acct.stripe_subscription_id}`, undefined, 'DELETE'); } catch { /* déjà annulé */ } }
      const { error } = await admin.auth.admin.deleteUser(user.id);
      if (error) return json({ error: 'delete_failed' }, 500);
      return json({ ok: true });
    }

    // compte admin (propriétaire de Fripe) : Pro à vie, jamais facturé ni rétrogradé
    if (acct.is_admin) return action === 'sync' ? json({ plan: 'pro', pro_until: null, admin: true }) : json({ error: 'admin_account' }, 400);

    if (!SK) return json({ error: 'stripe_not_configured', plan: acct.plan, pro_until: acct.pro_until }, action === 'sync' ? 200 : 503);

    if (action === 'sync') {
      if (!customerOk) {
        if (acct.plan !== 'free') await admin.from('accounts').update({ plan: 'free', pro_until: null, cancel_at_period_end: false }).eq('user_id', user.id);
        return json({ plan: 'free', pro_until: null });
      }
      const subs = await stripe(`subscriptions?customer=${acct.stripe_customer_id}&status=all&limit=10`, undefined, 'GET');
      const sub = subs.data.find((s: any) => ['active', 'trialing', 'past_due'].includes(s.status));
      const end = sub ? sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end : null;
      const row = { plan: sub ? 'pro' : 'free', pro_until: end ? new Date(end * 1000).toISOString() : null, cancel_at_period_end: !!sub?.cancel_at_period_end, stripe_subscription_id: sub?.id ?? null };
      await admin.from('accounts').update(row).eq('user_id', user.id);
      return json(row);
    }

    let customer = customerOk ? acct.stripe_customer_id : null;
    if (!customer) {
      const c = await stripe('customers', { email: user.email, metadata: { user_id: user.id } });
      customer = c.id;
      await admin.from('accounts').update({ stripe_customer_id: customer, stripe_mode: mode }).eq('user_id', user.id);
    }

    if (action === 'checkout') {
      const interval = body.interval === 'year' ? 'year' : 'month';
      const price = await priceFor(interval);
      const s = await stripe('checkout/sessions', {
        mode: 'subscription', customer, client_reference_id: user.id, locale: 'fr', allow_promotion_codes: 'true',
        line_items: [{ price, quantity: 1 }], subscription_data: { metadata: { user_id: user.id } },
        success_url: `${SITE}/?pro=ok#reglages`, cancel_url: `${SITE}/#reglages`,
        // paiement classique : Fripe encaisse elle-même (Managed Payments, où Stripe revend à notre place, reste désactivé)
        managed_payments: { enabled: 'false' },
        custom_text: { submit: { message: `En t’abonnant, tu acceptes les conditions générales de Fripe (${SITE}/legal.html#cgv). Résiliable à tout moment depuis Réglages, remboursé si tu changes d’avis sous 14 jours.` } },
      });
      return json({ url: s.url });
    }

    if (action === 'portal') {
      const cfg = await stripe('billing_portal/configurations?limit=1', undefined, 'GET');
      if (!cfg.data.length) {
        await stripe('billing_portal/configurations', {
          business_profile: { headline: 'Fripe Pro' },
          features: { subscription_cancel: { enabled: 'true', mode: 'at_period_end' }, payment_method_update: { enabled: 'true' }, invoice_history: { enabled: 'true' } },
        });
      }
      const s = await stripe('billing_portal/sessions', { customer, return_url: `${SITE}/#reglages`, locale: 'fr' });
      return json({ url: s.url });
    }

    return json({ error: 'unknown_action' }, 400);
  } catch (e) {
    // le détail reste dans les journaux du serveur, le navigateur ne reçoit qu'un code générique
    console.error(action, (e as Error).message);
    return json({ error: 'stripe_error' }, 502);
  }
});
