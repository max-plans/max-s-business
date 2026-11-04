'use client';
// Facture ou devis vu par le client (lien privé), imprimable en PDF depuis le navigateur.
// Mentions obligatoires d'une micro-entreprise en franchise de TVA.
import { useEffect, useState } from 'react';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/supabase';
import { euros, fmtDate } from '@/lib/fmt';
import type { Item } from '@/lib/types';

type D = { kind: 'invoice' | 'quote'; number: string; status: string; items: Item[]; total_cents: number; issued_on: string; due_on: string | null; notes: string;
  client: { name?: string; address?: string; email?: string }; seller: { name?: string; legal_name?: string; address?: string; siret?: string; email?: string; phone?: string } };

export default function DocPublic({ token }: { token: string }) {
  const [d, setD] = useState<D | null | 'missing'>(null);
  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/.test(token)) { setD('missing'); return; }
    fetch(`${SUPABASE_URL}/rest/v1/rpc/public_document`, { method: 'POST', headers: { apikey: SUPABASE_KEY, 'content-type': 'application/json' }, body: JSON.stringify({ p_token: token }) })
      .then((r) => r.json()).then((j) => setD(j && j.number ? j : 'missing')).catch(() => setD('missing'));
  }, [token]);

  if (d === null) return <div className="auth"><span className="muted">Chargement…</span></div>;
  if (d === 'missing') return <div className="auth"><div className="auth-card"><h1>Document introuvable.</h1><p className="muted">Le lien est incomplet ou le document a été retiré.</p></div></div>;
  const q = d.kind === 'quote', s = d.seller, c = d.client;
  const ei = s.legal_name ? (/\bEI\b/.test(s.legal_name) ? s.legal_name : `${s.legal_name} EI`) : `${s.name} (EI)`;
  return (
    <div className="inv-wrap">
      <div className="inv-bar">
        {d.status === 'paid' && <span className="tag green" style={{ height: 42, padding: '0 16px' }}>Payée</span>}
        {d.status === 'cancelled' && <span className="tag coral" style={{ height: 42, padding: '0 16px' }}>Annulée</span>}
        <button className="b ink" onClick={() => window.print()}>Imprimer ou enregistrer en PDF</button>
      </div>
      <article className="inv">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{s.name}</div>
            <div style={{ color: '#555', marginTop: 6, lineHeight: 1.55 }}>{ei}<br />{s.address}<br />SIRET {s.siret}{s.email && <><br />{s.email}</>}{s.phone && <><br />{s.phone}</>}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1>{q ? 'Devis' : 'Facture'}</h1>
            <div style={{ marginTop: 6, lineHeight: 1.55 }}>N° <b>{d.number}</b><br />Date : {fmtDate(d.issued_on)}{d.due_on && <><br />{q ? 'Valable jusqu’au' : 'Échéance'} : {fmtDate(d.due_on)}</>}</div>
          </div>
        </div>
        <div style={{ marginTop: 34, padding: '16px 18px', background: '#f7f5f1', borderRadius: 8, maxWidth: 360 }}>
          <div style={{ fontSize: 12, color: '#777', fontWeight: 600 }}>{q ? 'Pour' : 'Facturé à'}</div>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{c.name}</div>
          {c.address && <div style={{ color: '#555' }}>{c.address}</div>}
          {c.email && <div style={{ color: '#555' }}>{c.email}</div>}
        </div>
        <table>
          <thead><tr><th>Désignation</th><th className="num">Qté</th><th className="num">Prix unitaire</th><th className="num">Total</th></tr></thead>
          <tbody>{d.items.map((i, k) => <tr key={k}><td>{i.label}</td><td className="num">{String(i.qty).replace('.', ',')}</td><td className="num">{euros(i.unit_cents, true)}</td><td className="num">{euros(Math.round(i.qty * i.unit_cents), true)}</td></tr>)}</tbody>
        </table>
        <div className="tot"><div>
          <p><span>Total HT</span><span>{euros(d.total_cents, true)}</span></p>
          <p><span>TVA</span><span>0,00 €</span></p>
          <p className="big"><span>Total à payer</span><span>{euros(d.total_cents, true)}</span></p>
        </div></div>
        {d.notes && <p style={{ marginTop: 26, whiteSpace: 'pre-wrap' }}>{d.notes}</p>}
        {q && <div style={{ marginTop: 36, display: 'flex', justifyContent: 'flex-end' }}><div style={{ width: 280, border: '1px dashed #bbb', borderRadius: 8, padding: 16, minHeight: 110, color: '#777', fontSize: 12.5 }}>Bon pour accord — date et signature</div></div>}
        <div className="legal">
          TVA non applicable, art. 293 B du CGI.<br />
          {q ? 'Devis gratuit. ' : `Date de la prestation : ${fmtDate(d.issued_on)}. Paiement à réception, au plus tard à l’échéance indiquée. Pas d’escompte pour paiement anticipé. `}
          {!q && 'En cas de retard de paiement : pénalités au taux de trois fois le taux d’intérêt légal ; pour les clients professionnels, indemnité forfaitaire pour frais de recouvrement de 40 € (art. L441-10 et D441-5 du Code de commerce).'}
        </div>
      </article>
      <p className="pub-foot no-print">Document édité avec <a href="/">Fripe</a></p>
    </div>
  );
}
