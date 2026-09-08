import { json, readJson, getSessionUser, fullThread } from "../../../../lib/db.js";
import { sendEmail, counterOfferEmail, offerAcceptedEmail } from "../../../../lib/email.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const thread = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (!thread) return json({ error: "Konversationen finns inte." }, 404);
  if (thread.kind !== "buy") return json({ error: "Det här är inte en köp-förfrågan." }, 400);
  if (thread.offer_status !== "pending") return json({ error: "Budet är redan hanterat." }, 400);

  const isOwner = thread.owner === user.username;
  const isBuyer = thread.buyer_name === user.username;
  if (!isOwner && !isBuyer) return json({ error: "Du är inte del av den här förfrågan." }, 403);

  const myTurn = (isOwner && thread.offer_turn === "owner") || (isBuyer && thread.offer_turn === "buyer");
  if (!myTurn) return json({ error: "Det är inte din tur att svara just nu." }, 400);

  const b = await readJson(request);
  const action = b.action;

  if (action === "reject") {
    await env.DB.prepare("UPDATE threads SET offer_status = 'rejected' WHERE id = ?").bind(params.id).run();
  } else if (action === "accept") {
    const listing = await env.DB.prepare("SELECT sold FROM listings WHERE id = ?").bind(thread.item_id).first();
    if (listing?.sold) {
      await env.DB.prepare("UPDATE threads SET offer_status = 'rejected' WHERE id = ?").bind(params.id).run();
      return json({ error: "Titeln har redan sålts till någon annan." }, 409);
    }
    await env.DB.prepare("UPDATE threads SET offer_status = 'accepted' WHERE id = ?").bind(params.id).run();

    const buyer = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(thread.buyer_name).first();
    if (buyer?.email) {
      const { subject, html } = offerAcceptedEmail(thread.item_title, thread.offer_amount);
      await sendEmail(env, buyer.email, subject, html);
    }
  } else if (action === "counter") {
    const amount = Math.round(Number(b.amount) || 0);
    if (amount <= 0) return json({ error: "Ange ett motbud (kr) högre än 0." }, 400);
    const nextTurn = isOwner ? "buyer" : "owner";
    await env.DB.prepare("UPDATE threads SET offer_amount = ?, offer_turn = ? WHERE id = ?")
      .bind(amount, nextTurn, params.id).run();

    const otherUsername = isOwner ? thread.buyer_name : thread.owner;
    const other = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(otherUsername).first();
    if (other?.email) {
      const { subject, html } = counterOfferEmail(user.username, thread.item_title, amount);
      await sendEmail(env, other.email, subject, html);
    }
  } else {
    return json({ error: "Okänd åtgärd." }, 400);
  }

  return json(await fullThread(env, params.id));
}
