import { hashPassword, json, readJson, DEMO_VERIFY_CODE } from "../../lib/db.js";

export async function onRequestPost({ request, env }) {
  const { username, email, password } = await readJson(request);
  const u = (username || "").trim();
  const em = (email || "").trim();

  if (!u || u.length < 2) return json({ error: "Användarnamn krävs (minst 2 tecken)." }, 400);
  if (!em || !em.includes("@")) return json({ error: "En giltig e-postadress krävs." }, 400);
  if (!password || password.length < 4) return json({ error: "Lösenord krävs (minst 4 tecken)." }, 400);

  const exists = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(u).first();
  if (exists) return json({ error: "Användarnamnet är upptaget." }, 409);

  const { hash, salt } = await hashPassword(password);
  const countRow = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
  const isFirst = countRow.c === 0;
  // ADMIN_USERNAME (satt i Cloudflare Pages → Settings → Environment
  // variables) garanterar att just DET användarnamnet blir admin, oavsett
  // registreringsordning. Saknas den variabeln: första kontot blir admin
  // som tidigare (bra nog för snabb testning, men sätt ADMIN_USERNAME
  // innan riktig lansering så ingen annan kan hinna före).
  const isDesignatedAdmin = env.ADMIN_USERNAME && env.ADMIN_USERNAME.trim() === u;
  const isAdmin = isDesignatedAdmin || isFirst;

  await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, salt, verified, is_admin, banned, created_at)
     VALUES (?, ?, ?, ?, 0, ?, 0, ?)`
  ).bind(u, em, hash, salt, isAdmin ? 1 : 0, Date.now()).run();

  return json({ ok: true, needsVerify: true, demoCode: DEMO_VERIFY_CODE });
}
