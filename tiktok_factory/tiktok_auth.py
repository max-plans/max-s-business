"""Assistant de connexion TikTok (à lancer UNE fois par compte, sur ton ordinateur).

    python -m tiktok_factory.tiktok_auth

Il affiche un lien : ouvre-le, connecte-toi avec le compte TikTok voulu, autorise l'appli,
puis colle l'URL de redirection complète. Le script affiche le « refresh token » à mettre
dans les secrets GitHub (TIKTOK_REFRESH_TOKEN_MINDSET / _STOIC / _FINANCE). Valable 1 an.
"""
from __future__ import annotations

import os
import secrets
import urllib.parse

import requests

SCOPES = "user.info.basic,video.upload,video.publish"


def main() -> None:
    key = os.environ.get("TIKTOK_CLIENT_KEY") or input("Client key : ").strip()
    secret = os.environ.get("TIKTOK_CLIENT_SECRET") or input("Client secret : ").strip()
    redirect = os.environ.get("TIKTOK_REDIRECT_URI") or input("Redirect URI (déclarée dans l'appli TikTok) : ").strip()
    state = secrets.token_urlsafe(12)
    url = "https://www.tiktok.com/v2/auth/authorize/?" + urllib.parse.urlencode({
        "client_key": key, "scope": SCOPES, "response_type": "code", "redirect_uri": redirect, "state": state,
    })
    print(f"\n1) Ouvre ce lien et autorise l'appli :\n\n{url}\n")
    back = input("2) Colle ici l'URL complète sur laquelle tu as été redirigé : ").strip()
    qs = urllib.parse.parse_qs(urllib.parse.urlparse(back).query)
    if qs.get("state", [""])[0] != state:
        raise SystemExit("State invalide, recommence.")
    r = requests.post(
        "https://open.tiktokapis.com/v2/oauth/token/",
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        data={
            "client_key": key, "client_secret": secret, "code": qs["code"][0],
            "grant_type": "authorization_code", "redirect_uri": redirect,
        },
        timeout=30,
    )
    data = r.json()
    if "refresh_token" not in data:
        raise SystemExit(f"Erreur : {data}")
    print(f"\n✅ Refresh token (valable {data.get('refresh_expires_in', 0) // 86400} jours) :\n\n{data['refresh_token']}\n")


if __name__ == "__main__":
    main()
