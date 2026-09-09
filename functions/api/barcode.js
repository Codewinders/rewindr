import { json, getSessionUser } from "../../lib/db.js";

// Använder upcdatabase.org — se tidigare kommentar i git-historiken för
// varför (UPCitemdbs helt öppna gratisnivå delar kvot med hela internet).
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

    const rawText = await res.text();
    let data;
    try { data = JSON.parse(rawText); } catch { data = null; }

    if (res.status === 429) {
      return json({ error: "Dagens gräns för streckkodsuppslag är nådd — fyll i manuellt istället." }, 429);
    }
    if (res.status === 404) {
      return json({ found: false });
    }
    if (!res.ok || !data) {
      // Tillfällig felsökningsinfo tills vi bekräftat att svarsformatet stämmer.
      return json({ found: false, debug: { status: res.status, raw: rawText.slice(0, 300) } });
    }

    // Provar flera rimliga platser fältet kan ligga på, eftersom vi inte
    // kunnat testa ett riktigt lyckat svar än.
    const title = data.title || data.product?.title || data.data?.title || null;
    const category = data.category || data.product?.category || data.data?.category || null;

    if (!title) {
      return json({ found: false, debug: { status: res.status, raw: rawText.slice(0, 300) } });
    }

    return json({ found: true, title, category });
  } catch (err) {
    return json({ error: "Kunde inte slå upp streckkoden just nu — fyll i manuellt. (" + err.message + ")" }, 500);
  }
}
