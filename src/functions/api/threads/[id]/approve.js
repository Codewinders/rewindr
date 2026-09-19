import { json, getSessionUser, fullThread } from "../../../../lib/db.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const thread = await env.DB.prepare("SELECT * FROM threads WHERE id = ?").bind(params.id).first();
  if (!thread) return json({ error: "Konversationen finns inte." }, 404);
  if (thread.kind !== "trade") return json({ error: "Bara byten kan godkännas på det här sättet." }, 400);
  if (thread.owner !== user.username) return json({ error: "Bara ägaren kan godkänna bytet." }, 403);
  if (thread.status !== "pending") return json({ error: "Bytet är redan hanterat." }, 400);

  await env.DB.prepare("UPDATE threads SET status = 'approved' WHERE id = ?").bind(params.id).run();
  return json(await fullThread(env, params.id));
}
