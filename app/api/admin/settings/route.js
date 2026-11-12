import { isAdmin, isAuthed, unauthorized, forbidden } from "@/lib/auth";
import { updateJSON } from "@/lib/github";
import { FONT_PRESETS, AD_SLOTS } from "@/lib/site";

const str = (v, max = 300) => String(v ?? "").trim().slice(0, max);
const url = (v) => {
  const s = str(v, 600);
  return /^(https?:\/\/|\/)/.test(s) ? s : "";
};
const num = (v, min, max, d) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : d;
};

// config/site.json আপডেট। শুধু অ্যাডমিন।
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  if (!(await isAdmin())) return forbidden();
  const b = await req.json().catch(() => null);
  if (!b) return Response.json({ error: "তথ্য নেই" }, { status: 400 });

  try {
    const config = await updateJSON("config/site.json", {}, (c) => {
      // পরিচয়
      if (b.name) c.name = str(b.name, 60);
      if ("tagline" in b) c.tagline = str(b.tagline, 160);
      if ("footerText" in b) c.footerText = str(b.footerText, 200);
      if ("logo" in b) c.logo = url(b.logo);
      if ("logoHeight" in b) c.logoHeight = num(b.logoHeight, 24, 90, 46);
      if ("favicon" in b) c.favicon = url(b.favicon);
      if ("deskName" in b) c.deskName = str(b.deskName, 60) || "অনলাইন ডেস্ক";

      // যোগাযোগ ও প্রকাশনা
      for (const k of ["editor", "publisher", "phone", "email"]) if (k in b) c[k] = str(b[k], 120);
      if ("address" in b) c.address = str(b.address, 400);
      if (b.social && typeof b.social === "object") {
        c.social = {};
        for (const k of ["facebook", "youtube", "x", "instagram", "tiktok", "linkedin", "telegram"]) {
          const v = url(b.social[k]);
          if (v) c.social[k] = v;
        }
      }

      // ফন্ট ও লেখার আকার
      if (b.fontHeadline in FONT_PRESETS) c.fontHeadline = b.fontHeadline;
      if (b.fontBody in FONT_PRESETS) c.fontBody = b.fontBody;
      if ("headlineScale" in b) c.headlineScale = num(b.headlineScale, 80, 130, 100);
      if ("bodySize" in b) c.bodySize = num(b.bodySize, 15, 22, 18);

      // পাতা
      if ("about" in b) c.about = str(b.about, 20000);
      if ("privacy" in b) c.privacy = str(b.privacy, 20000);

      // টিকার
      if (b.ticker && typeof b.ticker === "object") {
        c.ticker = {
          mode: b.ticker.mode === "manual" ? "manual" : "auto",
          label: str(b.ticker.label, 30) || "শিরোনাম",
          speed: num(b.ticker.speed, 20, 150, 60),
          items: (Array.isArray(b.ticker.items) ? b.ticker.items : String(b.ticker.items || "").split("\n"))
            .map((x) => str(x, 200)).filter(Boolean).slice(0, 30),
        };
      }

      // বিজ্ঞাপন
      if (b.ads && typeof b.ads === "object") {
        c.ads = {};
        for (const k of Object.keys(AD_SLOTS)) {
          const a = b.ads[k] || {};
          c.ads[k] = { enabled: Boolean(a.enabled), image: url(a.image), link: url(a.link), html: String(a.html || "").slice(0, 20000) };
        }
      }

      // খবর আনা
      if (b.maxNewPerRun) c.maxNewPerRun = num(b.maxNewPerRun, 1, 40, 12);
      if (b.keepDays) c.keepDays = num(b.keepDays, 1, 60, 7);
      if (Array.isArray(b.sources)) {
        c.sources = b.sources
          .filter((s) => s && s.name && (s.site || (s.rss && s.rss.length)))
          .map((s) => ({
            id: s.id || String(s.site || s.name).replace(/[^a-z0-9]/gi, "").toLowerCase() || `src${Date.now()}`,
            name: str(s.name, 60),
            site: str(s.site).replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
            rss: (Array.isArray(s.rss) ? s.rss : String(s.rss || "").split(/[\s,]+/)).filter((u) => /^https?:\/\//.test(u)),
            enabled: s.enabled !== false,
          }));
      }
      return c;
    }, "admin: update settings");
    return Response.json({ ok: true, config });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
