import { json, readJson, makeId, getSessionUser, publicRental } from "../../../lib/db.js";
import { sendEmail, rentalEmail } from "../../../lib/email.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM rentals ORDER BY rented_at DESC").all();
  return json(results.map(publicRental));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (user.banned) return json({ error: "Ditt konto är spärrat." }, 403);

  const b = await readJson(request);
  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(b.itemId).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);
  if (listing.owner === user.username) return json({ error: "Du kan inte hyra din egen titel." }, 400);

  const days = Math.max(1, Number(b.days) || 1);
  const delivery = b.delivery === "ship" ? "ship" : "pickup";
  const shipCost = delivery === "ship" ? listing.shipping_price : 0;
  const rentCost = listing.price * days;
  const id = makeId("rental");

  // Det unika indexet på active_key (satt till item_id här, NULL vid
  // återlämning) gör att databasen SJÄLV avvisar ett andra samtidigt
  // försök att hyra samma titel — ingen tidslucka att missa, oavsett
  // hur nära i tid två personer klickar "Hyr nu".
  try {
    await env.DB.prepare(
      `INSERT INTO rentals
       (id, item_id, renter_name, owner_name, rented_at, days, delivery, ship_cost, rent_cost, returned, active_key)
       VALUES (?,?,?,?,?,?,?,?,?,0,?)`
    ).bind(id, b.itemId, user.username, listing.owner, Date.now(), days, delivery, shipCost, rentCost, b.itemId).run();
  } catch (err) {
    if (String(err.message || err).toLowerCase().includes("unique")) {
      return json({ error: "Någon annan hyrde precis den här titeln. Testa en annan." }, 409);
    }
    throw err;
  }

  // Mejla ägaren — misslyckas det, stoppar det INTE själva bokningen.
  const owner = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(listing.owner).first();
  if (owner?.email) {
    const rental = { renterName: user.username, days, delivery };
    const { subject, html } = rentalEmail(rental, listing.title);
    await sendEmail(env, owner.email, subject, html);
  }

  const row = await env.DB.prepare("SELECT * FROM rentals WHERE id = ?").bind(id).first();
  return json(publicRental(row));
}
