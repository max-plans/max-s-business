import type { Metadata } from 'next';
import LegalShell from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Confidentialité — Fripe' };

export default function Page() {
  return (
    <LegalShell title="Confidentialité">
      <p>Mise à jour le 4 novembre 2026. Cette page concerne la liste d’attente de Fripe, le service étant encore en construction.</p>
      <h2>Responsable du traitement</h2>
      <p>David Paré, entrepreneur individuel, éditeur de Fripe (voir les mentions légales). Contact : <a href="mailto:maxence.pare35000@gmail.com">maxence.pare35000@gmail.com</a>.</p>
      <h2>Données collectées</h2>
      <p>Lorsque tu t’inscris à la liste d’attente : ton adresse e-mail, le métier que tu indiques (facultatif), la page d’où tu t’es inscrit et la date d’inscription.</p>
      <h2>Pourquoi</h2>
      <p>Uniquement pour te prévenir de l’ouverture de Fripe et te proposer un accès, et pour savoir quels métiers sont intéressés. Base légale : ton consentement, donné en t’inscrivant. Aucune revente, aucune publicité de tiers.</p>
      <h2>Durée de conservation</h2>
      <p>Jusqu’à l’ouverture de Fripe et au plus 12 mois après ton inscription, ou jusqu’à ta demande de suppression.</p>
      <h2>Sous-traitants</h2>
      <p>Vercel (hébergement du site) et Supabase (base de données, serveurs à Paris). Ils traitent les données uniquement pour notre compte.</p>
      <h2>Tes droits</h2>
      <p>Tu peux accéder à tes données, les rectifier, les supprimer ou retirer ton consentement à tout moment en écrivant à l’adresse ci-dessus. Tu peux aussi saisir la CNIL (cnil.fr).</p>
      <h2>Cookies</h2>
      <p>Ce site n’utilise ni cookie publicitaire ni outil de mesure d’audience tiers.</p>
    </LegalShell>
  );
}
