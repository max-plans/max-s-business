// Accès au QG : page de connexion maison + cookie de session (le mot de passe est dans la variable QG_PASSWORD).
export const config = { matcher: "/(.*)" };

// Fichiers publics : icônes et manifeste de l'appli (le téléphone les récupère sans être connecté)
const PUBLIC = new Set(["/manifest.webmanifest", "/apple-touch-icon.png", "/apple-touch-icon-precomposed.png", "/icon-192.png", "/icon-512.png"]);
const COOKIE = "qg_session";
const NEXT = () => new Response(null, { headers: { "x-middleware-next": "1" } });

async function sessionValue(pass) {
  const data = new TextEncoder().encode("qg-max:" + pass);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, "0")).join("");
}

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

function readCookie(request, name) {
  const all = request.headers.get("cookie") || "";
  for (const part of all.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return "";
}

function loginPage(error) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex"><title>Le QG de Max</title>
<link rel="manifest" href="/manifest.webmanifest"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="icon" type="image/png" href="/icon-192.png">
<meta name="theme-color" content="#0B0D12"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="QG">
<style>
*{box-sizing:border-box}
html,body{margin:0;min-height:100%;background:#0B0D12;color:#F4F2EE;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
body{display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100dvh;padding:max(24px,env(safe-area-inset-top)) 20px max(24px,env(safe-area-inset-bottom));
  background:radial-gradient(700px 500px at 0% 0%,rgba(255,90,31,.22),transparent 60%),radial-gradient(700px 600px at 100% 100%,rgba(61,107,255,.2),transparent 60%),#0B0D12}
.card{width:100%;max-width:380px;display:flex;flex-direction:column;gap:22px;animation:in .6s cubic-bezier(.16,1,.3,1) both}
@keyframes in{from{opacity:0;transform:translateY(16px)}}
.badge{width:64px;height:64px;border-radius:16px;background:#FF5A1F;display:grid;place-items:center;transform:skewX(-10deg);box-shadow:0 14px 34px -12px rgba(255,90,31,.9)}
.badge b{font:italic 900 34px/1 system-ui,sans-serif;color:#fff;transform:skewX(10deg)}
h1{margin:0;font:italic 900 44px/.95 "Arial Narrow",system-ui,sans-serif;text-transform:uppercase;letter-spacing:-.01em}
h1 span{color:#FF5A1F}
p{margin:0;color:#8E95A6}
form{display:flex;flex-direction:column;gap:12px}
label{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#FF8A4C;font-weight:700}
input[type=password]{width:100%;font:inherit;font-size:17px;color:#F4F2EE;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.14);border-radius:14px;padding:15px 16px;outline:none}
input[type=password]:focus{border-color:#FF5A1F;box-shadow:0 0 0 4px rgba(255,90,31,.18)}
button{font:italic 800 19px/1 system-ui,sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#fff;background:#FF5A1F;border:0;border-radius:14px;padding:17px;cursor:pointer;box-shadow:0 14px 30px -14px rgba(255,90,31,1)}
button:active{transform:scale(.98)}
.err{color:#FF6B78;font-weight:600;font-size:14px}
.hide{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}
</style></head><body>
<main class="card">
  <div class="badge"><b>M</b></div>
  <div><h1>Le QG<br><span>de Max.</span></h1></div>
  <p>Entre ton mot de passe pour ouvrir ton tableau de bord.</p>
  <form method="post" action="/login">
    <input class="hide" type="text" name="username" value="max" autocomplete="username" tabindex="-1" aria-hidden="true">
    <label for="pw">Mot de passe</label>
    <input id="pw" type="password" name="password" autocomplete="current-password" required autofocus>
    ${error ? `<div class="err">${error}</div>` : ""}
    <button type="submit">Entrer</button>
  </form>
</main></body></html>`;
}

const html = (body, status = 200, extra = {}) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...extra } });

export default async function middleware(request) {
  const url = new URL(request.url);
  if (PUBLIC.has(url.pathname)) return NEXT();

  const pass = process.env.QG_PASSWORD;
  if (!pass) return html("<p>Accès fermé : le mot de passe n'est pas configuré.</p>", 503);
  const expected = await sessionValue(pass);

  if (url.pathname === "/logout") {
    return new Response(null, { status: 303, headers: { location: "/", "set-cookie": `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  }

  if (url.pathname === "/login" && request.method === "POST") {
    let given = "";
    try { given = String((await request.formData()).get("password") || ""); } catch {}
    if (sameText(given, pass)) {
      return new Response(null, {
        status: 303,
        headers: { location: "/", "set-cookie": `${COOKIE}=${expected}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` },
      });
    }
    return html(loginPage("Mot de passe incorrect, réessaie."), 401);
  }

  if (sameText(readCookie(request, COOKIE), expected)) {
    if (url.pathname === "/login") return new Response(null, { status: 303, headers: { location: "/" } });
    return NEXT();
  }
  return html(loginPage(""));
}
