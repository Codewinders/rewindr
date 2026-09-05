// Skickar e-post via Resend (https://resend.com — gratis upp till 3 000
// mejl/månad, inget kort krävs). Om RESEND_API_KEY saknas eller anropet
// misslyckas: logga bara felet och fortsätt — ett trasigt mejl ska
// ALDRIG stoppa själva bokningen/köpet från att gå igenom.

// Skickar e-post via Resend (https://resend.com — gratis upp till 3 000
// mejl/månad, inget kort krävs). Returnerar { ok, error } så att kritiska
// flöden (som kontoverifiering) kan visa ett fel om mejlet inte gick
// fram — medan icke-kritiska notismejl (uthyrning, meddelanden) kan
// strunta i returvärdet, precis som förut.

export async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY saknas i serverkonfigurationen." };
  if (!to) return { ok: false, error: "Ingen mottagaradress." };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM || "Rewindr <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.message || `Resend svarade ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

export function verifyEmail(code) {
  return {
    subject: `Din verifieringskod: ${code}`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Bekräfta ditt Rewindr-konto</h2>
        <p>Ange den här koden för att slutföra registreringen:</p>
        <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${code}</p>
        <p style="color:#666;">Koden gäller i 15 minuter. Bad du inte om den här koden kan du ignorera mejlet.</p>
      </div>
    `,
  };
}

export function saleEmail(buyerName, itemTitle, price) {
  return {
    subject: `Din titel "${itemTitle}" har sålts`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Grattis, din titel har sålts!</h2>
        <p><strong>${buyerName}</strong> har köpt <strong>${itemTitle}</strong> för ${price} kr.</p>
        <p>Logga in på Rewindr för att se detaljer och komma överens om upphämtning/frakt.</p>
      </div>
    `,
  };
}

export function rentalEmail(rental, itemTitle) {
  return {
    subject: `Din titel "${itemTitle}" har blivit uthyrd`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Ny uthyrning på Rewindr</h2>
        <p><strong>${rental.renterName}</strong> har hyrt <strong>${itemTitle}</strong> och betalningen har gått igenom.</p>
        <p>Antal dagar: ${rental.days}<br>
        Leverans: ${rental.delivery === "ship" ? "Skickas" : "Hämtas"}</p>
        <p>Logga in på Rewindr för att se detaljer och komma överens om upphämtning/frakt.</p>
        <p style="color:#888; font-size:13px; border-top:1px solid #eee; margin-top:20px; padding-top:12px;">
          Stämmer inte det här — t.ex. om titeln redan var utlånad eller skadad innan du hann ta bort annonsen?
          Kontakta oss direkt på hello.rewindr@gmail.com så hjälper vi till.
        </p>
      </div>
    `,
  };
}

export function purchaseEmail(buyerName, itemTitle, delivery) {
  return {
    subject: `Din titel "${itemTitle}" har blivit såld`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Ny försäljning på Rewindr</h2>
        <p><strong>${buyerName}</strong> har köpt <strong>${itemTitle}</strong> och betalningen har gått igenom.</p>
        <p>Leverans: ${delivery === "ship" ? "Skickas" : "Hämtas"}</p>
        <p>Logga in på Rewindr för att se detaljer och komma överens om upphämtning/frakt.</p>
        <p style="color:#888; font-size:13px; border-top:1px solid #eee; margin-top:20px; padding-top:12px;">
          Stämmer inte det här — t.ex. om titeln redan var såld eller borta innan du hann ta bort annonsen?
          Kontakta oss direkt på hello.rewindr@gmail.com så hjälper vi till.
        </p>
      </div>
    `,
  };
}

export function watchMatchEmail(query, itemTitle) {
  return {
    subject: `Ny titel matchar din bevakning: "${query}"`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Något du bevakar har dykt upp på Rewindr</h2>
        <p>En ny titel, <strong>${itemTitle}</strong>, matchar din bevakning "${query}".</p>
        <p>Logga in på Rewindr för att kolla in den innan någon annan hinner före.</p>
      </div>
    `,
  };
}

export function wantedResponseEmail(fromName, wantedTitle, note) {
  return {
    subject: `Någon har svarat på din efterlysning: "${wantedTitle}"`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Svar på din efterlysning på Rewindr</h2>
        <p><strong>${fromName}</strong> säger att de har <strong>${wantedTitle}</strong>.</p>
        ${note ? `<p>Meddelande: ${note}</p>` : ""}
        <p>Logga in på Rewindr och sök efter ${fromName}s profil för att komma i kontakt.</p>
      </div>
    `,
  };
}

export function messageEmail(fromName, itemTitle, text) {
  return {
    subject: `Nytt meddelande om "${itemTitle}" på Rewindr`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Nytt meddelande</h2>
        <p><strong>${fromName}</strong> skrev om <strong>${itemTitle}</strong>:</p>
        <p style="background:#f4f4f4; padding:12px; border-radius:8px;">${text}</p>
        <p>Logga in på Rewindr för att svara.</p>
      </div>
    `,
  };
}
