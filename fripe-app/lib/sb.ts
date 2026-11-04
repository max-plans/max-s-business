'use client';
// Client Supabase du navigateur : session conservée sur l'appareil, lien de connexion lu dans l'URL au retour.
// Toutes les lectures et écritures passent par la base, qui n'autorise que les données de l'activité du compte (RLS).
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './supabase';

let client: SupabaseClient | null = null;
export function sb() {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'fripe-auth' } });
  return client;
}

// fonctions serveur (Supabase Edge Functions)
export async function fn<T = Record<string, unknown>>(name: 'pro' | 'book', body: Record<string, unknown>, auth = true): Promise<T & { error?: string }> {
  const headers: Record<string, string> = { 'content-type': 'application/json', apikey: SUPABASE_KEY };
  if (auth) {
    const { data } = await sb().auth.getSession();
    if (data.session) headers.authorization = `Bearer ${data.session.access_token}`;
  }
  try {
    const r = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, { method: 'POST', headers, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return (r.ok ? j : { ...j, error: j?.error || `http_${r.status}` }) as T & { error?: string };
  } catch {
    return { error: 'network' } as T & { error?: string };
  }
}

// messages d'erreur de la base, en clair
export function errText(e: unknown): string {
  const m = typeof e === 'string' ? e : (e as { message?: string })?.message || '';
  if (m.includes('free_limit_bookings')) return 'Formule gratuite : 10 rendez-vous par mois. Passe en Pro pour continuer.';
  if (m.includes('free_limit_invoices')) return 'Formule gratuite : 5 factures par mois. Passe en Pro pour continuer.';
  if (m.includes('bookings_no_overlap') || m.includes('23P01')) return 'Ce créneau chevauche un autre rendez-vous.';
  if (m.includes('seller_incomplete')) return 'Complète ton nom, ton adresse et ton SIRET dans Réglages pour émettre une facture.';
  if (m.includes('no_client')) return 'Choisis un client.';
  if (m.includes('empty')) return 'Ajoute au moins une ligne.';
  if (m.includes('issued_locked')) return 'Un document émis ne se modifie plus. Annule-le et crée-en un nouveau.';
  if (m.includes('businesses_slug_key') || m.includes('duplicate key') && m.includes('slug')) return 'Cette adresse de page est déjà prise.';
  if (m.includes('businesses_slug_check')) return 'Adresse de page : lettres minuscules, chiffres et tirets (3 à 40 caractères).';
  if (m.includes('siret_check') || m.includes('businesses_siret')) return 'Le SIRET compte 14 chiffres.';
  if (m.includes('rate_limited')) return 'Trop de tentatives, réessaie dans quelques minutes.';
  if (m.includes('connect_disabled')) return 'Les paiements en ligne ne sont pas encore ouverts sur Fripe. Réessaie bientôt.';
  if (m.includes('network') || m.includes('Failed to fetch')) return 'Connexion impossible. Vérifie ton réseau.';
  return 'Une erreur est survenue. Réessaie.';
}
