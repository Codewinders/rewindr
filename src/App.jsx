import React, { useState, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { Film, Plus, X, Rewind, User, Clock, Sparkles, Search, Trash2, Tag, MessageCircle, Inbox, Send, Truck, Home, Shield, Gamepad2, Repeat, Star, ShieldCheck, LogIn, LogOut, Crown, Ban, CreditCard, Disc, Heart, Award, MoreVertical } from "lucide-react";

const FORMATS = ["VHS", "DVD", "Blu-ray", "4K Blu-ray"];
const FORMAT_PRICE_HINT = {
  VHS: "8–15 kr/dag",
  DVD: "10–20 kr/dag",
  "Blu-ray": "20–35 kr/dag",
  "4K Blu-ray": "30–50 kr/dag",
};
const PLATFORMS = ["Nintendo Switch", "Nintendo Switch 2", "Xbox One", "Xbox Series X", "PlayStation", "PlayStation 2", "PlayStation 4", "PlayStation 5"];
const DELIVERY_LABELS = { pickup: "Endast hämtning", ship: "Endast frakt", both: "Hämtning eller frakt" };
const RENT_FEE_PCT = 15;
const TRADE_FEE_PCT = 5;
const BUY_FEE_PCT = 10;

const GENRE_COLORS = {
  Skräck: "#ff2fb0",
  "Sci-fi": "#21e6ec",
  Drama: "#ffb627",
  Komedi: "#ffe94a",
  Action: "#ff5a3c",
  Romantik: "#ff85d0",
  Fantasy: "#8b5cf6",
  Deckare: "#4ade80",
};
const GENRES = Object.keys(GENRE_COLORS);


// ---------- storage ----------
function useRewindrData() {
  const [listings, setListings] = useState([]);
  const [name, setName] = useState("");
  const [rentals, setRentals] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [threads, setThreads] = useState([]);
  const [accounts, setAccounts] = useState({}); // { username: { verified, isAdmin, createdAt } }
  const [reviews, setReviews] = useState([]);
  const [favorites, setFavorites] = useState([]); // lista av item-id:n
  const [ready, setReady] = useState(false);
  const [lastError, setLastError] = useState("");

  const buildAccountsMap = (users) => {
    const map = {};
    users.forEach((u) => { map[u.username] = { verified: u.verified, isAdmin: u.isAdmin, createdAt: u.createdAt }; });
    return map;
  };

  const refreshFavorites = useCallback(async () => {
    if (!api.hasToken()) return setFavorites([]);
    try {
      setFavorites(await api.favorites());
    } catch {
      // inte inloggad eller tillfälligt fel — tyst, favoriter är inte kritiskt
    }
  }, []);

  const [myCredits, setMyCredits] = useState(0);

  const refreshAll = useCallback(async () => {
    try {
      const [l, r, p, t, rv, u] = await Promise.all([
        api.listings(), api.rentals(), api.purchases(), api.threads(), api.reviews(), api.users(),
      ]);
      setListings(l); setRentals(r); setPurchases(p); setThreads(t); setReviews(rv);
      setAccounts(buildAccountsMap(u));
      await refreshFavorites();
      if (api.hasToken()) {
        const me = await api.me().catch(() => null);
        setMyCredits(me?.freeFeeCredits || 0);
      } else {
        setMyCredits(0);
      }
    } catch (e) {
      setLastError("Kunde inte hämta data från servern: " + (e?.message || e));
    }
  }, [refreshFavorites]);

  const toggleFavorite = useCallback(async (itemId) => {
    const isFav = favorites.includes(itemId);
    setFavorites((prev) => (isFav ? prev.filter((id) => id !== itemId) : [...prev, itemId])); // optimistisk uppdatering
    try {
      if (isFav) await api.removeFavorite(itemId);
      else await api.addFavorite(itemId);
    } catch {
      await refreshFavorites(); // gick fel — synka tillbaka mot servern
    }
  }, [favorites, refreshFavorites]);

  useEffect(() => {
    (async () => {
      try {
        if (api.hasToken()) {
          const me = await api.me().catch(() => null);
          if (me) setName(me.username);
        }
        await refreshAll();
      } catch (e) {
        setLastError("Kunde inte nå backend: " + (e?.message || e));
      }
      setReady(true);
    })();
  }, [refreshAll]);

  // enkel polling så flera flikar/enheter ser varandras ändringar
  useEffect(() => {
    const id = setInterval(refreshAll, 5000);
    return () => clearInterval(id);
  }, [refreshAll]);

  return {
    listings, name, setName, rentals, purchases, threads, accounts, setAccounts, reviews,
    favorites, toggleFavorite, myCredits, ready, lastError, setLastError, refreshAll,
  };
}

// ---------- shared bits ----------
const fontDisplay = { fontFamily: "'Bebas Neue', sans-serif", letterSpacing: "0.03em" };
const fontLogo = { fontFamily: "'Anton', sans-serif" };
const fontBody = { fontFamily: "'Space Grotesk', sans-serif" };

function GlobalStyle() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Space+Grotesk:wght@400;500;600&display=swap');
      html { font-size: 18px; }
      .rw-card { transition: transform 0.2s ease, border-color 0.2s ease; }
      .rw-card:hover { transform: translateY(-3px); }
      @keyframes rwSlideIn {
        from { opacity: 0; transform: translateY(-8px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .rw-slide-in { animation: rwSlideIn 0.25s ease; }
    `}</style>
  );
}

// ---------- header ----------
function Marquee({ query, setQuery }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border mb-8" style={{ borderColor: "#33333a", background: "linear-gradient(180deg, #150c24 0%, #121214 100%)" }}>
      <div className="relative px-6 py-12 sm:py-16 text-center">
        <div className="flex items-center justify-center gap-2 text-[11px] tracking-[0.15em] uppercase mb-4" style={{ ...fontBody, color: "#6d5d8a" }}>
          <Rewind size={13} /> öppet dygnet runt · lån för lån
        </div>
        <h1 className="text-5xl sm:text-6xl leading-none"
          style={{ ...fontLogo, color: "#ff4fc0", textShadow: "0 0 18px #ff2fb055" }}>
          REWINDR
        </h1>
        <p className="mt-5 text-sm sm:text-base max-w-md mx-auto" style={{ ...fontBody, color: "#a99bc4" }}>
          Hyr, köp eller byt filmer och TV-spel med folk i din närhet — riktiga kopior, riktiga hyllor.
        </p>
        <div className="mt-6 max-w-sm mx-auto relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#6d5d8a" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök titel…"
            className="w-full pl-9 pr-3 py-2.5 rounded-full outline-none text-sm"
            style={{ ...fontBody, background: "#121214", border: "1px solid #33333a", color: "#f3eefc" }}
          />
        </div>
      </div>
    </div>
  );
}

function Tabs({ active, setActive, showAdmin, showMyListings }) {
  const tabs = [
    { id: "browse", label: "Bläddra" },
    { id: "wanted", label: "Efterlysningar" },
    { id: "list", label: "Lägg upp" },
    ...(showMyListings ? [{ id: "myListings", label: "Mina annonser" }] : []),
    ...(showMyListings ? [{ id: "favorites", label: "Favoriter" }] : []),
    ...(showMyListings ? [{ id: "shelf", label: "Min hylla" }] : []),
    { id: "mine", label: "Mina lån" },
    ...(showAdmin ? [{ id: "admin", label: "Admin" }] : []),
  ];
  return (
    <div className="flex gap-1.5 mb-8 flex-wrap justify-center p-1.5 rounded-xl" style={{ ...fontDisplay, background: "#1c1c20", border: "1px solid #33333a66" }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => setActive(t.id)}
          className="px-5 py-2.5 text-base rounded-lg transition-colors flex items-center gap-2"
          style={{
            letterSpacing: "0.04em",
            color: active === t.id ? "#121214" : "#a99bc4",
            background: active === t.id ? "#ffe94a" : "transparent",
          }}>
          {t.id === "admin" && <Crown size={13} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ---------- auth ----------
function AuthPanel({ name, accounts, myCredits, onAuthChange }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [pendingVerify, setPendingVerify] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stripeStatus, setStripeStatus] = useState(null);
  const [stripeBusy, setStripeBusy] = useState(false);

  const inputStyle = { background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody };

  useEffect(() => {
    if (!name) return;
    api.stripeStatus().then(setStripeStatus).catch(() => {});
  }, [name]);

  const [stripeError, setStripeError] = useState("");
  const [showReferral, setShowReferral] = useState(false);

  const connectStripe = async () => {
    setStripeBusy(true);
    setStripeError("");
    try {
      const data = await api.stripeConnect();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setStripeError("Fick inget svar från servern (ingen url).");
        setStripeBusy(false);
      }
    } catch (err) {
      setStripeError(err.message || "Okänt fel.");
      setStripeBusy(false);
    }
  };

  if (name) {
    const acc = accounts[name];
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border flex-wrap" style={{ borderColor: "#33333a", background: "#1c1c20", ...fontBody }}>
          <div className="flex items-center gap-2 text-sm flex-wrap" style={{ color: "#f3eefc" }}>
            <User size={15} style={{ color: "#21e6ec" }} />
            Inloggad som <strong>{name}</strong>
            {acc?.verified && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#4ade80" }}><ShieldCheck size={13} /> verifierad</span>
            )}
            {acc?.isAdmin && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#ffe94a" }}><Crown size={13} /> admin</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {myCredits > 0 && (
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "#ffe94a" }}>
                <Award size={13} /> {myCredits} rabatterad{myCredits > 1 ? "e" : ""} affär{myCredits > 1 ? "er" : ""}
              </span>
            )}
            <button onClick={() => setShowReferral((v) => !v)} className="flex items-center gap-1 text-[11px]" style={{ color: "#8b5cf6" }}>
              <Repeat size={13} /> Bjud in en vän
            </button>
            {stripeStatus && (
              stripeStatus.chargesEnabled ? (
                <span className="flex items-center gap-1 text-[11px]" style={{ color: "#4ade80" }}>
                  <CreditCard size={13} /> kan ta emot betalningar
                </span>
              ) : (
                <button onClick={connectStripe} disabled={stripeBusy}
                  className="flex items-center gap-1 text-[11px] disabled:opacity-50" style={{ color: "#21e6ec" }}>
                  <CreditCard size={13} /> {stripeBusy ? "..." : "Anslut betalningar"}
                </button>
              )
            )}
            <button
              onClick={async () => { await api.logout(); onAuthChange(null); }}
              className="flex items-center gap-1 text-xs" style={{ color: "#8a7aa8" }}>
              <LogOut size={13} /> Logga ut
            </button>
          </div>
        </div>
        {stripeError && (
          <div className="mt-2 text-[11px] rounded-lg p-2" style={{ background: "#ff8a8a15", color: "#ff8a8a", ...fontBody }}>
            Stripe-fel: {stripeError}
          </div>
        )}
        {showReferral && (
          <div className="mt-2 text-xs rounded-lg p-3" style={{ background: "#8b5cf615", border: "1px solid #8b5cf644", color: "#c9b8e0", ...fontBody }}>
            <p className="mb-1.5">Bjud in en vän! Ge dem din kod nedan så de kan fylla i den när de registrerar sig. När de gör sin första affär på Rewindr får du en avgiftsfri affär tillbaka.</p>
            <div className="flex items-center gap-2">
              <code className="px-2 py-1 rounded" style={{ background: "#121214", color: "#ffe94a" }}>{name}</code>
              <button onClick={() => navigator.clipboard?.writeText(name)} style={{ color: "#21e6ec" }}>Kopiera</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const submitRegister = async (e) => {
    e.preventDefault();
    setError("");
    const u = username.trim();
    const em = email.trim();
    if (!u || !password) return setError("Fyll i användarnamn och lösenord.");
    if (!em || !em.includes("@")) return setError("En giltig e-postadress krävs (för uthyrningsmejl).");
    if (password !== confirm) return setError("Lösenorden matchar inte.");
    setBusy(true);
    try {
      const data = await api.register(u, em, password, referralCode.trim());
      setPendingVerify(u);
      if (data.emailWarning) setError(data.emailWarning);
    } catch (err) {
      setError(err.message || "Något gick fel.");
    } finally {
      setBusy(false);
    }
  };

  const submitLogin = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await api.login(username.trim(), password);
      onAuthChange(user);
    } catch (err) {
      setError(err.message || "Något gick fel.");
    } finally {
      setBusy(false);
    }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const user = await api.verify(pendingVerify, code.trim());
      onAuthChange(user);
    } catch (err) {
      setError(err.message || "Fel kod, försök igen.");
    } finally {
      setBusy(false);
    }
  };

  if (pendingVerify) {
    return (
      <div className="mb-4 rounded-xl border p-4 max-w-sm mx-auto" style={{ borderColor: "#33333a", background: "#1c1c20", ...fontBody }}>
        <div className="text-sm mb-2" style={{ color: "#f3eefc" }}>Verifiera kontot "{pendingVerify}"</div>
        <p className="text-[11px] mb-2" style={{ color: "#6d5d8a" }}>
          Vi har skickat en 6-siffrig kod till din e-post. Ange den nedan (kolla även skräpposten om du inte ser den).
        </p>
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Verifieringskod"
          onKeyDown={(e) => { if (e.key === "Enter") submitVerify(e); }}
          className="w-full px-3 py-2 rounded-md outline-none text-sm mb-2" style={inputStyle} />
        {error && <div className="text-xs mb-2" style={{ color: "#ff8a8a" }}>{error}</div>}
        <button type="button" disabled={busy} onClick={submitVerify} className="w-full py-2 rounded-md text-sm disabled:opacity-50" style={{ ...fontDisplay, fontSize: "14px", background: "#4ade80", color: "#121214" }}>
          {busy ? "..." : "VERIFIERA"}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border p-4 max-w-sm mx-auto" style={{ borderColor: "#33333a", background: "#1c1c20" }}>
      <div className="flex gap-2 mb-3 text-xs" style={fontDisplay}>
        <button onClick={() => { setMode("login"); setError(""); }} style={{ color: mode === "login" ? "#ffe94a" : "#8a7aa8" }}>LOGGA IN</button>
        <span style={{ color: "#33333a" }}>/</span>
        <button onClick={() => { setMode("register"); setError(""); }} style={{ color: mode === "register" ? "#ffe94a" : "#8a7aa8" }}>SKAPA KONTO</button>
      </div>
      <div className="space-y-2" style={fontBody}>
        {(() => {
          const submitFn = mode === "login" ? submitLogin : submitRegister;
          return (
            <>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Användarnamn"
                onKeyDown={(e) => { if (e.key === "Enter") submitFn(e); }}
                className="w-full px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
              {mode === "register" && (
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="E-post (för notiser om dina uthyrningar)"
                  onKeyDown={(e) => { if (e.key === "Enter") submitFn(e); }}
                  className="w-full px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
              )}
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Lösenord"
                onKeyDown={(e) => { if (e.key === "Enter") submitFn(e); }}
                className="w-full px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
              {mode === "register" && (
                <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Upprepa lösenord"
                  onKeyDown={(e) => { if (e.key === "Enter") submitFn(e); }}
                  className="w-full px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
              )}
              {mode === "register" && (
                <input value={referralCode} onChange={(e) => setReferralCode(e.target.value)} placeholder="Värvningskod (valfritt)"
                  onKeyDown={(e) => { if (e.key === "Enter") submitFn(e); }}
                  className="w-full px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
              )}
              {error && <div className="text-xs" style={{ color: "#ff8a8a" }}>{error}</div>}
              <button type="button" disabled={busy} onClick={submitFn} className="w-full py-2 rounded-md text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ ...fontDisplay, fontSize: "14px", background: "#21e6ec", color: "#121214" }}>
                <LogIn size={14} /> {busy ? "..." : mode === "login" ? "LOGGA IN" : "SKAPA KONTO"}
              </button>
            </>
          );
        })()}
      </div>
      <p className="text-[11px] mt-2" style={{ color: "#6d5d8a" }}>
        Riktiga konton lagrade i backend-databasen — lösenord hashas med scrypt, aldrig i klartext.
      </p>
    </div>
  );
}


// ---------- reviews ----------
function StarRow({ value, onChange, size = 16 }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange && onChange(n)} disabled={!onChange}>
          <Star size={size} fill={n <= value ? "#ffe94a" : "none"} style={{ color: "#ffe94a" }} />
        </button>
      ))}
    </div>
  );
}

// Räknar fram förtroende-märken baserat på faktisk historik — inget
// användare kan sätta själva, allt härlett från riktiga affärer.
function computeBadges(username, { rentals, purchases, reviews, accounts }) {
  const badges = [];
  const dealsAsOwner = rentals.filter((r) => r.ownerName === username).length;
  const dealsAsSeller = purchases.filter((p) => p.sellerName === username).length;
  const totalDeals = dealsAsOwner + dealsAsSeller;
  if (totalDeals >= 10) badges.push({ label: `${totalDeals}+ lyckade affärer`, color: "#4ade80" });
  else if (totalDeals >= 1) badges.push({ label: `${totalDeals} genomförda affärer`, color: "#4ade80" });

  const theirReviews = reviews.filter((r) => r.ownerUsername === username);
  if (theirReviews.length >= 3) {
    const avg = theirReviews.reduce((s, r) => s + r.rating, 0) / theirReviews.length;
    if (avg >= 4.5) badges.push({ label: "Topprankad", color: "#ffe94a" });
  }

  const createdAt = accounts[username]?.createdAt;
  if (createdAt) {
    const year = new Date(createdAt).getFullYear();
    badges.push({ label: `Medlem sedan ${year}`, color: "#8a7aa8" });
  }
  return badges;
}

// Klickbart användarnamn som öppnar profilvyn — samma stil används
// överallt ett namn syns, så det alltid är tydligt att det går att klicka.
function UserLink({ username, onOpen, className = "", style = {} }) {
  return (
    <button onClick={(e) => { e.stopPropagation(); onOpen(username); }}
      className={`underline decoration-dotted hover:opacity-80 ${className}`}
      style={{ ...style }}>
      {username}
    </button>
  );
}

function OwnerReviews({ owner, reviews, name, onAddReview, isOwner }) {
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const ownerReviews = reviews.filter((r) => r.ownerUsername === owner);
  const avg = ownerReviews.length ? (ownerReviews.reduce((s, r) => s + r.rating, 0) / ownerReviews.length) : 0;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAddReview({ id: "rev-" + Date.now(), ownerUsername: owner, reviewerUsername: name, rating, text: text.trim(), at: Date.now() });
    setText(""); setOpen(false);
  };

  return (
    <div className="border-t pt-3 mt-3" style={{ borderColor: "#33333a" }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs" style={{ ...fontDisplay, fontSize: "13px", color: "#ffe94a" }}>
          <StarRow value={Math.round(avg)} />
          <span style={{ color: "#8a7aa8", fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px" }}>
            {ownerReviews.length > 0 ? `${avg.toFixed(1)} (${ownerReviews.length})` : "Inga recensioner än"}
          </span>
        </div>
        {!isOwner && name && !open && (
          <button onClick={() => setOpen(true)} className="text-[11px]" style={{ color: "#21e6ec", ...fontBody }}>Lämna recension</button>
        )}
      </div>
      {open && (
        <div className="rounded-lg p-2 space-y-2 mb-2" style={{ background: "#121214", border: "1px solid #33333a" }}>
          <StarRow value={rating} onChange={setRating} />
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="Hur var uthyrningen?"
            className="w-full px-2 py-1.5 rounded-md outline-none text-xs resize-none" style={{ background: "#1c1c20", border: "1px solid #33333a", color: "#f3eefc", ...fontBody }} />
          <button type="button" onClick={submit} className="w-full py-1.5 rounded-md text-xs" style={{ background: "#21e6ec", color: "#121214", ...fontDisplay }}>SKICKA</button>
        </div>
      )}
      {ownerReviews.length > 0 && (
        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
          {ownerReviews.slice().reverse().map((r) => (
            <div key={r.id} className="text-[11px] rounded-md p-1.5" style={{ background: "#121214", ...fontBody }}>
              <div className="flex items-center justify-between">
                <span style={{ color: "#f3eefc" }}>{r.reviewerUsername}</span>
                <StarRow value={r.rating} size={10} />
              </div>
              <div style={{ color: "#8a7aa8" }}>{r.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- admin ----------
function AdminPanel({ listings, accounts, reviews, rentals, threads, onDeleteListing, onDeleteReview, onToggleVerified, onToggleBanned }) {
  const [section, setSection] = useState("listings");
  const sections = [
    { id: "listings", label: `Titlar (${listings.length})` },
    { id: "accounts", label: `Konton (${Object.keys(accounts).length})` },
    { id: "reviews", label: `Recensioner (${reviews.length})` },
    { id: "rentals", label: `Uthyrningar (${rentals.length})` },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-4" style={{ ...fontDisplay, color: "#ffe94a" }}>
        <Crown size={18} /> <h2 className="text-2xl">Adminpanel</h2>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap text-xs" style={fontBody}>
        {sections.map((s) => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className="px-3 py-1.5 rounded-full border"
            style={{
              borderColor: section === s.id ? "#ffe94a" : "#33333a",
              color: section === s.id ? "#ffe94a" : "#8a7aa8",
              background: section === s.id ? "#ffe94a1a" : "transparent",
            }}>
            {s.label}
          </button>
        ))}
      </div>

      {section === "listings" && (
        <div className="space-y-2">
          {listings.length === 0 && <p className="text-xs" style={{ color: "#6d5d8a" }}>Inga titlar uppe.</p>}
          {listings.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs" style={{ background: "#1c1c20", border: "1px solid #33333a", ...fontBody }}>
              <div>
                <div style={{ color: "#f3eefc" }}>{item.title}</div>
                <div style={{ color: "#8a7aa8" }}>{item.genre} · hos {item.owner} · {item.price} kr/dag</div>
              </div>
              <button onClick={() => onDeleteListing(item)} className="flex items-center gap-1 shrink-0" style={{ color: "#ff8a8a" }}>
                <Trash2 size={13} /> Ta bort
              </button>
            </div>
          ))}
        </div>
      )}

      {section === "accounts" && (
        <div className="space-y-2">
          {Object.keys(accounts).length === 0 && <p className="text-xs" style={{ color: "#6d5d8a" }}>Inga registrerade konton.</p>}
          {Object.entries(accounts).map(([u, acc]) => (
            <div key={u} className="flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs flex-wrap" style={{ background: "#1c1c20", border: "1px solid #33333a", ...fontBody }}>
              <div className="flex items-center gap-1.5" style={{ color: "#f3eefc" }}>
                {u}
                {acc.isAdmin && <Crown size={12} style={{ color: "#ffe94a" }} />}
                {acc.verified && <ShieldCheck size={12} style={{ color: "#4ade80" }} />}
                {acc.banned && <span style={{ color: "#ff8a8a" }}>(spärrad)</span>}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => onToggleVerified(u)} style={{ color: acc.verified ? "#8a7aa8" : "#4ade80" }}>
                  {acc.verified ? "Avverifiera" : "Verifiera"}
                </button>
                {!acc.isAdmin && (
                  <button onClick={() => onToggleBanned(u)} className="flex items-center gap-1" style={{ color: acc.banned ? "#4ade80" : "#ff8a8a" }}>
                    <Ban size={12} /> {acc.banned ? "Häv spärr" : "Spärra"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "reviews" && (
        <div className="space-y-2">
          {reviews.length === 0 && <p className="text-xs" style={{ color: "#6d5d8a" }}>Inga recensioner ännu.</p>}
          {reviews.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg p-2.5 text-xs" style={{ background: "#1c1c20", border: "1px solid #33333a", ...fontBody }}>
              <div>
                <div style={{ color: "#f3eefc" }}>{r.reviewerUsername} → {r.ownerUsername} <StarRow value={r.rating} size={10} /></div>
                <div style={{ color: "#8a7aa8" }}>{r.text}</div>
              </div>
              <button onClick={() => onDeleteReview(r.id)} className="shrink-0" style={{ color: "#ff8a8a" }}><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}

      {section === "rentals" && (
        <div className="space-y-2">
          {rentals.length === 0 && <p className="text-xs" style={{ color: "#6d5d8a" }}>Inga uthyrningar ännu.</p>}
          {rentals.map((r) => {
            const item = listings.find((l) => l.id === r.itemId);
            return (
              <div key={r.id} className="rounded-lg p-2.5 text-xs" style={{ background: "#1c1c20", border: "1px solid #33333a", ...fontBody }}>
                <div style={{ color: "#f3eefc" }}>{item?.title || "(borttagen titel)"}</div>
                <div style={{ color: "#8a7aa8" }}>
                  {r.renterName} hyr av {r.ownerName} · {r.days} {r.days === 1 ? "dag" : "dagar"} · {r.returned ? "återlämnad" : "aktiv"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- browse ----------
function iconFor(type) {
  return type === "game" ? Gamepad2 : Film;
}

// Liten ikon som visar exakt fysiskt format — VHS, skiva eller spelkonsol —
// så man ser det på en blick utan att behöva läsa texten.
function formatIcon(item) {
  if (item.type === "game") return Gamepad2;
  if (item.format === "VHS") return Rewind;
  return Disc; // DVD, Blu-ray, 4K Blu-ray
}

function Cassette({ item, onOpen, isFavorite, onToggleFavorite }) {
  const color = GENRE_COLORS[item.genre] || "#21e6ec";
  const Icon = iconFor(item.type);
  const FormatIcon = formatIcon(item);
  return (
    <div onClick={() => onOpen(item)} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") onOpen(item); }}
      className="rw-card text-left rounded-xl overflow-hidden border transition-transform duration-200 group cursor-pointer"
      style={{ borderColor: "#33333a", background: "#1c1c20" }}>
      <div className="h-28 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}22, #121214 80%)` }}>
        <div className="absolute left-0 top-0 bottom-0 w-1 z-10" style={{ background: color }} />
        {onToggleFavorite && (
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className="absolute top-2 left-2 z-10 rounded-full p-1.5" style={{ background: "rgba(10,6,18,0.75)" }}
            title={isFavorite ? "Ta bort från favoriter" : "Lägg till i favoriter"}>
            <Heart size={13} fill={isFavorite ? "#ff2fb0" : "none"} style={{ color: isFavorite ? "#ff2fb0" : "#fff" }} />
          </button>
        )}
        {item.format && (
          <div className="absolute top-2 right-2 z-10 rounded-full p-1.5" style={{ background: "rgba(10,6,18,0.75)", border: `1px solid ${color}66` }} title={item.format}>
            <FormatIcon size={13} style={{ color }} />
          </div>
        )}
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Icon size={34} style={{ color }} className="group-hover:scale-110 transition-transform" />
        )}
        {item.sold && (
          <div className="absolute inset-0 z-20 flex items-center justify-center" style={{ background: "rgba(10,6,18,0.7)" }}>
            <span className="px-3 py-1 rounded-full text-xs" style={{ ...fontDisplay, background: "#33333a", color: "#f3eefc" }}>SÅLD</span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-base leading-tight" style={{ ...fontDisplay, color: "#f3eefc" }}>{item.title}</h3>
        <div className="flex items-center justify-between mt-2 text-xs" style={fontBody}>
          <span style={{ color }}>{item.genre}{item.format ? ` · ${item.format}` : ""}</span>
          <span style={{ color: "#ffe94a" }}>
            {item.rentable ? `${item.price} kr/dag` : item.forSale && item.salePrice ? `${item.salePrice} kr` : item.forSale ? "Köp" : item.tradeable ? "Byte" : "I hyllan"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1 text-[11px]" style={{ color: "#8a7aa8" }}>
          <span className="flex items-center gap-1">
            {item.delivery === "pickup" ? <Home size={11} /> : item.delivery === "ship" ? <Truck size={11} /> : <><Home size={11} /><Truck size={11} /></>}
            {item.delivery === "both" ? "Hämta/frakt" : item.delivery === "ship" ? "Frakt" : "Hämtas"}
          </span>
          {item.forSale && <span className="flex items-center gap-1" style={{ color: "#4ade80" }}><Tag size={10} /> säljbar</span>}
          {item.tradeable && <span className="flex items-center gap-1" style={{ color: "#8b5cf6" }}><Repeat size={10} /> byte</span>}
        </div>
      </div>
    </div>
  );
}

// Visar bytets status och rätt knappar beroende på om man är ägare eller
// den som föreslog bytet — allt spårbart i appen, ingen fri text krävs
// för att gå vidare i processen.
function TradeStatusBar({ thread, myName, onApprove, onReject, onComplete }) {
  const isOwner = thread.owner === myName;
  const isBuyer = thread.buyerName === myName;
  const myConfirmed = isOwner ? thread.ownerConfirmed : thread.buyerConfirmed;
  const otherConfirmed = isOwner ? thread.buyerConfirmed : thread.ownerConfirmed;

  const statusLabel = {
    pending: "Väntar på svar",
    approved: "Godkänt — väntar på att bytet genomförs",
    rejected: "Nekat",
    completed: "Bytet genomfört ✓",
  }[thread.status];

  const statusColor = { pending: "#ffe94a", approved: "#21e6ec", rejected: "#ff8a8a", completed: "#4ade80" }[thread.status];

  return (
    <div className="rounded-lg p-3 mb-2 text-xs" style={{ background: statusColor + "15", border: `1px solid ${statusColor}44`, ...fontBody }}>
      <div className="flex items-center justify-between mb-1">
        <span style={{ color: statusColor }}>{statusLabel}</span>
      </div>

      {thread.status === "pending" && isOwner && (
        <div className="flex gap-2 mt-2">
          <button onClick={() => onApprove(thread.id)} className="flex-1 py-1.5 rounded-md" style={{ background: "#4ade80", color: "#121214", ...fontDisplay, fontSize: "13px" }}>
            GODKÄNN
          </button>
          <button onClick={() => onReject(thread.id)} className="flex-1 py-1.5 rounded-md" style={{ background: "#33333a", color: "#ff8a8a", ...fontDisplay, fontSize: "13px" }}>
            NEKA
          </button>
        </div>
      )}
      {thread.status === "pending" && !isOwner && (
        <p style={{ color: "#8a7aa8" }}>Väntar på att ägaren godkänner eller nekar bytet.</p>
      )}

      {thread.status === "approved" && (isOwner || isBuyer) && (
        myConfirmed ? (
          <p style={{ color: "#8a7aa8" }}>Du har markerat bytet som genomfört. Väntar på {isOwner ? thread.buyerName : thread.owner}.</p>
        ) : (
          <button onClick={() => onComplete(thread.id)} className="w-full py-1.5 rounded-md mt-1" style={{ background: "#21e6ec", color: "#121214", ...fontDisplay, fontSize: "13px" }}>
            MARKERA SOM GENOMFÖRT
          </button>
        )
      )}
      {thread.status === "completed" && (
        <p style={{ color: "#8a7aa8" }}>Bekräftat av båda parter. Ni kan nu lämna recensioner till varandra.</p>
      )}
    </div>
  );
}

// ---------- shelf (hylla) ----------
// En rygg som står tätt packad bredvid andra ryggar, precis som i en
// riktig videobutik/samlarhylla. Klick "drar ut" den — den breddas och
// visar omslaget innan detaljvyn öppnas.
function ShelfSpine({ item, onOpen, isFavorite, onToggleFavorite }) {
  const [pulled, setPulled] = useState(false);
  const color = GENRE_COLORS[item.genre] || "#21e6ec";
  const Icon = iconFor(item.type);
  const FormatIcon = formatIcon(item);

  const toggle = () => setPulled((p) => !p);

  return (
    <div
      onClick={toggle} role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") toggle(); }}
      className="relative cursor-pointer shrink-0 group"
      style={{
        width: pulled ? 168 : 46,
        height: 220,
        transition: "width 0.42s cubic-bezier(0.34, 1.2, 0.64, 1)",
        transform: pulled ? "translateY(-14px)" : "translateY(0)",
        zIndex: pulled ? 20 : 1,
        filter: pulled ? "drop-shadow(0 14px 16px rgba(0,0,0,0.5))" : "none",
      }}>
      {/* Ryggens etikett — synlig hela tiden, tonas bort när utdragen */}
      <div className="absolute inset-0 flex flex-col items-center justify-between py-4 overflow-hidden rounded-[2px]"
        style={{ background: color, opacity: pulled ? 0 : 1, transition: "opacity 0.25s" }}>
        <FormatIcon size={15} style={{ color: "#121214" }} />
        <span className="text-[10px] uppercase tracking-wider text-center px-0.5" style={{ ...fontDisplay, color: "#121214", writingMode: "vertical-rl" }}>
          {item.title.length > 26 ? item.title.slice(0, 26) + "…" : item.title}
        </span>
        <div className="w-3.5 h-3.5 rounded-full" style={{ background: "#12121466" }} />
      </div>

      {/* Omslaget — tonas fram när utdragen */}
      <div className="absolute inset-0 overflow-hidden rounded-[2px] flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${color}33, #121214 85%)`, opacity: pulled ? 1 : 0, transition: "opacity 0.25s 0.15s" }}>
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: color }} />
        {item.imageUrl ? (
          <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <Icon size={42} style={{ color }} />
        )}
        {onToggleFavorite && (
          <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className="absolute top-2 left-2 rounded-full p-1.5" style={{ background: "rgba(10,6,18,0.75)" }}>
            <Heart size={13} fill={isFavorite ? "#ff2fb0" : "none"} style={{ color: isFavorite ? "#ff2fb0" : "#fff" }} />
          </button>
        )}
        {pulled && (
          <>
            <button onClick={(e) => { e.stopPropagation(); onOpen(item); }}
              className="absolute top-2 right-2 rounded-full p-1.5" style={{ background: "rgba(10,6,18,0.75)" }} title="Visa info">
              <MoreVertical size={14} style={{ color: "#fff" }} />
            </button>
            {item.format && (
              <span className="absolute top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] whitespace-nowrap"
                style={{ ...fontDisplay, background: "rgba(10,6,18,0.8)", color, border: `1px solid ${color}66` }}>
                {item.format}
              </span>
            )}
            <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 text-[10px] truncate" style={{ background: "rgba(10,6,18,0.75)", color: "#f3eefc", ...fontBody }}>
              {item.title}
            </div>
          </>
        )}
      </div>
      {item.sold && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(10,6,18,0.7)" }}>
          <span className="text-[10px]" style={{ ...fontDisplay, color: "#f3eefc" }}>SÅLD</span>
        </div>
      )}
      {!pulled && (
        <div className="absolute inset-0 rounded-[2px] transition-opacity opacity-0 group-hover:opacity-100" style={{ background: "#ffffff12" }} />
      )}
    </div>
  );
}

