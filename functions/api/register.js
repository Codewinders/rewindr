import { hashPassword, json, readJson } from "../../lib/db.js";
import { sendEmail, verifyEmail } from "../../lib/email.js";

const CODE_TTL_MS = 15 * 60 * 1000; // 15 minuter

function makeSixDigitCode() {
  // crypto.getRandomValues ger en kryptografiskt säker slumpkälla,
  // % 1000000 för att få exakt sex siffror (med ledande nollor bevarade).
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1000000).padStart(6, "0");
}

export async function onRequestPost({ request, env }) {
  const { username, email, password, referralCode } = await readJson(request);
  const u = (username || "").trim();
  const em = (email || "").trim();

  if (!u || u.length < 2) return json({ error: "Användarnamn krävs (minst 2 tecken)." }, 400);
  if (!em || !em.includes("@")) return json({ error: "En giltig e-postadress krävs." }, 400);
  if (!password || password.length < 4) return json({ error: "Lösenord krävs (minst 4 tecken)." }, 400);

  const exists = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(u).first();
  if (exists) return json({ error: "Användarnamnet är upptaget." }, 409);

  let referredBy = null;
  const refCode = (referralCode || "").trim();
  if (refCode) {
    if (refCode === u) return json({ error: "Du kan inte värva dig själv." }, 400);
    const referrer = await env.DB.prepare("SELECT username FROM users WHERE username = ?").bind(refCode).first();
    if (!referrer) return json({ error: "Värvningskoden hittades inte — dubbelkolla stavningen." }, 400);
    referredBy = referrer.username;
  }

  const { hash, salt } = await hashPassword(password);
  const countRow = await env.DB.prepare("SELECT COUNT(*) as c FROM users").first();
  const isFirst = countRow.c === 0;
  // ADMIN_USERNAME (satt i Cloudflare Pages → Settings → Environment
  // variables) garanterar att just DET användarnamnet blir admin, oavsett
  // registreringsordning. Saknas den variabeln: första kontot blir admin.
  const isDesignatedAdmin = env.ADMIN_USERNAME && env.ADMIN_USERNAME.trim() === u;
  const isAdmin = isDesignatedAdmin || isFirst;

  const code = makeSixDigitCode();
  const expires = Date.now() + CODE_TTL_MS;

  await env.DB.prepare(
    `INSERT INTO users (username, email, password_hash, salt, verified, is_admin, banned, verify_code, verify_code_expires, referred_by, created_at)
     VALUES (?, ?, ?, ?, 0, ?, 0, ?, ?, ?, ?)`
  ).bind(u, em, hash, salt, isAdmin ? 1 : 0, code, expires, referredBy, Date.now()).run();

  const { subject, html } = verifyEmail(code);
  const result = await sendEmail(env, em, subject, html);

  if (!result.ok) {
    // Kontot skapades ändå (så användaren inte behöver börja om), men vi
    // är ärliga om att mejlet inte gick fram — annars hade de aldrig
    // kunnat verifiera sig alls.
    return json({
      ok: true,
      needsVerify: true,
      emailWarning: "Kontot skapades, men vi kunde inte skicka verifieringsmejlet just nu: " + result.error,
    });
  }

  return json({ ok: true, needsVerify: true });
}
