import { json, getSessionUser, publicUser } from "../../lib/db.js";

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(env, request);
  return json({ user: publicUser(user) });
}
