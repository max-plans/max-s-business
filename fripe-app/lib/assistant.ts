// Assistant « une phrase → un rendez-vous » : lit une phrase en français et en tire le client, la prestation,
// le jour, l'heure et le prix. Tout se fait dans le navigateur ; le pro vérifie avant de valider.
// Exemples : « Léa, pose gel samedi 14h, 45 € », « demain 9h30 coupe pour Karim », « le 12/12 à 18h coaching Julie 40e »
import { addDays, todayLocal, weekdayOf } from './fmt';
import type { Client, Service } from './types';

export type Parsed = { clientName: string; client: Client | null; service: Service | null; day: string | null; min: number | null; price_cents: number | null; duration_min: number | null; title: string };

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
const STOP = new Set(['avec', 'pour', 'chez', 'a', 'le', 'la', 'les', 'de', 'du', 'des', 'et', 'rdv', 'rendez', 'vous', 'rendez-vous', 'un', 'une', 'h', 'heure', 'heures', 'euros', 'euro', 'e', 'prochain', 'prochaine', 'ce', 'cette', 'matin', 'soir', 'apres', 'midi', 'apres-midi', 'demain', 'aujourd', 'hui', "aujourd'hui", 'min', 'minutes', 'acompte']);

export function parseSentence(text: string, services: Service[], clients: Client[]): Parsed {
  let t = ' ' + norm(text).replace(/[’']/g, "'") + ' ';
  const today = todayLocal();
  const cut = (re: RegExp) => { t = t.replace(re, ' '); };

  // prix : « 45 € », « 45e », « 45 euros », « 45,50€ »
  let price: number | null = null;
  const pm = /(\d+(?:[.,]\d{1,2})?)\s?(?:€|eur(?:os?)?\b|e\b)/.exec(t);
  if (pm) { price = Math.round(parseFloat(pm[1].replace(',', '.')) * 100); cut(new RegExp(pm[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))); }

  // durée : « 1h30 de », « 45 min »
  let duration: number | null = null;
  const dm = /(\d{1,3})\s?min(?:utes)?\b/.exec(t);
  if (dm) { duration = +dm[1]; cut(/(\d{1,3})\s?min(?:utes)?\b/); }

  // date
  let day: string | null = null;
  if (/apres[- ]demain/.test(t)) { day = addDays(today, 2); cut(/apres[- ]demain/); }
  else if (/\bdemain\b/.test(t)) { day = addDays(today, 1); cut(/\bdemain\b/); }
  else if (/aujourd'?hui|ce soir|ce matin|cet apres[- ]midi/.test(t)) { day = today; cut(/aujourd'?hui/); }
  if (!day) {
    const d1 = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/.exec(t);
    const d2 = new RegExp(`\\b(\\d{1,2})(?:er)?\\s+(${MONTHS.join('|')})\\b`).exec(t);
    const d3 = /\ble\s+(\d{1,2})(?:er)?\b(?!\s*h)/.exec(t);
    const pick = (dd: number, mm: number, yy?: number) => {
      const ty = +today.slice(0, 4);
      let y = yy ? (yy < 100 ? 2000 + yy : yy) : ty;
      let cand = `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      if (!yy && cand < today) { y += 1; cand = `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`; }
      return cand;
    };
    if (d1 && +d1[2] >= 1 && +d1[2] <= 12) { day = pick(+d1[1], +d1[2], d1[3] ? +d1[3] : undefined); cut(/\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/); }
    else if (d2) { day = pick(+d2[1], MONTHS.indexOf(d2[2]) + 1); t = t.replace(d2[0], ' '); }
    else {
      const wd = DAYS.findIndex((d) => new RegExp(`\\b${d}\\b`).test(t));
      if (wd >= 0) {
        let n = (wd - weekdayOf(today) + 7) % 7;
        if (n === 0) n = 7;
        day = addDays(today, n);
        cut(new RegExp(`\\b${DAYS[wd]}\\b`));
      } else if (d3) {
        const [, tm] = today.split('-').map(Number);
        const dd = +d3[1];
        let cand = `${today.slice(0, 5)}${String(tm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
        if (cand < today) cand = addMonth(cand);
        day = cand; t = t.replace(d3[0], ' ');
      }
    }
  }

  // heure : « 14h », « 14h30 », « 14:30 », « à 9 h », « midi »
  let min: number | null = null;
  const hmm = /\b(\d{1,2})\s?(?:h|:)\s?(\d{2})?\b/.exec(t);
  if (hmm && +hmm[1] < 24) { min = +hmm[1] * 60 + (hmm[2] ? +hmm[2] : 0); t = t.replace(hmm[0], ' '); }
  else if (/\bmidi\b/.test(t)) { min = 720; cut(/\bmidi\b/); }
  else { const a = /\ba\s+(\d{1,2})\b/.exec(t); if (a && +a[1] >= 7 && +a[1] <= 21) { min = +a[1] * 60; t = t.replace(a[0], ' '); } }
  if (min != null && min < 7 * 60 && /apres[- ]midi|soir/.test(norm(text))) min += 12 * 60;

  // prestation : celle dont le nom partage le plus de mots avec la phrase
  let service: Service | null = null, best = 0;
  for (const s of services) {
    const words = norm(s.name).split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    const score = words.filter((w) => t.includes(w)).length / Math.max(1, words.length);
    if (score > best) { best = score; service = s; }
  }
  if (best < 0.5) service = null;
  if (service) for (const w of norm(service.name).split(/[^a-z0-9]+/).filter((x) => x.length > 2)) t = t.replace(new RegExp(`\\b${w}\\w*`, 'g'), ' ');

  // client : client existant cité dans la phrase, sinon les mots restants qui ressemblent à un prénom
  let client: Client | null = null;
  for (const c of clients) {
    const first = norm(c.name).split(/\s+/)[0];
    if (first.length > 1 && new RegExp(`\\b${first.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(norm(text))) {
      if (!client || norm(c.name).length > norm(client.name).length) client = c;
    }
  }
  const original = text.replace(/[,;.!?]/g, ' ').split(/\s+/).filter(Boolean);
  const leftover = original.filter((w) => {
    const n = norm(w).replace(/[’']/g, "'");
    return /^[a-z][a-z'-]*$/.test(n) && !STOP.has(n) && t.includes(' ' + n) && !DAYS.includes(n) && !MONTHS.includes(n);
  });
  const caps = leftover.filter((w) => /^[A-ZÀ-Ý]/.test(w));
  const clientName = client ? client.name : (caps.length ? caps.slice(0, 2) : leftover.slice(0, 1)).join(' ').replace(/^./, (c) => c.toUpperCase());

  return {
    clientName, client, service, day, min,
    price_cents: price ?? service?.price_cents ?? null,
    duration_min: duration ?? service?.duration_min ?? 60,
    title: service?.name ?? '',
  };
}

function addMonth(day: string) {
  const [y, m, d] = day.split('-').map(Number);
  const nm = m === 12 ? 1 : m + 1, ny = m === 12 ? y + 1 : y;
  return `${ny}-${String(nm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