// Hela hyllan — täta ryggar som står på en hyllkant, precis som i en
// riktig videobutik. Radbryter naturligt om man har många titlar.
function ShelfRow({ label, items, onOpen, favorites, onToggleFavorite }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6 last:mb-0">
      <div className="flex items-center gap-2 mb-2 px-1">
        <div className="h-px flex-1" style={{ background: "#ffffff12" }} />
        <span className="text-[11px] uppercase tracking-[0.15em]" style={{ ...fontDisplay, color: "#e8b45c" }}>{label}</span>
        <div className="h-px flex-1" style={{ background: "#ffffff12" }} />
      </div>
      <div className="flex items-end gap-[3px] flex-wrap pb-0 px-1">
        {items.map((item) => (
          <ShelfSpine key={item.id} item={item} onOpen={onOpen} isFavorite={favorites.includes(item.id)} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
      {/* Hyllplanet */}
      <div className="h-4 mt-0 rounded-b-md" style={{ background: "linear-gradient(180deg, #4a3220, #241608)", boxShadow: "0 6px 12px rgba(0,0,0,0.5)" }} />
    </div>
  );
}

function Shelf({ items, onOpen, favorites, onToggleFavorite }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-14 text-xs" style={{ color: "#6d5d8a", ...fontBody }}>
        <Sparkles className="mx-auto mb-3" size={26} />
        Hyllan är tom — lägg upp en titel och kryssa i "Bara i min hylla".
      </div>
    );
  }

  const movies = items.filter((i) => i.type !== "game");
  const games = items.filter((i) => i.type === "game");

  return (
    <div className="rounded-xl p-6 pt-8 overflow-x-auto relative" style={{
      background: "radial-gradient(ellipse at 50% 0%, #3a2a1a55 0%, #241a12 45%, #17110c 100%)",
      border: "1px solid #4a3220",
      boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)",
    }}>
      {/* Varmt ljussken uppifrån — som en lampa i ett vardagsrum */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{ width: 320, height: 160, background: "radial-gradient(ellipse, #ffb02a22 0%, transparent 70%)" }} />

      <div className="relative">
        <ShelfRow label="Filmer" items={movies} onOpen={onOpen} favorites={favorites} onToggleFavorite={onToggleFavorite} />
        <ShelfRow label="TV-spel" items={games} onOpen={onOpen} favorites={favorites} onToggleFavorite={onToggleFavorite} />
      </div>
      <div className="h-2" />

    </div>
  );
}

