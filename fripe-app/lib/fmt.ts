// Montants, dates et heures (fuseau Europe/Paris), règles URSSAF de la micro-entreprise.
export const TZ = 'Europe/Paris';

export const euros = (cents: number, decimals?: boolean) => {
  const v = (cents || 0) / 100;
  const d = decimals ?? !Number.isInteger(v);
  return v.toLocaleString('fr-FR', { minimumFractionDigits: d ? 2 : 0, maximumFractionDigits: d ? 2 : 0 }).replace(/ /g, ' ') + ' €';
};
// « 45 », « 45,5 », « 45.50 € » → centimes
export const toCents = (s: string | number) => {
  const n = Number(String(s).replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};
export const centsInput = (c: number | null | undefined) => (c == null ? '' : (c % 100 ? (c / 100).toFixed(2) : String(c / 100)).replace('.', ','));

// parties locales (Paris) d'un instant
export function parts(d: Date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { y: +p.year, m: +p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday), day: `${p.year}-${p.month}-${p.day}` };
}
// date locale « AAAA-MM-JJ » + minutes depuis minuit (Paris) → instant
export function fromLocal(day: string, min: number) {
  const [y, m, d] = day.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, Math.floor(min / 60), min % 60);
  let t = guess;
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(t));
    const asUtc = Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi);
    t = guess - (asUtc - t);
  }
  return new Date(t);
}
export const todayLocal = () => parts(new Date()).day;
export function addDays(day: string, n: number) {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}
export const weekdayOf = (day: string) => { const [y, m, d] = day.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); };
export const hm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
export const parseHm = (s: string) => { const m = /^(\d{1,2})[:h](\d{2})?$/.exec(s.trim()); return m ? +m[1] * 60 + +(m[2] || 0) : NaN; };

const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('fr-FR', { timeZone: TZ, ...o });
export const fmtTime = (d: string | Date) => f({ hour: '2-digit', minute: '2-digit' }).format(new Date(d));
export const fmtDay = (d: string | Date) => f({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d));
export const fmtShort = (d: string | Date) => f({ weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d));
export const fmtDate = (d: string | Date) => f({ day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(typeof d === 'string' && d.length === 10 ? d + 'T12:00:00Z' : d));
export const fmtMonth = (y: number, m: number) => new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15)));
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const dayLabel = (day: string) => {
  const t = todayLocal();
  if (day === t) return 'Aujourd’hui';
  if (day === addDays(t, 1)) return 'Demain';
  if (day === addDays(t, -1)) return 'Hier';
  return cap(fmtDay(day + 'T12:00:00Z'));
};

// ---------- micro-entreprise (montants 2026, modifiables dans Réglages) ----------
export const ACTIVITIES = {
  bic_services: { label: 'Prestations de services artisanales ou commerciales (BIC)', rate: 21.2, ceiling: 8360000, vat: 3750000 },
  bnc: { label: 'Profession libérale (BNC)', rate: 26.1, ceiling: 8360000, vat: 3750000 },
  bic_vente: { label: 'Vente de marchandises (BIC)', rate: 12.3, ceiling: 20310000, vat: 8500000 },
} as const;
export type Activity = keyof typeof ACTIVITIES;

export const slugify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
export const phoneIntl = (p: string) => { const d = p.replace(/\D/g, ''); return d.startsWith('0') && d.length === 10 ? '33' + d.slice(1) : d; };
