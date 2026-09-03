// Pratar direkt med Stripes REST-API via fetch (ingen Stripe-SDK behövs,
// vilket annars kan krångla i Cloudflares Workers-miljö).

const STRIPE_API = "https://api.stripe.com/v1";

function toFormBody(obj, prefix = "") {
  // Stripes API tar emot application/x-www-form-urlencoded, med
  // hakparenteser för nästlade objekt, t.ex. transfer_data[destination]=...
  const parts = [];
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const fieldKey = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object" && !Array.isArray(value)) {
      parts.push(toFormBody(value, fieldKey));
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => {
        if (typeof v === "object") parts.push(toFormBody(v, `${fieldKey}[${i}]`));
        else parts.push(`${encodeURIComponent(`${fieldKey}[${i}]`)}=${encodeURIComponent(v)}`);
      });
    } else {
      parts.push(`${encodeURIComponent(fieldKey)}=${encodeURIComponent(value)}`);
    }
  }
  return parts.join("&");
}

async function stripeRequest(env, method, path, body) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body ? toFormBody(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    const err = new Error(data.error?.message || "Stripe-fel");
    err.stripeError = data.error;
    throw err;
  }
  return data;
}

export const stripe = {
  createExpressAccount: (env, email) =>
    stripeRequest(env, "POST", "/accounts", {
      type: "express",
      email,
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    }),

  createAccountLink: (env, accountId, refreshUrl, returnUrl) =>
    stripeRequest(env, "POST", "/account_links", {
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: "account_onboarding",
    }),

  getAccount: (env, accountId) => stripeRequest(env, "GET", `/accounts/${accountId}`),

  createCheckoutSession: (env, params) => stripeRequest(env, "POST", "/checkout/sessions", params),

  getCheckoutSession: (env, id) => stripeRequest(env, "GET", `/checkout/sessions/${id}`),
};

// ---------- webhook-signaturverifiering ----------
// Stripe skickar en "Stripe-Signature"-header i formatet:
// t=<timestamp>,v1=<hmac-hex>. Vi räknar om HMAC-SHA256 av
// "<timestamp>.<body>" med webhook-hemligheten och jämför.

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => p.split("="))
  );
  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const computedSig = await hmacSha256Hex(secret, signedPayload);
  return computedSig === expectedSig;
}
