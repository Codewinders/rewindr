import { json, readJson, makeId, getSessionUser } from "../../../../lib/db.js";
import { sendEmail, messageEmail } from "../../../../lib/email.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const thread = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (!thread) return json({ error: "Konversationen finns inte." }, 404);

  const b = await readJson(request);
  const text = (b.text || "").trim();
  if (!text) return json({ error: "Meddelande krävs." }, 400);

  const msgId = makeId("msg");
  await env.DB.prepare("INSERT INTO messages (id, thread_id, from_name, text, at) VALUES (?,?,?,?,?)")
    .bind(msgId, params.id, user.username, text, Date.now()).run();

  // Mejla motparten (den som INTE skrev meddelandet just nu)
  const recipientUsername = user.username === thread.owner ? thread.buyer_name : thread.owner;
  const recipient = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(recipientUsername).first();
  if (recipient?.email) {
    const { subject, html } = messageEmail(user.username, thread.item_title, text);
    await sendEmail(env, recipient.email, subject, html);
  }

  const { results } = await env.DB.prepare("SELECT * FROM messages WHERE thread_id = ? ORDER BY at ASC").bind(params.id).all();
  return json({
    id: thread.id, kind: thread.kind, itemId: thread.item_id, itemTitle: thread.item_title, owner: thread.owner,
    buyerName: thread.buyer_name, offeredItemId: thread.offered_item_id, offeredItemTitle: thread.offered_item_title,
    tradeType: thread.trade_type, tradeDays: thread.trade_days,
    messages: results.map((m) => ({ from: m.from_name, text: m.text, at: m.at })),
  });
}
