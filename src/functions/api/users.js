import { json } from "../../lib/db.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT username, verified, is_admin, banned, created_at FROM users").all();
  return json(results.map((u) => ({
    username: u.username, verified: !!u.verified, isAdmin: !!u.is_admin, banned: !!u.banned, createdAt: u.created_at,
  })));
}
