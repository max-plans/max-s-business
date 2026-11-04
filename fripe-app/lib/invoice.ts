'use client';
// Facture automatique d'un rendez-vous terminé : brouillon → émission (numéro chronologique, document figé)
// → « payée » si tout est encaissé, avec les encaissements du rendez-vous rattachés à la facture.
import { sb } from './sb';
import type { Booking, Business, Doc } from './types';

export const sellerComplete = (b: Business) => !!(b.name && b.address && b.siret);

export async function invoiceForBooking(biz: Business, bk: Booking): Promise<{ doc?: Doc; error?: unknown }> {
  const ins = await sb().from('documents').insert({
    business_id: biz.id, kind: 'invoice', client_id: bk.client_id, booking_id: bk.id,
    items: [{ label: bk.title || 'Prestation', qty: 1, unit_cents: bk.price_cents }],
  }).select('id').single();
  if (ins.error) return { error: ins.error };
  const iss = await sb().rpc('issue_document', { doc: ins.data.id });
  if (iss.error) { await sb().from('documents').delete().eq('id', ins.data.id); return { error: iss.error }; }
  const doc = iss.data as Doc;
  await sb().from('payments').update({ document_id: doc.id }).eq('booking_id', bk.id).is('document_id', null);
  const { data: paid } = await sb().from('payments').select('amount_cents').eq('document_id', doc.id);
  const total = (paid ?? []).reduce((s, p) => s + p.amount_cents, 0);
  if (total >= doc.total_cents) {
    const u = await sb().from('documents').update({ status: 'paid' }).eq('id', doc.id).select().single();
    if (!u.error) return { doc: u.data as Doc };
  }
  return { doc };
}

export const docUrl = (d: Pick<Doc, 'public_token'>) => `${location.origin}/f/${d.public_token}`;
