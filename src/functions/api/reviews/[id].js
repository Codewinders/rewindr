import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user || !user.is_admin) return json({ error: "Endast admin." }, 403);
  await env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
