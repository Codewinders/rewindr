import { json, readJson, getSessionUser, publicPurchase } from "../../../lib/db.js";
import { stripe } from "../../../lib/stripe.js";

const PLATFORM_FEE_PCT = 10; // % provision på köp (lägre än hyra — engångssumma)

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM purchases ORDER BY purchased_at DESC").all();
  return json(results.map(publicPurchase));
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (user.banned) return json({ error: "Ditt konto är spärrat." }, 403);

  const b = await readJson(request);
  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(b.itemId).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);
  if (listing.owner === user.username) return json({ error: "Du kan inte köpa din egen titel." }, 400);
  if (!listing.for_sale || !listing.sale_price) return json({ error: "Den här titeln har inget fast köppris." }, 400);
  if (listing.sold) return json({ error: "Titeln är redan såld." }, 409);

  const seller = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(listing.owner).first();
  if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
    return json({ error: "Säljaren har inte kopplat sitt betalningskonto än." }, 400);
  }

  const delivery = b.delivery === "ship" ? "ship" : "pickup";
  const shipCost = delivery === "ship" ? listing.shipping_price : 0;
  const totalKr = listing.sale_price + shipCost;
  const applicationFeeOre = Math.round(listing.sale_price * (PLATFORM_FEE_PCT / 100)) * 100;

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  try {
    const session = await stripe.createCheckoutSession(env, {
      mode: "payment",
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "sek",
          product_data: { name: `${listing.title} — köp` },
          unit_amount: totalKr * 100,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: applicationFeeOre,
        transfer_data: { destination: seller.stripe_account_id },
      },
      metadata: {
        kind: "purchase",
        itemId: listing.id,
        buyerUsername: user.username,
        sellerUsername: listing.owner,
        delivery,
        shipCost: String(shipCost),
        price: String(listing.sale_price),
      },
      success_url: `${origin}/?bought=success`,
      cancel_url: `${origin}/?bought=cancel`,
    });

    return json({ checkoutUrl: session.url });
  } catch (err) {
    return json({ error: "Kunde inte starta betalningen: " + err.message }, 500);
  }
}
