import { json, readJson, getSessionUser } from "../../../../lib/db.js";
import { stripe } from "../../../../lib/stripe.js";

const PLATFORM_FEE_PCT = 10; // samma provision som vanliga köp

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const thread = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (!thread) return json({ error: "Konversationen finns inte." }, 404);
  if (thread.kind !== "buy") return json({ error: "Det här är inte en köp-förfrågan." }, 400);
  if (thread.buyer_name !== user.username) return json({ error: "Bara den som lade budet kan betala." }, 403);
  if (thread.offer_status !== "accepted") return json({ error: "Budet är inte accepterat än." }, 400);

  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(thread.item_id).first();
  if (!listing) return json({ error: "Titeln finns inte längre." }, 404);
  if (listing.sold) return json({ error: "Titeln är redan såld." }, 409);

  const seller = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(thread.owner).first();
  if (!seller?.stripe_account_id || !seller.stripe_charges_enabled) {
    return json({ error: "Säljaren har inte kopplat sitt betalningskonto än." }, 400);
  }

  const b = await readJson(request).catch(() => ({}));
  const delivery = b.delivery === "ship" ? "ship" : "pickup";
  const shipCost = delivery === "ship" ? listing.shipping_price : 0;
  const price = thread.offer_amount;
  const totalKr = price + shipCost;
  const usingCredit = seller.free_fee_credits > 0;
  const applicationFeeOre = usingCredit ? 0 : Math.round(price * (PLATFORM_FEE_PCT / 100)) * 100;

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
          product_data: { name: `${listing.title} — överenskommet pris` },
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
        sellerUsername: thread.owner,
        delivery,
        shipCost: String(shipCost),
        price: String(price),
        usingCredit: usingCredit ? "1" : "0",
      },
      success_url: `${origin}/?bought=success`,
      cancel_url: `${origin}/?bought=cancel`,
    });

    return json({ checkoutUrl: session.url });
  } catch (err) {
    return json({ error: "Kunde inte starta betalningen: " + err.message }, 500);
  }
}
