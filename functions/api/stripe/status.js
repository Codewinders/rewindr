import { json, getSessionUser } from "../../../lib/db.js";
import { stripe } from "../../../lib/stripe.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  if (!user.stripe_account_id) {
    return json({ connected: false, chargesEnabled: false });
  }

  try {
    const account = await stripe.getAccount(env, user.stripe_account_id);
    const chargesEnabled = !!account.charges_enabled;
    if (chargesEnabled !== !!user.stripe_charges_enabled) {
      await env.DB.prepare("UPDATE users SET stripe_charges_enabled = ? WHERE username = ?")
        .bind(chargesEnabled ? 1 : 0, user.username).run();
    }
    return json({ connected: true, chargesEnabled });
  } catch (err) {
    return json({ connected: true, chargesEnabled: false });
  }
}
