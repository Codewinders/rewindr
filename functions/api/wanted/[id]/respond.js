import { json, readJson, getSessionUser } from "../../../../lib/db.js";
import { sendEmail, wantedResponseEmail } from "../../../../lib/email.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const ad = await env.DB.prepare("SELECT * FROM wanted_ads WHERE id = ?").bind(params.id).first();
  if (!ad) return json({ error: "Efterlysningen finns inte." }, 404);
  if (ad.username === user.username) return json({ error: "Du kan inte svara på din egen efterlysning." }, 400);

  const b = await readJson(request);
  const poster = await env.DB.prepare("SELECT email FROM users WHERE username = ?").bind(ad.username).first();
  if (poster?.email) {
    const { subject, html } = wantedResponseEmail(user.username, ad.title, (b.note || "").trim());
    await sendEmail(env, poster.email, subject, html);
  }

  return json({ ok: true });
}
