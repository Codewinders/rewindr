import { makeId } from "../../../lib/db.js";
import { verifyStripeWebhook, stripe } from "../../../lib/stripe.js";
import { sendEmail, rentalEmail, purchaseEmail } from "../../../lib/email.js";

export async function onRequestPost({ request, env }) {
  const rawBody = await request.text();
  const signature = request.headers.get("Stripe-Signature");

  const valid = await verifyStripeWebhook(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  if (!valid) {
    return new Response(JSON.stringify({ error: "Ogiltig webhook-signatur." }), { status: 400 });
  }

  const event = JSON.parse(rawBody);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const m = session.metadata || {};

    // ---- Köp (engångsförsäljning) ----
    if (m.kind === "purchase" && m.itemId && m.buyerUsername) {
      const purchaseId = makeId("purchase");
      try {
        await env.DB.prepare(
          `INSERT INTO purchases
           (id, item_id, buyer_name, seller_name, price, ship_cost, delivery, purchased_at,
            stripe_checkout_session_id, stripe_payment_intent_id, application_fee_amount)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        ).bind(
          purchaseId, m.itemId, m.buyerUsername, m.sellerUsername,
          Number(m.price) || 0, Number(m.shipCost) || 0, m.delivery, Date.now(),
          session.id, session.payment_intent,
          Math.round((Number(m.price) || 0) * 0.10) * 100
        ).run();

        await env.DB.prepare("UPDATE listings SET sold = 1, sold_at = ? WHERE id = ?")
          .bind(Date.now(), m.itemId).run();

        const seller = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(m.sellerUsername).first();
        const listing = await env.DB.prepare("SELECT title FROM listings WHERE id = ?").bind(m.itemId).first();
        if (seller?.email && listing) {
          const { subject, html } = purchaseEmail(m.buyerUsername, listing.title, m.delivery);
          await sendEmail(env, seller.email, subject, html);
        }
      } catch (err) {
        // Titeln kan i extremt sällsynta fall ha blivit köpt/borttagen mellan
        // betalningsstart och betalningsslut — pengarna har redan gått till
        // säljaren via Stripe. Loggas här för manuell uppföljning.
        console.error("Kunde inte registrera köp efter betalning:", err.message, m);
      }
    }
    // ---- Hyra ----
    else if (m.itemId && m.renterUsername) {
      const rentalId = makeId("rental");
      try {
        await env.DB.prepare(
          `INSERT INTO rentals
           (id, item_id, renter_name, owner_name, rented_at, days, delivery, ship_cost, rent_cost,
            returned, active_key, stripe_checkout_session_id, stripe_payment_intent_id, application_fee_amount)
           VALUES (?,?,?,?,?,?,?,?,?,0,?,?,?,?)`
        ).bind(
          rentalId, m.itemId, m.renterUsername, m.ownerUsername, Date.now(),
          Number(m.days) || 1, m.delivery, Number(m.shipCost) || 0, Number(m.rentCost) || 0,
          m.itemId, session.id, session.payment_intent,
          Math.round((Number(m.rentCost) || 0) * 0.15) * 100
        ).run();

        const owner = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(m.ownerUsername).first();
        const listing = await env.DB.prepare("SELECT title FROM listings WHERE id = ?").bind(m.itemId).first();
        if (owner?.email && listing) {
          const rental = { renterName: m.renterUsername, days: m.days, delivery: m.delivery };
          const { subject, html } = rentalEmail(rental, listing.title);
          await sendEmail(env, owner.email, subject, html);
        }
      } catch (err) {
        console.error("Kunde inte registrera hyra efter betalning:", err.message, m);
      }
    }
  }

  if (event.type === "account.updated") {
    const account = event.data.object;
    await env.DB.prepare("UPDATE users SET stripe_charges_enabled = ? WHERE stripe_account_id = ?")
      .bind(account.charges_enabled ? 1 : 0, account.id).run();
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
