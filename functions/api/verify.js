import { json, readJson, makeToken, publicUser } from "../../lib/db.js";

export async function onRequestPost({ request, env }) {
  const { username, code } = await readJson(request);
  const u = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  if (!u) return json({ error: "Kontot hittades inte." }, 404);
  if (u.verified) return json({ error: "Kontot är redan verifierat." }, 400);

  if (!u.verify_code || (code || "").trim() !== u.verify_code) {
    return json({ error: "Fel kod." }, 400);
  }
  if (!u.verify_code_expires || Date.now() > u.verify_code_expires) {
    return json({ error: "Koden har gått ut. Registrera dig igen för att få en ny kod." }, 400);
  }

  await env.DB.prepare(
    "UPDATE users SET verified = 1, verify_code = NULL, verify_code_expires = NULL WHERE username = ?"
  ).bind(username).run();

  const token = makeToken();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  await env.DB.prepare("INSERT INTO sessions (token, username, expires_at) VALUES (?, ?, ?)")
    .bind(token, username, expiresAt).run();

  const updated = await env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(username).first();
  return json({ token, user: publicUser(updated) });
}
