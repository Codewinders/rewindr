import { json, getSessionUser } from "../../lib/db.js";

// Provar upcdatabase.org (er egen nyckel, garanterad kvot) FÖRST, och om
// den inte hittar något, provar UPCitemdb (mycket större databas, 500M+
// produkter) som en bonus-chans utan extra kostnad — den kan ibland vara
// upptagen (delad kvot mellan alla Cloudflare-projekt), men är värd att
// försöka eftersom den ofta har betydligt bättre täckning för just
// filmer/spel.
async function tryUpcDatabase(upc, apiKey) {
  const res = await fetch(`https://api.upcdatabase.org/product/${encodeURIComponent(upc)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const rawText = await res.text();
  let data;
  try { data = JSON.parse(rawText); } catch { data = null; }
  if (!res.ok || !data) return { found: false, debug: { source: "upcdatabase.org", status: res.status, raw: rawText.slice(0, 200) } };

  const title = data.title || data.product?.title || data.data?.title || null;
  const category = data.category || data.product?.category || data.data?.category || null;
  if (!title) return { found: false, debug: { source: "upcdatabase.org", status: res.status, raw: rawText.slice(0, 200) } };
  return { found: true, title, category };
}

async function tryUpcItemDb(upc) {
  const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(upc)}`);
  if (!res.ok) return { found: false, debug: { source: "upcitemdb", status: res.status } };
  const data = await res.json().catch(() => null);
  const item = data?.items?.[0];
  if (!item) return { found: false, debug: { source: "upcitemdb", status: res.status, raw: JSON.stringify(data).slice(0, 200) } };
  return { found: true, title: item.title || null, category: item.category || null };
}

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const url = new URL(request.url);
  const upc = (url.searchParams.get("upc") || "").replace(/\D/g, "");
  if (!upc) return json({ error: "Ingen streckkod angiven." }, 400);

  try {
    let result = { found: false };

    if (env.UPCDB_API_KEY) {
      result = await tryUpcDatabase(upc, env.UPCDB_API_KEY);
      if (result.found) return json(result);
    }

    // Bonus-försök mot UPCitemdb om första försöket inte hittade något.
    const secondTry = await tryUpcItemDb(upc);
    if (secondTry.found) return json(secondTry);

    // Ingen av tjänsterna hittade något — visa felsökningsinfo från båda.
    return json({ found: false, debug: { first: result.debug, second: secondTry.debug } });
  } catch (err) {
    return json({ error: "Kunde inte slå upp streckkoden just nu — fyll i manuellt. (" + err.message + ")" }, 500);
  }
}
