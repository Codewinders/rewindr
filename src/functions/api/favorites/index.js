import { json, readJson, makeId, getSessionUser } from "../../../lib/db.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  const { results } = await env.DB.prepare("SELECT item_id FROM favorites WHERE username = ?").bind(user.username).all();
  return json(results.map((r) => r.item_id));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  const { itemId } = await readJson(request);
  if (!itemId) return json({ error: "itemId krävs." }, 400);

  const existing = await env.DB.prepare("SELECT id FROM favorites WHERE username = ? AND item_id = ?")
    .bind(user.username, itemId).first();
  if (existing) return json({ ok: true }); // redan favorit, inget att göra

  await env.DB.prepare("INSERT INTO favorites (id, username, item_id, created_at) VALUES (?,?,?,?)")
    .bind(makeId("fav"), user.username, itemId, Date.now()).run();
  return json({ ok: true });
}
