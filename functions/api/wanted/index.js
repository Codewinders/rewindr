import { json, readJson, makeId, getSessionUser } from "../../../lib/db.js";

function publicWantedAd(w) {
  return { id: w.id, username: w.username, title: w.title, note: w.note, fulfilled: !!w.fulfilled, createdAt: w.created_at };
}

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM wanted_ads WHERE fulfilled = 0 ORDER BY created_at DESC").all();
  return json(results.map(publicWantedAd));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (user.banned) return json({ error: "Ditt konto är spärrat." }, 403);

  const b = await readJson(request);
  if (!b.title || !b.title.trim()) return json({ error: "Titel krävs." }, 400);

  const id = makeId("wanted");
  await env.DB.prepare("INSERT INTO wanted_ads (id, username, title, note, fulfilled, created_at) VALUES (?,?,?,?,0,?)")
    .bind(id, user.username, b.title.trim(), b.note || "", Date.now()).run();

  const row = await env.DB.prepare("SELECT * FROM wanted_ads WHERE id = ?").bind(id).first();
  return json(publicWantedAd(row));
}
