import type { Metadata } from 'next';
import LegalShell from '@/components/LegalShell';

export const metadata: Metadata = { title: 'Confidentialité — Fripe' };

export default function Page() {
  return (
    <LegalShell title="Confidentialité">
      <p>Mise à jour le 4 novembre 2026.</p>
      <h2>Responsable du traitement</h2>
      <p>David Paré, entrepreneur individuel, éditeur de Fripe (voir les mentions légales). Contact : <a href="mailto:maxence.pare35000@gmail.com">maxence.pare35000@gmail.com</a>.</p>
      <h2>Liste d’attente</h2>
      <p>Si tu t’inscris à la liste d’attente : ton adresse e-mail, le métier indiqué (facultatif), la page d’inscription et la date. Pour te prévenir des nouveautés de Fripe, sur la base de ton consentement. Conservées au plus 12 mois.</p>
      <h2>Comptes professionnels</h2>
      <p>Si tu utilises Fripe : ton e-mail de connexion, les informations de ton activité (nom, adresse, SIRET, prestations, horaires), tes rendez-vous, factures, encaissements et dépenses. Pour fournir le service, sur la base du contrat (conditions générales). Conservées tant que le compte existe ; les factures émises peuvent être conservées 10 ans au titre des obligations comptables, sauf suppression du compte à ta demande.</p>
      <h2>Clients des professionnels</h2>
      <p>Quand tu réserves sur la page d’un professionnel : ton nom, ton e-mail, ton téléphone, ton message et ton rendez-vous. Le professionnel est responsable de ces données ; Fripe les traite pour son compte (sous-traitant) et ne les utilise jamais pour autre chose. Pour exercer tes droits, adresse-toi au professionnel ou écris-nous.</p>
      <h2>Sous-traitants</h2>
      <p>Vercel (hébergement du site), Supabase (base de données, serveurs à Paris), Brevo (envoi des e-mails de connexion, France), Stripe (paiements en ligne des acomptes et des abonnements). Les données de carte bancaire sont saisies chez Stripe et ne passent jamais par Fripe.</p>
      <h2>Tes droits</h2>
      <p>Accès, rectification, suppression, opposition, portabilité et retrait du consentement à tout moment, en écrivant à l’adresse ci-dessus ou en supprimant ton compte depuis Réglages. Tu peux aussi saisir la CNIL (cnil.fr).</p>
      <h2>Cookies</h2>
      <p>Aucun cookie publicitaire ni outil de mesure d’audience tiers. Ta session de connexion est gardée dans le stockage de ton navigateur, uniquement pour te garder connecté.</p>
    </LegalShell>
  );
}
