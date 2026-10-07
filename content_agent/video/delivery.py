"""Direction vocale : transforme un texte + un ton en une lecture expressive, comme un narrateur humain.

Ce qui rend une voix de synthèse « lue par une IA » : même vitesse partout, aucune respiration, aucun mot
mis en valeur, phrases qui finissent toutes pareil. On agit sur chacun de ces points :

- ton par phrase (accroche, suspense, grave...) → vitesse / hauteur / énergie différentes ;
- Edge : SSML riche (pauses aux virgules et aux « … », mots clés accentués, fin de phrase qui descend,
  question qui monte) dans UNE seule requête, donc intonation continue ;
- ElevenLabs : réglages d'expression par ton, balises d'émotion (modèle v3), mots clés en majuscules (v3) ;
- légère variation aléatoire (mais reproductible) de la vitesse d'une phrase à l'autre ;
- traitement audio « voix de narrateur » (compression douce, présence, chaleur).
"""
from __future__ import annotations

import hashlib
import re
import unicodedata
from xml.sax.saxutils import escape

# Ton → (variation de vitesse en %, variation de hauteur en Hz)
TONES: dict[str, tuple[int, int]] = {
    "accroche": (+6, +6), "energique": (+8, +8), "suspense": (-6, -5), "grave": (-4, -8),
    "question": (+2, +12), "chute": (-3, -4), "normal": (0, 0),
}
TONE_PAUSE = {"suspense": 0.22, "chute": 0.18, "question": 0.1}   # silence après la phrase (s)

# ElevenLabs (modèles v2) : plus la stabilité est basse et le style haut, plus la lecture est expressive.
ELEVEN_TONE = {  # ton → (stabilité, style, facteur de vitesse)
    "accroche": (0.25, 0.70, 1.05), "energique": (0.25, 0.65, 1.07), "suspense": (0.35, 0.55, 0.94),
    "grave": (0.40, 0.45, 0.96), "question": (0.30, 0.55, 1.00), "chute": (0.40, 0.50, 0.95),
    "normal": (0.35, 0.45, 1.00),
}
V3_TAGS = {"accroche": "[excited]", "energique": "[excited]", "suspense": "[whispers]", "question": "[curious]"}


def pct(v: str | None) -> int:
    return int(re.sub(r"[^\d-]", "", v or "0") or 0)


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "").lower())
    return "".join(c for c in s if c.isalnum())


def _jitter(text: str) -> int:
    """-2..+2 % reproductible selon le texte : deux phrases ne sont jamais lues exactement au même rythme."""
    return int(hashlib.sha1(text.encode()).hexdigest()[:4], 16) % 5 - 2


def with_tone(voice_cfg: dict, tone: str | None, text: str = "") -> dict:
    dr, dp = TONES.get(tone or "normal", (0, 0))
    dr += _jitter(text) if text else 0
    cfg = dict(voice_cfg)
    cfg["rate"] = f"{pct(voice_cfg.get('rate', '+0%')) + dr:+d}%"
    cfg["pitch"] = f"{pct(voice_cfg.get('pitch', '+0Hz')) + dp:+d}Hz"
    if voice_cfg.get("piper_speed"):
        cfg["piper_speed"] = round(voice_cfg["piper_speed"] * (1 - dr / 100), 3)
    return cfg


# ------------------------------------------------------------------ Edge : SSML riche

_BREAKS = {",": 130, ";": 200, ":": 220, "…": 380, "...": 380, "—": 300, "–": 260, ".": 250, "!": 250, "?": 250}
_TOKEN = re.compile(r"^([^\w]*)(.*?)([^\w]*)$", re.U)


