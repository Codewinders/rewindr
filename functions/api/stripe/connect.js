import { json, getSessionUser } from "../../../lib/db.js";
import { stripe } from "../../../lib/stripe.js";

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const url = new URL(request.url);
  const origin = `${url.protocol}//${url.host}`;

  try {
    let accountId = user.stripe_account_id;

    if (!accountId) {
      const account = await stripe.createExpressAccount(env, user.email);
      accountId = account.id;
      await env.DB.prepare("UPDATE users SET stripe_account_id = ? WHERE username = ?")
        .bind(accountId, user.username).run();
    }

    const link = await stripe.createAccountLink(
      env,
      accountId,
      `${origin}/?stripe=refresh`,
      `${origin}/?stripe=done`
    );

    return json({ url: link.url });
  } catch (err) {
    return json({ error: "Kunde inte koppla Stripe: " + err.message }, 500);
  }
}
