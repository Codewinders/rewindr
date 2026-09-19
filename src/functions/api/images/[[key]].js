export async function onRequestGet({ env, params }) {
  if (!env.IMAGES) return new Response("Bildlagring är inte konfigurerad.", { status: 500 });

  const key = Array.isArray(params.key) ? params.key.join("/") : params.key;
  const object = await env.IMAGES.get(key);
  if (!object) return new Response("Bilden hittades inte.", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
