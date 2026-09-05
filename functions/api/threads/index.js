import { json, readJson, makeId, getSessionUser, fullThread } from "../../../lib/db.js";
import { sendEmail, messageEmail } from "../../../lib/email.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT id FROM threads ORDER BY created_at DESC").all();
  const threads = await Promise.all(results.map((r) => fullThread(env, r.id)));
  return json(threads);
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (user.banned) return json({ error: "Ditt konto är spärrat." }, 403);

  const b = await readJson(request);
  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(b.itemId).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);

  const id = makeId("thread");
  await env.DB.prepare(
    `INSERT INTO threads
     (id, kind, item_id, item_title, owner, buyer_name, offered_item_id, offered_item_title, trade_type, trade_days, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?)`
  ).bind(
    id, b.kind === "trade" ? "trade" : "buy", b.itemId, listing.title, listing.owner, user.username,
    b.offeredItemId || null, b.offeredItemTitle || null, b.tradeType || null, b.tradeDays || null, Date.now()
  ).run();

  const messageText = b.message || "";
  const msgId = makeId("msg");
  await env.DB.prepare("INSERT INTO messages (id, thread_id, from_name, text, at) VALUES (?,?,?,?,?)")
    .bind(msgId, id, user.username, messageText, Date.now()).run();

  const owner = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(listing.owner).first();
  if (owner?.email) {
    const { subject, html } = messageEmail(user.username, listing.title, messageText);
    await sendEmail(env, owner.email, subject, html);
  }

  return json(await fullThread(env, id));
}
