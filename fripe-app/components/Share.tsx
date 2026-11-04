'use client';
// Envoi d'un message préparé (rappel, facture, relance, lien d'acompte) depuis le téléphone ou la messagerie du pro :
// WhatsApp, SMS, e-mail ou copie. Rien ne part sans son clic.
import { phoneIntl } from '@/lib/fmt';
import { Icon, copyText, useToast } from './ui';

export default function Share({ phone, email, subject, text, onSent }: { phone?: string; email?: string; subject: string; text: string; onSent?: () => void }) {
  const toast = useToast();
  const intl = phone ? phoneIntl(phone) : '';
  const enc = encodeURIComponent;
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {intl && <a className="b sm" href={`https://wa.me/${intl}?text=${enc(text)}`} target="_blank" rel="noreferrer" onClick={onSent}>WhatsApp</a>}
      {phone && <a className="b sm" href={`sms:${phone.replace(/\s/g, '')}?&body=${enc(text)}`} onClick={onSent}><Icon name="phone" />SMS</a>}
      <a className="b sm" href={`mailto:${email ?? ''}?subject=${enc(subject)}&body=${enc(text)}`} onClick={onSent}><Icon name="send" />E-mail</a>
      <button className="b sm" onClick={async () => { toast((await copyText(text)) ? 'Message copié' : 'Copie impossible'); onSent?.(); }}><Icon name="copy" />Copier</button>
    </div>
  );
}