def edge_ssml(text: str, tone: str | None, emphasis: list[str] | tuple = ()) -> str:
    """Contenu SSML (à placer dans la balise <prosody> d'Edge) : pauses, accents, intonation de fin de phrase."""
    emph = {norm(w) for e in emphasis for w in e.split() if len(norm(w)) > 2}
    text = re.sub(r"\s+([?!;:,.…])", r"\1", text.replace(" ", " "))   # « Pourquoi ? » → « Pourquoi? »
    tokens = text.split()
    n = len(tokens)
    last = text.strip()[-1:] if text.strip() else "."
    out: list[str] = []
    for i, tok in enumerate(tokens):
        lead, core, trail = _TOKEN.match(tok).groups()
        if not core:
            if tok[:1] in "—–-":                        # tiret isolé : simple respiration
                out.append(f'<break time="{_BREAKS.get(tok[:1], 250)}ms"/>')
            else:
                out.append(escape(tok))
            continue
        piece = escape(lead + core)
        if norm(core) in emph:                          # mot clé : plus haut, plus lent, plus fort
            piece = f'<prosody pitch="+9%" rate="-10%" volume="+18%">{piece}</prosody>'
        elif i >= n - 2 and last == "?":                # la question monte
            piece = f'<prosody pitch="+8%">{piece}</prosody>'
        elif i >= n - 3 and last in ".…" and tone != "energique":   # l'affirmation retombe progressivement
            drop, slow = {n - 3: (-2, -3), n - 2: (-4, -5), n - 1: (-7, -8)}[i]
            piece = f'<prosody pitch="{drop}%" rate="{slow}%">{piece}</prosody>'
        elif i >= n - 2 and last == "!":
            piece = f'<prosody rate="+4%" volume="+10%">{piece}</prosody>'
        piece += escape(trail)
        if i < n - 1 and trail:
            key = "…" if trail.endswith(("…", "...")) else trail[-1]
            if key in _BREAKS:
                piece += f'<break time="{_BREAKS[key]}ms"/>'
        out.append(piece)
    return " ".join(out)


# ------------------------------------------------------------------ ElevenLabs

def eleven_settings(model: str, tone: str | None, speed: float) -> dict:
    stab, style, f = ELEVEN_TONE.get(tone or "normal", ELEVEN_TONE["normal"])
    if model == "eleven_v3":                           # v3 : stabilité 0 / 0,5 / 1 seulement
        return {"stability": 0.0 if tone in ("accroche", "energique", "suspense") else 0.5}
    return {"stability": stab, "similarity_boost": 0.75, "style": style, "use_speaker_boost": True,
            "speed": max(0.7, min(1.2, speed * f))}


def eleven_text(text: str, tone: str | None, emphasis: list[str] | tuple, model: str) -> tuple[str, dict[str, str]]:
    """Texte envoyé à ElevenLabs + correspondance MAJUSCULE → original (pour des sous-titres en minuscules)."""
    restore: dict[str, str] = {}
    if model != "eleven_v3":
        return text, restore
    for e in emphasis:
        for w in e.split():
            if len(norm(w)) < 3:
                continue
            pattern = re.compile(rf"\b{re.escape(w)}\b", re.I)
            m = pattern.search(text)
            if m:
                restore[m.group(0).upper()] = m.group(0)
                text = pattern.sub(lambda mm: mm.group(0).upper(), text, count=1)
    tag = V3_TAGS.get(tone or "")
    return (f"{tag} {text}" if tag else text), restore


def strip_tags(words: list) -> list:
    """Retire les balises [excited]... renvoyées par l'alignement ElevenLabs."""
    return [w for w in words if not (w[0].startswith("[") and w[0].endswith("]"))]


# ------------------------------------------------------------------ traitement audio « narrateur »

POLISH = (
    "highpass=f=70,lowpass=f=15000,"
    "acompressor=threshold=0.125:ratio=3:attack=5:release=90:makeup=2,"
    "equalizer=f=180:t=q:w=1:g=1.5,equalizer=f=3000:t=q:w=1:g=2,"
    "afade=t=in:d=0.008,areverse,afade=t=in:d=0.02,areverse"
)
