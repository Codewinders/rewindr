import { json, getSessionUser } from "../../lib/db.js";

// Gratisnivån hos UPCitemdb (100 uppslag/dag, ingen nyckel krävs) används
// som standard. Om ni senare uppgraderar till en betald plan (fler
// uppslag/dag), lägg till UPCITEMDB_API_KEY som miljövariabel i Cloudflare
// — koden växlar automatiskt till den betalda url:en och skickar med
// nyckeln, ingen kodändring behövs.
export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const url = new URL(request.url);
  const upc = (url.searchParams.get("upc") || "").replace(/\D/g, "");
  if (!upc) return json({ error: "Ingen streckkod angiven." }, 400);

  const apiKey = env.UPCITEMDB_API_KEY;
  const base = apiKey ? "https://api.upcitemdb.com/prod/v1/lookup" : "https://api.upcitemdb.com/prod/trial/lookup";
  const headers = apiKey ? { user_key: apiKey, key_type: "3scale" } : {};

  try {
    const res = await fetch(`${base}?upc=${encodeURIComponent(upc)}`, { headers });
    if (res.status === 429) {
      return json({ error: "Dagens gräns för streckkodsuppslag är nådd — fyll i manuellt istället." }, 429);
    }
    const data = await res.json();
    const item = data.items && data.items[0];
    if (!item) return json({ found: false });

    return json({
      found: true,
      title: item.title || null,
      category: item.category || null,
      imageUrl: (item.images && item.images[0]) || null,
    });
  } catch (err) {
    return json({ error: "Kunde inte slå upp streckkoden just nu — fyll i manuellt." }, 500);
  }
}
