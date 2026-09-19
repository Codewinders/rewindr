import { json, readJson, makeId, getSessionUser } from "../../../lib/db.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM reviews ORDER BY at DESC").all();
  return json(results.map((r) => ({
    id: r.id, ownerUsername: r.owner_username, reviewerUsername: r.reviewer_username,
    rating: r.rating, text: r.text, at: r.at,
  })));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const b = await readJson(request);
  if (!b.ownerUsername || !b.rating) return json({ error: "Ägare och betyg krävs." }, 400);
  if (b.ownerUsername === user.username) return json({ error: "Du kan inte recensera dig själv." }, 400);

  const id = makeId("rev");
  await env.DB.prepare("INSERT INTO reviews (id, owner_username, reviewer_username, rating, text, at) VALUES (?,?,?,?,?,?)")
    .bind(id, b.ownerUsername, user.username, Math.min(5, Math.max(1, Number(b.rating))), b.text || "", Date.now()).run();

  return json({ ok: true, id });
}
