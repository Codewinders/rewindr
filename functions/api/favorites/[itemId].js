import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  await env.DB.prepare("DELETE FROM favorites WHERE username = ? AND item_id = ?")
    .bind(user.username, params.itemId).run();
  return json({ ok: true });
}
