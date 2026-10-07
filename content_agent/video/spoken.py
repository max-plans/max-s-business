"""Prépare le texte pour qu'une voix de synthèse le lise comme un humain.

Les moteurs de voix lisent mal « 1,7 % », « 3 000 000 € », « 1er », « x2 », « 50 €/mois »...
On réécrit donc les nombres en toutes lettres, comme on les dit à l'oral :
« 1,7 % » → « un virgule sept pour cent », « 3 000 000 € » → « trois millions d'euros ».
Aucune dépendance externe.
"""
from __future__ import annotations

import re

_UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
          "treize", "quatorze", "quinze", "seize"]
_TENS = {20: "vingt", 30: "trente", 40: "quarante", 50: "cinquante", 60: "soixante"}


def _below_100(n: int, end: bool = True) -> str:
    if n <= 16:
        return _UNITS[n]
    if n < 20:
        return "dix-" + _UNITS[n - 10]
    if n < 70:
        t, u = divmod(n, 10)
        base = _TENS[t * 10]
        if u == 0:
            return base
        if u == 1:
            return f"{base} et un"
        return f"{base}-{_UNITS[u]}"
    if n < 80:  # 70-79 : soixante-dix, soixante et onze...
        return "soixante et onze" if n == 71 else "soixante-" + _below_100(n - 60)
    if n == 80:
        return "quatre-vingts" if end else "quatre-vingt"
    return "quatre-vingt-" + _below_100(n - 80)


def _below_1000(n: int, end: bool = True) -> str:
    h, r = divmod(n, 100)
    if h == 0:
        return _below_100(r, end)
    head = "cent" if h == 1 else f"{_UNITS[h]} cent" + ("s" if r == 0 and end else "")
    return head if r == 0 else f"{head} {_below_100(r, end)}"


def number_to_words(n: int) -> str:
    """Entier → mots en français (règles traditionnelles : vingt/cent au pluriel, « et un »...)."""
    if n < 0:
        return "moins " + number_to_words(-n)
    if n < 1000:
        return _below_1000(n)
    parts = []
    for value, sing, plur in ((10 ** 9, "milliard", "milliards"), (10 ** 6, "million", "millions")):
        q, n = divmod(n, value)
        if q:
            parts.append(f"{number_to_words(q)} {sing if q == 1 else plur}")
    q, n = divmod(n, 1000)
    if q:
        parts.append("mille" if q == 1 else f"{_below_1000(q, end=False)} mille")
    if n:
        parts.append(_below_1000(n))
    return " ".join(parts)


def ordinal(n: int, feminine: bool = False) -> str:
    if n == 1:
        return "première" if feminine else "premier"
    w = number_to_words(n)
    if w.endswith("cinq"):
        w += "u"
    elif w.endswith("neuf"):
        w = w[:-1] + "v"
    elif w.endswith("e"):
        w = w[:-1]
    return w + "ième"


def _decimal(int_part: str, dec_part: str) -> str:
    """« 1,75 » → « un virgule soixante-quinze », « 2,05 » → « deux virgule zéro cinq »."""
    head = number_to_words(int(int_part))
    zeros = len(dec_part) - len(dec_part.lstrip("0"))
    rest = dec_part.lstrip("0")
    tail = " ".join(["zéro"] * zeros + ([number_to_words(int(rest))] if rest else []))
    return f"{head} virgule {tail}"


def _num(raw: str) -> tuple[str, int | None]:
    """Chaîne numérique (« 1,7 », « 3000000 ») → (mots, valeur entière ou None si décimal)."""
    if "," in raw:
        a, b = raw.split(",", 1)
        b = b.rstrip("0")
        return (_decimal(a, b) if b else number_to_words(int(a))), (None if b else int(a))
    return number_to_words(int(raw)), int(raw)


def _money(words: str, value: int | None, unit: str) -> str:
    # « trois millions d'euros », « un million de dollars », mais « vingt euros »
    if value and value >= 10 ** 6 and value % 10 ** 6 == 0:
        return f"{words} {'d’' if unit[0] in 'aeiouy' else 'de '}{unit}".replace("’", "'")
    if words == "un":
        return f"un {unit[:-1]}" if unit.endswith("s") else f"un {unit}"
    return f"{words} {unit}"


_THOUSANDS = re.compile(r"(?<![\d,])(\d{1,3})((?:[  . ]\d{3})+)(?![\d])")
_CURRENCY = re.compile(r"(\d+(?:,\d+)?)\s*(k|K|M|Md)?\s*(€|euros?|\$|dollars?)(\s*/\s*(mois|an|jour|semaine|heure))?")
_PERCENT = re.compile(r"(\d+(?:,\d+)?)\s*(%|pour ?cent)")
_ORDINAL = re.compile(r"\b(\d+)(er|re|ère|e|ème|eme)\b")
_TIMES = re.compile(r"(?:\bx|×)\s?(\d+(?:,\d+)?)\b")
_PER = re.compile(r"\s*/\s*(mois|an|jour|semaine|heure)\b")
_NUMBER = re.compile(r"\d+(?:,\d+)?")


def speakable(text: str) -> str:
    """Réécrit les nombres, prix et pourcentages tels qu'on les prononce."""
    t = text.replace(" ", " ")
    t = _THOUSANDS.sub(lambda m: m.group(1) + re.sub(r"\D", "", m.group(2)), t)          # 3 000 000 → 3000000
    t = re.sub(r"(\d)\.(\d)", r"\1,\2", t)                                                # 1.7 → 1,7

    def cur(m: re.Match) -> str:
        words, value = _num(m.group(1))
        mult = {"k": 1000, "K": 1000, "M": 10 ** 6, "Md": 10 ** 9}.get(m.group(2) or "")
        unit = "dollars" if m.group(3).startswith(("$", "dollar")) else "euros"
        if mult:
            if value is not None:
                value *= mult
                words = number_to_words(value)
            else:
                # « 1,5 M€ » → « un million et demi d'euros », « 2,3 M€ » → « deux virgule trois millions d'euros »
                a, b = m.group(1).split(",", 1)
                big = {1000: "mille", 10 ** 6: "million", 10 ** 9: "milliard"}[mult]
                if b.rstrip("0") == "5":
                    words = f"{number_to_words(int(a))} {big}{'s' if int(a) > 1 and mult > 1000 else ''} et demi"
                else:
                    words += f" {big}{'s' if mult > 1000 else ''}"
                if mult >= 10 ** 6:
                    out = f"{words} {'d' + chr(39) if unit[0] in 'aeiouy' else 'de '}{unit}"
                    return out + (f" par {m.group(5)}" if m.group(5) else "")
        out = _money(words, value, unit)
        if m.group(5):
            out += f" par {m.group(5)}"
        return out

    t = _CURRENCY.sub(cur, t)
    t = _PERCENT.sub(lambda m: _num(m.group(1))[0] + " pour cent", t)
    t = _ORDINAL.sub(lambda m: ordinal(int(m.group(1)), feminine=m.group(2) in ("re", "ère")), t)
    t = _TIMES.sub(lambda m: "fois " + _num(m.group(1))[0], t)
    t = _PER.sub(lambda m: f" par {m.group(1)}", t)
    t = _NUMBER.sub(lambda m: _num(m.group(0))[0], t)
    return re.sub(r"\s{2,}", " ", t).strip()
