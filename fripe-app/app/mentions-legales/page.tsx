import type { Metadata } from 'next';
import LegalShell from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Mentions légales — Fripe' };

export default function Page() {
  return (
    <LegalShell title="Mentions légales">
      <p>Conformément à l’article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN).</p>
      <h2>Éditeur du site</h2>
      <p><b>Fripe</b>, service édité par <b>David Paré</b>, entrepreneur individuel (EI – micro-entreprise)<br />
        16 allée de l’Orée du Grand Clos, 35630 Vignoc, France<br />
        SIRET : 131 678 013 00015 — TVA non applicable, article 293 B du CGI<br />
        E-mail : <a href="mailto:maxence.pare35000@gmail.com">maxence.pare35000@gmail.com</a> — Téléphone : 07 54 38 37 49</p>
      <h2>Hébergement</h2>
      <p><b>Site web :</b> Vercel Inc., 440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis — vercel.com<br />
        <b>Base de données :</b> Supabase Inc., 970 Toa Payoh North #07-04, Singapour 318992 — supabase.com. Les données sont stockées sur des serveurs situés à Paris (France).</p>
      <h2>Propriété intellectuelle</h2>
      <p>Le nom Fripe, les textes, visuels et éléments graphiques de ce site sont la propriété de l’éditeur. Toute reproduction sans autorisation est interdite.</p>
    </LegalShell>
  );
}
