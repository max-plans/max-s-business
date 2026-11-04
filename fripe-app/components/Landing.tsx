import Link from 'next/link';
import { METIERS, eur, type Metier } from '@/lib/metiers';
import Hero3DLazy from './Hero3DLazy';
import WaitlistForm from './WaitlistForm';
import Reveal from './Reveal';
import DashTilt from './DashTilt';
import AiDemo from './AiDemo';

const Mark = () => <span className="mark" aria-hidden="true"><svg width="14" height="16" viewBox="0 0 14 16"><path d="M2 1h10v3H5.5v3H11v3H5.5v5H2z" fill="currentColor" /></svg></span>;

// Page d'accueil (liste d'attente). Avec un métier, les textes et exemples s'adaptent (pages /pour/[métier]).
export default function Landing({ metier }: { metier?: Metier }) {
  const m = metier ?? METIERS[0];
  const src = metier ? `pour-${metier.slug}` : 'accueil';
  const months = [38, 44, 41, 52, 49, 58, 61, 57, 66, 72, 69, 80];
  return (
    <>
      <Reveal />
      <header className="nav">
        <div className="wrap">
          <Link href="/" className="brand"><Mark />Fripe</Link>
          <nav className="nav-links" aria-label="Sections">
            <a href="#boucle">Comment ça marche</a><a href="#tableau">Tableau de bord</a><a href="#tarifs">Tarifs</a><a href="#faq">Questions</a>
          </nav>
          <a href="#rejoindre" className="btn">Rejoindre la liste</a>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="glow" />
          <div className="wrap">
            <div>
              <span className="eyebrow reveal"><span className="dot" />Bientôt disponible · liste d’attente ouverte</span>
              <h1 className="serif reveal" style={{ ['--d' as string]: '.08s' }}>Ton client réserve et paie. <em>La facture part toute seule.</em></h1>
              <p className="lead reveal" style={{ ['--d' as string]: '.16s' }}>
                {metier
                  ? <>Pour les {metier.who} : fini {metier.pain}. Fripe gère tes rendez-vous, tes acomptes, tes factures et ton URSSAF.</>
                  : <>Rendez-vous, acomptes, factures et URSSAF, réunis dans un seul outil pensé pour les indépendants. Sans commission sur tes ventes.</>}
              </p>
              <div className="reveal" style={{ ['--d' as string]: '.24s' }}><WaitlistForm metier={metier?.slug} source={src} /></div>
              <div className="reassure reveal" style={{ ['--d' as string]: '.3s' }}><span>Gratuit pour commencer</span><span>Sans commission</span><span>Pour tous les métiers de services</span></div>
            </div>
            <Hero3DLazy />
          </div>
        </section>

        <section className="metiers" aria-label="Métiers">
          <p className="label">Pensé pour les indépendants qui vendent leur temps</p>
          <div className="marquee"><div className="track">
            {[...METIERS, ...METIERS].map((x, i) => <Link key={i} href={`/pour/${x.slug}`} className="chip" aria-hidden={i >= METIERS.length}><i />{x.label}</Link>)}
          </div></div>
        </section>

        <section className="section" id="boucle">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow"><span className="dot" />Comment ça marche</span>
              <h2 className="serif">Du rendez-vous à la déclaration, <em>sans paperasse.</em></h2>
              <p>Une seule boucle, gérée de bout en bout. Tu fais ton métier, Fripe s’occupe du reste.</p>
            </div>
            <div className="loop">
              <div className="step reveal"><span className="n">01</span><h3>Réserver</h3><p>Ton lien en bio : le client choisit son créneau, sans messages à rallonge.</p>
                <div className="mini"><div className="r"><b>{m.service}</b><span className="muted">{m.duration}</span></div><div className="slots"><span>10:00</span><span className="on">14:00</span><span>16:30</span></div></div></div>
              <div className="step reveal" style={{ ['--d' as string]: '.08s' }}><span className="n">02</span><h3>Encaisser</h3><p>Acompte en ligne à la réservation, rappels automatiques : fini les lapins.</p>
                <div className="mini"><div className="r"><span>Acompte</span><b>{eur(Math.round(m.price / 3))}</b></div><div className="r"><span className="muted">{m.client}</span><span className="pill">Payé</span></div></div></div>
              <div className="step reveal" style={{ ['--d' as string]: '.16s' }}><span className="n">03</span><h3>Facturer</h3><p>La facture conforme part toute seule après le rendez-vous. Relances comprises.</p>
                <div className="mini"><div className="r"><span>Facture n° 2026-042</span><b>{eur(m.price)}</b></div><div className="r"><span className="muted">Envoyée</span><span className="pill ink">Auto</span></div></div></div>
              <div className="step reveal" style={{ ['--d' as string]: '.24s' }}><span className="n">04</span><h3>Déclarer</h3><p>Ton chiffre d’affaires à déclarer, prêt chaque mois. Et ce que tu gagnes vraiment.</p>
                <div className="mini"><div className="r"><span>À déclarer</span><b>2 340 €</b></div><div className="r"><span className="muted">Bénéfice réel</span><b style={{ color: 'var(--accent)' }}>1 612 €</b></div></div></div>
            </div>
          </div>
        </section>

        <section className="section" id="tableau" style={{ paddingTop: 20 }}>
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow"><span className="dot" />Ton tableau de bord</span>
              <h2 className="serif">Enfin savoir <em>ce que tu gagnes vraiment.</em></h2>
              <p>Chiffre d’affaires, bénéfice, ce qui reste à encaisser et ce que tu dois à l’URSSAF, en un coup d’œil.</p>
            </div>
            <DashTilt>
              <div className="dash-top"><span className="dots"><i /><i /><i /></span><span>Tableau de bord</span><span className="who">Novembre</span></div>
              <div className="dash-body">
                <div className="dash-side"><span className="on">Tableau de bord</span><span>Agenda</span><span>Clients</span><span>Factures</span><span>Argent</span><span>Ma page</span></div>
                <div className="dash-main">
                  <h4>Bonjour, voici ton mois</h4>
                  <div className="kpis">
                    <div className="kpi hl"><div className="l">Encaissé ce mois</div><div className="v">2 340 €</div><div className="d">▲ 18 % vs octobre</div></div>
                    <div className="kpi"><div className="l">Bénéfice réel</div><div className="v">1 612 €</div><div className="d">après cotisations et dépenses</div></div>
                    <div className="kpi"><div className="l">À encaisser</div><div className="v">285 €</div><div className="d" style={{ color: 'var(--muted)' }}>3 soldes · 1 facture</div></div>
                    <div className="kpi"><div className="l">Cotisations estimées</div><div className="v">496 €</div><div className="d" style={{ color: 'var(--muted)' }}>à déclarer ce mois</div></div>
                  </div>
                  <div className="dash-row">
                    <div className="card"><h5>Chiffre d’affaires <small>12 derniers mois</small></h5>
                      <svg className="chart" viewBox="0 0 480 150" preserveAspectRatio="none" role="img" aria-label="Chiffre d’affaires en hausse sur 12 mois">
                        {months.map((v, i) => <rect key={i} x={i * 40 + 6} y={150 - v * 1.6} width="28" height={v * 1.6} rx="6" fill={i === 11 ? '#0e7c5a' : '#dcf1e7'} />)}
                      </svg></div>
                    <div className="card"><h5>Aujourd’hui <small>3 rendez-vous</small></h5>
                      <div className="rdv">
                        <div><time>10:00</time><span>{m.service} · Emma</span><span className="pill">Payé</span></div>
                        <div><time>14:00</time><span>{m.service} · {m.client}</span><span className="pill">Acompte</span></div>
                        <div><time>16:30</time><span>{m.service} · Chloé</span><span className="pill coral">Rappel</span></div>
                      </div>
                      <h5 style={{ marginTop: 18 }}>Plafond de la micro-entreprise <small>24 %</small></h5><div className="gauge"><i style={{ width: '24%' }} /></div>
                    </div>
                  </div>
                </div>
              </div>
            </DashTilt>
          </div>
        </section>

        <section className="section">
          <div className="wrap ai">
            <div className="reveal">
              <span className="eyebrow"><span className="dot" />Assistant intégré</span>
              <h2 className="serif">Une phrase. <em>Tout est prêt.</em></h2>
              <p className="muted" style={{ fontSize: 18 }}>Écris ou dicte ton rendez-vous comme à un ami. Fripe l’ajoute à ton agenda, envoie la demande d’acompte et prépare la facture.</p>
            </div>
            <div className="reveal" style={{ ['--d' as string]: '.1s' }}><AiDemo m={m} /></div>
          </div>
        </section>

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap why">
            <div className="reveal"><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></svg></span><h3>Sans commission</h3><p>Un abonnement simple. Ce que tes clients paient est à toi.</p></div>
            <div className="reveal" style={{ ['--d' as string]: '.08s' }}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M5 3L2 6M19 3l3 3"/></svg></span><h3>Moins de lapins</h3><p>Acompte à la réservation et rappel automatique la veille.</p></div>
            <div className="reveal" style={{ ['--d' as string]: '.16s' }}><span className="ico"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span><h3>Factures en règle</h3><p>Mentions obligatoires, numérotation et relances, sans y penser.</p></div>
          </div>
        </section>

        <section className="section" id="tarifs">
          <div className="wrap">
            <div className="section-head reveal">
              <span className="eyebrow"><span className="dot" />Tarifs</span>
              <h2 className="serif">Simple, <em>sans surprise.</em></h2>
              <p>Commence gratuitement. Passe en Pro quand ton activité décolle.</p>
            </div>
            <div className="prices">
              <div className="price reveal"><h3>Gratuit</h3><div className="amt">0 €<small>pour toujours</small></div>
                <ul><li>10 rendez-vous par mois</li><li>5 factures par mois</li><li>Ta page de réservation</li><li>Tableau de bord</li></ul></div>
              <div className="price pro reveal" style={{ ['--d' as string]: '.08s' }}><h3>Pro</h3><div className="amt">12 €<small>par mois</small></div>
                <ul><li>Rendez-vous et factures illimités</li><li>Acomptes en ligne et rappels</li><li>Relances automatiques</li><li>Suivi URSSAF, dépenses et bénéfice</li><li>Assistant intégré</li></ul>
                <p className="note">Ou 120 € par an (2 mois offerts). Sans commission, seulement les frais de paiement bancaire.</p></div>
            </div>
          </div>
        </section>

        <section className="section" id="faq" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="section-head reveal"><h2 className="serif">Questions <em>fréquentes</em></h2></div>
            <div className="faq">
              <details className="reveal"><summary>Quand est-ce que Fripe sera disponible ?</summary><p>Fripe est en construction. Les inscrits de la liste d’attente auront accès en premier, par ordre d’inscription, et on te prévient par e-mail.</p></details>
              <details className="reveal"><summary>Est-ce que Fripe prend une commission sur mes ventes ?</summary><p>Non. Fripe fonctionne avec un abonnement. Seuls les frais du prestataire de paiement s’appliquent aux acomptes payés en ligne.</p></details>
              <details className="reveal"><summary>Mes clients doivent-ils créer un compte ?</summary><p>Non. Ils choisissent un créneau sur ta page, paient l’acompte si tu en demandes un, et c’est tout.</p></details>
              <details className="reveal"><summary>Est-ce que ça marche pour mon métier ?</summary><p>Fripe est pensé pour tous les indépendants qui travaillent sur rendez-vous ou à la prestation : beauté, coaching, cours, photo, bien-être, animaux… Indique ton métier en t’inscrivant.</p></details>
              <details className="reveal"><summary>Que faites-vous de mon adresse e-mail ?</summary><p>Elle sert uniquement à te prévenir du lancement de Fripe. Tu peux demander sa suppression à tout moment.</p></details>
            </div>
          </div>
        </section>

        <section className="final" id="rejoindre">
          <div className="wrap">
            <span className="eyebrow reveal"><span className="dot" />Liste d’attente</span>
            <h2 className="serif reveal">Moins de paperasse. <em>Plus de clients.</em></h2>
            <div className="reveal"><WaitlistForm metier={metier?.slug} source={`${src}-bas`} cta="Je veux mon accès" /></div>
          </div>
        </section>
      </main>

      <footer className="foot">
        <div className="wrap">
          <Link href="/" className="brand" style={{ fontSize: 17 }}><Mark />Fripe</Link>
          <span>© {new Date().getFullYear()} Fripe</span>
          <nav aria-label="Liens légaux"><Link href="/mentions-legales">Mentions légales</Link><Link href="/confidentialite">Confidentialité</Link></nav>
        </div>
      </footer>
    </>
  );
}
