import { json, getSessionUser } from "../../lib/db.js";

// Använder upcdatabase.org istället för UPCitemdb — UPCitemdbs gratisnivå
// kräver ingen inloggning alls, vilket betyder att kvoten (100/dag) delas
// mellan ALLA Cloudflare-projekt i världen som råkar anropa den, inte
// bara oss. Den blir därför ofta redan uttömd. upcdatabase.org kräver ett
// gratis konto + egen nyckel, så kvoten är garanterat er egen.
//
// Så här skaffar ni nyckeln (gratis, inget kort krävs):
// 1. Skapa konto på https://upcdatabase.org/signup
// 2. Skapa en nyckel på https://upcdatabase.org/apikeys
// 3. Lägg till den som miljövariabel UPCDB_API_KEY i Cloudflare Pages
export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  if (!env.UPCDB_API_KEY) {
    return json({ error: "Streckkodsuppslag är inte konfigurerat än — UPCDB_API_KEY saknas i Cloudflare." }, 500);
  }

  const url = new URL(request.url);
  const upc = (url.searchParams.get("upc") || "").replace(/\D/g, "");
  if (!upc) return json({ error: "Ingen streckkod angiven." }, 400);

  try {
    const res = await fetch(`https://api.upcdatabase.org/product/${encodeURIComponent(upc)}`, {
      headers: { Authorization: `Bearer ${env.UPCDB_API_KEY}` },
    });
    if (res.status === 429) {
      return json({ error: "Dagens gräns för streckkodsuppslag är nådd — fyll i manuellt istället." }, 429);
    }
    if (res.status === 404) {
      return json({ found: false });
    }
    const data = await res.json();
    if (data.success === false || !data.title) {
      return json({ found: false });
    }
    return json({
      found: true,
      title: data.title || null,
      category: data.category || null,
    });
  } catch (err) {
    return json({ error: "Kunde inte slå upp streckkoden just nu — fyll i manuellt." }, 500);
  }
}
