import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user || !user.is_admin) return json({ error: "Endast admin." }, 403);

  const { results } = await env.DB.prepare(
    "SELECT username, email, verified, is_admin, banned, created_at FROM users"
  ).all();
  return json(results.map((u) => ({
    username: u.username, email: u.email, verified: !!u.verified,
    isAdmin: !!u.is_admin, banned: !!u.banned, createdAt: u.created_at,
  })));
}
