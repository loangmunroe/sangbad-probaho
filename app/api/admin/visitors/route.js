import { getSession, unauthorized, forbidden } from "@/lib/auth";
import { pipeline, redisReady } from "@/lib/redis";

export const dynamic = "force-dynamic";

const dhakaDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka" }).format(d);
const toObj = (arr) => {
  const o = {};
  for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]);
  return o;
};

// ভিজিটর পরিসংখ্যান: শুধু অ্যাডমিন
export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized();
  if (s.role !== "admin") return forbidden();
  if (!redisReady()) return Response.json({ ready: false });

  const days = [...Array(14)].map((_, i) => dhakaDate(new Date(Date.now() - i * 864e5))).reverse();
  const today = days[days.length - 1];
  try {
    const cmds = [];
    for (const d of days) cmds.push(["GET", `v:${d}`], ["PFCOUNT", `u:${d}`]);
    cmds.push(
      ["ZREVRANGE", `p:${today}`, 0, 14, "WITHSCORES"],
      ["HGETALL", `c:${today}`],
      ["HGETALL", `dev:${today}`],
      ["HGETALL", `ref:${today}`],
      ["LRANGE", "recent", 0, 299],
    );
    const res = await pipeline(cmds);
    const series = days.map((d, i) => ({ date: d, views: Number(res[i * 2] || 0), visitors: Number(res[i * 2 + 1] || 0) }));
    const k = days.length * 2;
    const recent = (res[k + 4] || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
    const online = new Set(recent.filter((h) => Date.now() - h.t < 5 * 60e3).map((h) => h.ip)).size;
    return Response.json({
      ready: true,
      today: series[series.length - 1],
      online,
      series,
      pages: Object.entries(toObj(res[k])).map(([path, views]) => ({ path, views })),
      countries: toObj(res[k + 1]),
      devices: toObj(res[k + 2]),
      referrers: toObj(res[k + 3]),
      recent,
    });
  } catch (e) {
    return Response.json({ ready: true, error: e.message }, { status: 500 });
  }
}
