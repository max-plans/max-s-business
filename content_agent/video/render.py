"""VOIX → VISUELS → SOUS-TITRES → MONTAGE → MP4 (9:16, 1080×1920, 30 i/s)."""
from __future__ import annotations

import copy
import random
import re
import shutil
import time
import unicodedata
from pathlib import Path
from typing import Callable

from .. import settings
from ..accounts import get_account
from ..paths import MUSIC_DIR, VIDEOS_DIR, WORK_DIR
from . import panda, qc
from .fonts import FONTS, font_file, resolve_font
from .media import probe_duration, run
from .subtitles import Overlay, timed_words, write_ass
from .tts import synthesize_script, synthesize, voice_envelope
from .visuals import scene_visual

FPS = 30
W, H = 1080, 1920
TAIL = 0.8
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19", "-pix_fmt", "yuv420p", "-r", str(FPS)]

_edge_down_until = 0.0


def slugify(s: str) -> str:
    s = unicodedata.normalize("NFD", (s or "video").lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")[:50] or "video"


def build_caption(video: dict, acc: dict) -> str:
    text = (video.get("description") or "").strip()
    if acc.get("disclaimer") and acc["disclaimer"] not in text:
        text += f"\n{acc['disclaimer']}"
    tags = " ".join(video.get("hashtags") or acc["hashtags"])
    return f"{text}\n\n{tags}".strip()


def _ensure_characters(acc: dict, scenes: list[dict], cfg: dict) -> None:
    """Crée (une seule fois) la fiche de référence de chaque personnage utilisé : panda et personnages nommés."""
    from .. import characters
    keys = []
    if acc.get("mascot") and any(sc.get("with_panda", True) for sc in scenes):
        keys.append(characters.PANDA_SLUG)
    for sc in scenes:
        for n in sc.get("characters") or []:
            c = characters.get(n)
            if c and c["slug"] not in keys and not characters.is_panda(n):
                keys.append(c["slug"])
    style = (cfg.get("image_styles") or {}).get(acc["id"]) or None
    for k in keys:
        try:
            characters.ensure_reference(k, acc, style, cfg)
        except Exception as e:  # noqa: BLE001
            print(f"  ! fiche personnage {k} impossible : {type(e).__name__}: {e}")


def render(video: dict, progress: Callable[[int, str], None]) -> dict:
    global _edge_down_until
    cfg = settings.load()
    acc = get_account(video["account"])
    scenes = video["scenes"]
    if not scenes:
        raise RuntimeError("Cette vidéo n'a pas encore de script.")
    style = copy.deepcopy(acc["style"])
    if cfg.get("music_volume") is not None:
        style["music_volume"] = cfg["music_volume"]
    local_panda = bool(acc.get("mascot")) and cfg.get("panda_mode") == "local"
    if local_panda:  # le panda occupe le bas de l'écran : texte au-dessus
        style.update(sub_y=760, card_y=480, handle_y=1880)

    work = WORK_DIR / f"v{video['id']}_{int(time.time())}"
    work.mkdir(parents=True, exist_ok=True)
    notes: list[str] = []
    try:
        # ---------------- 1. VOIX
        engine = cfg.get("tts_engine", "edge")
        voice_cfg = dict(acc["voice"])
        if (cfg.get("voices") or {}).get(acc["id"]):
            voice_cfg["edge"] = cfg["voices"][acc["id"]]
        use_eleven = _eleven_ready(cfg, acc, scenes, notes)
        spoken = []
        # Lecture continue : plusieurs phrases d'un trait (intonation humaine), découpées ensuite par scène.
        if cfg.get("voice_continuous", True):
            eng0 = "elevenlabs" if use_eleven else ("piper" if (engine == "edge" and time.time() < _edge_down_until) else engine)
            if eng0 in ("edge", "elevenlabs"):
                progress(8, "Voix off : lecture continue du script...")
                vc = dict(voice_cfg)
                if use_eleven:
                    vc["eleven"] = {"key": cfg["elevenlabs_key"], "voice": cfg["eleven_voices"][acc["id"]],
                                    "model": cfg.get("elevenlabs_model") or "eleven_multilingual_v2",
                                    "speed": acc["voice"].get("eleven_speed", 1.0)}
                spoken = synthesize_script(vc, scenes, work, eng0) or []
                if not spoken and use_eleven:
                    notes.append("Lecture continue ElevenLabs impossible : phrase par phrase")
        continuous = bool(spoken)
        for i, sc in enumerate(scenes):
            if continuous:
                break
            progress(5 + int(30 * i / len(scenes)), f"Voix off : scène {i + 1}/{len(scenes)}")
            eng = "piper" if (engine == "edge" and time.time() < _edge_down_until) else engine
            if use_eleven:
                eng = "elevenlabs"
                voice_cfg["eleven"] = {
                    "key": cfg["elevenlabs_key"], "voice": cfg["eleven_voices"][acc["id"]], "model": cfg.get("elevenlabs_model") or "eleven_multilingual_v2",
                    "speed": acc["voice"].get("eleven_speed", 1.0),
                    "prev": " ".join(x["voice"] for x in scenes[max(0, i - 2):i]), "next": scenes[i + 1]["voice"] if i + 1 < len(scenes) else "",
                }
            sp = synthesize(voice_cfg, sc["voice"], work / f"voice_{i:02d}", engine=eng,
                            tone=sc.get("tone"), emphasis=sc.get("emphasis") or [])
            if eng == "elevenlabs" and sp.engine != "elevenlabs":
                use_eleven = False  # quota ou réseau : le reste de la vidéo passe en voix gratuite
            if eng == "edge" and sp.engine == "piper":
                _edge_down_until = time.time() + 600
            pause = TONE_PAUSE.get(sc.get("tone") or "", 0.0) or (0.1 if sc["voice"].rstrip().endswith("?") else 0.0)
            if pause:
                _pad_audio(sp, pause)
            spoken.append(sp)
        used = sorted({s.engine for s in spoken})
        notes.append("Voix : " + " + ".join({"edge": "Edge TTS", "piper": "Piper (local)", "elevenlabs": "ElevenLabs"}[u] for u in used))
        durations = [s.duration for s in spoken]
        offsets, t = [], 0.0
        for d in durations:
            offsets.append(t)
            t += d
        voice_total = t
        total = voice_total + TAIL

        # ---------------- 2. VISUELS
        media_list: list[list] = []
        if cfg["visual_source"].get(acc["id"], "ai") == "ai" and not local_panda:
            progress(35, "Fiches des personnages...")
            _ensure_characters(acc, scenes, cfg)
        for i, sc in enumerate(scenes):
            progress(35 + int(25 * i / len(scenes)), f"Images : scène {i + 1}/{len(scenes)}")
            media_list.append(list(scene_visual(acc, sc, i, video["id"], cfg, local_panda)))

        # Contrôle qualité : Claude regarde les images (membre manquant, panda déformé, texte absurde...)
        # et les mauvaises sont régénérées (2 tentatives maximum).
        redone, doubtful = 0, 0
        if cfg.get("image_qc", True) and any(m[2] == "ai" for m in media_list):
            progress(60, "Contrôle qualité des images...")
            ai_idx = [i for i, m in enumerate(media_list) if m[2] == "ai"]
            bad = qc.review([(i, media_list[i][0], scenes[i]) for i in ai_idx], bool(acc.get("mascot")))
            for attempt in (1, 2):
                if not bad:
                    break
                for n, (i, problem) in enumerate(list(bad.items())):
                    progress(61 + attempt * 2, f"Image {i + 1} refaite (essai {attempt}) : {problem[:50]}")
                    new = list(scene_visual(acc, scenes[i], i, video["id"], cfg, local_panda, attempt, problem))
                    if new[2] == "ai":
                        media_list[i] = new
                        redone += 1
                bad = qc.review([(i, media_list[i][0], scenes[i]) for i in bad], bool(acc.get("mascot")))
            doubtful = len(bad)
            notes.append(f"Images contrôlées par IA ({redone} refaite(s)" + (f", {doubtful} douteuse(s) à vérifier" if doubtful else "") + ")")

        shots: list[Path] = []
        sources: list[str] = []
        for i, (media, kind, src) in enumerate(media_list):
            progress(64 + int(8 * i / len(scenes)), f"Montage de l'image {i + 1}/{len(scenes)}")
            sources.append(src)
            d = durations[i] + (TAIL if i == len(scenes) - 1 else 0)
            shot = work / f"shot_{i:03d}.mp4"
            _make_shot(media, kind, d, style["grade"], shot, i, style.get("motion", True))
            shots.append(shot)
        if acc.get("mascot") and not local_panda and "local" in sources:
            # Images IA indisponibles : plutôt qu'un fond vide, le panda animé local joue la scène.
            from .visuals import local_background
            local_panda = True
            style.update(sub_y=760, card_y=480, handle_y=1880)
            for i in range(len(scenes)):
                d = durations[i] + (TAIL if i == len(scenes) - 1 else 0)
                _make_shot(local_background(acc, video["id"] * 37 + i), "image", d, style["grade"], shots[i], i)
            from . import visuals as _vis
            why = _vis.last_error or "service injoignable"
            notes.append(f"Images de secours : panda animé (images IA indisponibles : {why})")
        notes.append("Visuels : " + ", ".join(f"{sources.count(s)}× {s}" for s in sorted(set(sources))))
        if "local" in sources and cfg["visual_source"].get(acc["id"], "ai") != "local" and not acc.get("mascot"):
            from . import visuals as _vis
            notes.append(f"Images de secours ({_vis.last_error or 'service injoignable'})")

        progress(72, "Montage des plans...")
        base = work / "base.mp4"
        _concat(shots, base, work)

        # ---------------- 3. SOUS-TITRES
        progress(76, "Sous-titres...")
        words = timed_words([s.words for s in spoken], offsets, [sc.get("emphasis", []) for sc in scenes])
        hook_end = min(3.0, voice_total)
        cards = []
        for i, sc in enumerate(scenes):
            if sc.get("on_screen", "").strip():
                start = offsets[i] + 0.1
                if i == 0:
                    start = max(start, hook_end)
                end = offsets[i] + durations[i]
                if end - start > 0.6:
                    cards.append(Overlay(sc["on_screen"].strip(), start, end))
        font_key = style.get("font", "anton")
        font = resolve_font(font_key)
        fonts_dir = work / "fonts"
        fonts_dir.mkdir(exist_ok=True)
        for key in FONTS:
            f = font_file(key)
            if f:
                shutil.copy(f, fonts_dir / f.name)
        handle = (cfg.get("handles") or {}).get(acc["id"], "")
        write_ass(work / "subs.ass", style, font, words, Overlay(video.get("hook") or "", 0.0, hook_end), cards, handle, total)

        # ---------------- 4. AUDIO
        progress(80, "Mixage audio...")
        audio = _audio(acc, style, [s.audio for s in spoken], total, work)

        # ---------------- 5. MASCOTTE
        panda_list = None
        if local_panda:
            progress(84, "Animation du panda...")
            voice_wav = work / "voice.wav"
            env = voice_envelope(voice_wav, FPS)
            bounds = [(offsets[i], offsets[i] + durations[i], panda.pose_for_scene(sc, i)) for i, sc in enumerate(scenes)]
            bounds[-1] = (bounds[-1][0], total + 1, bounds[-1][2])
            panda_list = panda.build_track(env, bounds, FPS, total, work / "panda.txt")

        # ---------------- 6. EXPORT MP4
        progress(88, "Export MP4...")
        out_dir = VIDEOS_DIR / acc["id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{video['id']:04d}_{slugify(video.get('title'))}.mp4"
        post = []
        if style.get("vignette"):
            post.append("vignette=PI/4.5")
        if style.get("grain"):
            post.append(f"noise=alls={int(style['grain'])}:allf=t")
        post.append("ass=subs.ass:fontsdir=fonts")
        inputs = ["-i", "base.mp4", "-i", audio.name]
        if panda_list:
            inputs += ["-f", "concat", "-safe", "0", "-i", panda_list.name]
            fc = (
                "[2:v]scale=860:-1,format=rgba[p];"
                "[0:v][p]overlay=x=(W-w)/2:y=H-h+60+12*sin(2*PI*t/1.9):shortest=0:eof_action=repeat[v0];"
                f"[v0]{','.join(post)}[v]"
            )
        else:
            fc = f"[0:v]{','.join(post)}[v]"
        run([
            "ffmpeg", "-y", *inputs, "-filter_complex", fc, "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-maxrate", "8M", "-bufsize", "16M",
            "-pix_fmt", "yuv420p", "-r", str(FPS), "-c:a", "copy", "-movflags", "+faststart",
            "-t", f"{total:.3f}", str(out.resolve()),
        ], cwd=work)
        duration = probe_duration(out)
        caption = build_caption(video, acc)
        out.with_suffix(".txt").write_text(f"{video.get('title', '')}\n\n{caption}\n", encoding="utf-8")
        progress(100, "Vidéo terminée")
        return {"path": out, "duration": round(duration, 1), "caption": caption, "notes": notes}
    finally:
        shutil.rmtree(work, ignore_errors=True)


from .delivery import TONE_PAUSE  # noqa: E402


def _pad_audio(sp, seconds: float) -> None:
    """Ajoute un court silence après la phrase (effet de suspense / respiration)."""
    padded = sp.audio.with_name(sp.audio.stem + "_p.wav")
    run(["ffmpeg", "-y", "-i", str(sp.audio), "-af", f"apad=pad_dur={seconds:.2f}", str(padded)])
    sp.audio = padded
    sp.duration = probe_duration(padded)


def _eleven_ready(cfg: dict, acc: dict, scenes: list[dict], notes: list[str]) -> bool:
    """ElevenLabs seulement si choisi pour ce compte ET si le crédit restant couvre toute la vidéo."""
    if (cfg.get("voice_engines") or {}).get(acc["id"]) != "elevenlabs":
        return False
    key, voice = cfg.get("elevenlabs_key"), (cfg.get("eleven_voices") or {}).get(acc["id"])
    if not key or not voice:
        notes.append("ElevenLabs non configuré → voix gratuite")
        return False
    from . import elevenlabs
    try:
        sub = elevenlabs.subscription(key)
    except elevenlabs.ElevenError as e:
        notes.append(f"{e} → voix gratuite")
        return False
    need = elevenlabs.cost([s["voice"] for s in scenes], cfg.get("elevenlabs_model") or "eleven_multilingual_v2")
    if sub["remaining"] < need:
        notes.append(f"Crédit ElevenLabs insuffisant ({sub['remaining']} restants, {need} nécessaires) → voix gratuite")
        return False
    return True


def _make_shot(media: Path, kind: str, d: float, grade: str, out: Path, variant: int, motion: bool = True) -> None:
    if kind == "image" and not motion:
        # Image parfaitement fixe (style des vidéos « panthère ») : simple recadrage plein écran 9:16.
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},"
              f"{grade or 'null'},setsar=1,format=yuv420p")
        run(["ffmpeg", "-y", "-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", str(media),
             "-t", f"{d:.3f}", "-vf", vf, *ENC, "-an", str(out)])
        return
    sw, sh = int(W * 1.14) // 2 * 2, int(H * 1.14) // 2 * 2
    v = variant % 4
    x, y = {
        0: (f"(in_w-out_w)*t/{d:.3f}", "(in_h-out_h)/2"),
        1: (f"(in_w-out_w)*(1-t/{d:.3f})", "(in_h-out_h)/2"),
        2: ("(in_w-out_w)/2", f"(in_h-out_h)*(1-t/{d:.3f})"),
        3: ("(in_w-out_w)/2", f"(in_h-out_h)*t/{d:.3f}"),
    }[v]
    vf = (f"scale={sw}:{sh}:force_original_aspect_ratio=increase,crop={sw}:{sh},"
          f"crop={W}:{H}:x='{x}':y='{y}',fps={FPS},{grade or 'null'},setsar=1,format=yuv420p")
    if kind == "image":
        # Image fixe : zoom lent et centré (le personnage reste au centre), avant / arrière en alternance.
        z0, z1 = (1.0, 1.10) if variant % 2 == 0 else (1.10, 1.0)
        zoom = f"({z0}+({z1 - z0:.2f})*t/{d:.3f})"
        vf = (f"scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},"
              f"scale=w='trunc({W}*{zoom}/2)*2':h='trunc({H}*{zoom}/2)*2':eval=frame,"
              f"crop={W}:{H},fps={FPS},{grade or 'null'},setsar=1,format=yuv420p")
        src = ["-loop", "1", "-framerate", str(FPS), "-t", f"{d:.3f}", "-i", str(media)]
    else:
        dur = probe_duration(media)
        pre = ["-ss", f"{random.uniform(0, max(dur - d - 0.2, 0)):.2f}"] if dur > d + 0.5 else ["-stream_loop", "-1"]
        src = [*pre, "-i", str(media)]
    run(["ffmpeg", "-y", *src, "-t", f"{d:.3f}", "-vf", vf, *ENC, "-an", str(out)])


