import { json, readJson, makeId, getSessionUser, publicListing } from "../../../lib/db.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM listings ORDER BY created_at DESC").all();
  return json(results.map(publicListing));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (user.banned) return json({ error: "Ditt konto är spärrat." }, 403);

  const b = await readJson(request);
  const price = Math.max(0, Number(b.price) || 0);
  if (!b.title || !b.title.trim() || price <= 0) {
    return json({ error: "Titel och pris (>0) krävs." }, 400);
  }

  const id = makeId("item");
  await env.DB.prepare(
    `INSERT INTO listings
     (id, title, type, format, genre, price, owner, note, for_sale, delivery, shipping_price, replacement_value, tradeable, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.title.trim(), b.type || "movie", b.format || null, b.genre || null, price,
    user.username, b.note || "", b.forSale ? 1 : 0, b.delivery || "pickup",
    Math.max(0, Number(b.shippingPrice) || 0), Math.max(0, Number(b.replacementValue) || 0),
    b.tradeable ? 1 : 0, Date.now()
  ).run();

  const row = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();
  return json(publicListing(row));
}
