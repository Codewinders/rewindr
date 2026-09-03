import { json, getSessionUser } from "../../../lib/db.js";

export async function onRequestDelete({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const listing = await env.DB.prepare("SELECT * FROM listings WHERE id = ?").bind(params.id).first();
  if (!listing) return json({ error: "Titeln finns inte." }, 404);
  if (listing.owner !== user.username && !user.is_admin) {
    return json({ error: "Du äger inte den här titeln." }, 403);
  }

  const active = await env.DB.prepare("SELECT id FROM rentals WHERE item_id = ? AND returned = 0").bind(params.id).first();
  if (active) return json({ error: "Titeln är uthyrd just nu och kan inte tas bort." }, 409);

  await env.DB.prepare("DELETE FROM listings WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
