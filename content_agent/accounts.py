"""Définition des 3 comptes TikTok : ton éditorial, voix, style visuel."""
from __future__ import annotations

# Personnage récurrent du compte Argent (même description dans chaque image → personnage cohérent).
PANDA = (
    "a tall slim anthropomorphic giant panda gentleman with round black glasses, wearing a navy blue suit, "
    "white shirt and a golden tie, smug confident smile, expressive cartoon acting"
)

# Styles d'image proposés (clé → (nom affiché, description envoyée au générateur d'images)).
IMAGE_STYLES: dict[str, tuple[str, str]] = {
    "cartoon": ("Cartoon rétro 2D (style panthère rose)",
                "vintage 1960s hand-drawn animated cartoon still, flat colors, clean bold black ink outlines, "
                "retro cel animation look, plain flat pastel sky-blue background, simple minimalist composition, "
                "character fully visible and centered"),
    "3d": ("Animation 3D (style Pixar)",
           "Pixar-style 3D animated movie still, soft cinematic lighting, vibrant colors, shallow depth of field"),
    "cinema": ("Cinéma réaliste",
               "cinematic photorealistic film still, dramatic moody lighting, teal and orange grade, film grain, "
               "shallow depth of field"),
    "marbre": ("Antique / marbre",
               "ancient greek and roman aesthetic, marble statues, dramatic chiaroscuro lighting, dark moody background, "
               "cinematic, film grain"),
}
IMAGE_SUFFIX = ", vertical 9:16 composition, empty lower third, no text, no letters, no words, no watermark"

# Voix françaises gratuites (Edge TTS). Les « Multilingual » sont les plus naturelles.
EDGE_VOICES: dict[str, str] = {
    "fr-FR-RemyMultilingualNeural": "Rémy — homme, très naturel (recommandé)",
    "fr-FR-VivienneMultilingualNeural": "Vivienne — femme, très naturelle",
    "fr-FR-HenriNeural": "Henri — homme, voix grave",
    "fr-FR-DeniseNeural": "Denise — femme, claire",
    "fr-FR-EloiseNeural": "Éloïse — femme, jeune",
    "fr-CH-FabriceNeural": "Fabrice — homme (Suisse)",
    "fr-BE-GerardNeural": "Gérard — homme (Belgique)",
    "fr-CA-ThierryNeural": "Thierry — homme (Québec)",
}

