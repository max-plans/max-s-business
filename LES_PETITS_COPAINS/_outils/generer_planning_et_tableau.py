# -*- coding: utf-8 -*-
"""
Génère :
  10_PLANNING/calendrier_90_jours.csv
  12_STATISTIQUES/tableau_de_bord_Tralalune.xlsx  (vidéos, suivi mensuel, objectifs YPP, calendrier, coûts, simulateur)
Usage : python3 _outils/generer_planning_et_tableau.py [AAAA-MM-JJ]   (date du jour 1, un lundi ; défaut 2027-01-04)
"""
import csv
import datetime as dt
import os
import sys

from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference
from openpyxl.formatting.rule import CellIsRule, ColorScaleRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.table import Table, TableStyleInfo

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT  # noqa: E402
from videos_data import VIDEOS  # noqa: E402

START = dt.date.fromisoformat(sys.argv[1]) if len(sys.argv) > 1 else dt.date(2027, 1, 4)
JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
V = {v["n"]: v for v in VIDEOS}

# Ordre de publication des comptines (une nouveauté chaque mercredi après le lancement)
EXTRA = {
    11: ("Une poule sur un mur – version Tralalune (comptine traditionnelle, domaine public à vérifier)", "Bibou, Pipo", "Toutes les comptines ; Les animaux"),
    12: ("Les formes avec Nounou (rond, carré, triangle)", "Nounou, Milo", "Apprendre en chantant"),
    13: ("Tête, bras, pieds : la chanson du corps (originale)", "Pipo, tous", "Chansons pour danser ; Apprendre en chantant"),
    14: ("La chasse aux œufs de Bibou (Pâques)", "Bibou, tous", "Comptines du quotidien"),
    15: ("Au clair de la lune avec Luna (traditionnelle, domaine public à vérifier)", "Luna", "Berceuses douces"),
}
ORDER = [(0, [1, 2, 10])] + [(7 * w + 2, [n]) for w, n in enumerate([9, 3, 8, 4, 6, 7, 5, 11, 12, 13, 14, 15], start=1)]
COMPILS = [
    (19, "Berceuse douce avec Luna – 30 minutes pour dormir (variations instrumentales + animation lente)", "Berceuses douces", 30),
    (33, "Les comptines de Tralalune – 20 minutes (vidéos 1, 2, 3, 8, 9, 10)", "Compilations", 20),
    (47, "Chansons pour danser – 20 minutes avec les copains", "Chansons pour danser ; Compilations", 20),
    (61, "Apprendre en chantant – 25 minutes (couleurs, chiffres, émotions, formes)", "Apprendre en chantant ; Compilations", 25),
    (75, "Le best-of de Tralalune – 30 minutes", "Compilations", 30),
    (89, "Comptines de Tralalune – 40 minutes (toute la saison)", "Compilations", 40),
]
SHORT_IDEAS = [
    "Refrain « Bonjour les amis » (Milo, clap clap)", "Le saut du lion – apprends la danse de Milo", "« Quelle couleur ? » – mini-jeu avec Milo",
    "La pirouette magique de Luna", "Refrain « Tous ensemble, on danse ! »", "Compte jusqu'à 5 avec Nounou", "Le dandin du nounours (Bibou)",
    "Luna souhaite bonne nuit (berceuse, 40 s)", "Le boum du dino (Pipo)", "Les oreilles qui volent (Nounou)", "Refrain « Frotte tes dents »",
    "Jeu de la statue : STOP ! (Bibou & Pipo)", "Qui fait meuh ? Devinette de la ferme", "Sentir la fleur, souffler la bougie (respiration)",
    "La dino-danse de Pipo", "Compte à rebours de la fusée", "Refrain « Dans mon cœur » (émotions)", "Bibou et la moustache de crème",
    "Mardi gras à Tralalune (déguisements des copains)", "Refrain de la ferme", "Kangourou hop hop hop – STOP !", "Le ventre de Bibou qui gronde",
]


