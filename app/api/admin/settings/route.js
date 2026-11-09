import { isAuthed, unauthorized } from "@/lib/auth";
import { updateJSON } from "@/lib/github";

// config/site.json আপডেট (নাম, ট্যাগলাইন, পত্রিকা তালিকা, সীমা)
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const b = await req.json().catch(() => null);
  if (!b) return Response.json({ error: "তথ্য নেই" }, { status: 400 });

  try {
    const config = await updateJSON("config/site.json", {}, (c) => {
      if (b.name) c.name = String(b.name).slice(0, 60);
      if (typeof b.tagline === "string") c.tagline = b.tagline.slice(0, 160);
      if (b.maxNewPerRun) c.maxNewPerRun = Math.min(Math.max(+b.maxNewPerRun, 1), 40);
      if (b.keepDays) c.keepDays = Math.min(Math.max(+b.keepDays, 1), 60);
      if (Array.isArray(b.sources)) {
        c.sources = b.sources
          .filter((s) => s && s.name && (s.site || (s.rss && s.rss.length)))
          .map((s) => ({
            id: s.id || String(s.site || s.name).replace(/[^a-z0-9]/gi, "").toLowerCase() || `src${Date.now()}`,
            name: String(s.name).slice(0, 60),
            site: String(s.site || "").replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
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
