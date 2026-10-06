"""Lancement :  python -m content_agent   → ouvre http://127.0.0.1:8765"""
from __future__ import annotations

import argparse
import threading
import webbrowser


def main() -> None:
    ap = argparse.ArgumentParser(prog="content_agent", description="TikTok Content Agent (local)")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    import uvicorn

    from .server import app

    url = f"http://127.0.0.1:{args.port}"
    print(f"\n  🎬 TikTok Content Agent → {url}\n  (Ctrl+C pour arrêter)\n")
    if not args.no_browser:
        threading.Timer(1.5, lambda: webbrowser.open(url)).start()
    uvicorn.run(app, host="127.0.0.1", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