def build_calendar():
    rows = []
    for d in range(90):
        day = START + dt.timedelta(days=d)
        rows.append(dict(jour_n=d + 1, date=day.isoformat(), jour=JOURS[day.weekday()], semaine=d // 7 + 1, items=[]))
    for off, ns in ORDER:
        for n in ns:
            if n in V:
                v = V[n]
                persos = v["lead"].capitalize()
                rows[off]["items"].append(("Comptine (vidéo longue)", f"V{n:02d} – {v['titre_yt']}", persos, "Toutes les comptines", "10:00"))
            else:
                t, p, pl = EXTRA[n]
                rows[off]["items"].append(("Comptine (vidéo longue)", f"V{n:02d} – {t}", p, pl, "10:00"))
    for off, t, pl, mins in COMPILS:
        rows[off]["items"].append((f"Compilation {mins} min", t, "Tous", pl, "09:00"))
    k = 0
    for r in rows:
        if r["jour"] in ("Lundi", "Vendredi", "Dimanche") and r["jour_n"] > 1:
            r["items"].append(("Short", SHORT_IDEAS[k % len(SHORT_IDEAS)], "", "Shorts Tralalune", "18:00"))
            k += 1
        if r["jour"] == "Dimanche":
            r["items"].append(("Analyse", "Revue hebdo des statistiques (15 min) + mise à jour du tableau de bord", "", "", "20:00"))
        if r["jour"] == "Mardi":
            r["items"].append(("Production", "Bloc production : avancer la vidéo n+2 (musique → images → animation → montage)", "", "", ""))
    for d in (29, 59, 89):
        rows[d]["items"].append(("Bilan", f"Bilan mensuel J{d + 1} : ajuster thèmes, miniatures, horaires (voir PLAN_90_JOURS.md)", "", "", ""))
    rows[39]["items"].append(("Saison", "Mardi gras / carnaval : Short dédié (déguisements = accessoires temporaires)", "", "", ""))
    return rows


def write_csv(rows):
    path = os.path.join(ROOT, "10_PLANNING", "calendrier_90_jours.csv")
    with open(path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["Jour", "Date", "Jour semaine", "Semaine", "Type", "Contenu", "Personnages", "Playlist", "Heure", "Statut"])
        for r in rows:
            for it in r["items"]:
                w.writerow([r["jour_n"], r["date"], r["jour"], r["semaine"], it[0], it[1], it[2], it[3], it[4], "À faire"])
    return path


# ---------------------------------------------------------------------------- Excel
NAVY = "2B2D6E"
ORANGE = "FF9F1C"
HEAD = PatternFill("solid", fgColor=NAVY)
LIGHT = PatternFill("solid", fgColor="FFF6E5")
INPUT = PatternFill("solid", fgColor="FFF3C4")
WH = Font(color="FFFFFF", bold=True)
THIN = Border(*(Side(style="thin", color="DDDDDD"),) * 4)


def header(ws, row, cols, widths=None):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=row, column=i, value=c)
        cell.fill = HEAD
        cell.font = WH
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[row].height = 34
    if widths:
        for i, w in enumerate(widths, 1):
            ws.column_dimensions[get_column_letter(i)].width = w


def build_xlsx(rows):
    wb = Workbook()
    # ------------------------------------------------------------ Accueil
    ws = wb.active
    ws.title = "Accueil"
    ws["A1"] = "🌙 TRALALUNE — Tableau de bord"
    ws["A1"].font = Font(size=22, bold=True, color=NAVY)
    ws["A2"] = "Saisissez vos chiffres (issus de YouTube Studio) dans les cellules jaunes des onglets « Vidéos » et « Suivi mensuel ». Tout le reste se calcule seul."
    ws["A2"].font = Font(italic=True, color="666666")
    kpis = [
        ("Vidéos au catalogue (lignes remplies)", "=COUNTA(Vidéos!B2:B500)"),
        ("Vidéos produites (statut Prête ou Publiée)", '=COUNTIF(Vidéos!E2:E500,"Prête")+COUNTIF(Vidéos!E2:E500,"Publiée")'),
        ("Vidéos publiées", '=COUNTIF(Vidéos!E2:E500,"Publiée")'),
        ("Vues totales (somme des vidéos)", "=SUM(Vidéos!J2:J500)"),
        ("Impressions totales", "=SUM(Vidéos!K2:K500)"),
        ("Taux de clic moyen pondéré", '=IFERROR(SUMPRODUCT(Vidéos!K2:K500,Vidéos!L2:L500)/SUM(Vidéos!K2:K500),"–")'),
        ("Abonnés gagnés (somme des vidéos)", "=SUM(Vidéos!O2:O500)"),
        ("Revenus totaux (€)", "=SUM(Vidéos!P2:P500)"),
        ("RPM moyen (€ / 1000 vues)", '=IFERROR(SUM(Vidéos!P2:P500)/SUM(Vidéos!J2:J500)*1000,"–")'),
        ("Coûts totaux saisis (€)", "=SUM(Coûts!D2:D200)"),
        ("Résultat (revenus – coûts)", "=B11-B13"),
    ]
    for i, (lab, f) in enumerate(kpis, 4):
        ws.cell(row=i, column=1, value=lab).font = Font(bold=True, color=NAVY)
        c = ws.cell(row=i, column=2, value=f)
        c.fill = LIGHT
        c.border = THIN
        c.font = Font(size=13, bold=True)
    ws["B9"].number_format = "0.00%"
    for r in (11, 12, 13, 14):
        ws.cell(row=r, column=2).number_format = '#,##0.00 "€"'
    ws["A17"] = "Progression vers le Programme Partenaire YouTube (voir onglet Objectifs YPP)"
    ws["A17"].font = Font(bold=True, size=13, color=ORANGE)
    ws["A18"], ws["B18"] = "Abonnés (dernier mois saisi)", "=Objectifs!B4"
    ws["A19"], ws["B19"] = "Heures de visionnage publiques sur 12 mois glissants", "=Objectifs!B5"
    ws["A20"], ws["B20"] = "Vues de Shorts sur les 3 derniers mois", "=Objectifs!B6"
    ws.column_dimensions["A"].width = 58
    ws.column_dimensions["B"].width = 22
    ws["A23"] = "Onglets : Vidéos · Suivi mensuel · Objectifs · Calendrier 90 j · Coûts · Simulateur (hypothèses)."
    ws["A24"] = "Règle d'or : ne jamais inventer un chiffre. Seules les données réelles de YouTube Studio sont saisies ; le Simulateur est clairement hypothétique."
    ws["A24"].font = Font(italic=True, color="C0392B")

    # ------------------------------------------------------------ Vidéos
    wv = wb.create_sheet("Vidéos")
    cols = ["N°", "Titre", "Type", "Personnage principal", "Statut", "Date prévue", "Date publiée", "Miniature (fichier)",
            "Durée (min)", "Vues", "Impressions", "CTR (%)", "Durée moy. visionnage (min)", "% moyen regardé",
            "Abonnés gagnés", "Revenus (€)", "RPM (€)", "Lien YouTube", "Notes"]
    header(wv, 1, cols, [5, 52, 16, 14, 12, 12, 12, 30, 9, 10, 12, 9, 13, 11, 11, 11, 9, 28, 30])
    first_dates = {}
    for r in rows:
        for it in r["items"]:
            if it[0].startswith("Comptine") and it[1][:3] not in first_dates:
                first_dates[it[1][:3]] = r["date"]
    thumbs = {1: "M01_bonjour_les_amis.png", 2: "M02_couleurs_avec_milo.png", 3: "M03_chiffres_1_2_3.png", 4: "M04_danse_des_animaux.png",
              5: "M05_pipo_fait_la_fete.png", 6: "M06_chanson_des_emotions.png", 7: "M07_ferme_des_copains.png",
              8: "M08_brossage_des_dents.png", 9: "M09_bonne_nuit_luna.png", 10: "M10_tous_ensemble_on_danse.png"}
    line = 2
    for n in range(1, 16):
        if n in V:
            v = V[n]
            title, typ, lead, dur, thumb = v["titre_yt"], "Comptine", v["lead"].capitalize(), "", thumbs[n]
            status = "Musique"
        else:
            title, typ, lead, dur, thumb, status = EXTRA[n][0], "Comptine", EXTRA[n][1].split(",")[0], "", "", "Idée"
        d = first_dates.get(f"V{n:02d}")
        vals = [n, title, typ, lead, status, dt.date.fromisoformat(d) if d else None, None, thumb, dur]
        for c, val in enumerate(vals, 1):
            wv.cell(row=line, column=c, value=val)
        line += 1
    for off, t, pl, mins in COMPILS:
        for c, val in enumerate([None, t, "Compilation", "Tous", "Idée", START + dt.timedelta(days=off), None, "", mins], 1):
            wv.cell(row=line, column=c, value=val)
        line += 1
    last = 200
    for r in range(2, last + 1):
        wv.cell(row=r, column=14, value=f'=IFERROR(M{r}/I{r},"")').number_format = "0%"
        wv.cell(row=r, column=17, value=f'=IFERROR(P{r}/J{r}*1000,"")').number_format = "0.00"
        wv.cell(row=r, column=12).number_format = "0.0%"
        for c in (6, 7):
            wv.cell(row=r, column=c).number_format = "DD/MM/YYYY"
        for c in (10, 11, 12, 13, 15, 16):
            wv.cell(row=r, column=c).fill = INPUT
    dv = DataValidation(type="list", formula1='"Idée,Écriture,Musique,Images,Animation,Montage,Prête,Publiée"', allow_blank=True)
    dv2 = DataValidation(type="list", formula1='"Comptine,Compilation,Short,Berceuse longue,Bande-annonce"', allow_blank=True)
    wv.add_data_validation(dv)
    wv.add_data_validation(dv2)
    dv.add(f"E2:E{last}")
    dv2.add(f"C2:C{last}")
    wv.conditional_formatting.add(f"L2:L{last}", ColorScaleRule(start_type="num", start_value=0.02, start_color="F8D7DA",
                                                                mid_type="num", mid_value=0.05, mid_color="FFF3C4",
                                                                end_type="num", end_value=0.10, end_color="C8F2C2"))
    wv.conditional_formatting.add(f"E2:E{last}", CellIsRule(operator="equal", formula=['"Publiée"'], fill=PatternFill("solid", fgColor="C8F2C2")))
    wv.conditional_formatting.add(f"E2:E{last}", CellIsRule(operator="equal", formula=['"Prête"'], fill=PatternFill("solid", fgColor="CFE3FF")))
    wv.freeze_panes = "C2"
    wv["U1"] = "CTR : saisir 0,056 ou 5,6 % (format pourcentage). Durée moyenne en minutes décimales (2 min 30 = 2,5)."
    wv["U1"].font = Font(italic=True, color="666666")

    # ------------------------------------------------------------ Suivi mensuel
    wm = wb.create_sheet("Suivi mensuel")
    cols = ["Mois", "Vues (vidéos longues)", "Vues Shorts", "Heures de visionnage publiques (longues)", "Abonnés en fin de mois",
            "Abonnés gagnés", "Impressions", "CTR moyen", "Durée moy. visionnage (min)", "Revenus estimés (€)",
            "Heures sur 12 mois glissants", "Shorts sur 3 mois glissants", "Vidéos publiées ce mois"]
    header(wm, 1, cols, [12, 14, 12, 18, 14, 12, 14, 10, 14, 14, 16, 16, 12])
    for i in range(24):
        r = i + 2
        y, m = START.year + (START.month - 1 + i) // 12, (START.month - 1 + i) % 12 + 1
        wm.cell(row=r, column=1, value=dt.date(y, m, 1)).number_format = "MMM YYYY"
        for c in range(2, 11):
            if c != 6:
                wm.cell(row=r, column=c).fill = INPUT
        wm.cell(row=r, column=6, value=f"=IF(E{r}=\"\",\"\",E{r}-IF(ROW()=2,0,N(E{r - 1})))" if r > 2 else f'=IF(E{r}="","",E{r})')
        wm.cell(row=r, column=8).number_format = "0.0%"
        wm.cell(row=r, column=11, value=f"=SUM(D{max(2, r - 11)}:D{r})").number_format = "#,##0"
        wm.cell(row=r, column=12, value=f"=SUM(C{max(2, r - 2)}:C{r})").number_format = "#,##0"
        wm.cell(row=r, column=13, value=f'=COUNTIFS(Vidéos!G2:G500,">="&A{r},Vidéos!G2:G500,"<"&EDATE(A{r},1))')
        wm.cell(row=r, column=10).number_format = '#,##0.00 "€"'
    ch = LineChart()
    ch.title = "Vues mensuelles (longues et Shorts)"
    ch.height, ch.width = 8, 18
    ch.add_data(Reference(wm, min_col=2, max_col=3, min_row=1, max_row=25), titles_from_data=True)
    ch.set_categories(Reference(wm, min_col=1, min_row=2, max_row=25))
    wm.add_chart(ch, "O2")
    ch2 = LineChart()
    ch2.title = "Abonnés en fin de mois"
    ch2.height, ch2.width = 8, 18
    ch2.add_data(Reference(wm, min_col=5, max_col=5, min_row=1, max_row=25), titles_from_data=True)
    ch2.set_categories(Reference(wm, min_col=1, min_row=2, max_row=25))
    wm.add_chart(ch2, "O20")
    wm.freeze_panes = "B2"

    # ------------------------------------------------------------ Objectifs
    wo = wb.create_sheet("Objectifs")
    wo["A1"] = "Seuils du Programme Partenaire YouTube (partage des revenus publicitaires) — à revérifier sur l'aide officielle YouTube"
    wo["A1"].font = Font(bold=True, color=NAVY, size=12)
    header(wo, 3, ["Critère", "Valeur actuelle", "Seuil", "Progression"], [52, 18, 14, 14])
    obj = [("Abonnés", "=LOOKUP(2,1/(ISNUMBER('Suivi mensuel'!E2:E25)),'Suivi mensuel'!E2:E25)", 1000),
           ("Heures de visionnage publiques (12 mois glissants)", "=LOOKUP(2,1/(ISNUMBER('Suivi mensuel'!D2:D25)),'Suivi mensuel'!K2:K25)", 4000),
           ("OU vues de Shorts valides (90 derniers jours)", "=LOOKUP(2,1/(ISNUMBER('Suivi mensuel'!C2:C25)),'Suivi mensuel'!L2:L25)", 10000000)]
    for i, (a, f, s) in enumerate(obj, 4):
        wo.cell(row=i, column=1, value=a)
        wo.cell(row=i, column=2, value=f"=IFERROR({f[1:]},0)").number_format = "#,##0"
        wo.cell(row=i, column=3, value=s).number_format = "#,##0"
        wo.cell(row=i, column=4, value=f"=MIN(1,B{i}/C{i})").number_format = "0%"
    wo["A8"] = "Éligible (voie 1 : abonnés + heures) ?"
    wo["B8"] = '=IF(AND(B4>=C4,B5>=C5),"OUI – candidater","Pas encore")'
    wo["A9"] = "Éligible (voie 2 : abonnés + Shorts) ?"
    wo["B9"] = '=IF(AND(B4>=C4,B6>=C6),"OUI – candidater","Pas encore")'
    wo["A11"] = ("Note : les fonctionnalités de « fan funding » (abonnements, Super Chat…) sont indisponibles sur le contenu conçu pour les enfants ; "
                 "le palier intermédiaire du YPP n'apporte donc presque rien à Tralalune. L'objectif utile est le palier publicitaire.")
    wo["A11"].alignment = Alignment(wrap_text=True)
    wo.row_dimensions[11].height = 48
    wo.conditional_formatting.add("D4:D6", ColorScaleRule(start_type="num", start_value=0, start_color="F8D7DA", end_type="num", end_value=1, end_color="C8F2C2"))

    # ------------------------------------------------------------ Calendrier
    wc = wb.create_sheet("Calendrier 90 j")
    header(wc, 1, ["Jour", "Date", "Jour semaine", "Semaine", "Type", "Contenu", "Personnages", "Playlist", "Heure", "Statut"],
           [6, 12, 12, 9, 22, 80, 16, 32, 8, 12])
    r = 2
    for row in rows:
        for it in row["items"]:
            vals = [row["jour_n"], dt.date.fromisoformat(row["date"]), row["jour"], row["semaine"], it[0], it[1], it[2], it[3], it[4], "À faire"]
            for c, val in enumerate(vals, 1):
                cell = wc.cell(row=r, column=c, value=val)
                if it[0].startswith("Comptine"):
                    cell.fill = PatternFill("solid", fgColor="FFE3B8")
                elif it[0].startswith("Compilation"):
                    cell.fill = PatternFill("solid", fgColor="E3D4FF")
                elif it[0] == "Short":
                    cell.fill = PatternFill("solid", fgColor="D7F5C9")
            wc.cell(row=r, column=2).number_format = "DD/MM/YYYY"
            r += 1
    dvs = DataValidation(type="list", formula1='"À faire,En cours,Fait,Reporté"', allow_blank=True)
    wc.add_data_validation(dvs)
    dvs.add(f"J2:J{r}")
    wc.conditional_formatting.add(f"J2:J{r}", CellIsRule(operator="equal", formula=['"Fait"'], fill=PatternFill("solid", fgColor="C8F2C2")))
    wc.freeze_panes = "A2"
    wc.auto_filter.ref = f"A1:J{r - 1}"

    # ------------------------------------------------------------ Coûts
    wk = wb.create_sheet("Coûts")
    header(wk, 1, ["Date", "Poste", "Outil / fournisseur", "Montant (€)", "Licence commerciale vérifiée ? (Oui/Non)", "Preuve (capture, facture)"],
           [12, 26, 26, 14, 22, 36])
    exemples = [("Abonnement", "Musique IA (ex. Suno Pro)"), ("Abonnement", "Images IA"), ("Abonnement", "Vidéo IA (ex. Kling / Runway)"),
                ("Abonnement", "Voix (ex. ElevenLabs)"), ("Dépôt de marque", "INPI"), ("Nom de domaine", "tralalune.fr")]
    for i, (a, b) in enumerate(exemples, 2):
        wk.cell(row=i, column=2, value=a)
        wk.cell(row=i, column=3, value=b)
        wk.cell(row=i, column=4).fill = INPUT
    for i in range(2, 201):
        wk.cell(row=i, column=1).number_format = "DD/MM/YYYY"
        wk.cell(row=i, column=4).number_format = '#,##0.00 "€"'

    # ------------------------------------------------------------ Simulateur
    wsim = wb.create_sheet("Simulateur")
    wsim["A1"] = "SIMULATEUR DE REVENUS — HYPOTHÈSES UNIQUEMENT (aucune garantie, à remplacer par vos RPM réels dès que possible)"
    wsim["A1"].font = Font(bold=True, color="C0392B", size=12)
    header(wsim, 3, ["Paramètre", "Petit développement", "Développement intermédiaire", "Forte croissance"], [46, 22, 26, 20])
    params = [("Vues mensuelles – vidéos longues (hypothèse)", 30000, 300000, 3000000),
              ("Vues mensuelles – Shorts (hypothèse)", 100000, 1000000, 10000000),
              ("RPM vidéos longues pour enfants (€/1000 vues, hypothèse)", 0.30, 0.60, 1.00),
              ("RPM Shorts (€/1000 vues, hypothèse)", 0.02, 0.04, 0.06),
              ("Revenus musique en streaming / mois (€, hypothèse)", 0, 30, 300),
              ("Coûts mensuels (abonnements, €)", 80, 150, 600)]
    for i, p in enumerate(params, 4):
        for c, val in enumerate(p, 1):
            cell = wsim.cell(row=i, column=c, value=val)
            if c > 1:
                cell.fill = INPUT
    res = [("Revenus YouTube vidéos longues / mois (€)", "={c}4*{c}6/1000"), ("Revenus Shorts / mois (€)", "={c}5*{c}7/1000"),
           ("Revenus totaux / mois (€)", "={c}11+{c}12+{c}8"), ("Résultat mensuel après coûts (€)", "={c}13-{c}9"),
           ("Résultat annuel (×12, €)", "={c}14*12")]
    for i, (lab, f) in enumerate(res, 11):
        wsim.cell(row=i, column=1, value=lab).font = Font(bold=True)
        for c in "BCD":
            cell = wsim[f"{c}{i}"]
            cell.value = f.format(c=c)
            cell.number_format = '#,##0 "€"'
            cell.fill = LIGHT
    wsim["A18"] = ("Ces montants sont bruts avant impôts et cotisations, ne sont dus qu'après l'admission au Programme Partenaire, "
                   "et varient selon les pays des spectateurs, la saison (forte hausse en fin d'année) et le type d'annonce. "
                   "Le contenu « conçu pour les enfants » n'affiche que des annonces non personnalisées : RPM généralement plus bas.")
    wsim["A18"].alignment = Alignment(wrap_text=True)
    wsim.merge_cells("A18:D21")
    bc = BarChart()
    bc.title = "Revenus mensuels hypothétiques par scénario"
    bc.add_data(Reference(wsim, min_col=2, max_col=4, min_row=13, max_row=13), from_rows=True, titles_from_data=False)
    bc.set_categories(Reference(wsim, min_col=2, max_col=4, min_row=3))
    bc.height, bc.width = 8, 16
    wsim.add_chart(bc, "F3")

    for sh in wb.worksheets:
        sh.sheet_view.showGridLines = sh.title not in ("Accueil",)
    out = os.path.join(ROOT, "12_STATISTIQUES", "tableau_de_bord_Tralalune.xlsx")
    wb.save(out)
    return out


if __name__ == "__main__":
    rows = build_calendar()
    print(write_csv(rows))
    print(build_xlsx(rows))
