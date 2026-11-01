# -*- coding: utf-8 -*-
"""Filigrane de chaîne YouTube (150 x 150 px, PNG transparent, < 1 Mo)."""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from art import draw, G  # noqa: E402
import scenes as S  # noqa: E402
from common import ROOT, svg_page, run  # noqa: E402

OUT = os.path.join(ROOT, "01_IDENTITE", "filigrane")


def milo_badge():
    # dessiné en 600x600 puis réduit à 150x150 par le viewBox
    s = 400 / 290.0
    head = ('<clipPath id="fh"><circle cx="200" cy="190" r="143"/></clipPath>' +
            G('<g clip-path="url(#fh)">' + draw("milo", "front", "joyeux", "debout", shadow=False) + "</g>",
              f"translate({300 - 200 * s:.1f} {318 - 190 * s:.1f}) scale({s:.4f})"))
    i, d = S.radial(["#6A4FD8", "#3B2E9A", "#1B1D4E"], 0.5, 0.45, 0.7)
    return (d + f'<circle cx="300" cy="300" r="284" fill="url(#{i})" stroke="#FFFFFF" stroke-width="24"/>' +
            S.moon(300, 92, 34, "#FFD23F") + head)


def monogramme():
    return ('<circle cx="300" cy="300" r="284" fill="#2B2D6E" stroke="#FFFFFF" stroke-width="24"/>' +
            S.moon(285, 285, 170, "#FFD23F") + S.note(340, 390, 1.5, "#FF86C3", -10) +
            S.star(430, 170, 30, "#FFFFFF", 8, stroke="#FFFFFF"))


for name, body in [("filigrane_milo_150x150.png", milo_badge()), ("filigrane_monogramme_150x150.png", monogramme())]:
    svg = f'<svg x="0" y="0" width="150" height="150" viewBox="0 0 600 600">{body}</svg>'
    svg_page(svg, 150, 150, os.path.join(OUT, name), transparent=True)
run()
