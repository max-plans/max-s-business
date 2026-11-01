# -*- coding: utf-8 -*-
"""
Génère l'ANIMATIQUE de chaque vidéo : les cases du storyboard minutées selon la liste de scènes,
avec les paroles karaoké (brouillon) et la maquette du refrain en fond sonore discret.
But : valider le rythme et le découpage AVANT de dépenser des crédits de génération IA.

Usage : python3 _outils/animatique.py            (toutes les vidéos)
        python3 _outils/animatique.py 3          (vidéo 3 seulement)
Sortie : 04_VIDEOS/VIDEO_XX/animatique_VIDEO_XX.mp4 (854x480, léger)
"""
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import ROOT, BUILD, svg_page, run  # noqa: E402
from videos_data import VIDEOS  # noqa: E402
from generer_contenus import panel_svg, secs, dur_to_s  # noqa: E402
import karaoke  # noqa: E402
import scenes as S  # noqa: E402


def main(only=None):
    todo = [v for v in VIDEOS if only is None or v["n"] == only]
    for v in todo:
        n = v["n"]
        for i, sc in enumerate(v["scenes"]):
            body = panel_svg(sc)
            body += (f'<rect x="24" y="24" width="300" height="56" rx="28" fill="#FFFFFF" opacity="0.9"/>'
                     f'<text x="44" y="62" font-family="Fredoka" font-weight="700" font-size="30" fill="#2B2D6E">'
                     f'Scène {i + 1} · {sc[1][:12]}</text>'
                     f'<text x="1256" y="700" text-anchor="end" font-family="Nunito" font-weight="800" font-size="22" '
                     f'fill="#FFFFFF" stroke="#2B2D6E" stroke-width="4" paint-order="stroke">ANIMATIQUE – brouillon</text>')
            if not sc[3]:
                body += S.title(640, 380, "Fondu au noir", 70, "#FFE89A", "#1B1D4E", 8)
            svg_page(body, 1280, 720, os.path.join(BUILD, f"anim_{n:02d}_{i:02d}.png"))
    run()
    for v in todo:
        n = v["n"]
        scs = v["scenes"]
        total = dur_to_s(v["duree"])
        lst = os.path.join(BUILD, f"anim_{n:02d}.txt")
        with open(lst, "w") as f:
            for i, sc in enumerate(scs):
                end = secs(scs[i + 1][0]) if i + 1 < len(scs) else total
                d = max(2, end - secs(sc[0]))
                f.write(f"file '{BUILD}/anim_{n:02d}_{i:02d}.png'\nduration {d}\n")
            f.write(f"file '{BUILD}/anim_{n:02d}_{len(scs) - 1:02d}.png'\n")
        vd = os.path.join(ROOT, "04_VIDEOS", f"VIDEO_{n:02d}")
        ass = os.path.join(BUILD, f"anim_{n:02d}.ass")
        karaoke.srt_to_ass(os.path.join(vd, "paroles_ecran_BROUILLON.srt"), ass)
        audio = os.path.join(ROOT, "05_MUSIQUES", "maquettes", f"VIDEO_{n:02d}_refrain.mp3")
        out = os.path.join(vd, f"animatique_VIDEO_{n:02d}.mp4")
        vf = (f"fps=12,scale=854:480,"
              f"subtitles={ass}:fontsdir={karaoke.FONTS_DIR}:original_size=1920x1080,format=yuv420p")
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lst,
               "-stream_loop", "-1", "-i", audio, "-filter_complex", f"[0:v]{vf}[v];[1:a]volume=0.35[a]",
               "-map", "[v]", "-map", "[a]", "-t", str(total), "-c:v", "libx264", "-crf", "30", "-preset", "veryfast",
               "-c:a", "aac", "-b:a", "64k", out]
        subprocess.run(cmd, check=True)
        print("OK", out)


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else None)
