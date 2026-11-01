# Guide du tableau de bord

Fichier : `tableau_de_bord_Tralalune.xlsx` (Excel, LibreOffice ou Google Sheets via import).

| Onglet | À quoi il sert | Ce que vous saisissez (cellules jaunes) |
|---|---|---|
| **Accueil** | Synthèse automatique : vidéos produites/publiées, vues, impressions, CTR pondéré, abonnés, revenus, RPM, coûts, résultat, progression YPP | Rien |
| **Vidéos** | Une ligne par vidéo (15 comptines + 6 compilations déjà pré-remplies avec date prévue et miniature) | Statut (liste), date publiée, durée, vues, impressions, CTR, durée moyenne de visionnage, abonnés gagnés, revenus, lien, notes |
| **Suivi mensuel** | Évolution sur 24 mois + graphiques ; calcule les heures sur 12 mois glissants et les Shorts sur 3 mois | Vues longues, vues Shorts, heures publiques, abonnés en fin de mois, impressions, CTR, durée moyenne, revenus |
| **Objectifs** | Progression vers les seuils YPP (1 000 abonnés, 4 000 h ou 10 M de vues de Shorts) et éligibilité | Rien |
| **Calendrier 90 j** | Le planning de lancement, filtrable, avec statut À faire / En cours / Fait / Reporté | Statut |
| **Coûts** | Abonnements et dépenses, avec vérification de licence et preuve | Date, poste, outil, montant, Oui/Non, preuve |
| **Simulateur** | Trois scénarios **hypothétiques** de revenus | Vos hypothèses (puis vos RPM réels) |

## Où trouver les chiffres dans YouTube Studio
| Donnée | Chemin |
|---|---|
| Vues, durée moyenne, % regardé, abonnés par vidéo | Studio → Contenu → (vidéo) → Statistiques → Vue d'ensemble / Engagement / Audience |
| Impressions et CTR | Statistiques de la vidéo → Audience/Portée → « Impressions » et « Taux de clics sur les impressions » |
| Heures de visionnage publiques 12 mois | Studio → Gagner de l'argent (affiche la progression YPP) |
| Revenus et RPM | Studio → Statistiques → Revenus (après admission au YPP) |
| Recherches de votre audience | Studio → Statistiques → Recherche (« Research ») |

## Bonnes pratiques
- Saisir **toujours le même jour** (dimanche soir) pour des comparaisons justes.
- Comparer une vidéo à **la moyenne de la chaîne**, pas à d'autres chaînes.
- Ne jamais saisir de chiffres estimés dans « Vidéos » ou « Suivi mensuel » : seulement les données réelles. Les hypothèses vont dans « Simulateur ».
- Évolutif : ajoutez simplement des lignes (formules prévues jusqu'à la ligne 200 dans « Vidéos »), et des colonnes à droite si besoin. Pour régénérer un fichier vierge : `python3 _outils/generer_planning_et_tableau.py` (⚠️ écrase le fichier : faites une copie avant).
