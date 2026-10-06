"""Génération des sous-titres animés (format .ass rendu par libass/ffmpeg).

Style « TikTok » : 1 à 3 mots à la fois, gros caractères avec contour, le mot prononcé
s'allume dans la couleur du compte, les mots-clés restent colorés.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .config import HEIGHT, WIDTH
from .tts import Word


@dataclass
class TimedWord:
    text: str
    start: float
    end: float
    segment: int
    emphasis: bool = False


@dataclass
class Overlay:
    text: str
    start: float
    end: float


def ass_color(hex_color: str, alpha: int = 0) -> str:
    h = hex_color.lstrip("#")
    r, g, b = h[0:2], h[2:4], h[4:6]
    return f"&H{alpha:02X}{b}{g}{r}".upper()


def _ts(t: float) -> str:
    t = max(t, 0)
    h, rem = divmod(t, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h)}:{int(m):02d}:{s:05.2f}"


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s.lower())
    return "".join(c for c in s if c.isalnum())


def _esc(s: str) -> str:
    s = s.replace("\\N", "\n").replace("\\", "").replace("{", "(").replace("}", ")")
    return s.replace("\n", "\\N")


def build_timed_words(segments_words: list[list[Word]], offsets: list[float], emphasis: list[list[str]]) -> list[TimedWord]:
    out: list[TimedWord] = []
    for i, (words, off) in enumerate(zip(segments_words, offsets)):
        emph = {_norm(e) for phrase in emphasis[i] for e in phrase.split()}
        for w in words:
            out.append(TimedWord(w.text, off + w.start, off + w.end, i, _norm(w.text) in emph))
    return out


def group_words(words: list[TimedWord], per_line: int, max_chars: int) -> list[list[TimedWord]]:
    groups: list[list[TimedWord]] = []
    cur: list[TimedWord] = []
    for w in words:
        if cur:
            chars = sum(len(x.text) + 1 for x in cur) + len(w.text)
            gap = w.start - cur[-1].end
            if len(cur) >= per_line or chars > max_chars or gap > 0.35 or w.segment != cur[-1].segment:
                groups.append(cur)
                cur = []
        cur.append(w)
        if w.text.endswith(("?", "!")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def write_ass(
    path: Path,
    channel: dict,
    font: str,
    words: list[TimedWord],
    hook: Overlay | None,
    highlights: list[Overlay],
    total: float,
) -> None:
    st = channel["style"]
    upper = st.get("uppercase", True)
    size = st.get("font_size", 100)
    y = st.get("position_y", 1180)
    txt, act, emp = st["text_color"], st["active_color"], st["emphasis_color"]

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {WIDTH}
PlayResY: {HEIGHT}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{font},{size},{ass_color(txt)},{ass_color(txt)},&H00000000,&H64000000,1,0,0,0,100,100,1,0,1,{max(5, size // 14)},4,5,60,60,0,1
Style: Hook,{font},{int(size * 0.8)},{ass_color('#111111')},{ass_color('#111111')},{ass_color('#FFFFFF')},&H00000000,1,0,0,0,100,100,0,0,3,20,0,5,80,80,0,1
Style: Card,{font},{int(size * 0.74)},{ass_color(act)},{ass_color(act)},&H30000000,&H00000000,1,0,0,0,100,100,0,0,3,28,0,5,100,100,0,1
Style: Handle,{font},38,&H50FFFFFF,&H50FFFFFF,&H90000000,&H00000000,0,0,0,0,100,100,1,0,1,2,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines: list[str] = []

    def disp(s: str) -> str:
        return _esc(s.upper() if upper else s)

    for gi, group in enumerate(groups := group_words(words, st.get("words_per_line", 3), st.get("max_chars_per_line", 16))):
        g_end = group[-1].end + 0.15
        if gi + 1 < len(groups):
            g_end = min(g_end, groups[gi + 1][0].start)
        for wi, w in enumerate(group):
            start = w.start if wi else group[0].start
            end = group[wi + 1].start if wi + 1 < len(group) else g_end
            if end <= start:
                continue
            parts = []
            for j, other in enumerate(group):
                t = disp(other.text)
                if j == wi:
                    parts.append(f"{{\\c{ass_color(act)}\\fscx110\\fscy110}}{t}{{\\c{ass_color(txt)}\\fscx100\\fscy100}}")
                elif other.emphasis:
                    parts.append(f"{{\\c{ass_color(emp)}}}{t}{{\\c{ass_color(txt)}}}")
                else:
                    parts.append(t)
            pop = "\\fscx82\\fscy82\\t(0,90,\\fscx100\\fscy100)" if wi == 0 else ""
            lines.append(
                f"Dialogue: 2,{_ts(start)},{_ts(end)},Sub,,0,0,0,,{{\\an5\\pos({WIDTH // 2},{y}){pop}}}" + " ".join(parts)
            )

    if hook and hook.text:
        lines.append(
            f"Dialogue: 3,{_ts(hook.start)},{_ts(hook.end)},Hook,,0,0,0,,"
            f"{{\\an5\\pos({WIDTH // 2},400)\\fad(120,300)\\fscx85\\fscy85\\t(0,140,\\fscx100\\fscy100)}}{disp(hook.text)}"
        )
    for h in highlights:
        lines.append(
            f"Dialogue: 1,{_ts(h.start)},{_ts(h.end)},Card,,0,0,0,,"
            f"{{\\an5\\pos({WIDTH // 2},780)\\fad(200,200)\\fscx90\\fscy90\\t(0,160,\\fscx100\\fscy100)}}{_esc(h.text)}"
        )
    if channel.get("handle"):
        lines.append(f"Dialogue: 0,{_ts(0)},{_ts(total)},Handle,,0,0,0,,{{\\an5\\pos({WIDTH // 2},1460)}}{_esc(channel['handle'])}")

    path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
