import { json, getSessionUser } from "../../../lib/db.js";

const GENRE_KEYWORDS = {
  Skräck: ["horror"],
  "Sci-fi": ["sci-fi", "science fiction"],
  Drama: ["drama"],
  Komedi: ["comedy"],
  Action: ["action"],
  Romantik: ["romance", "romantic"],
  Fantasy: ["fantasy"],
  Deckare: ["crime", "mystery", "detective", "thriller"],
};

const GAME_KEYWORDS = ["playstation", "xbox", "nintendo", "switch", "ps4", "ps5", "ps3", "video game"];

function guessType(text) {
  const t = text.toLowerCase();
  return GAME_KEYWORDS.some((k) => t.includes(k)) ? "game" : "movie";
}

function guessGenre(text) {
  const t = text.toLowerCase();
  for (const [genre, keywords] of Object.entries(GENRE_KEYWORDS)) {
    if (keywords.some((k) => t.includes(k))) return genre;
  }
  return null;
}

function guessFormat(text, type) {
  const t = text.toLowerCase();
  if (type === "game") {
    if (t.includes("playstation 5") || t.includes("ps5")) return "PlayStation 5";
    if (t.includes("playstation 4") || t.includes("ps4")) return "PlayStation 4";
    if (t.includes("playstation 2") || t.includes("ps2")) return "PlayStation 2";
    if (t.includes("playstation")) return "PlayStation";
    if (t.includes("switch 2")) return "Nintendo Switch 2";
    if (t.includes("switch")) return "Nintendo Switch";
    if (t.includes("series x") || t.includes("series s")) return "Xbox Series X";
    if (t.includes("xbox one")) return "Xbox One";
    return null;
  }
  if (t.includes("4k")) return "4K Blu-ray";
  if (t.includes("blu-ray") || t.includes("bluray")) return "Blu-ray";
  if (t.includes("dvd")) return "DVD";
  if (t.includes("vhs")) return "VHS";
  return null;
}

// Städar bort vanliga tillägg i produkttitlar ("[Blu-ray]", "(DVD, 2015)" osv)
// så bara själva filmens/spelets namn blir kvar i titelfältet.
function cleanTitle(title) {
  return title
    .replace(/[\[(].*?(blu-?ray|dvd|vhs|4k|widescreen|region \d|steelbook).*?[\])]/gi, "")
    .replace(/\s+-\s+(blu-?ray|dvd|vhs|4k)\s*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function onRequestGet({ request, env, params }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);

  const code = (params.code || "").replace(/[^0-9]/g, "");
  if (!code || code.length < 8) return json({ error: "Ogiltig streckkod." }, 400);

  try {
    const res = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${code}`, {
      headers: { "Content-Type": "application/json", Accept: "application/json" },
    });
    const data = await res.json();

    if (!data.items || data.items.length === 0) {
      return json({ found: false });
    }

    const item = data.items[0];
    const rawTitle = item.title || "";
    const searchText = `${rawTitle} ${item.category || ""} ${item.description || ""}`;

    const type = guessType(searchText);
    return json({
      found: true,
      title: cleanTitle(rawTitle) || rawTitle,
      type,
      genre: guessGenre(searchText),
      format: guessFormat(searchText, type),
      imageUrl: item.images && item.images[0] ? item.images[0] : null,
    });
  } catch (err) {
    return json({ error: "Kunde inte slå upp streckkoden just nu." }, 502);
  }
}
