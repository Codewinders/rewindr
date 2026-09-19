import { json, readJson, makeId, getSessionUser, publicListing } from "../../../lib/db.js";
import { sendEmail, watchMatchEmail } from "../../../lib/email.js";

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
  const shelfOnly = !!b.shelfOnly;
  if (!rentable && !forSale && !tradeable && !shelfOnly) {
    return json({ error: "Välj minst ett: hyra ut, sälja, byta, eller bara visa i hyllan." }, 400);
  }

  const price = Math.max(0, Number(b.price) || 0);
  if (rentable && price <= 0) {
    return json({ error: "Pris per dag (>0) krävs när titeln kan hyras." }, 400);
  }
  const salePrice = forSale && b.salePrice ? Math.max(0, Number(b.salePrice) || 0) : null;

  const id = makeId("item");
  await env.DB.prepare(
    `INSERT INTO listings
     (id, title, type, format, genre, price, owner, note, image_url, rentable, for_sale, sale_price, shelf_only, delivery, shipping_price, replacement_value, tradeable, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(
    id, b.title.trim(), b.type || "movie", b.format || null, b.genre || null, rentable ? price : 0,
    user.username, b.note || "", b.imageUrl || null, rentable ? 1 : 0, forSale ? 1 : 0, salePrice, shelfOnly ? 1 : 0,
    b.delivery || "pickup", Math.max(0, Number(b.shippingPrice) || 0), Math.max(0, Number(b.replacementValue) || 0),
    tradeable ? 1 : 0, Date.now()
  ).run();

  const row = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(id).first();

  // Meddela alla som bevakar en sökterm som matchar den nya titeln —
  // körs "best effort", ett fel här ska aldrig hindra att annonsen skapas.
  try {
    const { results: watches } = await env.DB.prepare("SELECT * FROM watches").all();
    const titleLower = row.title.toLowerCase();
    const genreLower = (row.genre || "").toLowerCase();
    const matches = watches.filter((w) => {
      const q = w.query.toLowerCase();
      return titleLower.includes(q) || genreLower.includes(q);
    });
    for (const w of matches) {
      const watcher = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(w.username).first();
      if (watcher?.email) {
        const { subject, html } = watchMatchEmail(w.query, row.title);
        await sendEmail(env, watcher.email, subject, html);
      }
    }
  } catch (err) {
    console.error("Kunde inte skicka bevakningsmejl:", err.message);
  }

  return json(publicListing(row));
}
