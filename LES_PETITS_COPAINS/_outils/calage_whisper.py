# -*- coding: utf-8 -*-
"""
Calage automatique des paroles par RECONNAISSANCE VOCALE (Whisper « small », moteur sherpa-onnx, 100 % local et gratuit).

1. La voix isolée (STEMS/voix.wav) est découpée en petites phrases aux débuts de syllabes chantées.
2. Whisper transcrit chaque morceau (en français).
3. Une programmation dynamique retrouve, dans l'ordre, quels morceaux correspondent à chaque ligne des paroles
   → début ET fin réels de chaque ligne chantée.

Modèle : _outils/modeles/sherpa-onnx-whisper-small/ (téléchargé depuis les releases GitHub de k2-fsa/sherpa-onnx, non versionné).
"""
import difflib
import os
import re
import tarfile
import unicodedata
import urllib.request

import numpy as np

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modeles", "sherpa-onnx-whisper-small")
MODEL_URL = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-whisper-small.tar.bz2"
SR = 16000


def ensure_model():
    enc = os.path.join(MODEL_DIR, "small-encoder.int8.onnx")
    if not os.path.exists(enc):
        os.makedirs(os.path.dirname(MODEL_DIR), exist_ok=True)
        tmp = MODEL_DIR + ".tar.bz2"
        print("Téléchargement du modèle Whisper small (≈ 640 Mo, une seule fois)…")
        urllib.request.urlretrieve(MODEL_URL, tmp)
        with tarfile.open(tmp) as t:
            t.extractall(os.path.dirname(MODEL_DIR))
        os.remove(tmp)
        for f in ("small-encoder.onnx", "small-decoder.onnx"):
            if os.path.exists(os.path.join(MODEL_DIR, f)):
                os.remove(os.path.join(MODEL_DIR, f))
    return MODEL_DIR


def norm(s):
    s = unicodedata.normalize("NFD", s.lower())
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z]", "", s)


def onsets(voc, sr=SR):
    """Débuts de phrases/syllabes chantées (remontée de l'énergie après un creux)."""
    hop = sr // 100
    n = len(voc) // hop
    e = np.array([np.sqrt(np.mean(voc[i * hop:(i + 1) * hop] ** 2)) for i in range(n)])
    e = np.convolve(e, np.ones(5) / 5, mode="same")
    e /= (np.percentile(e, 95) or 1)
    cand = []
    for k in range(10, n):
        if e[k] > 0.25 and (e[k - 10:k] < 0.16).any() and (not cand or k / 100 - cand[-1] > 0.45):
            cand.append((k - 10 + int(np.argmin(e[k - 10:k]))) / 100)
    act = e > 0.10
    ends = []
    for c in cand:  # fin du morceau = dernier instant chanté avant le début suivant
        ends.append(c)
    return cand, e


def transcribe_segments(voc, cuts):
    import sherpa_onnx
    m = ensure_model()
    rec = sherpa_onnx.OfflineRecognizer.from_whisper(
        encoder=os.path.join(m, "small-encoder.int8.onnx"), decoder=os.path.join(m, "small-decoder.int8.onnx"),
        tokens=os.path.join(m, "small-tokens.txt"), language="fr", task="transcribe", num_threads=os.cpu_count() or 4)
    out = []
    for a, b in cuts:
        seg = voc[max(0, int((a - 0.1) * SR)):int((b + 0.1) * SR)]
        if len(seg) < SR * 0.3 or np.sqrt(np.mean(seg ** 2)) < 1e-3:
            out.append("")
            continue
        s = rec.create_stream()
        s.accept_waveform(SR, seg.astype(np.float32))
        rec.decode_stream(s)
        txt = s.result.text.strip()
        if re.search(r"sous-titr|amara|merci d'avoir regard", txt.lower()):  # hallucinations connues de Whisper
            txt = ""
        out.append(txt)
    return out


def align(lines, voc, dur, min_seg=0.9, kmax=4):
    """Renvoie [(début, fin)] pour chaque ligne, + diagnostic."""
    cand, e = onsets(voc)
    # morceaux : d'un début de phrase au suivant (fusion des morceaux trop courts)
    cuts, cur = [], None
    for c in cand + [dur]:
        if cur is None:
            cur = c
            continue
        if c - cur >= min_seg:
            cuts.append((cur, c))
            cur = c
    texts = transcribe_segments(voc, cuts)
    # fin chantée réelle de chaque morceau (dernier point au-dessus du seuil)
    seg_end = []
    for a, b in cuts:
        ia, ib = int(a * 100), min(len(e), int(b * 100))
        idx = np.where(e[ia:ib] > 0.12)[0]
        seg_end.append(a + (idx[-1] + 1) / 100 if len(idx) else b)
    L = [norm(l) for l in lines]
    T = [norm(t) for t in texts]
    n, m = len(L), len(cuts)
    KMAX = kmax
    NEG = -1e9
    dp = np.full((n + 1, m + 1), NEG)
    bk = {}
    dp[0, :] = [-0.15 * j for j in range(m + 1)]  # morceaux ignorés avant la 1re ligne
    for i in range(n):
        for j in range(m):
            if dp[i, j] <= NEG / 2:
                continue
            # ignorer un morceau (instrumental, bruit, répétition non prévue)
            if dp[i, j] - 0.25 > dp[i, j + 1] and i > 0:
                dp[i, j + 1] = dp[i, j] - 0.25
                bk[(i, j + 1)] = ("skip", i, j)
            acc = ""
            for k in range(1, KMAX + 1):
                if j + k > m:
                    break
                acc += T[j + k - 1]
                sim = difflib.SequenceMatcher(None, L[i], acc).ratio() if acc else 0.0
                lenpen = 0.15 * max(0, k - 1)  # préférer peu de morceaux par ligne
                sc = dp[i, j] + sim * 2.0 - lenpen
                if sc > dp[i + 1, j + k]:
                    dp[i + 1, j + k] = sc
                    bk[(i + 1, j + k)] = ("line", i, j)
    j = int(np.argmax(dp[n]))
    spans = [None] * n
    i = n
    while i > 0:
        kind, pi, pj = bk[(i, j)]
        if kind == "line":
            spans[pi] = (pj, j)
            i, j = pi, pj
        else:
            i, j = pi, pj
    res, sims = [], []
    for li, (a, b) in enumerate(spans):
        t0 = cuts[a][0]
        t1 = seg_end[b - 1]
        res.append((round(t0, 2), round(max(t1, t0 + 0.8), 2)))
        sims.append(round(difflib.SequenceMatcher(None, L[li], "".join(T[a:b])).ratio(), 2))
    info = dict(morceaux=m, ressemblance_moyenne=round(float(np.mean(sims)), 2),
                lignes_douteuses=[lines[i] for i, s in enumerate(sims) if s < 0.45])
    return res, info, list(zip([c[0] for c in cuts], texts))

