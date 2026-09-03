import { makeId } from "../../../lib/db.js";
import { verifyStripeWebhook, stripe } from "../../../lib/stripe.js";
import { sendEmail, rentalEmail } from "../../../lib/email.js";

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

    if (m.itemId && m.renterUsername) {
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
        // Om titeln redan hyrdes av någon annan mellan betalningsstart och
        // betalningsslut (osannolikt, men möjligt): pengarna har redan
        // gått till uthyraren via Stripe. Manuell återbetalning krävs i
        // det extremt sällsynta fallet — loggas här för uppföljning.
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