function ChatThread({ thread, myName, onReply }) {
  const [text, setText] = useState("");
  const inputStyle = { background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody };

  const send = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onReply(thread.id, myName, text.trim());
    setText("");
  };

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "#121214", border: "1px solid #4ade8044" }}>
      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        {thread.messages.map((m, i) => (
          <div key={i} className="text-xs rounded-md px-2 py-1.5" style={{
            background: m.from === myName ? "#4ade8022" : "#33333a55",
            marginLeft: m.from === myName ? "20%" : 0,
            marginRight: m.from === myName ? 0 : "20%",
          }}>
            <div style={{ color: m.from === myName ? "#4ade80" : "#ffe94a", fontSize: "10px" }}>{m.from}</div>
            <div style={{ color: "#f3eefc" }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Skriv ett svar…"
          onKeyDown={(e) => { if (e.key === "Enter") send(e); }}
          className="flex-1 px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
        <button type="button" onClick={send} className="px-3 rounded-md" style={{ background: "#4ade80", color: "#121214" }}>
          <Send size={14} />
        </button>
      </div>
    </div>
  );
}

function RentFlow({ item, alreadyRented, activeRental, name, onConfirm }) {
  const [deliveryChoice, setDeliveryChoice] = useState(item.delivery === "ship" ? "ship" : "pickup");
  const [days, setDays] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const shipCost = deliveryChoice === "ship" ? (item.shippingPrice || 0) : 0;
  const safeDays = Math.max(1, Number(days) || 1);
  const rentCost = item.price * safeDays;
  const total = rentCost + shipCost;

  if (alreadyRented) {
    const mine = activeRental && activeRental.renterName === name;
    return (
      <button disabled className="w-full py-2.5 rounded-lg text-sm opacity-50"
        style={{ ...fontDisplay, fontSize: "16px", background: "#332a44", color: "#fff" }}>
        {mine ? "REDAN HYRD AV DIG" : "REDAN UTHYRD"}
      </button>
    );
  }

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className="w-full py-2.5 rounded-lg text-sm"
        style={{ ...fontDisplay, fontSize: "16px", background: "#ff2fb0", color: "#fff", boxShadow: "0 0 12px #ff2fb040" }}>
        HYR NU
      </button>
    );
  }

  return (
    <div className="rounded-lg p-3 space-y-3" style={{ background: "#121214", border: "1px solid #ff2fb044" }}>
      <div>
        <div className="text-[11px] mb-1.5" style={{ color: "#8a7aa8", ...fontBody }}>Antal dagar</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setDays((d) => Math.max(1, (Number(d) || 1) - 1))}
            className="w-8 h-8 rounded-md text-sm" style={{ background: "#33333a", color: "#f3eefc" }}>−</button>
          <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)}
            className="w-16 text-center py-1.5 rounded-md outline-none text-sm"
            style={{ background: "#1c1c20", border: "1px solid #33333a", color: "#f3eefc", ...fontBody }} />
          <button type="button" onClick={() => setDays((d) => (Number(d) || 1) + 1)}
            className="w-8 h-8 rounded-md text-sm" style={{ background: "#33333a", color: "#f3eefc" }}>+</button>
        </div>
      </div>

      {item.delivery === "both" && (
        <div>
          <div className="text-[11px] mb-1.5" style={{ color: "#8a7aa8", ...fontBody }}>Hur vill du få den?</div>
          <div className="flex gap-2">
            <button onClick={() => setDeliveryChoice("pickup")}
              className="flex-1 py-2 rounded-md text-xs flex items-center justify-center gap-1.5"
              style={{ background: deliveryChoice === "pickup" ? "#ff2fb022" : "transparent", border: `1px solid ${deliveryChoice === "pickup" ? "#ff2fb0" : "#33333a"}`, color: deliveryChoice === "pickup" ? "#ff2fb0" : "#8a7aa8" }}>
              <Home size={13} /> Hämta (gratis)
            </button>
            <button onClick={() => setDeliveryChoice("ship")}
              className="flex-1 py-2 rounded-md text-xs flex items-center justify-center gap-1.5"
              style={{ background: deliveryChoice === "ship" ? "#ff2fb022" : "transparent", border: `1px solid ${deliveryChoice === "ship" ? "#ff2fb0" : "#33333a"}`, color: deliveryChoice === "ship" ? "#ff2fb0" : "#8a7aa8" }}>
              <Truck size={13} /> Skicka (+{item.shippingPrice} kr)
            </button>
          </div>
        </div>
      )}
      {item.delivery !== "both" && (
        <div className="text-xs flex items-center gap-1.5" style={{ color: "#8a7aa8", ...fontBody }}>
          {item.delivery === "ship" ? <Truck size={13} /> : <Home size={13} />}
          {item.delivery === "ship" ? `Skickas (+${item.shippingPrice} kr)` : "Hämtas hos ägaren"}
        </div>
      )}

      <div className="text-xs space-y-1" style={fontBody}>
        <div className="flex justify-between" style={{ color: "#c9b8e0" }}>
          <span>Hyra ({item.price} kr × {safeDays} {safeDays === 1 ? "dag" : "dagar"})</span><span>{rentCost} kr</span>
        </div>
        {shipCost > 0 && (
          <div className="flex justify-between" style={{ color: "#c9b8e0" }}>
            <span>Frakt</span><span>{shipCost} kr</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t" style={{ borderColor: "#33333a", color: "#f3eefc" }}>
          <span>Att betala nu</span><span style={{ color: "#ffe94a" }}>{total} kr</span>
        </div>
      </div>

      <div className="flex items-start gap-1.5 text-[11px] rounded-md p-2" style={{ background: "#8b5cf615", color: "#c9b8e0", ...fontBody }}>
        <Shield size={13} className="shrink-0 mt-0.5" style={{ color: "#8b5cf6" }} />
        <span>Ersättningsvärde {item.replacementValue} kr hålls som deposition — dras vid skada eller om den inte lämnas tillbaka, återbetalas annars i sin helhet.</span>
      </div>

      <button onClick={() => onConfirm(deliveryChoice, shipCost, safeDays, rentCost)}
        className="w-full py-2 rounded-md text-sm"
        style={{ ...fontDisplay, fontSize: "15px", background: "#ff2fb0", color: "#fff" }}>
        BEKRÄFTA HYRA · {total} KR
      </button>
    </div>
  );
}

