import { json, readJson, makeId, getSessionUser } from "../../../lib/db.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  const { results } = await env.DB.prepare("SELECT * FROM watches WHERE username = ? ORDER BY created_at DESC")
    .bind(user.username).all();
  return json(results.map((w) => ({ id: w.id, query: w.query, createdAt: w.created_at })));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const { query } = await readJson(request);
  const q = (query || "").trim();
  if (!q) return json({ error: "En sökterm krävs." }, 400);

  const existing = await env.DB.prepare("SELECT id FROM watches WHERE username = ? AND query = ?")
    .bind(user.username, q).first();
  if (existing) return json({ ok: true });

  await env.DB.prepare("INSERT INTO watches (id, username, query, created_at) VALUES (?,?,?,?)")
    .bind(makeId("watch"), user.username, q, Date.now()).run();
  return json({ ok: true });
}
