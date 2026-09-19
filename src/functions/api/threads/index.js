import { json, readJson, makeId, getSessionUser, fullThread } from "../../../lib/db.js";
import { sendEmail, messageEmail, offerEmail } from "../../../lib/email.js";

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
  if (listing.owner === user.username) return json({ error: "Du kan inte lägga bud på din egen titel." }, 400);
  if (listing.sold) return json({ error: "Titeln är redan såld." }, 400);

  const kind = b.kind === "trade" ? "trade" : "buy";
  let offerAmount = null;
  if (kind === "buy") {
    offerAmount = Math.round(Number(b.offerAmount) || 0);
    if (offerAmount <= 0) return json({ error: "Ange ett bud (kr) högre än 0." }, 400);
  }

  const id = makeId("thread");
  await env.DB.prepare(
    `INSERT INTO threads
     (id, kind, item_id, item_title, owner, buyer_name, offered_item_id, offered_item_title, trade_type, trade_days,
      status, offer_amount, offer_turn, offer_status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?,?,'pending',?)`
  ).bind(
    id, kind, b.itemId, listing.title, listing.owner, user.username,
    b.offeredItemId || null, b.offeredItemTitle || null, b.tradeType || null, b.tradeDays || null,
    offerAmount, kind === "buy" ? "owner" : null, Date.now()
  ).run();

  if (kind === "trade") {
    // Byten har fortfarande ett vanligt meddelande kopplat till förslaget.
    const messageText = b.message || "";
    const msgId = makeId("msg");
    await env.DB.prepare("INSERT INTO messages (id, thread_id, from_name, text, at) VALUES (?,?,?,?,?)")
      .bind(msgId, id, user.username, messageText, Date.now()).run();
  }

  const owner = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(listing.owner).first();
  if (owner?.email) {
    if (kind === "buy") {
      const { subject, html } = offerEmail(user.username, listing.title, offerAmount);
      await sendEmail(env, owner.email, subject, html);
    } else {
      const { subject, html } = messageEmail(user.username, listing.title, b.message || "");
      await sendEmail(env, owner.email, subject, html);
    }
  }

  return json(await fullThread(env, id));
}
