// Sauvegarde en ligne du QG (objectifs, créneaux, notes, focus) dans le stockage privé Vercel Blob.
// Protégé par middleware.js : seule une session connectée peut lire ou écrire.
import { get, put } from "@vercel/blob";

const PATH = "qg/state.json";
const MAX_BYTES = 900_000;

async function readCurrent() {
  const r = await get(PATH, { access: "private", useCache: false });
  if (!r || r.statusCode !== 200) return null;
  return JSON.parse(await new Response(r.stream).text());
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

export default async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  try {
    if (req.method === "GET") {
      return res.status(200).json((await readCurrent()) || { state: null, updatedAt: 0 });
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      if (!body || typeof body.state !== "object" || typeof body.updatedAt !== "number") {
        return res.status(400).json({ error: "Données invalides" });
      }
      const text = JSON.stringify({ state: body.state, updatedAt: body.updatedAt });
      if (text.length > MAX_BYTES) return res.status(413).json({ error: "Données trop volumineuses" });
      const current = await readCurrent();
      if (current && current.updatedAt > body.updatedAt) return res.status(409).json(current);
      await put(PATH, text, { access: "private", allowOverwrite: true, addRandomSuffix: false, contentType: "application/json" });
      return res.status(200).json({ ok: true, updatedAt: body.updatedAt });
    }
    res.setHeader("allow", "GET, PUT");
    return res.status(405).json({ error: "Méthode non prise en charge" });
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
}
