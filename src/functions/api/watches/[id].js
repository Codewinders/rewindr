import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  await env.DB.prepare("DELETE FROM watches WHERE id = ? AND username = ?").bind(params.id, user.username).run();
  return json({ ok: true });
}