def _concat(files: list[Path], out: Path, work: Path, audio: bool = False) -> None:
    lst = work / f"{out.stem}_list.txt"
    lst.write_text("".join(f"file '{f.resolve().as_posix()}'\n" for f in files))
    codec = ["-c:a", "pcm_s16le"] if audio else ["-c", "copy"]
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), *codec, str(out)])


def _audio(acc: dict, style: dict, voices: list[Path], total: float, work: Path) -> Path:
    voice = work / "voice.wav"
    _concat(voices, voice, work, audio=True)
    out = work / "mix.m4a"
    tracks = [p for p in (MUSIC_DIR / acc["id"]).glob("*") if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".ogg"}]
    vol = style.get("music_volume", 0.12)
    if tracks and vol > 0:
        fc = (
            f"[0:a]apad=pad_dur={TAIL},asplit=2[v1][v2];"
            f"[1:a]volume={vol},afade=t=in:d=1.5,afade=t=out:st={max(total - 2.5, 0):.2f}:d=2.5[m];"
            "[m][v1]sidechaincompress=threshold=0.04:ratio=5:attack=15:release=350[md];"
            "[v2][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]"
        )
        run(["ffmpeg", "-y", "-i", str(voice), "-stream_loop", "-1", "-i", str(random.choice(tracks)),
             "-filter_complex", fc, "-map", "[a]", "-t", f"{total:.3f}", "-ar", "48000",
             "-c:a", "aac", "-b:a", "192k", str(out)])
    else:
        run(["ffmpeg", "-y", "-i", str(voice), "-af", f"apad=pad_dur={TAIL},loudnorm=I=-14:TP=-1.5:LRA=11",
             "-t", f"{total:.3f}", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", str(out)])
    return out
