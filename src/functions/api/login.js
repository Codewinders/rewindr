import { json, readJson, verifyPassword, makeToken, publicUser } from "../../lib/db.js";

export async function onRequestPost({ request, env }) {
  const { username, password } = await readJson(request);
  const u = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!u) return json({ error: "Fel användarnamn eller lösenord." }, 401);

  const ok = await verifyPassword(password, u.salt, u.password_hash);
  if (!ok) return json({ error: "Fel användarnamn eller lösenord." }, 401);
  if (u.banned) return json({ error: "Det här kontot är spärrat." }, 403);

  const token = makeToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)")
    .bind(token, u.username, expiresAt).run();

  return json({ token, user: publicUser(u) });
}