ACCOUNTS: dict[str, dict] = {
    "argent": {
        "id": "argent",
        "label": "Compte 1 — Argent",
        "short": "Argent",
        "emoji": "🐼",
        "color": "#2EE59D",
        "theme": "argent, finance personnelle, richesse, investissement, mentalité de riche",
        "persona": (
            "Un narrateur de storytelling, rythmé et captivant, raconte les secrets de l'argent que l'école "
            "n'enseigne pas. La mascotte visuelle est « Panda Boss », un panda en costume qui illustre chaque scène, "
            "mais le narrateur ne dit jamais « moi, le panda » : il raconte, comme une histoire, avec du suspense. "
            "Tutoiement, phrases courtes et percutantes, chiffres concrets en euros, exemples réels en France "
            "(Livret A, PEA, assurance-vie, ETF, intérêts composés, budget, inflation, crédit, immobilier, salaire), "
            "anecdotes de milliardaires et de stratégies célèbres racontées simplement. "
            "Jamais de promesse de gain garanti, pas de crypto-hype ni de schéma douteux."
        ),
        "structure": (
            "1) Hook choc chiffré ou contre-intuitif dans la 1re phrase. "
            "2) Le problème / l'erreur que fait la majorité. "
            "3) La règle ou technique expliquée pas à pas avec un exemple chiffré simple. "
            "4) Le piège à éviter. "
            "5) Chute mémorable + appel à enregistrer la vidéo. "
            "Finir par : « Ceci n'est pas un conseil en investissement. »"
        ),
        "pillars": [
            "intérêts composés", "budget et règle 50/30/20", "se payer en premier", "épargne de précaution",
            "inflation et Livret A", "PEA, assurance-vie, PER", "ETF et investissement passif", "DCA",
            "règle des 72", "actifs vs passifs", "dettes et crédit conso", "négocier son salaire",
            "revenus complémentaires", "biais psychologiques et argent", "habitudes des riches",
            "indépendance financière et règle des 4 %", "erreurs d'argent à 20 ans", "immobilier vs bourse",
            "histoires de grands investisseurs", "pièges marketing et consommation",
        ],
        "hashtags": ["#argent", "#finance", "#investir", "#educationfinanciere", "#panda"],
        "disclaimer": "Ceci n'est pas un conseil en investissement.",
        "voice": {"edge": "fr-FR-RemyMultilingualNeural", "rate": "+6%", "pitch": "+0Hz",
                  "piper": "fr_FR-tom-medium", "piper_speaker": None, "piper_speed": 0.95},
        "style": {
            # Sous-titres façon TikTok « storytelling » : blanc à gros contour noir, mot prononcé en cyan, 2 lignes.
            "font": "poppins", "font_size": 88, "uppercase": True, "words_per_line": 6, "max_chars": 26,
            "two_lines": True, "cards": False, "hook_box": False,
            "text_color": "#FFFFFF", "active_color": "#3FE6F2", "emphasis_color": "#FFD23F",
            "sub_y": 1360, "card_y": 330, "grade": "eq=saturation=1.05",
            "vignette": False, "grain": 0, "music_volume": 0.10,
            "bg": [(120, 170, 215), (90, 140, 195), (255, 255, 255)],
        },
        "image_style": "cartoon",
        "mascot": True,
    },
    "stoicisme": {
        "id": "stoicisme",
        "label": "Compte 2 — Stoïcisme",
        "short": "Stoïcisme",
        "emoji": "🏛️",
        "color": "#E8B04B",
        "theme": "stoïcisme, philosophie, discipline, maîtrise de soi, sagesse antique appliquée",
        "persona": (
            "Un narrateur philosophe, calme, profond et apaisant, qui fait parler les grands penseurs "
            "(Marc Aurèle, Sénèque, Épictète, Zénon, Musashi, Nietzsche, Lao Tseu, Schopenhauer, Camus...). "
            "Les citations doivent être RÉELLES et correctement attribuées (si tu n'es pas sûr, paraphrase "
            "sans guillemets). Il applique chaque idée à la vie moderne : réseaux sociaux, travail, colère, "
            "anxiété, relations, discipline. Tutoiement, ton solennel mais accessible."
        ),
        "structure": (
            "1) Hook : une phrase intrigante (« Il y a 2000 ans, un empereur a écrit... ») ou une question existentielle. "
            "2) La citation ou l'idée clé du penseur. "
            "3) Le contexte en 2-3 phrases (qui, quelle époque, quelle épreuve). "
            "4) L'application concrète aujourd'hui. "
            "5) Un exercice simple à faire aujourd'hui + une chute qui fait réfléchir."
        ),
        "pillars": [
            "dichotomie du contrôle", "memento mori", "amor fati", "premeditatio malorum", "la colère",
            "le temps qu'on gaspille", "l'opinion des autres", "discipline et maîtrise de soi",
            "Marc Aurèle", "Sénèque", "Épictète", "Musashi", "Nietzsche", "Camus et l'absurde",
            "Lao Tseu et le lâcher-prise", "souffrance et épreuves", "solitude", "vertu et caractère",
            "habitudes des stoïciens", "le présent",
        ],
        "hashtags": ["#stoicisme", "#philosophie", "#discipline", "#sagesse", "#marcaurele"],
        "disclaimer": "",
        "voice": {"edge": "fr-FR-RemyMultilingualNeural", "rate": "-8%", "pitch": "-4Hz",
                  "piper": "fr_FR-gilles-low", "piper_speaker": None, "piper_speed": 1.08},
        "style": {
            "font": "cinzel", "font_size": 100, "uppercase": False, "words_per_line": 3, "max_chars": 18,
            "text_color": "#F5EFE0", "active_color": "#E8B04B", "emphasis_color": "#E8B04B",
            "sub_y": 1200, "card_y": 600,
            "grade": "hue=s=0.2,colorbalance=rs=0.07:gs=0.03:bs=-0.07,eq=contrast=1.12:brightness=-0.04",
            "vignette": True, "grain": 9, "music_volume": 0.12,
            "bg": [(26, 22, 16), (58, 48, 32), (232, 176, 75)],
        },
        "image_style": "marbre",
        "image_extra": "philosophical mood",
        "mascot": False,
    },
    "reflexion": {
        "id": "reflexion",
        "label": "Compte 3 — Remise en question de la vie",
        "short": "Réflexion",
        "emoji": "🌌",
        "color": "#FFD23F",
        "theme": "remise en question de la vie, développement personnel, réflexion, sens, mindset",
        "persona": (
            "Un narrateur de documentaire à la voix grave et posée, qui pose les questions que les gens "
            "évitent : le temps qui passe, le sens de la vie, le regard des autres, le confort, la peur, "
            "les regrets, les relations, l'ambition. Il est direct, parfois dérangeant, mais bienveillant. "
            "Tutoiement, phrases courtes, métaphores fortes, silences implicites."
        ),
        "structure": (
            "1) Hook dérangeant ou question qui fait mal en une phrase. "
            "2) Le constat : ce que la majorité vit sans s'en rendre compte. "
            "3) Le basculement : une image ou métaphore forte qui change le regard. "
            "4) 2 ou 3 prises de conscience / actions concrètes. "
            "5) Une chute mémorable qui donne envie de réécouter."
        ),
        "pillars": [
            "le temps qui passe", "vivre la vie des autres", "le confort qui tue l'ambition",
            "la peur du regard des autres", "les regrets en fin de vie", "la solitude choisie",
            "les relations toxiques", "la dopamine facile", "la discipline vs la motivation",
            "le sens de la vie", "la comparaison sur les réseaux", "repartir de zéro", "l'échec",
            "les habitudes qui changent une vie", "devenir quelqu'un d'autre", "le silence",
            "l'enfant que tu étais", "la mort et l'urgence de vivre", "l'argent et le bonheur", "le courage",
        ],
        "hashtags": ["#reflexion", "#developpementpersonnel", "#mindset", "#motivation", "#vie"],
        "disclaimer": "",
        "voice": {"edge": "fr-FR-HenriNeural", "rate": "-5%", "pitch": "-6Hz",
                  "piper": "fr_FR-upmc-medium", "piper_speaker": 1, "piper_speed": 1.05},
        "style": {
            "font": "anton", "font_size": 120, "uppercase": True, "words_per_line": 3, "max_chars": 16,
            "text_color": "#FFFFFF", "active_color": "#FFD23F", "emphasis_color": "#FF4B4B",
            "sub_y": 1180, "card_y": 560, "grade": "eq=contrast=1.12:brightness=-0.05:saturation=0.85",
            "vignette": True, "grain": 6, "music_volume": 0.12,
            "bg": [(10, 10, 20), (40, 16, 22), (255, 210, 63)],
        },
        "image_style": "cinema",
        "image_extra": "lone silhouette, dramatic sky, atmospheric",
        "mascot": False,
    },
}


def image_prompt(acc: dict, scene: str, style_key: str | None = None) -> str:
    """Prompt complet pour le générateur d'images : style + personnage récurrent + scène."""
    key = style_key or acc.get("image_style", "cinema")
    style = IMAGE_STYLES.get(key, IMAGE_STYLES["cinema"])[1]
    parts = [style]
    if acc.get("mascot"):
        parts.append(f"Main character: {PANDA}")
    if acc.get("image_extra"):
        parts.append(acc["image_extra"])
    parts.append(f"Scene: {scene}")
    return ". ".join(parts) + IMAGE_SUFFIX


def get_account(account_id: str) -> dict:
    if account_id not in ACCOUNTS:
        raise KeyError(f"Compte inconnu : {account_id}")
    return ACCOUNTS[account_id]
