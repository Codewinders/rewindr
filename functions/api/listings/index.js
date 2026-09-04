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
  if (!b.title || !b.title.trim()) return json({ error: "Titel krävs." }, 400);

  const rentable = b.rentable !== false; // true om inte uttryckligen false
  const forSale = !!b.forSale;
  const tradeable = !!b.tradeable;
  if (!rentable && !forSale && !tradeable) {
    return json({ error: "Välj minst ett: hyra ut, sälja eller byta." }, 400);
  }

  const price = Math.max(0, Number(b.price) || 0);
  if (rentable && price <= 0) {
    return json({ error: "Pris per dag (>0) krävs när titeln kan hyras." }, 400);
  }
  const salePrice = forSale && b.salePrice ? Math.max(0, Number(b.salePrice) || 0) : null;

  const id = makeId("item");
  await env.DB.prepare(
    `INSERT INTO listings
     (id, title, type, format, genre, price, owner, note, image_url, rentable, for_sale, sale_price, delivery, shipping_price, replacement_value, tradeable, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.title.trim(), b.type || "movie", b.format || null, b.genre || null, rentable ? price : 0,
    user.username, b.note || "", b.imageUrl || null, rentable ? 1 : 0, forSale ? 1 : 0, salePrice,
    b.delivery || "pickup", Math.max(0, Number(b.shippingPrice) || 0), Math.max(0, Number(b.replacementValue) || 0),
    tradeable ? 1 : 0, Date.now()
  ).run();

  const row = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();
  return json(publicListing(row));
}
