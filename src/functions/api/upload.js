import { json, getSessionUser } from "../../lib/db.js";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB gräns per bild (klientkomprimering håller dem oftast under 300 kB)

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(env, request);
  if (!user) return json({ error: "Inloggning krävs." }, 401);
  if (!env.IMAGES) return json({ error: "Bildlagring är inte konfigurerad än." }, 500);

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") return json({ error: "Ingen bild bifogad." }, 400);
  if (!file.type || !file.type.startsWith("image/")) return json({ error: "Filen måste vara en bild." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Bilden är för stor (max 5 MB)." }, 400);

  const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const key = `covers/${user.username}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;

  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return json({ url: `/api/images/${key}` });
}
