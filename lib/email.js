// Skickar e-post via Resend (https://resend.com — gratis upp till 3 000
// mejl/månad, inget kort krävs). Om RESEND_API_KEY saknas eller anropet
// misslyckas: logga bara felet och fortsätt — ett trasigt mejl ska
// ALDRIG stoppa själva bokningen/köpet från att gå igenom.

export async function sendEmail(env, to, subject, html) {
  if (!env.RESEND_API_KEY || !to) return;
  try {
    await fetch("https://api.resend.com/emails", {
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
  } catch (err) {
    console.error("Kunde inte skicka mejl:", err);
  }
}

export function rentalEmail(rental, itemTitle) {
  return {
    subject: `Din titel "${itemTitle}" har blivit uthyrd`,
    html: `
      <div style="font-family: sans-serif;">
        <h2>Ny uthyrning på Rewindr</h2>
        <p><strong>${rental.renterName}</strong> har hyrt <strong>${itemTitle}</strong>.</p>
        <p>Antal dagar: ${rental.days}<br>
        Leverans: ${rental.delivery === "ship" ? "Skickas" : "Hämtas"}</p>
        <p>Logga in på Rewindr för att se detaljer och komma överens om upphämtning/frakt.</p>
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
