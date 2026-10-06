"""Sous-titres dynamiques (format .ass rendu par libass/ffmpeg).

- 1 à 3 mots à la fois, gros caractères avec contour, apparition « pop » ;
- le mot prononcé s'allume dans la couleur du compte, les mots-clés restent colorés ;
- hook en bandeau blanc les 3 premières secondes ;
- texte fort de chaque scène (on_screen) dans un encadré ;
- pseudo du compte en filigrane.
"""
from __future__ import annotations

import unicodedata
from dataclasses import dataclass
from pathlib import Path

from .tts import Word

W, H = 1080, 1920


@dataclass
class TimedWord:
    text: str
    start: float
    end: float
    scene: int
    emphasis: bool = False


@dataclass
class Overlay:
    text: str
    start: float
    end: float


def ass_color(hex_color: str, alpha: int = 0) -> str:
    h = hex_color.lstrip("#")
    return f"&H{alpha:02X}{h[4:6]}{h[2:4]}{h[0:2]}".upper()


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


def timed_words(scene_words: list[list[Word]], offsets: list[float], emphasis: list[list[str]]) -> list[TimedWord]:
    out: list[TimedWord] = []
    for i, (words, off) in enumerate(zip(scene_words, offsets)):
        emph = {_norm(e) for phrase in emphasis[i] for e in phrase.split() if len(_norm(e)) > 1}
        for w in words:
            out.append(TimedWord(w.text, off + float(w.start), off + float(w.end), i, _norm(w.text) in emph))
    return out


def group_words(words: list[TimedWord], per_line: int, max_chars: int) -> list[list[TimedWord]]:
    groups: list[list[TimedWord]] = []
    cur: list[TimedWord] = []
    for w in words:
        if cur:
            chars = sum(len(x.text) + 1 for x in cur) + len(w.text)
            gap = w.start - cur[-1].end
            if len(cur) >= per_line or chars > max_chars or gap > 0.35 or w.scene != cur[-1].scene:
                groups.append(cur)
                cur = []
        cur.append(w)
        if w.text.endswith(("?", "!")):
            groups.append(cur)
            cur = []
    if cur:
        groups.append(cur)
    return groups


def write_ass(path: Path, style: dict, font: str, words: list[TimedWord], hook: Overlay | None,
              cards: list[Overlay], handle: str, total: float) -> None:
    upper = style.get("uppercase", True)
    size = style.get("font_size", 100)
    y = style.get("sub_y", 1200)
    card_y = style.get("card_y", 600)
    txt, act, emp = style["text_color"], style["active_color"], style["emphasis_color"]

    header = f"""[Script Info]
ScriptType: v4.00+
PlayResX: {W}
PlayResY: {H}
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Sub,{font},{size},{ass_color(txt)},{ass_color(txt)},&H00000000,&H64000000,1,0,0,0,100,100,1,0,1,{max(5, size // 14)},4,5,60,60,0,1
Style: Hook,{font},{int(size * 0.78)},{ass_color('#111111')},{ass_color('#111111')},{ass_color('#FFFFFF')},&H00000000,1,0,0,0,100,100,0,0,3,20,0,5,80,80,0,1
Style: Card,{font},{int(size * 0.95)},{ass_color(act)},{ass_color(act)},&H30000000,&H00000000,1,0,0,0,100,100,0,0,3,26,0,5,90,90,0,1
Style: Handle,{font},38,&H50FFFFFF,&H50FFFFFF,&H90000000,&H00000000,0,0,0,0,100,100,1,0,1,2,0,5,0,0,0,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines: list[str] = []

    def disp(s: str) -> str:
        return _esc(s.upper() if upper else s)

    groups = group_words(words, style.get("words_per_line", 3), style.get("max_chars", 16))
    for gi, group in enumerate(groups):
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
            lines.append(f"Dialogue: 2,{_ts(start)},{_ts(end)},Sub,,0,0,0,,{{\\an5\\pos({W // 2},{y}){pop}}}" + " ".join(parts))

    if hook and hook.text:
        lines.append(
            f"Dialogue: 3,{_ts(hook.start)},{_ts(hook.end)},Hook,,0,0,0,,"
            f"{{\\an5\\pos({W // 2},300)\\fad(120,300)\\fscx85\\fscy85\\t(0,140,\\fscx100\\fscy100)}}{disp(hook.text)}"
        )
    for c in cards:
        lines.append(
            f"Dialogue: 1,{_ts(c.start)},{_ts(c.end)},Card,,0,0,0,,"
            f"{{\\an5\\pos({W // 2},{card_y})\\fad(180,180)\\fscx88\\fscy88\\t(0,150,\\fscx100\\fscy100)}}{disp(c.text)}"
        )
    if handle:
        lines.append(f"Dialogue: 0,{_ts(0)},{_ts(total)},Handle,,0,0,0,,{{\\an5\\pos({W // 2},{style.get('handle_y', min(y + 230, 1720))})}}{_esc(handle)}")
    path.write_text(header + "\n".join(lines) + "\n", encoding="utf-8")
