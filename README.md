# Rewindr — komplett app (frontend + backend + databas)

Allt i ett enda projekt, byggt för att publiceras helt gratis på
**Cloudflare Pages**: hemsidan, API:et och databasen ligger på samma
domän, ingen separat server att hålla igång eller betala för.

## Vad som ingår

- **Frontend** — React-appen (`src/`)
- **Backend** — API-funktioner (`functions/api/`), körs automatiskt
  av Cloudflare, ingen egen server behövs
- **Databas** — schema för D1 (Cloudflares gratis SQL-databas, `schema.sql`)
- **Skydd mot dubbelbokning** — inbyggt i själva databasen (ett unikt
  index gör det fysiskt omöjligt att skapa två aktiva uthyrningar av
  samma titel samtidigt, även om två personer klickar exakt samtidigt)
- **E-postnotiser** — uthyraren mejlas automatiskt när någon hyr deras
  titel eller skriver ett meddelande (kräver ett gratis Resend-konto,
  se steg 4 nedan)

## Steg-för-steg: publicera helt gratis

### 1. Skapa ett Cloudflare-konto
Gå till [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) — gratis, inget kort krävs.

### 2. Ladda upp koden till GitHub
Precis som tidigare: skapa ett repository på GitHub och ladda upp
hela den uppackade `rewindr-local`-mappen (alla filer, inte zip-filen).

### 3. Skapa databasen
I Cloudflare-dashboarden: **Workers & Pages** → **D1** → **Create database**,
döp den till `rewindr-db`. Kopiera det ID:t som visas och klistra in det
i `wrangler.json` (ersätt `REPLACE_WITH_YOUR_DATABASE_ID`), committa
och pusha ändringen till GitHub.

Kör sedan schemat mot databasen — enklast via Cloudflares webbgränssnitt:
öppna din nya databas → fliken **Console** → klistra in hela innehållet
i `schema.sql` → kör.

### 4. Skapa ett gratis Resend-konto (för e-postnotiser)
Gå till [resend.com](https://resend.com), registrera dig gratis (upp
till 3 000 mejl/månad, inget kort krävs). Skapa en API-nyckel under
**API Keys**.

### 5. Koppla ihop allt i Cloudflare Pages
**Workers & Pages** → **Create** → **Pages** → **Connect to Git** →
välj ditt GitHub-repo → Cloudflare känner automatiskt igen att det är
ett Vite-projekt.

Innan du klickar Deploy, lägg till under **Settings → Environment variables**:
- `RESEND_API_KEY` = nyckeln du kopierade i steg 4
- `EMAIL_FROM` = t.ex. `Rewindr <onboarding@resend.dev>` (fungerar direkt
  utan egen domän — vill du skicka från din egen adress behöver den
  verifieras hos Resend, valfritt senare steg)
- `ADMIN_USERNAME` = **det användarnamn du tänker registrera åt dig
  själv**, t.ex. `alex`. Garanterar att just det kontot blir admin,
  oavsett vem som råkar registrera sig först på sajten.

Under **Settings → Functions → D1 database bindings**, koppla in
databasen du skapade i steg 3 med variabelnamnet `DB`.

Klicka **Deploy**. Efter någon minut har du en riktig, publik adress
(typ `rewindr.pages.dev`) där allt fungerar — konton, uthyrning,
byten, mejl, admin, allt.

## Testa lokalt innan du publicerar (valfritt)

Kräver [Node.js](https://nodejs.org/) och Cloudflares CLI-verktyg
`wrangler` (installeras automatiskt första gången):

```bash
npm install
npm run build
npx wrangler pages dev dist --d1 DB=rewindr-db
```

## Vad som fortfarande är förenklat

- **E-postverifiering vid registrering** använder fortfarande en
  hårdkodad kod (`123456`) istället för att skicka en riktig kod via
  Resend — bra att veta, men lätt att koppla på riktigt senare
  (samma Resend-konto du redan satt upp i steg 4 räcker).
- **Betalningar** finns inte alls än — nästa steg dit är Stripe.
