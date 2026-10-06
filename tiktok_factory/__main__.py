"""Point d'entrée :

    python -m tiktok_factory                       # 1 vidéo pour chacun des 3 comptes
    python -m tiktok_factory finance --count 2     # 2 vidéos pour le compte finance
    python -m tiktok_factory stoic --topic "Sénèque et la colère"
"""
from __future__ import annotations

import argparse
import sys
import traceback
from pathlib import Path

from .config import list_channels, load_channel
from .pipeline import produce
from .publish import post_tiktok, send_telegram
from .script_writer import VideoScript


def main() -> int:
    ap = argparse.ArgumentParser(prog="tiktok_factory", description="Générateur de vidéos TikTok faceless")
    ap.add_argument("channels", nargs="*", help=f"comptes à traiter (défaut : tous) — {', '.join(list_channels())}")
    ap.add_argument("--count", type=int, default=1, help="vidéos par compte (défaut 1)")
    ap.add_argument("--topic", help="sujet imposé (sinon l'IA choisit)")
    ap.add_argument("--script-json", type=Path, help="utiliser un script déjà écrit (fichier JSON) au lieu de Claude")
    ap.add_argument("--no-publish", action="store_true", help="ne pas envoyer sur Telegram / TikTok")
    ap.add_argument("--keep-work", action="store_true", help="garder les fichiers intermédiaires")
    args = ap.parse_args()

    script = VideoScript.model_validate_json(args.script_json.read_text(encoding="utf-8")) if args.script_json else None
    failures = 0
    for cid in args.channels or list_channels():
        channel = load_channel(cid)
        for n in range(args.count):
            for attempt in range(1, 4):
                try:
                    res = produce(channel, args.topic, script, args.keep_work)
                    break
                except Exception:
                    traceback.print_exc()
                    print(f"[{cid}] ⚠️  tentative {attempt}/3 échouée")
            else:
                failures += 1
                continue
            if args.no_publish:
                continue
            try:
                sent_tt = post_tiktok(res.video, res.caption, cid)
                sent_tg = send_telegram(res.video, res.caption, cid)
                if not (sent_tt or sent_tg):
                    print(f"[{cid}] (aucune publication configurée : vidéo seulement enregistrée)")
            except Exception:
                traceback.print_exc()
                failures += 1
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