function BuyFlow({ item, alreadySold, name, onConfirm }) {
  const [deliveryChoice, setDeliveryChoice] = useState(item.delivery === "ship" ? "ship" : "pickup");
  const [expanded, setExpanded] = useState(false);

  const shipCost = deliveryChoice === "ship" ? (item.shippingPrice || 0) : 0;
  const total = item.salePrice + shipCost;

  if (alreadySold) {
    return (
      <button disabled className="w-full py-2.5 rounded-lg text-sm opacity-50"
        style={{ ...fontDisplay, fontSize: "16px", background: "#332a44", color: "#fff" }}>
        SÅLD
      </button>
    );
  }

  if (!expanded) {
    return (
      <button onClick={() => setExpanded(true)}
        className="w-full py-2.5 rounded-lg text-sm"
        style={{ ...fontDisplay, fontSize: "16px", background: "#4ade80", color: "#121214" }}>
        KÖP NU · {item.salePrice} KR
      </button>
    );
  }

  return (
    <div className="rounded-lg p-3 space-y-3" style={{ background: "#121214", border: "1px solid #4ade8044" }}>
      {item.delivery === "both" && (
        <div>
          <div className="text-[11px] mb-1.5" style={{ color: "#8a7aa8", ...fontBody }}>Hur vill du få den?</div>
          <div className="flex gap-2">
            <button onClick={() => setDeliveryChoice("pickup")}
              className="flex-1 py-2 rounded-md text-xs flex items-center justify-center gap-1.5"
              style={{ background: deliveryChoice === "pickup" ? "#4ade8022" : "transparent", border: `1px solid ${deliveryChoice === "pickup" ? "#4ade80" : "#33333a"}`, color: deliveryChoice === "pickup" ? "#4ade80" : "#8a7aa8" }}>
              <Home size={13} /> Hämta (gratis)
            </button>
            <button onClick={() => setDeliveryChoice("ship")}
              className="flex-1 py-2 rounded-md text-xs flex items-center justify-center gap-1.5"
              style={{ background: deliveryChoice === "ship" ? "#4ade8022" : "transparent", border: `1px solid ${deliveryChoice === "ship" ? "#4ade80" : "#33333a"}`, color: deliveryChoice === "ship" ? "#4ade80" : "#8a7aa8" }}>
              <Truck size={13} /> Skicka (+{item.shippingPrice} kr)
            </button>
          </div>
        </div>
      )}
      {item.delivery !== "both" && (
        <div className="text-xs flex items-center gap-1.5" style={{ color: "#8a7aa8", ...fontBody }}>
          {item.delivery === "ship" ? <Truck size={13} /> : <Home size={13} />}
          {item.delivery === "ship" ? `Skickas (+${item.shippingPrice} kr)` : "Hämtas hos säljaren"}
        </div>
      )}
      <div className="text-xs space-y-1" style={fontBody}>
        <div className="flex justify-between" style={{ color: "#c9b8e0" }}>
          <span>Pris</span><span>{item.salePrice} kr</span>
        </div>
        {shipCost > 0 && (
          <div className="flex justify-between" style={{ color: "#c9b8e0" }}>
            <span>Frakt</span><span>{shipCost} kr</span>
          </div>
        )}
        <div className="flex justify-between pt-1 border-t" style={{ borderColor: "#33333a", color: "#f3eefc" }}>
          <span>Att betala nu</span><span style={{ color: "#4ade80" }}>{total} kr</span>
        </div>
      </div>
      <button onClick={() => onConfirm(deliveryChoice, shipCost)}
        className="w-full py-2 rounded-md text-sm"
        style={{ ...fontDisplay, fontSize: "15px", background: "#4ade80", color: "#121214" }}>
        BEKRÄFTA KÖP · {total} KR
      </button>
    </div>
  );
}

