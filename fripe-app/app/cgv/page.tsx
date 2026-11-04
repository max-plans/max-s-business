import type { Metadata } from 'next';
import LegalShell from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Conditions générales — Fripe' };

export default function Page() {
  return (
    <LegalShell title="Conditions générales">
      <p>Mise à jour le 4 novembre 2026.</p>
      <h2>1. Le service</h2>
      <p>Fripe est un logiciel en ligne pour les indépendants : page de réservation, acomptes en ligne, factures et devis, suivi des encaissements, des dépenses et des cotisations estimées. Il est édité par David Paré, entrepreneur individuel (voir les mentions légales).</p>
      <h2>2. Compte</h2>
      <p>Le compte est créé avec une adresse e-mail ; la connexion se fait par un lien envoyé à cette adresse. Tu es responsable de l’accès à ta messagerie et de l’exactitude des informations saisies, notamment celles qui figurent sur tes factures (nom, adresse, SIRET).</p>
      <h2>3. Formules et prix</h2>
      <p>Formule gratuite : 10 rendez-vous et 5 factures par mois. Formule Pro : 12 € par mois ou 120 € par an, sans limite. Fripe ne prend aucune commission sur tes encaissements ; seuls les frais du prestataire de paiement (Stripe) s’appliquent aux acomptes payés en ligne. L’abonnement se renouvelle automatiquement et se résilie à tout moment depuis Réglages, avec effet à la fin de la période payée. Si tu changes d’avis dans les 14 jours suivant ta première souscription, écris-nous : tu es remboursé.</p>
      <h2>4. Paiements de tes clients</h2>
      <p>Les acomptes sont encaissés directement sur ton compte Stripe, ouvert à ton nom. Tu restes seul responsable de ta relation avec tes clients : prestation, prix, conditions d’annulation et remboursements.</p>
      <h2>5. Factures et chiffres</h2>
      <p>Fripe numérote tes factures dans l’ordre chronologique et les fige une fois émises. Les cotisations URSSAF et le bénéfice affichés sont des estimations calculées à partir des taux que tu choisis ; ils ne remplacent ni ta déclaration ni l’avis d’un expert-comptable.</p>
      <h2>6. Tes données</h2>
      <p>Tes données et celles de tes clients t’appartiennent. Fripe les traite uniquement pour fournir le service (voir la page Confidentialité). Tu peux supprimer ton compte à tout moment depuis Réglages ; tes données sont alors effacées.</p>
      <h2>7. Disponibilité et responsabilité</h2>
      <p>Fripe fait le nécessaire pour que le service soit disponible et fiable, sans pouvoir le garantir en permanence. Sa responsabilité est limitée aux sommes payées pour l’abonnement au cours des 12 derniers mois.</p>
      <h2>8. Droit applicable</h2>
      <p>Ces conditions sont soumises au droit français. En cas de litige, une solution amiable est recherchée en priorité ; à défaut, les tribunaux compétents sont ceux du ressort de Rennes, sous réserve des règles protectrices du consommateur.</p>
    </LegalShell>
  );
}
