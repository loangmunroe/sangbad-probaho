import { pipeline, redisReady } from "@/lib/redis";

export const dynamic = "force-dynamic";

const TTL = 60 * 60 * 24 * 30; // ৩০ দিন
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|monitor|curl|wget|python|axios/i;

function dhakaDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d); // YYYY-MM-DD
}

function parseUA(ua) {
  const device = /iPad|Tablet/i.test(ua) ? "ট্যাবলেট" : /Mobi|Android|iPhone/i.test(ua) ? "মোবাইল" : "কম্পিউটার";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /SamsungBrowser/.test(ua) ? "Samsung" :
    /UCBrowser/.test(ua) ? "UC" : /FBAN|FBAV/.test(ua) ? "Facebook" : /Chrome\//.test(ua) ? "Chrome" :
    /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "অন্যান্য";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" :
    /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "অন্যান্য";
  return { device, browser, os };
}

// প্রতিটা পাতা দেখার তথ্য জমা রাখে (Redis যুক্ত না থাকলে চুপচাপ কিছু করে না)
export async function POST(req) {
  if (!redisReady()) return new Response(null, { status: 204 });
  const ua = req.headers.get("user-agent") || "";
  if (BOT.test(ua)) return new Response(null, { status: 204 });

  let body = {};
  try { body = JSON.parse(await req.text()); } catch {}
  const path = String(body.path || "/").slice(0, 200);
  if (path.startsWith("/admin")) return new Response(null, { status: 204 });

  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "অজানা";
  const dec = (v) => { try { return decodeURIComponent(v || ""); } catch { return v || ""; } };
  const country = req.headers.get("x-vercel-ip-country") || "";
  const city = dec(req.headers.get("x-vercel-ip-city"));
  const region = dec(req.headers.get("x-vercel-ip-country-region"));
  let ref = String(body.ref || "");
  try { ref = ref ? new URL(ref).hostname : ""; } catch { ref = ""; }
  const host = req.headers.get("host") || "";
  if (ref === host) ref = "";
  const { device, browser, os } = parseUA(ua);
  const d = dhakaDate();

  const hit = { t: Date.now(), ip, country, city, region, path, ref, device, browser, os };
  try {
    await pipeline([
      ["INCR", `v:${d}`], ["EXPIRE", `v:${d}`, TTL],
      ["PFADD", `u:${d}`, ip], ["EXPIRE", `u:${d}`, TTL],
      ["ZINCRBY", `p:${d}`, 1, path], ["EXPIRE", `p:${d}`, TTL],
      ["HINCRBY", `c:${d}`, country || "?", 1], ["EXPIRE", `c:${d}`, TTL],
      ["HINCRBY", `dev:${d}`, device, 1], ["EXPIRE", `dev:${d}`, TTL],
      ["HINCRBY", `ref:${d}`, ref || "সরাসরি", 1], ["EXPIRE", `ref:${d}`, TTL],
      ["LPUSH", "recent", JSON.stringify(hit)], ["LTRIM", "recent", 0, 999],
    ]);
  } catch {}
  return new Response(null, { status: 204 });
}
