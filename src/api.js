// Enkel fetch-baserad klient mot Rewindr-backend (Cloudflare Pages
// Functions, körs på samma domän som sajten själv — ingen separat
// adress att konfigurera, inga CORS-problem).

const TOKEN_KEY = "rewindr-token";

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Serverfel (${res.status})`);
  return data;
}

export const api = {
  // auth
  register: (username, email, password) => request("POST", "/api/register", { username, email, password }),
  verify: async (username, code) => {
    const data = await request("POST", "/api/verify", { username, code });
    setToken(data.token);
    return data.user;
  },
  login: async (username, password) => {
    const data = await request("POST", "/api/login", { username, password });
    setToken(data.token);
    return data.user;
  },
  logout: async () => {
    try { await request("POST", "/api/logout"); } catch (e) {}
    setToken("");
  },
  me: () => request("GET", "/api/me").then((d) => d.user),
  hasToken: () => !!getToken(),

  // public
  users: () => request("GET", "/api/users"),

  // listings
  listings: () => request("GET", "/api/listings"),
  createListing: (listing) => request("POST", "/api/listings", listing),
  deleteListing: (id) => request("DELETE", `/api/listings/${id}`),

  // rentals
  rentals: () => request("GET", "/api/rentals"),
  createRental: (itemId, days, delivery) => request("POST", "/api/rentals", { itemId, days, delivery }),
  returnRental: (id) => request("POST", `/api/rentals/${id}/return`),

  // threads
  threads: () => request("GET", "/api/threads"),
  createThread: (payload) => request("POST", "/api/threads", payload),
  replyThread: (id, text) => request("POST", `/api/threads/${id}/messages`, { text }),

  // reviews
  reviews: () => request("GET", "/api/reviews"),
  createReview: (ownerUsername, rating, text) => request("POST", "/api/reviews", { ownerUsername, rating, text }),
  deleteReview: (id) => request("DELETE", `/api/reviews/${id}`),

  // admin
  adminAccounts: () => request("GET", "/api/accounts"),
  adminToggleVerified: (username) => request("POST", `/api/accounts/${username}/verify`),
  adminToggleBanned: (username) => request("POST", `/api/accounts/${username}/ban`),
};
