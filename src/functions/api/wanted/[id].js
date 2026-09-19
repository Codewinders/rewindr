import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const ad = await env.DB.prepare("SELECT * FROM wanted_ads WHERE id = ?").bind(params.id).first();
  if (!ad) return json({ error: "Efterlysningen finns inte." }, 404);
  if (ad.username !== user.username && !user.is_admin) return json({ error: "Du äger inte den här efterlysningen." }, 403);

  await env.DB.prepare("DELETE FROM wanted_ads WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
