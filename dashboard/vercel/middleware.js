// Filtre d'accès Vercel : demande le mot de passe (variable d'environnement QG_PASSWORD) avant d'afficher le QG.
export const config = { matcher: "/(.*)" };

function sameText(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default function middleware(request) {
  const pass = process.env.QG_PASSWORD;
  if (!pass) {
    return new Response("Accès fermé : le mot de passe n'est pas configuré.", {
      status: 503,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    try {
      const decoded = atob(auth.slice(6));
      const given = decoded.slice(decoded.indexOf(":") + 1);
      if (sameText(given, pass)) {
        return new Response(null, { headers: { "x-middleware-next": "1" } });
      }
    } catch {}
  }
  return new Response("Mot de passe requis pour ouvrir le QG de Max.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Le QG de Max", charset="UTF-8"',
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
