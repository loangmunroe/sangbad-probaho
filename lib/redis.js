// Upstash Redis (REST) — Vercel-এর Storage থেকে ফ্রি যোগ করা যায়।
// Vercel নিজে থেকে KV_REST_API_URL / KV_REST_API_TOKEN (বা UPSTASH_REDIS_REST_*) বসিয়ে দেয়।

function env() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function redisReady() {
  return Boolean(env());
}

/** একসাথে কয়েকটা কমান্ড: [["INCR","k"], ["GET","x"]] → [ফল, ফল] */
export async function pipeline(commands) {
  const e = env();
  if (!e) throw new Error("ভিজিটর ডাটাবেস (Upstash Redis) যুক্ত করা নেই");
  const r = await fetch(`${e.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${e.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`Redis ${r.status}`);
  const data = await r.json();
  return data.map((x) => (x.error ? null : x.result));
}
