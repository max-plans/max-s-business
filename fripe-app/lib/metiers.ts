// Métiers mis en avant : un même produit, un message adapté à chacun (pages /pour/[métier]).
export type Metier = { slug: string; label: string; who: string; service: string; duration: string; price: number; client: string; pain: string };

export const METIERS: Metier[] = [
  { slug: 'ongles', label: 'Ongles', who: 'prothésistes ongulaires', service: 'Pose gel', duration: '1 h 30', price: 45, client: 'Léa', pain: 'les clientes qui ne viennent pas' },
  { slug: 'cils', label: 'Cils', who: 'techniciennes cils', service: 'Extension cil à cil', duration: '2 h', price: 70, client: 'Inès', pain: 'les annulations de dernière minute' },
  { slug: 'coiffure', label: 'Coiffure', who: 'coiffeuses à domicile', service: 'Coupe et brushing', duration: '1 h', price: 35, client: 'Sarah', pain: 'les rendez-vous pris en messages privés' },
  { slug: 'maquillage', label: 'Maquillage', who: 'maquilleuses', service: 'Maquillage mariée', duration: '2 h', price: 120, client: 'Camille', pain: 'les acomptes demandés à la main' },
  { slug: 'tatouage', label: 'Tatouage', who: 'tatoueurs', service: 'Pièce flash', duration: '2 h', price: 150, client: 'Hugo', pain: 'les acomptes jamais versés' },
  { slug: 'coach', label: 'Coaching', who: 'coachs sportifs', service: 'Séance individuelle', duration: '1 h', price: 40, client: 'Julien', pain: 'les forfaits suivis sur un carnet' },
  { slug: 'cours', label: 'Cours particuliers', who: 'profs particuliers', service: 'Cours de maths', duration: '1 h', price: 25, client: 'Nathan', pain: 'les heures à facturer en fin de mois' },
  { slug: 'photo', label: 'Photo', who: 'photographes', service: 'Shooting portrait', duration: '1 h', price: 90, client: 'Manon', pain: 'les devis et acomptes éparpillés' },
  { slug: 'bien-etre', label: 'Bien-être', who: 'praticiens bien-être', service: 'Massage relaxant', duration: '1 h', price: 60, client: 'Claire', pain: 'les créneaux perdus' },
  { slug: 'toilettage', label: 'Toilettage', who: 'toiletteurs', service: 'Toilettage chien moyen', duration: '1 h 30', price: 50, client: 'Paul', pain: 'les oublis de rendez-vous' },
];

export const metierBySlug = (slug: string) => METIERS.find((m) => m.slug === slug);
export const eur = (n: number) => n.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: n % 1 ? 2 : 0 });
