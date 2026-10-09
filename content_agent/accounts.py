"""Définition des 3 comptes TikTok : ton éditorial, voix, style visuel."""
from __future__ import annotations

# Personnage récurrent du compte Argent (même description dans chaque image → personnage cohérent).
PANDA = (
    "Panda Boss: a tall slim cartoon giant panda standing on two legs, a real panda head (round white furry head, "
    "round black fur ears, black eye patches, small black nose), round gold glasses, long thin black arms and legs, "
    "slim black suit, white shirt, thin black tie, feet firmly on the ground"
)
# Seed fixe pour le compte à mascotte : même « tirage » de base → personnage plus stable d'une image à l'autre.
MASCOT_SEED = 7777

# Styles d'image proposés (clé → (nom affiché, description envoyée au générateur d'images)).
IMAGE_STYLES: dict[str, tuple[str, str]] = {
    "cartoon": ("Cartoon rétro 2D (style panthère rose)",
                "modern flat 2D cartoon illustration in the style of a classic 1960s American TV cartoon, "
                "remastered: clean confident black ink outlines, flat bright cel colors with subtle soft shading, "
                "plain solid pastel sky-blue background with almost no background details, ONE big hero subject "
                "centered and filling most of the frame, oversized exaggerated props, playful cartoon motion lines "
                "and small sparkles, characters with slender elegant limbs, sly half-closed eyes, smug relaxed "
                "confident poses, crisp vector look, high quality editorial illustration"),
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
# Style cartoon : le générateur gratuit écrit mal → AUCUN texte dans l'image (les sous-titres portent les mots).
IMAGE_SUFFIX_TEXT = (", vertical 9:16 composition, main subject large and centered, absolutely no text, no letters, "
                     "no words, no numbers, no writing anywhere, signs and papers are blank, no watermark")

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
            "Un narrateur de storytelling, complice et un peu malicieux, raconte les secrets de l'argent à travers "
            "« le panda » (Panda Boss), le héros de chaque vidéo : un panda en costume noir, riche, calme et plus malin "
            "que tout le monde. Le narrateur parle SOUVENT du panda à la 3e personne et l'oppose aux gens normaux : "
            "« Le panda, lui, ne fait pas comme tout le monde. », « Quand tout le monde achète, le panda attend. », "
            "« Le panda a compris un truc que 90 pour cent des gens ignorent. », « Et là, le panda sourit. ». "
            "Il tutoie le spectateur et le compare au panda (« Toi, tu fais ça… le panda, lui, fait ça. »). "
            "Langage SIMPLE, compréhensible par un ado de 15 ans : zéro jargon, ou alors expliqué en une phrase avec une "
            "image du quotidien (une baguette, un abonnement Netflix, un café, un loyer). Exemples réels en France. "
            "Jamais de promesse de gain garanti, pas de crypto-hype ni de schéma douteux, pas de conseil personnalisé."
        ),
        "structure": (
            "Format storytelling des gros comptes « animal en costume » : "
            "1) Hook = curiosité ou promesse choc dans la 1re phrase, souvent avec le panda "
            "(« Le panda a acheté une maison sans jamais payer de loyer. Voici comment. », « Pourquoi le panda ne paie "
            "jamais en carte de crédit ? »). "
            "2) Ce que fait tout le monde (l'erreur ou le piège du quotidien). "
            "3) Ce que fait le panda à la place, expliqué étape par étape, très simplement, avec UN exemple chiffré facile. "
            "4) Le retournement : le petit détail que personne ne voit, ou la face cachée (« Mais il y a un piège… »). "
            "5) La leçon en une phrase mémorable (« Le panda ne travaille pas pour l'argent. L'argent travaille pour le "
            "panda. ») + « Abonne-toi, le panda a encore plein de secrets. ». "
            "Finir par : « Ceci n'est pas un conseil en investissement. »"
        ),
        "idea_rules": (
            "Choisis des sujets qui donnent ENVIE de regarder jusqu'au bout et qu'on peut comprendre sans rien connaître "
            "à la finance : un mystère du quotidien (« Pourquoi les prix finissent par 99 centimes ? »), un secret des "
            "riches expliqué simplement, une arnaque ou un piège dont on est tous victimes, l'histoire vraie d'un "
            "milliardaire ou d'une marque célèbre, une comparaison « tout le monde vs le panda ». "
            "Chaque idée doit avoir une révélation surprenante et une leçon concrète. Évite les sujets techniques "
            "ou ennuyeux (fiscalité détaillée, produits financiers complexes). Vise le GRAND PUBLIC : des sujets "
            "que même quelqu'un qui n'aime pas la finance regarderait (les coulisses d'une marque connue, un truc "
            "qu'il achète chaque semaine, une arnaque légale, l'histoire folle d'un milliardaire, un chiffre qui choque)."
        ),
        "pillars": [
            "pourquoi les riches empruntent au lieu de vendre", "comment les supermarchés te font dépenser plus",
            "pourquoi les billets d'avion changent de prix à chaque clic", "comment Netflix gagne de l'argent quand tu ne regardes rien",
            "pourquoi les cafés coûtent aussi cher", "le vrai coût d'un iPhone", "comment IKEA te fait acheter ce que tu ne voulais pas",
            "les riches qui ne paient presque pas d'impôts", "pourquoi Ryanair vend des billets à 9 euros",
            "la fortune cachée des marques de luxe", "ce que font les riches avec leur argent chaque matin",
            "le piège des abonnements qu'on oublie", "pourquoi les prix finissent par 99", "le paiement en 4 fois",
            "pourquoi les gagnants du loto finissent ruinés", "comment McDonald's gagne vraiment son argent",
            "comment les casinos gagnent toujours", "l'inflation expliquée avec une baguette",
            "les intérêts composés et Warren Buffett", "pourquoi ta voiture te rend pauvre", "les soldes et le faux prix barré",
            "comment Apple te fait racheter un iPhone", "le luxe et la rareté organisée", "le système de Ponzi de Madoff",
            "pourquoi le salaire seul ne rend pas riche", "actifs contre passifs", "se payer en premier",
            "les petites dépenses qui coûtent une fortune", "comment les banques gagnent avec ton argent",
            "les histoires de milliardaires partis de rien", "les erreurs d'argent à vingt ans",
            "le crédit renouvelable", "pourquoi les riches achètent de l'art et des montres",
        ],
        "hashtags": ["#argent", "#finance", "#investir", "#educationfinanciere", "#panda"],
        "disclaimer": "Ceci n'est pas un conseil en investissement.",
        "voice": {"edge": "fr-FR-RemyMultilingualNeural", "rate": "+12%", "pitch": "+0Hz",
                  "piper": "fr_FR-tom-medium", "piper_speaker": None, "piper_speed": 0.9, "eleven_speed": 1.08},
        "style": {
            # Sous-titres comme les vidéos « panthère » : UN mot à la fois, minuscules, blanc à gros contour noir.
            "font": "poppins", "font_size": 104, "uppercase": False, "words_per_line": 1, "max_chars": 18,
            "two_lines": False, "cards": False, "hook_box": False, "active_scale": 100,
            "motion": False,   # image fixe, sans zoom (comme les vidéos de référence)
            "text_color": "#FFFFFF", "active_color": "#FFFFFF", "emphasis_color": "#FFD23F",
            "sub_y": 1250, "card_y": 330, "grade": "eq=saturation=1.05",
            "vignette": False, "grain": 0, "music_volume": 0.10,
            "bg": [(120, 170, 215), (90, 140, 195), (255, 255, 255)],
        },
        "image_style": "cartoon",
        "scene_seconds": 3.2,   # une nouvelle image environ toutes les 3 s (une par phrase)
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


