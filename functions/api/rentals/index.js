import { json, readJson, getSessionUser, publicRental } from "../../../lib/db.js";
import { stripe } from "../../../lib/stripe.js";

const PLATFORM_FEE_PCT = 15; // % provision på hyresdelen (inte på frakt)

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

  const owner = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(listing.owner).first();
  if (!owner?.stripe_account_id || !owner.stripe_charges_enabled) {
    return json({ error: "Ägaren har inte kopplat sitt betalningskonto än, så titeln kan inte hyras just nu." }, 400);
  }

  // Snabb koll innan vi skickar iväg till Stripe (själva skyddet mot
  // dubbelbokning sker ändå garanterat i webhooken, via det unika
  // databasindexet — det här är bara för att slippa onödiga Stripe-sessioner).
  const active = await env.DB.prepare("SELECT id FROM rentals WHERE item_id = ? AND returned = 0").bind(b.itemId).first();
  if (active) return json({ error: "Titeln är redan uthyrd." }, 409);

  const days = Math.max(1, Number(b.days) || 1);
  const delivery = b.delivery === "ship" ? "ship" : "pickup";
  const shipCost = delivery === "ship" ? listing.shipping_price : 0;
  const rentCost = listing.price * days;
  const totalKr = rentCost + shipCost;
  const applicationFeeOre = Math.round(rentCost * (PLATFORM_FEE_PCT / 100)) * 100;

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  try {
    const session = await stripe.createCheckoutSession(env, {
      mode: "payment",
      customer_email: user.email,
      payment_method_types: ["card", "klarna"],
      line_items: [{
        price_data: {
          currency: "sek",
          product_data: { name: `${listing.title} — hyra (${days} ${days === 1 ? "dag" : "dagar"})` },
          unit_amount: totalKr * 100,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeOre,
        transfer_data: { destination: owner.stripe_account_id },
      },
      metadata: {
        itemId: listing.id,
        renterUsername: user.username,
        ownerUsername: listing.owner,
        days: String(days),
        delivery,
        shipCost: String(shipCost),
        rentCost: String(rentCost),
      },
      success_url: `${origin}/?rented=success`,
      cancel_url: `${origin}/?rented=cancel`,
    });

    return json({ checkoutUrl: session.url });
  } catch (err) {
    return json({ error: "Kunde inte starta betalningen: " + err.message }, 500);
  }
}
