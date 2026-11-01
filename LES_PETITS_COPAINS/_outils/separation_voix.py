# -*- coding: utf-8 -*-
"""
Séparation voix / musique 100 % locale et gratuite (modèle MDX-Net « UVR-MDX-NET-Inst_HQ_3 », format ONNX,
publié par le projet open source Ultimate Vocal Remover). Le modèle prédit l'instrumental ; la voix = mélange − instrumental.

Utilisé UNIQUEMENT pour l'analyse (calage des paroles, mouvements de bouche) : la vidéo garde la chanson d'origine.

  python3 _outils/separation_voix.py chanson.mp3 sortie_dossier/
Le modèle (≈ 64 Mo) est téléchargé automatiquement depuis GitHub au premier usage dans _outils/modeles/ (non versionné).
"""
import os
import subprocess
import sys
import urllib.request
import wave

import numpy as np

MODEL_URL = "https://github.com/TRvlvr/model_repo/releases/download/all_public_uvr_models/UVR-MDX-NET-Inst_HQ_3.onnx"
MODEL = os.path.join(os.path.dirname(os.path.abspath(__file__)), "modeles", "UVR-MDX-NET-Inst_HQ_3.onnx")
N_FFT, HOP, DIM_F, DIM_T, COMP = 6144, 1024, 3072, 256, 1.022
SR = 44100


def ensure_model():
    if not os.path.exists(MODEL):
        os.makedirs(os.path.dirname(MODEL), exist_ok=True)
        print("Téléchargement du modèle de séparation (≈ 64 Mo)…")
        urllib.request.urlretrieve(MODEL_URL, MODEL)
    return MODEL


def load_stereo(path):
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).T.copy()  # (2, N)


WIN = (0.5 - 0.5 * np.cos(2 * np.pi * np.arange(N_FFT) / N_FFT)).astype(np.float32)  # Hann périodique (comme torch)


def stft(x):
    """x (2, L) -> (2, N_FFT//2+1, T) complexe, équivalent torch.stft(center=True, reflect)."""
    pad = N_FFT // 2
    xp = np.pad(x, ((0, 0), (pad, pad)), mode="reflect")
    T = 1 + (xp.shape[1] - N_FFT) // HOP
    idx = np.arange(N_FFT)[None, :] + HOP * np.arange(T)[:, None]
    frames = xp[:, idx] * WIN  # (2, T, N_FFT)
    return np.fft.rfft(frames, axis=-1).transpose(0, 2, 1)


def istft(S, length):
    frames = np.fft.irfft(S.transpose(0, 2, 1), n=N_FFT, axis=-1) * WIN  # (2, T, N_FFT)
    T = frames.shape[1]
    out = np.zeros((2, N_FFT + HOP * (T - 1)), dtype=np.float32)
    norm = np.zeros(N_FFT + HOP * (T - 1), dtype=np.float32)
    for t in range(T):
        out[:, t * HOP:t * HOP + N_FFT] += frames[:, t]
        norm[t * HOP:t * HOP + N_FFT] += WIN ** 2
    out /= np.maximum(norm, 1e-8)
    pad = N_FFT // 2
    return out[:, pad:pad + length]


def separate(path, out_dir):
    import onnxruntime as ort
    sess = ort.InferenceSession(ensure_model(), providers=["CPUExecutionProvider"])
    mix = load_stereo(path)
    L = mix.shape[1]
    chunk = HOP * (DIM_T - 1)
    trim = N_FFT // 2
    gen = chunk - 2 * trim
    pad = gen - L % gen
    xp = np.concatenate([np.zeros((2, trim), np.float32), mix, np.zeros((2, pad + trim), np.float32)], axis=1)
    inst = np.zeros((2, L + pad), np.float32)
    for i in range(0, L + pad, gen):
        seg = xp[:, i:i + chunk]
        S = stft(seg)[:, :DIM_F]  # (2, F, T)
        inp = np.stack([S[0].real, S[0].imag, S[1].real, S[1].imag])[None].astype(np.float32)
        o = sess.run(None, {"input": inp})[0][0]
        Sp = np.zeros((2, N_FFT // 2 + 1, DIM_T), np.complex64)
        Sp[0, :DIM_F] = o[0] + 1j * o[1]
        Sp[1, :DIM_F] = o[2] + 1j * o[3]
        y = istft(Sp, chunk)
        inst[:, i:i + gen] = y[:, trim:trim + gen]
    inst = inst[:, :L] * COMP
    voc = mix - inst
    os.makedirs(out_dir, exist_ok=True)
    paths = {}
    for name, sig in (("voix", voc), ("instrumental", inst)):
        p = os.path.join(out_dir, f"{name}.wav")
        with wave.open(p, "wb") as w:
            w.setnchannels(2)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes((np.clip(sig.T, -1, 1) * 32767).astype(np.int16).tobytes())
        paths[name] = p
    return paths


if __name__ == "__main__":
    print(separate(sys.argv[1], sys.argv[2]))