ANATOMY = ("anatomically correct characters: every character has exactly two arms, two legs, two hands with five "
           "fingers each, all limbs fully visible and attached, symmetrical face, simple clear pose, no overlapping "
           "bodies, no cropped limbs")
NEGATIVE = ("missing arm, missing leg, extra limb, extra arm, extra fingers, deformed hands, malformed body, fused "
            "limbs, cropped limbs, two heads, fat, chubby, text, letters, watermark, blurry")


def image_prompt(acc: dict, scene: str, style_key: str | None = None, with_panda: bool = True, hint: str = "",
                 characters: list[tuple[str, str]] | None = None) -> str:
    """Prompt complet pour le générateur d'images. La SCÈNE vient en premier (le plus important), puis les personnages
    (fiches fixes), puis le style et les règles d'anatomie. `characters` = [(nom, description fixe)] des personnages
    non-panda de la scène."""
    key = style_key or acc.get("image_style", "cinema")
    style = IMAGE_STYLES.get(key, IMAGE_STYLES["cinema"])[1]
    parts = [f"Scene: {scene}"]
    if acc.get("mascot") and with_panda:
        parts.append(f"Main character: {PANDA}. The other characters are cartoon humans")
    elif acc.get("mascot"):
        parts.append("Characters: expressive cartoon humans, standing with feet on the ground")
    for name, desc in characters or []:
        parts.append(f"Character {name}, always drawn exactly like this: {desc}")
    if acc.get("image_extra"):
        parts.append(acc["image_extra"])
    parts.append(f"Style: {style}")
    parts.append(ANATOMY)
    if hint:
        parts.append(f"IMPORTANT, fix this previous mistake: {hint}. Use a simpler pose")
    return ". ".join(parts) + (IMAGE_SUFFIX_TEXT if key == "cartoon" else IMAGE_SUFFIX)


def scene_has_panda(scene: dict) -> bool:
    """Le panda n'apparaît que si la phrase parle de lui (et qu'on ne l'a pas retiré à la main)."""
    return scene.get("with_panda", True) is not False and "panda" in (scene.get("voice") or "").lower()


def get_account(account_id: str) -> dict:
    if account_id not in ACCOUNTS:
        raise KeyError(f"Compte inconnu : {account_id}")
    return ACCOUNTS[account_id]
