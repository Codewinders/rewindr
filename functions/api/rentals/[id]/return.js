import { json, getSessionUser } from "../../../../lib/db.js";

export async function onRequestPost({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const rental = await env.DB.prepare("SELECT * FROM rentals WHERE id = ?").bind(params.id).first();
  if (!rental) return json({ error: "Hyran finns inte." }, 404);
  if (rental.renter_name !== user.username && rental.owner_name !== user.username && !user.is_admin) {
    return json({ error: "Du är varken hyresgäst eller ägare för det här lånet." }, 403);
  }
  if (rental.returned) return json({ ok: true }); // redan klart, gör inget

  // active_key sätts till NULL här — det är det som "frigör" titeln så
  // att den kan hyras igen (se det unika indexet i schema.sql).
  await env.DB.prepare("UPDATE rentals SET returned = 1, returned_at = ?, active_key = NULL WHERE id = ?")
    .bind(Date.now(), params.id).run();

  return json({ ok: true });
}
