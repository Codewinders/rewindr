// Delade hjälpfunktioner för alla Pages Functions.
// Använder bara Web-standard-API:er (crypto.subtle, crypto.randomUUID)
// eftersom Cloudflare Workers-miljön inte har Node.js inbyggda moduler.

export function makeId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function makeToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(password, saltHex, iterations = 100000) {
  const enc = new TextEncoder();
  const saltBytes = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPassword(password, existingSaltHex) {
  const salt = existingSaltHex || Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await pbkdf2(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password, saltHex, expectedHash) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === expectedHash;
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return {};
  }
}

export async function getSessionUser(env, request) {
  const auth = request.headers.get("Authorization") || "";
  if (!auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const session = await env.DB.prepare("SELECT * FROM sessions WHERE token = ?").bind(token).first();
  if (!session) return null;
  if (session.expires_at < Date.now()) {
    await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(token).run();
    return null;
  }
  return env.DB.prepare("SELECT * FROM users WHERE username = ?").bind(session.username).first();
}

export function publicUser(u) {
  if (!u) return null;
  return { username: u.username, verified: !!u.verified, isAdmin: !!u.is_admin, banned: !!u.banned };
}

export function publicListing(l) {
  return {
    id: l.id, title: l.title, type: l.type, format: l.format, genre: l.genre,
    price: l.price, owner: l.owner, note: l.note, imageUrl: l.image_url,
    rentable: !!l.rentable, forSale: !!l.for_sale, salePrice: l.sale_price,
    sold: !!l.sold, soldAt: l.sold_at,
    delivery: l.delivery, shippingPrice: l.shipping_price, replacementValue: l.replacement_value,
    tradeable: !!l.tradeable,
  };
}

export function publicPurchase(p) {
  return {
    id: p.id, itemId: p.item_id, buyerName: p.buyer_name, sellerName: p.seller_name,
    price: p.price, shipCost: p.ship_cost, delivery: p.delivery, purchasedAt: p.purchased_at,
  };
}

export function publicRental(r) {
  return {
    id: r.id, itemId: r.item_id, renterName: r.renter_name, ownerName: r.owner_name,
    rentedAt: r.rented_at, days: r.days, delivery: r.delivery, shipCost: r.ship_cost,
    rentCost: r.rent_cost, returned: !!r.returned, returnedAt: r.returned_at,
  };
}
