import { json } from "../../lib/db.js";

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare("SELECT username, verified, is_admin FROM users").all();
  return json(results.map((u) => ({ username: u.username, verified: !!u.verified, isAdmin: !!u.is_admin })));
}