function TradeFlow({ item, myItems, onPropose }) {
  const [open, setOpen] = useState(false);
  const [offeredId, setOfferedId] = useState(myItems[0]?.id || "");
  const [tradeType, setTradeType] = useState("temporary");
  const [days, setDays] = useState(7);
  const [message, setMessage] = useState("");
  const inputStyle = { background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
        style={{ ...fontDisplay, fontSize: "15px", background: "transparent", border: "1px solid #8b5cf666", color: "#8b5cf6" }}>
        <Repeat size={15} /> FÖRESLÅ BYTE
      </button>
    );
  }

  if (myItems.length === 0) {
    return (
      <div className="text-xs rounded-lg p-3" style={{ background: "#8b5cf615", color: "#c9b8e0", ...fontBody }}>
        Du behöver lägga upp minst en egen titel innan du kan föreslå ett byte.
      </div>
    );
  }

  const submit = (e) => {
    e.preventDefault();
    const offered = myItems.find((m) => m.id === offeredId);
    if (!offered) return;
    onPropose(offered, tradeType, tradeType === "temporary" ? Number(days) || 1 : null, message.trim());
    setOpen(false);
    setMessage("");
  };

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "#121214", border: "1px solid #8b5cf644" }}>
      <div>
        <label className="text-[11px]" style={{ color: "#8a7aa8" }}>Din titel att erbjuda</label>
        <select value={offeredId} onChange={(e) => setOfferedId(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md outline-none text-sm" style={inputStyle}>
          {myItems.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => setTradeType("temporary")}
          className="flex-1 py-1.5 rounded-md text-xs"
          style={{ background: tradeType === "temporary" ? "#8b5cf622" : "transparent", border: `1px solid ${tradeType === "temporary" ? "#8b5cf6" : "#33333a"}`, color: tradeType === "temporary" ? "#8b5cf6" : "#8a7aa8" }}>
          Tillfälligt
        </button>
        <button type="button" onClick={() => setTradeType("permanent")}
          className="flex-1 py-1.5 rounded-md text-xs"
          style={{ background: tradeType === "permanent" ? "#8b5cf622" : "transparent", border: `1px solid ${tradeType === "permanent" ? "#8b5cf6" : "#33333a"}`, color: tradeType === "permanent" ? "#8b5cf6" : "#8a7aa8" }}>
          Permanent
        </button>
      </div>
      {tradeType === "temporary" && (
        <div>
          <label className="text-[11px]" style={{ color: "#8a7aa8" }}>Antal dagar innan bytet byts tillbaka</label>
          <input type="number" min="1" value={days} onChange={(e) => setDays(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md outline-none text-sm" style={inputStyle} />
        </div>
      )}
      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Valfritt meddelande…"
        className="w-full px-3 py-2 rounded-md outline-none text-sm resize-none" style={inputStyle} />
      <div className="text-[11px]" style={{ color: "#6d5d8a" }}>Byten har lägre avgift ({TRADE_FEE_PCT}%) än vanlig hyra ({RENT_FEE_PCT}%).</div>
      <button type="button" onClick={submit} className="w-full py-2 rounded-md text-sm flex items-center justify-center gap-2"
        style={{ ...fontDisplay, fontSize: "14px", background: "#8b5cf6", color: "#fff" }}>
        <Repeat size={14} /> SKICKA BYTESFÖRSLAG
      </button>
    </div>
  );
}

function ItemModal({ item, onClose, onRent, onPurchase, onRemove, onEdit, onOpenProfile, alreadyRented, activeRental, onReturnRental, isOwner, name, threads, onStartThread, onReply, onApproveTrade, onRejectTrade, onCompleteTrade, myItems, onProposeTrade, reviews, onAddReview, accounts }) {
  const [askOpen, setAskOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [openThreadId, setOpenThreadId] = useState(null);

  useEffect(() => { setAskOpen(false); setMessage(""); setOpenThreadId(null); }, [item]);

  if (!item) return null;
  const color = GENRE_COLORS[item.genre] || "#21e6ec";
  const Icon = iconFor(item.type);
  const inputStyle = { background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody };

  const itemThreads = threads.filter((t) => t.itemId === item.id);
  const myThread = itemThreads.find((t) => t.buyerName === name);

  const submitAsk = (e) => {
    e.preventDefault();
    if (!name || !message.trim()) return;
    onStartThread(item, name, message.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,2,12,0.8)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border overflow-hidden max-h-[90vh] overflow-y-auto" style={{ borderColor: color + "66", background: "#1c1c20" }} onClick={(e) => e.stopPropagation()}>
        <div className="h-32 flex items-center justify-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${color}33, #121214 85%)` }}>
          {item.format && (
            <div className="absolute top-3 left-3 z-10 rounded-full p-1.5 flex items-center gap-1" style={{ background: "rgba(10,6,18,0.75)", border: `1px solid ${color}66` }}>
              {React.createElement(formatIcon(item), { size: 13, style: { color } })}
            </div>
          )}
          {item.imageUrl ? (
            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
          ) : (
            <Icon size={44} style={{ color }} />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 text-white/60 hover:text-white z-10" style={{ background: item.imageUrl ? "rgba(0,0,0,0.4)" : "transparent", borderRadius: "9999px", padding: 4 }}><X size={20} /></button>
        </div>
        <div className="p-5" style={fontBody}>
          <h2 className="text-2xl mb-1" style={{ ...fontDisplay, color: "#f3eefc" }}>{item.title}</h2>
          <div className="flex items-center gap-2 text-xs mb-3 flex-wrap" style={{ color }}>
            <span>{item.genre}</span>
            {item.format && <><span style={{ color: "#8a7aa8" }}>·</span><span>{item.format}</span></>}
            <span style={{ color: "#8a7aa8" }}>·</span>
            <span style={{ color: "#8a7aa8" }}>{item.type === "game" ? "TV-spel" : "Film"}</span>
            {item.forSale && <span className="flex items-center gap-1" style={{ color: "#4ade80" }}><Tag size={11} /> märkt säljbar av ägaren</span>}
          </div>
          <p className="text-sm mb-4" style={{ color: "#c9b8e0" }}>{item.note}</p>
          <div className="flex items-center justify-between text-sm mb-1" style={{ color: "#8a7aa8" }}>
            <span className="flex items-center gap-1">
              <User size={14} />
              <UserLink username={item.owner} onOpen={onOpenProfile} style={{ color: "#8a7aa8" }} />
              {accounts[item.owner]?.verified && <ShieldCheck size={13} style={{ color: "#4ade80" }} />}
            </span>
            <span style={{ color: "#ffe94a" }}>
              {item.rentable ? `${item.price} kr/dag` : item.forSale && item.salePrice ? `${item.salePrice} kr` : item.shelfOnly ? "I hyllan" : ""}
            </span>
          </div>
          <OwnerReviews owner={item.owner} reviews={reviews} name={name} onAddReview={onAddReview} isOwner={isOwner} />
          <div className="mt-4" />

          {isOwner ? (
            <>
              {activeRental && (
                <div className="rounded-lg p-3 mb-3 text-xs" style={{ background: "#ff2fb015", border: "1px solid #ff2fb044", color: "#c9b8e0" }}>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: "#ff2fb0" }}>
                    <Clock size={13} /> Uthyrd till <strong>{activeRental.renterName}</strong>
                  </div>
                  <div>Sedan {new Date(activeRental.rentedAt).toLocaleDateString("sv-SE")}, {activeRental.days} {activeRental.days === 1 ? "dag" : "dagar"}</div>
                  <button onClick={() => onReturnRental(activeRental.id)} className="mt-1.5 text-[11px]" style={{ color: "#21e6ec" }}>
                    Markera som återlämnad
                  </button>
                </div>
              )}
              <div className="flex gap-2 mb-4">
                <button onClick={() => onEdit(item)}
                  className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                  style={{ ...fontDisplay, fontSize: "16px", background: "transparent", border: "1px solid #21e6ec66", color: "#21e6ec" }}>
                  Redigera
                </button>
                <button onClick={() => onRemove(item)}
                  className="flex-1 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                  style={{ ...fontDisplay, fontSize: "16px", background: "#33333a", color: "#ff8a8a" }}>
                  <Trash2 size={16} /> TA BORT
                </button>
              </div>
              {itemThreads.length > 0 && (
                <div className="border-t pt-4" style={{ borderColor: "#33333a" }}>
                  <div className="flex items-center gap-2 text-xs mb-2" style={{ color: "#ffe94a", ...fontDisplay, fontSize: "13px" }}>
                    <Inbox size={14} /> FÖRFRÅGNINGAR & BYTEN ({itemThreads.length})
                  </div>
                  <div className="space-y-2">
                    {itemThreads.map((t) => (
                      <div key={t.id}>
                        <button onClick={() => setOpenThreadId(openThreadId === t.id ? null : t.id)}
                          className="w-full text-left text-xs rounded-lg p-2"
                          style={{ background: "#121214", border: "1px solid #33333a", color: "#f3eefc" }}>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              {t.kind === "trade" && <Repeat size={11} style={{ color: "#8b5cf6" }} />}
                              {t.buyerName}
                            </span>
                            <span style={{ color: "#8a7aa8" }}>{t.messages.length} meddelanden</span>
                          </div>
                          {t.kind === "trade" && (
                            <div className="mt-1" style={{ color: "#8b5cf6" }}>
                              Erbjuder: {t.offeredItemTitle} · {t.tradeType === "permanent" ? "permanent byte" : `tillfälligt, ${t.tradeDays} dagar`}
                            </div>
                          )}
                        </button>
                        {openThreadId === t.id && (
                          <div className="mt-2">
                            {t.kind === "trade" && (
                              <TradeStatusBar thread={t} myName={item.owner} onApprove={onApproveTrade} onReject={onRejectTrade} onComplete={onCompleteTrade} />
                            )}
                            <ChatThread thread={t} myName={item.owner} onReply={onReply} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : !name ? (
            <div className="text-xs rounded-lg p-3 text-center" style={{ background: "#21e6ec15", color: "#c9b8e0", ...fontBody }}>
              Logga in högst upp för att hyra, fråga om köp eller föreslå byte.
            </div>
          ) : (
            <div className="space-y-2">
              {item.rentable && (
                <RentFlow item={item} alreadyRented={alreadyRented} activeRental={activeRental} name={name} onConfirm={(delivery, shipCost, days, rentCost) => onRent(item, delivery, shipCost, days, rentCost)} />
              )}
              {item.forSale && item.salePrice && (
                <BuyFlow item={item} alreadySold={item.sold} name={name} onConfirm={(delivery, shipCost) => onPurchase(item, delivery, shipCost)} />
              )}

              {myThread ? (
                <div>
                  <div className="text-xs mb-1 flex items-center gap-1" style={{ color: myThread.kind === "trade" ? "#8b5cf6" : "#4ade80" }}>
                    {myThread.kind === "trade" ? <Repeat size={13} /> : <MessageCircle size={13} />}
                    Din konversation med {item.owner}
                    {myThread.kind === "trade" && ` — bytesförslag: ${myThread.offeredItemTitle} (${myThread.tradeType === "permanent" ? "permanent" : myThread.tradeDays + " dagar"})`}
                  </div>
                  {myThread.kind === "trade" && (
                    <TradeStatusBar thread={myThread} myName={name} onApprove={onApproveTrade} onReject={onRejectTrade} onComplete={onCompleteTrade} />
                  )}
                  <ChatThread thread={myThread} myName={name} onReply={onReply} />
                </div>
              ) : (
                <>
                  {!askOpen && !(item.forSale && item.salePrice) && (
                    <button onClick={() => setAskOpen(true)}
                      className="w-full py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
                      style={{ ...fontDisplay, fontSize: "15px", background: "transparent", border: "1px solid #4ade8066", color: "#4ade80" }}>
                      <MessageCircle size={15} /> FRÅGA OM ATT KÖPA LOSS
                    </button>
                  )}
                  {askOpen && (
                    <div className="rounded-lg p-3 space-y-2" style={{ background: "#121214", border: "1px solid #4ade8044" }}>
                      <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="t.ex. Hej! Vill du sälja den, och för hur mycket?"
                        className="w-full px-3 py-2 rounded-md outline-none text-sm resize-none" style={inputStyle} />
                      <button type="button" onClick={submitAsk} className="w-full py-2 rounded-md text-sm flex items-center justify-center gap-2"
                        style={{ ...fontDisplay, fontSize: "14px", background: "#4ade80", color: "#121214" }}>
                        <Send size={14} /> SKICKA FÖRFRÅGAN
                      </button>
                    </div>
                  )}
                  {item.tradeable && !askOpen && (
                    <TradeFlow item={item} myItems={myItems} onPropose={(offered, tradeType, days, msg) => onProposeTrade(item, offered, tradeType, days, msg, name)} />
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------- list form ----------
function ListForm({ name, onAdd, onUpdate, editingItem, onCancelEdit }) {
  const [title, setTitle] = useState(editingItem?.title || "");
  const [type, setType] = useState(editingItem?.type || "movie");
  const [format, setFormat] = useState(editingItem?.format || FORMATS[1]);
  const [genre, setGenre] = useState(editingItem?.genre || GENRES[0]);
  const [price, setPrice] = useState(editingItem?.price || 15);
  const [note, setNote] = useState(editingItem?.note || "");
  const [forSale, setForSale] = useState(editingItem?.forSale || false);
  const [rentable, setRentable] = useState(editingItem ? editingItem.rentable : true);
  const [salePrice, setSalePrice] = useState(editingItem?.salePrice || "");
  const [delivery, setDelivery] = useState(editingItem?.delivery || "pickup");
  const [shippingPrice, setShippingPrice] = useState(editingItem?.shippingPrice || 35);
  const [replacementValue, setReplacementValue] = useState(editingItem?.replacementValue || 100);
  const [tradeable, setTradeable] = useState(editingItem?.tradeable || false);
  const [shelfOnly, setShelfOnly] = useState(editingItem?.shelfOnly || false);
  const [imageUrl, setImageUrl] = useState(editingItem?.imageUrl || null);
  const [imagePreview, setImagePreview] = useState(editingItem?.imageUrl || null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => { if (type === "game" && !PLATFORMS.includes(format)) setFormat(PLATFORMS[0]); if (type === "movie" && !FORMATS.includes(format)) setFormat(FORMATS[1]); }, [type]);

  const inputStyle = { background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody };

  // Krymper bilden till max 800px bredd/höjd och komprimerar som JPEG
  // innan uppladdning — håller lagringen liten och sidan snabb.
  const compressImage = (file) => new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = () => reject(new Error("Kunde inte läsa bilden"));
    img.onload = () => {
      const maxSize = 800;
      let { width, height } = img;
      if (width > height && width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
      else if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8);
    };
    img.onerror = () => reject(new Error("Filen är ingen giltig bild"));
    reader.readAsDataURL(file);
  });

  const handleImageSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      setImagePreview(URL.createObjectURL(compressed));
      const data = await api.uploadImage(compressed);
      setImageUrl(data.url);
    } catch (err) {
      setUploadError(err.message || "Kunde inte ladda upp bilden.");
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  };

  const [formError, setFormError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    setFormError("");
    if (!title.trim()) return setFormError("Titel krävs.");
    if (!name) return setFormError("Du måste vara inloggad.");
    if (!rentable && !forSale && !tradeable && !shelfOnly) return setFormError("Välj minst ett: hyra ut, sälja, byta, eller bara visa i hyllan.");
    const cleanPrice = Math.max(0, Number(price) || 0);
    const cleanShipping = Math.max(0, Number(shippingPrice) || 0);
    const cleanReplacement = Math.max(0, Number(replacementValue) || 0);
    if (rentable && cleanPrice === 0) return setFormError("Pris per dag måste vara högre än 0 kr när titeln kan hyras.");

    const payload = {
      title: title.trim(),
      type,
      format: format,
      genre,
      price: cleanPrice,
      owner: name,
      note: note.trim() || "Ingen extra info.",
      imageUrl,
      rentable,
      forSale,
      salePrice: forSale && salePrice ? Math.max(0, Number(salePrice) || 0) : null,
      shelfOnly,
      delivery,
      shippingPrice: delivery === "pickup" ? 0 : cleanShipping,
      replacementValue: cleanReplacement,
      tradeable,
    };

    if (editingItem) {
      onUpdate(editingItem.id, payload);
      return;
    }

    onAdd({ id: "item-" + Date.now(), ...payload });
    setTitle(""); setNote(""); setForSale(false); setTradeable(false); setRentable(true); setSalePrice("");
    setImageUrl(null); setImagePreview(null);
  };

  return (
    <div className="max-w-md mx-auto space-y-4 rounded-2xl border p-5" style={{ borderColor: "#33333a", background: "#1c1c20", ...fontBody }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-2xl" style={{ ...fontDisplay, color: "#ffe94a" }}>{editingItem ? "Redigera titel" : "Lägg upp en titel"}</h2>
        {editingItem && (
          <button type="button" onClick={onCancelEdit} className="text-xs" style={{ color: "#8a7aa8" }}>Avbryt</button>
        )}
      </div>

      <div>
        <label className="text-xs" style={{ color: "#8a7aa8" }}>Omslagsbild (valfritt)</label>
        <label className="mt-1 flex items-center justify-center gap-2 rounded-md border border-dashed cursor-pointer py-3 text-xs"
          style={{ borderColor: "#33333a", color: uploading ? "#8a7aa8" : "#21e6ec" }}>
          <input type="file" accept="image/*" className="hidden" onChange={handleImageSelect} disabled={uploading} />
          {uploading ? "Laddar upp…" : imagePreview ? "Byt bild" : "Välj eller ta en bild"}
        </label>
        {imagePreview && (
          <div className="mt-2 relative">
            <img src={imagePreview} alt="Förhandsvisning" className="w-full h-32 object-cover rounded-md" />
            <button type="button" onClick={() => { setImageUrl(null); setImagePreview(null); }}
              className="absolute top-2 right-2 rounded-full p-1.5 flex items-center gap-1 text-[11px]"
              style={{ background: "rgba(10,6,18,0.8)", color: "#ff8a8a" }}>
              <X size={13} /> Ta bort bild
            </button>
          </div>
        )}
        {uploadError && <p className="text-[11px] mt-1" style={{ color: "#ff8a8a" }}>{uploadError}</p>}
      </div>

      <div>
        <label className="text-xs" style={{ color: "#8a7aa8" }}>Titel</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)}
          className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle} placeholder="Filmens eller spelets namn" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Typ</label>
          <select value={type} onChange={(e) => setType(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle}>
            <option value="movie">Film</option>
            <option value="game">TV-spel</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Genre</label>
          <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle}>
            {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>
      {(type === "movie" || type === "game") && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>{type === "game" ? "Plattform" : "Format"}</label>
          <select value={format} onChange={(e) => setFormat(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle}>
            {(type === "game" ? PLATFORMS : FORMATS).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          {type === "movie" && <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>Ungefärligt pris för {format}: {FORMAT_PRICE_HINT[format]}</p>}
        </div>
      )}

      <div>
        <label className="text-xs" style={{ color: "#8a7aa8" }}>Vad vill du göra med titeln?</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setShelfOnly(false)}
            className="py-2 rounded-md text-xs"
            style={{ background: !shelfOnly ? "#21e6ec22" : "transparent", border: `1px solid ${!shelfOnly ? "#21e6ec" : "#33333a"}`, color: !shelfOnly ? "#21e6ec" : "#8a7aa8" }}>
            Erbjuda på marknaden
          </button>
          <button type="button" onClick={() => { setShelfOnly(true); setRentable(false); setForSale(false); setTradeable(false); }}
            className="py-2 rounded-md text-xs"
            style={{ background: shelfOnly ? "#8b5cf622" : "transparent", border: `1px solid ${shelfOnly ? "#8b5cf6" : "#33333a"}`, color: shelfOnly ? "#8b5cf6" : "#8a7aa8" }}>
            Bara i min hylla
          </button>
        </div>
        {shelfOnly && (
          <p className="text-[11px] mt-2" style={{ color: "#6d5d8a" }}>
            Titeln visas bara som prydnad på din profilhylla — ingen hyra, köp eller byte. Andra kan fortfarande fråga om att köpa loss den.
          </p>
        )}
      </div>

      {!shelfOnly && (
        <div>
          <div className="mt-1.5 space-y-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#c9b8e0" }}>
              <input type="checkbox" checked={rentable} onChange={(e) => setRentable(e.target.checked)} />
              Hyra ut (pris per dag)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#c9b8e0" }}>
              <input type="checkbox" checked={forSale} onChange={(e) => setForSale(e.target.checked)} />
              Till försäljning (köpa loss)
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: "#c9b8e0" }}>
              <input type="checkbox" checked={tradeable} onChange={(e) => setTradeable(e.target.checked)} />
              Öppen för byte — lägre avgift ({TRADE_FEE_PCT}% mot {RENT_FEE_PCT}% för hyra)
            </label>
          </div>
        </div>
      )}

      {rentable && !shelfOnly && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Pris per dag (kr)</label>
          <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle} />
          <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>
            Rewindr tar {RENT_FEE_PCT}% i avgift — du får ca{" "}
            <strong style={{ color: "#c9b8e0" }}>{Math.round((Number(price) || 0) * (1 - RENT_FEE_PCT / 100))} kr/dag</strong>.
          </p>
        </div>
      )}
      {forSale && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Säljpris (kr, valfritt)</label>
          <input type="number" min="0" value={salePrice} onChange={(e) => setSalePrice(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle} placeholder="Lämna tomt om ni vill komma överens i chatten" />
          {salePrice ? (
            <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>
              Rewindr tar {BUY_FEE_PCT}% i avgift — du får ca{" "}
              <strong style={{ color: "#c9b8e0" }}>{Math.round((Number(salePrice) || 0) * (1 - BUY_FEE_PCT / 100))} kr</strong>.
            </p>
          ) : (
            <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>Om ni sätter ett pris här tar Rewindr {BUY_FEE_PCT}% i avgift vid köp.</p>
          )}
        </div>
      )}
      <div>
        <label className="text-xs" style={{ color: "#8a7aa8" }}>Skick / anteckning</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
          className="w-full mt-1 px-3 py-2 rounded-md outline-none resize-none" style={inputStyle} placeholder="t.ex. VHS, lite repig men spelbar" />
      </div>
      {!shelfOnly && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Leverans</label>
          <select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle}>
            <option value="pickup">Endast hämtning</option>
            <option value="ship">Endast frakt</option>
            <option value="both">Hämtning eller frakt</option>
          </select>
        </div>
      )}
      {delivery !== "pickup" && !shelfOnly && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Fraktpris (kr)</label>
          <input type="number" min="0" value={shippingPrice} onChange={(e) => setShippingPrice(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle} />
          <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>Typiskt 25–40 kr för brev, 60–90 kr för paket.</p>
        </div>
      )}
      {rentable && (
        <div>
          <label className="text-xs" style={{ color: "#8a7aa8" }}>Ersättningsvärde vid skada/förlust (kr)</label>
          <input type="number" min="0" value={replacementValue} onChange={(e) => setReplacementValue(e.target.value)}
            className="w-full mt-1 px-3 py-2 rounded-md outline-none" style={inputStyle} />
          <p className="text-[11px] mt-1" style={{ color: "#6d5d8a" }}>Hålls som deposition hos hyresgästen. Sätt gärna till ca 70–80% av nuvarande butikspris.</p>
        </div>
      )}
      {formError && <div className="text-xs" style={{ color: "#ff8a8a" }}>{formError}</div>}
      <button type="button" onClick={submit} className="w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
        style={{ ...fontDisplay, fontSize: "16px", background: "#21e6ec", color: "#121214", boxShadow: "0 0 12px #21e6ec40" }}>
        {editingItem ? "SPARA ÄNDRINGAR" : <><Plus size={16} /> LÄGG TILL I HYLLAN</>}
      </button>
      <p className="text-[11px] pt-1" style={{ color: "#6d5d8a" }}>Titlar du lägger upp blir synliga för alla som öppnar Rewindr.</p>
    </div>
  );
}

// ---------- my rentals ----------
function MyRentals({ rentals, listings, name, onReturn }) {
  const myRentals = rentals.filter((r) => r.renterName === name);
  const items = myRentals
    .map((r) => ({ ...listings.find((l) => l.id === r.itemId), rental: r }))
    .filter((i) => i.id);
  if (items.length === 0) {
    return (
      <div className="text-center py-16" style={{ ...fontBody, color: "#6d5d8a" }}>
        <Sparkles className="mx-auto mb-3" size={28} />
        Inga lån att visa. Utforska vad andra lagt upp.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
      {items.map((item) => {
        const r = item.rental;
        const color = GENRE_COLORS[item.genre] || "#21e6ec";
        const total = r.rentCost + (r.shipCost || 0);
        return (
          <div key={r.id} className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: color + "44", background: "#1c1c20" }}>
            {React.createElement(iconFor(item.type), { size: 22, style: { color } })}
            <div className="flex-1" style={fontBody}>
              <div className="text-sm flex items-center gap-2" style={{ color: "#f3eefc" }}>
                {item.title}
                {r.returned && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#4ade8022", color: "#4ade80" }}>återlämnad</span>}
              </div>
              <div className="text-[11px] flex items-center gap-2 mt-0.5 flex-wrap" style={{ color: "#8a7aa8" }}>
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(r.rentedAt).toLocaleDateString("sv-SE")} · {r.days} {r.days === 1 ? "dag" : "dagar"}</span>
                <span className="flex items-center gap-1">
                  {r.delivery === "ship" ? <Truck size={11} /> : <Home size={11} />}
                  {r.delivery === "ship" ? "Skickas" : "Hämtas"}
                </span>
              </div>
              {!r.returned && (
                <button onClick={() => onReturn(r.id)} className="text-[11px] mt-1" style={{ color: "#21e6ec" }}>
                  Markera som återlämnad
                </button>
              )}
            </div>
            <div className="text-xs text-right" style={{ color: "#ffe94a" }}>
              {total} kr
              {r.shipCost > 0 && <div className="text-[10px]" style={{ color: "#6d5d8a" }}>varav {r.shipCost} kr frakt</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// mode: "buyer" (visar mina köp) eller "seller" (visar mina sålda)
// ---------- wanted ads (efterlysningar) ----------
function WantedAdCard({ ad, name, onDelete, onRespond }) {
  const [responding, setResponding] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const isMine = ad.username === name;

  const send = () => {
    onRespond(ad.id, note.trim());
    setSent(true);
    setResponding(false);
  };

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "#33333a", background: "#1c1c20" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-base" style={{ ...fontDisplay, color: "#f3eefc" }}>{ad.title}</h3>
        {isMine && (
          <button onClick={() => onDelete(ad.id)} style={{ color: "#ff8a8a" }}><Trash2 size={14} /></button>
        )}
      </div>
      <div className="text-xs mt-1" style={{ color: "#8a7aa8", ...fontBody }}>Efterlyst av {ad.username}</div>
      {ad.note && <p className="text-xs mt-1" style={{ color: "#c9b8e0", ...fontBody }}>{ad.note}</p>}

      {!isMine && name && !sent && (
        responding ? (
          <div className="mt-2 space-y-2">
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Valfritt meddelande…"
              className="w-full px-3 py-2 rounded-md outline-none text-xs" style={{ background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody }} />
            <button onClick={send} className="w-full py-1.5 rounded-md text-xs" style={{ background: "#4ade80", color: "#121214", ...fontDisplay }}>SKICKA</button>
          </div>
        ) : (
          <button onClick={() => setResponding(true)} className="mt-2 text-xs" style={{ color: "#4ade80", ...fontBody }}>Jag har den här!</button>
        )
      )}
      {sent && <p className="text-xs mt-2" style={{ color: "#4ade80", ...fontBody }}>Skickat! {ad.username} har fått en mejlnotis.</p>}
    </div>
  );
}

function WantedAdsPanel({ ads, name, onAdd, onDelete, onRespond }) {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    if (!title.trim()) return;
    onAdd(title.trim(), note.trim());
    setTitle(""); setNote("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      {name && (
        <div className="rounded-xl border p-4 mb-5 space-y-2" style={{ borderColor: "#33333a", background: "#1c1c20" }}>
          <h2 className="text-xl mb-1" style={{ ...fontDisplay, color: "#ffe94a" }}>Efterlys en titel</h2>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Vad letar du efter?"
            className="w-full px-3 py-2 rounded-md outline-none text-sm" style={{ background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody }} />
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Detaljer (valfritt) — t.ex. vilket format"
            className="w-full px-3 py-2 rounded-md outline-none text-sm" style={{ background: "#121214", border: "1px solid #33333a", color: "#f3eefc", ...fontBody }} />
          <button onClick={submit} className="w-full py-2 rounded-md text-sm" style={{ background: "#ffe94a", color: "#121214", ...fontDisplay }}>LÄGG UPP EFTERLYSNING</button>
        </div>
      )}
      {ads.length === 0 ? (
        <div className="text-center py-10 text-xs" style={{ color: "#6d5d8a", ...fontBody }}>Inga efterlysningar just nu.</div>
      ) : (
        <div className="space-y-3">
          {ads.map((ad) => (
            <WantedAdCard key={ad.id} ad={ad} name={name} onDelete={onDelete} onRespond={onRespond} />
          ))}
        </div>
      )}
    </div>
  );
}

function MyPurchases({ purchases, listings, name, mode }) {
  const mine = purchases.filter((p) => (mode === "buyer" ? p.buyerName : p.sellerName) === name);
  const items = mine
    .map((p) => ({ ...listings.find((l) => l.id === p.itemId), purchase: p }))
    .filter((i) => i.id || i.purchase); // titeln kan vara borttagen, visa ändå köpet

  if (items.length === 0) {
    return (
      <div className="text-center py-10" style={{ ...fontBody, color: "#6d5d8a" }}>
        {mode === "buyer" ? "Inga köp än." : "Inget sålt än."}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
      {items.map((item) => {
        const p = item.purchase;
        const color = GENRE_COLORS[item.genre] || "#4ade80";
        const total = p.price + (p.shipCost || 0);
        return (
          <div key={p.id} className="rounded-xl border p-4 flex items-center gap-3" style={{ borderColor: color + "44", background: "#1c1c20" }}>
            {React.createElement(iconFor(item.type || "movie"), { size: 22, style: { color } })}
            <div className="flex-1" style={fontBody}>
              <div className="text-sm" style={{ color: "#f3eefc" }}>{item.title || "(borttagen titel)"}</div>
              <div className="text-[11px] flex items-center gap-2 mt-0.5 flex-wrap" style={{ color: "#8a7aa8" }}>
                <span className="flex items-center gap-1"><Clock size={12} /> {new Date(p.purchasedAt).toLocaleDateString("sv-SE")}</span>
                <span className="flex items-center gap-1">
                  {p.delivery === "ship" ? <Truck size={11} /> : <Home size={11} />}
                  {p.delivery === "ship" ? "Skickas" : "Hämtas"}
                </span>
                <span>{mode === "buyer" ? `från ${p.sellerName}` : `till ${p.buyerName}`}</span>
              </div>
            </div>
            <div className="text-xs text-right" style={{ color: "#4ade80" }}>
              {total} kr
              {p.shipCost > 0 && <div className="text-[10px]" style={{ color: "#6d5d8a" }}>varav {p.shipCost} kr frakt</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- info pages ----------
const ABOUT_TEXT = `Kommer du också ihåg känslan?

Att gå in i videobutiken en fredagskväll, kolla igenom hyllorna, bestämma sig för en film. Den var din den kvällen. Ingen kunde plötsligt ta bort den mitt i, ingen kunde bestämma att den "inte längre ingår."

Vi saknar det.

Streaming skulle göra allt enklare. Ibland känns det tvärtom.

Man betalar för flera tjänster samtidigt, och ändå försvinner filmer man ville se igen — flyttade till en annan tjänst, eller bara bortplockade. Man har betalat i flera år utan att egentligen äga något av det. Ingen fil, ingen skiva, ingen möjlighet att låna ut den till en kompis eller sälja den vidare.

Det är inte hela världen. Men det är en udda känsla — att betala för något man aldrig faktiskt får.

Fysisk media har aldrig riktigt försvunnit

Det finns en anledning att DVD:er och Blu-ray fortfarande säljer, trots allt. Det handlar inte bara om nostalgi — det handlar om att det som är ditt faktiskt förblir ditt, utan att någon plattform kan ändra på det senare.

Rewindr är till för dig som fortfarande har en hylla med filmer eller spel hemma. Som hellre lånar av en granne än scrollar bland förslag i en app. Som tycker det är lite skönt att äga saker, inte bara ha tillgång till dem.

En marknadsplats för att hyra, köpa och byta det som faktiskt finns

Du lägger upp det du redan har. Andra hyr eller byter det de faktiskt vill se — inte det en algoritm råkar föreslå just nu.

Vi börjar smått, i ditt närområde

Rewindr lanseras inte överallt på en gång. Vi börjar lokalt och växer i takt med att fler är med. Är du en av de första formar du en del av hur det blir. Känner du någon i närheten som skulle gilla det — dela det gärna vidare.

Välkommen till Rewindr.`;

const HOW_IT_WORKS = [
  { title: "1. Skapa ett konto", text: "Registrera dig med ett användarnamn, e-post och lösenord. Verifiera kontot, så är du redo." },
  { title: "2. Lägg upp det du redan har", text: "Filmer eller TV-spel som ligger hemma i en hylla — lägg upp dem med bild, pris per dag och hur de kan hämtas eller skickas." },
  { title: "3. Bläddra och hitta något att hyra", text: "Sök bland andras titlar i Bläddra-fliken. Hittar du något du vill hyra? Klicka Hyr nu, välj antal dagar, betala tryggt med kort." },
  { title: "4. Hämta eller vänta på leverans", text: "Beroende på vad uthyraren erbjuder — hämta själv eller få den skickad hem." },
  { title: "5. Lämna tillbaka i tid", text: "När lånetiden är slut, lämna tillbaka eller skicka tillbaka titeln. Markera den som återlämnad i appen." },
  { title: "6. Betalt direkt till dig", text: "Som uthyrare går din del av hyran automatiskt till ditt kopplade betalningskonto — ingen väntan, inget krångel." },
];

const FAQ_ITEMS = [
  { q: "Vad händer om något går sönder eller inte lämnas tillbaka?", a: "Varje titel har ett ersättningsvärde som uthyraren sätter när de lägger upp den. Vid skada eller utebliven återlämning kan uthyraren och hyresgästen använda det värdet som utgångspunkt för att lösa det sinsemellan." },
  { q: "Hur mycket kostar det att hyra ut?", a: "Rewindr tar en provision på hyresintäkter. Du ser alltid tydligt vad du får innan du lägger upp en titel." },
  { q: "Måste jag betala för att skapa konto?", a: "Nej, det är gratis att registrera sig, bläddra och lägga upp titlar." },
  { q: "Kan jag byta istället för att hyra?", a: "Ja — märk din titel som öppen för byte när du lägger upp den, så kan andra föreslå byten, permanenta eller tillfälliga." },
  { q: "Kan jag bara lägga upp något till försäljning, utan att hyra ut det?", a: "Ja — kryssa bara i \"Till försäljning\" och låt \"Hyra ut\" vara okryssad när du lägger upp titeln, så visas den enbart som en köp-annons." },
  { q: "Vilka betalsätt stöds?", a: "Kort, hanterat säkert via Stripe. Fler betalsätt kan tillkomma längre fram." },
  { q: "Var är Rewindr tillgängligt?", a: "Rewindr fungerar i hela Sverige, men vi växer stad för stad — så utbudet kan variera beroende på var du bor." },
];

function ProfilePage({ username, onBack, listings, rentals, purchases, reviews, accounts, favorites, onToggleFavorite, onOpenItem }) {
  const [profileFilter, setProfileFilter] = useState("all");
  if (!username) return null;

  const acc = accounts[username];
  const theirItems = listings.filter((l) => l.owner === username && !l.sold).filter((l) => {
    if (profileFilter === "all") return true;
    if (profileFilter === "rent") return l.rentable;
    if (profileFilter === "buy") return l.forSale;
    if (profileFilter === "trade") return l.tradeable;
    return l.shelfOnly;
  });
  const theirReviews = reviews.filter((r) => r.ownerUsername === username);
  const avg = theirReviews.length ? theirReviews.reduce((s, r) => s + r.rating, 0) / theirReviews.length : 0;
  const badges = computeBadges(username, { rentals, purchases, reviews, accounts });

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-4" style={{ color: "#8a7aa8", ...fontBody }}>
        ← Tillbaka
      </button>

      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-3xl" style={{ ...fontDisplay, color: "#f3eefc" }}>
            <User size={26} style={{ color: "#21e6ec" }} />
            {username}
            {acc?.verified && <ShieldCheck size={20} style={{ color: "#4ade80" }} />}
            {acc?.isAdmin && <Crown size={20} style={{ color: "#ffe94a" }} />}
          </div>
          <div className="flex items-center gap-2 text-xs mt-1" style={{ color: "#8a7aa8", ...fontBody }}>
            <StarRow value={Math.round(avg)} size={13} />
            {theirReviews.length > 0 ? `${avg.toFixed(1)} (${theirReviews.length} recensioner)` : "Inga recensioner än"}
          </div>
        </div>
      </div>

      {badges.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {badges.map((b) => (
            <span key={b.label} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full" style={{ background: b.color + "1a", color: b.color, ...fontBody }}>
              <Award size={11} /> {b.label}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4 flex-wrap" style={fontBody}>
        {[["all", "Alla"], ["rent", "Hyra"], ["buy", "Köp"], ["trade", "Byt"], ["shelf", "Hylla"]].map(([id, label]) => (
          <button key={id} onClick={() => setProfileFilter(id)}
            className="px-3 py-1.5 rounded-full text-xs border"
            style={{
              borderColor: profileFilter === id ? "#21e6ec" : "#33333a",
              color: profileFilter === id ? "#21e6ec" : "#8a7aa8",
              background: profileFilter === id ? "#21e6ec1a" : "transparent",
            }}>
            {label}
          </button>
        ))}
      </div>

      {profileFilter === "shelf" ? (
        <Shelf items={theirItems} onOpen={onOpenItem} favorites={favorites} onToggleFavorite={onToggleFavorite} />
      ) : theirItems.length === 0 ? (
        <div className="text-center py-8 text-xs" style={{ color: "#6d5d8a", ...fontBody }}>Inga annonser i den här kategorin.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {theirItems.map((item) => (
            <Cassette key={item.id} item={item} onOpen={onOpenItem} isFavorite={favorites.includes(item.id)} onToggleFavorite={onToggleFavorite} />
          ))}
        </div>
      )}

      {theirReviews.length > 0 && (
        <div className="border-t pt-4 max-w-2xl" style={{ borderColor: "#33333a" }}>
          <div className="text-sm mb-2" style={{ ...fontDisplay, fontSize: "14px", color: "#ffe94a" }}>RECENSIONER</div>
          <div className="space-y-1.5">
            {theirReviews.slice().reverse().map((r) => (
              <div key={r.id} className="text-xs rounded-md p-2" style={{ background: "#121214", ...fontBody }}>
                <div className="flex items-center justify-between">
                  <span style={{ color: "#f3eefc" }}>{r.reviewerUsername}</span>
                  <StarRow value={r.rating} size={10} />
                </div>
                <div style={{ color: "#8a7aa8" }}>{r.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoModal({ page, onClose }) {
  if (!page) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(5,2,12,0.85)" }} onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border p-6" style={{ borderColor: "#33333a", background: "#1c1c20" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl" style={{ ...fontDisplay, color: "#ffe94a" }}>
            {page === "about" && "Om Rewindr"}
            {page === "how" && "Så fungerar det"}
            {page === "faq" && "Vanliga frågor"}
            {page === "contact" && "Kontakt"}
          </h2>
          <button onClick={onClose} style={{ color: "#8a7aa8" }}><X size={20} /></button>
        </div>

        {page === "about" && (
          <div className="text-sm space-y-3 whitespace-pre-line" style={{ color: "#c9b8e0", ...fontBody }}>{ABOUT_TEXT}</div>
        )}

        {page === "how" && (
          <div className="space-y-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title}>
                <div className="text-sm mb-1" style={{ color: "#ffe94a", ...fontDisplay, fontSize: "14px" }}>{step.title}</div>
                <div className="text-sm" style={{ color: "#c9b8e0", ...fontBody }}>{step.text}</div>
              </div>
            ))}
          </div>
        )}

        {page === "faq" && (
          <div className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.q}>
                <div className="text-sm mb-1" style={{ color: "#21e6ec", ...fontBody, fontWeight: 600 }}>{item.q}</div>
                <div className="text-sm" style={{ color: "#c9b8e0", ...fontBody }}>{item.a}</div>
              </div>
            ))}
          </div>
        )}

        {page === "contact" && (
          <div className="text-sm space-y-3" style={{ color: "#c9b8e0", ...fontBody }}>
            <p>Har du frågor, feedback, eller stötte du på ett problem?</p>
            <p>
              Mejla oss på{" "}
              <a href="mailto:hello.rewindr@gmail.com" style={{ color: "#21e6ec" }}>hello.rewindr@gmail.com</a>
              {" "}så återkommer vi så snart vi kan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Footer({ onOpenInfo }) {
  const links = [
    { id: "about", label: "Om oss" },
    { id: "how", label: "Så fungerar det" },
    { id: "faq", label: "FAQ" },
    { id: "contact", label: "Kontakt" },
  ];
  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 pt-6">
      <div className="flex flex-wrap gap-4 justify-center text-xs border-t pt-6" style={{ borderColor: "#33333a66", ...fontBody }}>
        {links.map((l) => (
          <button key={l.id} onClick={() => onOpenInfo(l.id)} style={{ color: "#8a7aa8" }}>
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("rewindr-cookie-consent")) setVisible(true);
  }, []);

  const accept = () => {
    localStorage.setItem("rewindr-cookie-consent", "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4" style={{ background: "#1c1c20", borderTop: "1px solid #33333a" }}>
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs" style={{ color: "#c9b8e0", ...fontBody }}>
          Vi använder nödvändig lagring för inloggning och grundläggande, cookielös besöksstatistik. Inga spårningscookies för reklam.
        </p>
        <button onClick={accept} className="px-4 py-1.5 rounded-md text-xs shrink-0"
          style={{ background: "#21e6ec", color: "#121214", ...fontDisplay }}>
          OK
        </button>
      </div>
    </div>
  );
}

// ---------- app root ----------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: "#121214" }}>
          <div className="max-w-sm text-center rounded-2xl border p-6" style={{ borderColor: "#33333a", background: "#1c1c20", ...fontBody }}>
            <h2 className="text-xl mb-2" style={{ ...fontDisplay, color: "#ff2fb0" }}>Något gick fel</h2>
            <p className="text-sm mb-4" style={{ color: "#c9b8e0" }}>
              Rewindr stötte på ett oväntat fel. Testa att ladda om.
            </p>
            <button onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 rounded-md text-sm"
              style={{ background: "#21e6ec", color: "#121214", ...fontDisplay }}>
              FÖRSÖK IGEN
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RewindrAppInner() {
  const { listings, name, setName, rentals, purchases, threads, accounts, reviews, favorites, toggleFavorite, myCredits, ready, lastError, setLastError, refreshAll } = useRewindrData();
  const [viewingProfile, setViewingProfile] = useState(null);
  const [tab, setTab] = useState("browse");
  const [mineSection, setMineSection] = useState("rentals");
  const [filter, setFilter] = useState("all");
  const [offerFilter, setOfferFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [adminAccounts, setAdminAccounts] = useState({});
  const [watches, setWatches] = useState([]);
  const [wantedAds, setWantedAds] = useState([]);

  const loadWatches = useCallback(async () => {
    if (!api.hasToken()) return setWatches([]);
    try { setWatches(await api.watches()); } catch { /* tyst */ }
  }, []);
  useEffect(() => { loadWatches(); }, [loadWatches, name]);

  const loadWantedAds = useCallback(async () => {
    try { setWantedAds(await api.wantedAds()); } catch { /* tyst */ }
  }, []);
  useEffect(() => { loadWantedAds(); }, [loadWantedAds]);

  const handleAddWatch = async (q) => {
    try { await api.createWatch(q); await loadWatches(); } catch (err) { setLastError(err.message); }
  };
  const handleRemoveWatch = async (id) => {
    try { await api.deleteWatch(id); await loadWatches(); } catch (err) { setLastError(err.message); }
  };
  const handleAddWantedAd = async (title, note) => {
    try { await api.createWantedAd(title, note); await loadWantedAds(); } catch (err) { setLastError(err.message); }
  };
  const handleDeleteWantedAd = async (id) => {
    try { await api.deleteWantedAd(id); await loadWantedAds(); } catch (err) { setLastError(err.message); }
  };
  const handleRespondWantedAd = async (id, note) => {
    try { await api.respondToWantedAd(id, note); } catch (err) { setLastError(err.message); }
  };
  const [infoPage, setInfoPage] = useState(null);

  const filtered = listings.filter((i) => {
    if (i.sold) return false; // sålda titlar försvinner permanent från Bläddra
    if (i.shelfOnly) return false; // rena hylltitlar visas bara på profilens hylla, inte i Bläddra
    const typeOk = filter === "all" || i.type === filter;
    const offerOk =
      offerFilter === "all" ||
      (offerFilter === "rent" && i.rentable) ||
      (offerFilter === "buy" && i.forSale) ||
      (offerFilter === "trade" && i.tradeable);
    const q = query.trim().toLowerCase();
    const queryOk = !q || i.title.toLowerCase().includes(q) || i.genre.toLowerCase().includes(q);
    return typeOk && offerOk && queryOk;
  });

  const isAdmin = name && accounts[name]?.isAdmin;

  const withErrorHandling = (fn) => async (...args) => {
    try {
      await fn(...args);
      await refreshAll();
    } catch (err) {
      setLastError(err.message || "Något gick fel mot servern.");
    }
  };

  const handleAuthChange = async (user) => {
    setName(user ? user.username : "");
    await refreshAll();
  };

  const handleAdd = withErrorHandling(async (item) => {
    await api.createListing(item);
    setTab("browse");
  });

  const handleUpdateListing = withErrorHandling(async (id, item) => {
    await api.updateListing(id, item);
    setEditingItem(null);
    setTab("myListings");
  });

  const handleRent = withErrorHandling(async (item, delivery, shipCost, days) => {
    const data = await api.createRental(item.id, days, delivery);
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  });

  const handlePurchase = withErrorHandling(async (item, delivery) => {
    const data = await api.createPurchase(item.id, delivery);
    if (data.checkoutUrl) window.location.href = data.checkoutUrl;
  });

  const handleReturnRental = withErrorHandling(async (rentalId) => {
    await api.returnRental(rentalId);
  });

  const handleRemove = withErrorHandling(async (item) => {
    await api.deleteListing(item.id);
    setOpenItem(null);
  });

  const handleStartThread = withErrorHandling(async (item, buyerName, text) => {
    await api.createThread({ itemId: item.id, kind: "buy", message: text });
  });

  const handleProposeTrade = withErrorHandling(async (item, offeredItem, tradeType, days, message) => {
    await api.createThread({
      itemId: item.id, kind: "trade", offeredItemId: offeredItem.id, offeredItemTitle: offeredItem.title,
      tradeType, tradeDays: days, message,
    });
  });

  const handleReply = withErrorHandling(async (threadId, sender, text) => {
    await api.replyThread(threadId, text);
  });

  const handleApproveTrade = withErrorHandling(async (threadId) => {
    await api.approveTrade(threadId);
  });
  const handleRejectTrade = withErrorHandling(async (threadId) => {
    await api.rejectTrade(threadId);
  });
  const handleCompleteTrade = withErrorHandling(async (threadId) => {
    await api.completeTrade(threadId);
  });

  const handleAddReview = withErrorHandling(async (review) => {
    await api.createReview(review.ownerUsername, review.rating, review.text);
  });

  const activeRentalFor = (item) => rentals.find((r) => r.itemId === item.id && !r.returned);
  const isRented = (item) => !!activeRentalFor(item);
  const isOwner = (item) => name && item.owner === name;
  const myItems = listings.filter((l) => name && l.owner === name && !l.shelfOnly);

  const loadAdminAccounts = async () => {
    try {
      const list = await api.adminAccounts();
      const map = {};
      list.forEach((u) => { map[u.username] = u; });
      setAdminAccounts(map);
    } catch (err) {
      setLastError(err.message);
    }
  };
  useEffect(() => { if (isAdmin && tab === "admin") loadAdminAccounts(); }, [isAdmin, tab]);

  const adminDeleteListing = withErrorHandling(async (item) => { await api.deleteListing(item.id); });
  const adminDeleteReview = withErrorHandling(async (reviewId) => { await api.deleteReview(reviewId); });
  const adminToggleVerified = async (u) => { await api.adminToggleVerified(u); await loadAdminAccounts(); await refreshAll(); };
  const adminToggleBanned = async (u) => { await api.adminToggleBanned(u); await loadAdminAccounts(); };

  return (
    <div className="min-h-screen w-full" style={{ background: "#121214" }}>
      <GlobalStyle />
      <div className="max-w-5xl mx-auto px-4 py-8">
        {lastError && (
          <div className="mb-4 rounded-xl border p-3 text-xs flex items-center justify-between gap-2" style={{ borderColor: "#ff8a8a66", background: "#ff8a8a15", color: "#ff8a8a", ...fontBody }}>
            <span>{lastError}</span>
            <button onClick={() => setLastError("")} style={{ color: "#ff8a8a" }}>✕</button>
          </div>
        )}
        <AuthPanel name={name} accounts={accounts} myCredits={myCredits} onAuthChange={handleAuthChange} />
        {!viewingProfile && <Marquee query={query} setQuery={setQuery} />}
        <Tabs active={tab} setActive={(id) => { setEditingItem(null); setViewingProfile(null); setTab(id); }} showAdmin={isAdmin} showMyListings={!!name} />

        {!ready ? (
          <div className="text-center py-16" style={{ color: "#6d5d8a", ...fontBody }}>Spolar upp hyllan…</div>
        ) : viewingProfile ? (
          <ProfilePage
            username={viewingProfile}
            onBack={() => setViewingProfile(null)}
            listings={listings}
            rentals={rentals}
            purchases={purchases}
            reviews={reviews}
            accounts={accounts}
            favorites={favorites}
            onToggleFavorite={name ? toggleFavorite : undefined}
            onOpenItem={(item) => { setViewingProfile(null); setOpenItem(item); }}
          />
        ) : (
          <>
            {tab === "browse" && (
              <div>
                {watches.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {watches.map((w) => (
                      <span key={w.id} className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full" style={{ background: "#21e6ec15", color: "#21e6ec", ...fontBody }}>
                        Bevakar: {w.query}
                        <button onClick={() => handleRemoveWatch(w.id)} style={{ color: "#8a7aa8" }}><X size={11} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 mb-3 flex-wrap" style={fontBody}>
                  {[["all", "Allt"], ["movie", "Filmer"], ["game", "TV-spel"]].map(([id, label]) => (
                    <button key={id} onClick={() => setFilter(id)}
                      className="px-3 py-1.5 rounded-full text-xs border"
                      style={{
                        borderColor: filter === id ? "#ff2fb0" : "#33333a",
                        color: filter === id ? "#ff2fb0" : "#8a7aa8",
                        background: filter === id ? "#ff2fb01a" : "transparent",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-5 flex-wrap" style={fontBody}>
                  {[["all", "Alla erbjudanden"], ["rent", "Hyra"], ["buy", "Köp"], ["trade", "Byt"]].map(([id, label]) => (
                    <button key={id} onClick={() => setOfferFilter(id)}
                      className="px-3 py-1.5 rounded-full text-xs border"
                      style={{
                        borderColor: offerFilter === id ? "#21e6ec" : "#33333a",
                        color: offerFilter === id ? "#21e6ec" : "#8a7aa8",
                        background: offerFilter === id ? "#21e6ec1a" : "transparent",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                {filtered.length === 0 ? (
                  <div className="text-center py-16" style={{ ...fontBody, color: "#6d5d8a" }}>
                    <p className="mb-3">Inget hittades — testa ett annat sökord.</p>
                    {name && query.trim() && (
                      <button onClick={() => handleAddWatch(query.trim())}
                        className="px-4 py-2 rounded-full text-xs inline-flex items-center gap-1.5"
                        style={{ background: "#21e6ec15", border: "1px solid #21e6ec44", color: "#21e6ec" }}>
                        Bevaka "{query.trim()}" — mejla mig när något dyker upp
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filtered.map((item) => <Cassette key={item.id} item={item} onOpen={setOpenItem} isFavorite={favorites.includes(item.id)} onToggleFavorite={name ? toggleFavorite : undefined} />)}
                  </div>
                )}
              </div>
            )}
            {tab === "wanted" && (
              <WantedAdsPanel
                ads={wantedAds}
                name={name}
                onAdd={handleAddWantedAd}
                onDelete={handleDeleteWantedAd}
                onRespond={handleRespondWantedAd}
              />
            )}
            {tab === "list" && (
              name
                ? <ListForm name={name} onAdd={handleAdd} onUpdate={handleUpdateListing} editingItem={editingItem} onCancelEdit={() => { setEditingItem(null); setTab("myListings"); }} />
                : <div className="text-xs rounded-lg p-4 max-w-sm" style={{ background: "#21e6ec15", color: "#c9b8e0", ...fontBody }}>Logga in högst upp för att lägga upp en titel.</div>
            )}
            {tab === "myListings" && (
              name ? (
                myItems.length === 0 ? (
                  <div className="text-center py-16" style={{ ...fontBody, color: "#6d5d8a" }}>
                    <Sparkles className="mx-auto mb-3" size={28} />
                    Du har inte lagt upp något än — gå till "Lägg upp" för att komma igång.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {myItems.map((item) => <Cassette key={item.id} item={item} onOpen={setOpenItem} isFavorite={favorites.includes(item.id)} onToggleFavorite={name ? toggleFavorite : undefined} />)}
                  </div>
                )
              ) : (
                <div className="text-xs rounded-lg p-4 max-w-sm" style={{ background: "#21e6ec15", color: "#c9b8e0", ...fontBody }}>Logga in högst upp för att se dina annonser.</div>
              )
            )}
            {tab === "favorites" && (
              name ? (
                (() => {
                  const favItems = listings.filter((l) => favorites.includes(l.id));
                  return favItems.length === 0 ? (
                    <div className="text-center py-16" style={{ ...fontBody, color: "#6d5d8a" }}>
                      <Heart className="mx-auto mb-3" size={28} />
                      Inga favoriter än — klicka på hjärtat på en annons för att spara den här.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                      {favItems.map((item) => <Cassette key={item.id} item={item} onOpen={setOpenItem} isFavorite={true} onToggleFavorite={toggleFavorite} />)}
                    </div>
                  );
                })()
              ) : (
                <div className="text-xs rounded-lg p-4 max-w-sm" style={{ background: "#21e6ec15", color: "#c9b8e0", ...fontBody }}>Logga in högst upp för att se dina favoriter.</div>
              )
            )}
            {tab === "shelf" && (
              name ? (
                <div>
                  <h2 className="text-2xl mb-4" style={{ ...fontDisplay, color: "#ffe94a" }}>Min hylla</h2>
                  <Shelf
                    items={listings.filter((l) => l.owner === name && l.shelfOnly && !l.sold)}
                    onOpen={setOpenItem}
                    favorites={favorites}
                    onToggleFavorite={toggleFavorite}
                  />
                  <p className="text-[11px] mt-3" style={{ color: "#6d5d8a", ...fontBody }}>
                    Andra kan se din hylla på din profil. Lägg till fler titlar under "Lägg upp" → "Bara i min hylla".
                  </p>
                </div>
              ) : (
                <div className="text-xs rounded-lg p-4 max-w-sm" style={{ background: "#21e6ec15", color: "#c9b8e0", ...fontBody }}>Logga in högst upp för att se din hylla.</div>
              )
            )}
            {tab === "mine" && (
              <div>
                <div className="flex gap-2 mb-5 flex-wrap" style={fontBody}>
                  {[["rentals", "Mina lån"], ["purchases", "Mina köp"], ["sales", "Mina sålda"]].map(([id, label]) => (
                    <button key={id} onClick={() => setMineSection(id)}
                      className="px-4 py-2 rounded-full text-xs border transition-colors"
                      style={{
                        borderColor: mineSection === id ? "#ffe94a" : "#33333a",
                        color: mineSection === id ? "#ffe94a" : "#8a7aa8",
                        background: mineSection === id ? "#ffe94a1a" : "transparent",
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
                <div key={mineSection} className="rw-slide-in">
                  {mineSection === "rentals" && (
                    <MyRentals rentals={rentals} listings={listings} name={name} onReturn={handleReturnRental} />
                  )}
                  {mineSection === "purchases" && (
                    <MyPurchases purchases={purchases} listings={listings} name={name} mode="buyer" />
                  )}
                  {mineSection === "sales" && (
                    <MyPurchases purchases={purchases} listings={listings} name={name} mode="seller" />
                  )}
                </div>
              </div>
            )}
            {tab === "admin" && isAdmin && (
              <AdminPanel
                listings={listings}
                accounts={adminAccounts}
                reviews={reviews}
                rentals={rentals}
                threads={threads}
                onDeleteListing={adminDeleteListing}
                onDeleteReview={adminDeleteReview}
                onToggleVerified={adminToggleVerified}
                onToggleBanned={adminToggleBanned}
              />
            )}
          </>
        )}
      </div>
      <ItemModal
        item={openItem}
        onClose={() => setOpenItem(null)}
        onRent={handleRent}
        onPurchase={handlePurchase}
        onEdit={(item) => { setEditingItem(item); setOpenItem(null); setTab("list"); }}
        onOpenProfile={(username) => { setOpenItem(null); setViewingProfile(username); }}
        onRemove={handleRemove}
        alreadyRented={openItem ? isRented(openItem) : false}
        activeRental={openItem ? activeRentalFor(openItem) : null}
        onReturnRental={handleReturnRental}
        isOwner={openItem ? isOwner(openItem) : false}
        name={name}
        threads={threads}
        myItems={myItems.filter((m) => openItem && m.id !== openItem.id)}
        onProposeTrade={handleProposeTrade}
        onStartThread={handleStartThread}
        onReply={handleReply}
        onApproveTrade={handleApproveTrade}
        onRejectTrade={handleRejectTrade}
        onCompleteTrade={handleCompleteTrade}
        reviews={reviews}
        onAddReview={handleAddReview}
        accounts={accounts}
      />
      <Footer onOpenInfo={setInfoPage} />
      <InfoModal page={infoPage} onClose={() => setInfoPage(null)} />
      <CookieBanner />
    </div>
  );
}

export default function RewindrApp() {
  return (
    <ErrorBoundary>
      <RewindrAppInner />
    </ErrorBoundary>
  );
}
