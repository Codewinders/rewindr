import { json, readJson, getSessionUser, publicListing } from "../../../lib/db.js";

export async function onRequestPatch({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(params.id).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);
  if (listing.owner !== user.username && !user.is_admin) {
    return json({ error: "Du äger inte den här titeln." }, 403);
  }

  const b = await readJson(request);
  if (!b.title || !b.title.trim()) return json({ error: "Titel krävs." }, 400);

  const rentable = b.rentable !== false;
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

  await env.DB.prepare(
    `UPDATE listings SET
       title = ?, type = ?, format = ?, genre = ?, price = ?, note = ?, image_url = ?,
       rentable = ?, for_sale = ?, sale_price = ?, delivery = ?, shipping_price = ?,
       replacement_value = ?, tradeable = ?
     WHERE id = ?`
  ).bind(
    b.title.trim(), b.type || "movie", b.format || null, b.genre || null, rentable ? price : 0,
    b.note || "", b.imageUrl || null, rentable ? 1 : 0, forSale ? 1 : 0, salePrice,
    b.delivery || "pickup", Math.max(0, Number(b.shippingPrice) || 0), Math.max(0, Number(b.replacementValue) || 0),
    tradeable ? 1 : 0, params.id
  ).run();

  const row = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(params.id).first();
  return json(publicListing(row));
}

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(params.id).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);
  if (listing.owner !== user.username && !user.is_admin) {
    return json({ error: "Du äger inte den här titeln." }, 403);
  }

  const active = await env.DB.prepare("SELECT id FROM rentals WHERE item_id = ? AND returned = 0").bind(params.id).first();
  if (active) return json({ error: "Titeln är uthyrd just nu och kan inte tas bort." }, 409);

  await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
