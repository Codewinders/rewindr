import { json, getSessionUser, fullThread } from "../../../../lib/db.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const thread = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (!thread) return json({ error: "Konversationen finns inte." }, 404);
  if (thread.kind !== "trade") return json({ error: "Bara byten kan markeras som genomförda på det här sättet." }, 400);
  if (thread.status !== "approved") return json({ error: "Bytet måste vara godkänt innan det kan markeras som genomfört." }, 400);

  const isOwner = thread.owner === user.username;
  const isBuyer = thread.buyer_name === user.username;
  if (!isOwner && !isBuyer) return json({ error: "Du är inte del av det här bytet." }, 403);

  if (isOwner) {
    await env.DB.prepare("UPDATE threads SET owner_confirmed = 1 WHERE id = ?").bind(params.id).run();
  } else {
    await env.DB.prepare("UPDATE threads SET buyer_confirmed = 1 WHERE id = ?").bind(params.id).run();
  }

  const updated = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (updated.owner_confirmed && updated.buyer_confirmed) {
    await env.DB.prepare("UPDATE threads SET status = 'completed' WHERE id = ?").bind(params.id).run();
  }

  return json(await fullThread(env, params.id));
}
