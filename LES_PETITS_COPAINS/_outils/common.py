# -*- coding: utf-8 -*-
"""Outils partagés : chemins, page HTML avec polices, file de rendu."""
import json, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "_outils")
FONTS = os.path.join(ROOT, "01_IDENTITE", "charte_graphique", "polices")
BUILD = "/tmp/tralalune_build"
os.makedirs(BUILD, exist_ok=True)

FONT_CSS = "".join(
    f"@font-face{{font-family:'{fam}';font-weight:{w};src:url('file://{FONTS}/{f}') format('woff2');}}"
    for fam, w, f in [("Baloo2", 800, "baloo-2-latin-800-normal.woff2"),
                      ("Fredoka", 600, "fredoka-latin-600-normal.woff2"),
                      ("Fredoka", 700, "fredoka-latin-700-normal.woff2"),
                      ("Nunito", 400, "nunito-latin-400-normal.woff2"),
                      ("Nunito", 700, "nunito-latin-700-normal.woff2"),
                      ("Nunito", 800, "nunito-latin-800-normal.woff2")])

_jobs = []


def page(body, w, h, bg="transparent", css=""):
    return (f"<!DOCTYPE html><html><head><meta charset='utf-8'><style>{FONT_CSS}"
            f"html,body{{margin:0;padding:0;width:{w}px;height:{h}px;background:{bg};overflow:hidden}}"
            f"svg{{display:block}}{css}</style></head><body>{body}</body></html>")


def svg_page(svg_inner, w, h, out, transparent=False, bg="transparent"):
    from art import defs
    svg = (f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>"
           f"{defs()}{svg_inner}</svg>")
    name = os.path.join(BUILD, f"job{len(_jobs)}.html")
    with open(name, "w", encoding="utf-8") as f:
        f.write(page(svg, w, h, bg))
    _jobs.append(dict(html=name, out=out, w=w, h=h, transparent=transparent))
    return svg


def html_job(html, w, h, out, pdf=False, full=False):
    name = os.path.join(BUILD, f"job{len(_jobs)}.html")
    with open(name, "w", encoding="utf-8") as f:
        f.write(html)
    _jobs.append(dict(html=name, out=out, w=w, h=h, pdf=pdf, full=full))


def run():
    if not _jobs:
        return
    jf = os.path.join(BUILD, "jobs.json")
    with open(jf, "w") as f:
        json.dump(_jobs, f)
    subprocess.run(["node", os.path.join(TOOLS, "render.js"), jf], check=True, stdout=subprocess.DEVNULL)
    print(f"{len(_jobs)} fichiers rendus")
    _jobs.clear()
