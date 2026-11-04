// Projet Supabase de Fripe. La clé « publishable » est faite pour être visible côté navigateur :
// la base ne lui permet que ce qui est explicitement autorisé (ici, s'inscrire sur la liste d'attente).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tlmfldqzdptzylfkuyhz.supabase.co';
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bebJiUXcC2VHHQIFOQIfGw_p5iquCmg';

export async function joinWaitlist(email: string, metier: string, source: string): Promise<'ok' | 'invalid' | 'busy' | 'error'> {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/join_waitlist`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: SUPABASE_KEY },
      body: JSON.stringify({ p_email: email, p_metier: metier || null, p_source: source || null }),
    });
    if (!r.ok) return 'error';
    const v = await r.json();
    return v === 'ok' || v === 'invalid' || v === 'busy' ? v : 'error';
  } catch { return 'error'; }
}
