import { json } from "../../lib/db.js";

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(auth.slice(7)).run();
  }
  return json({ ok: true });
}
