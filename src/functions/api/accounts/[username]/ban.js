import { json, getSessionUser } from "../../../../lib/db.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user || !user.is_admin) return json({ error: "Endast admin." }, 403);

  const target = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(params.username).first();
  if (!target) return json({ error: "Kontot finns inte." }, 404);
  if (target.is_admin) return json({ error: "Kan inte spärra en admin." }, 400);

  await env.DB.prepare("UPDATE users SET banned = ? WHERE username = ?")
    .bind(target.banned ? 0 : 1, params.username).run();
  return json({ ok: true });
}
