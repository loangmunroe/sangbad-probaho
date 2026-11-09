import { isAuthed, unauthorized } from "@/lib/auth";
import site from "@/config/site.json";

export const maxDuration = 60;

function htmlToText(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<(nav|header|footer|aside)[\s\S]*?<\/\1>/gi, " ");
  const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => m[1].replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim())
    .filter((t) => t.length > 40);
  return paras.join("\n\n");
}

// পেস্ট করা লেখা বা লিংক থেকে Gemini দিয়ে নিজস্ব ভাষায় খবর
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "Vercel-এ GEMINI_API_KEY সেট করা নেই" }, { status: 500 });

  let { text = "", url = "", sourceName = "" } = await req.json().catch(() => ({}));
  if (!text && url) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0", "Accept-Language": "bn-BD,bn" } });
      text = htmlToText(await r.text());
    } catch {}
    if (text.length < 150) {
      return Response.json({ error: "লিংক থেকে লেখা আনা যায়নি। লেখাটা কপি করে পেস্ট করুন।" }, { status: 400 });
    }
  }
  if (text.trim().length < 80) return Response.json({ error: "আরও লেখা দিন" }, { status: 400 });

  const cats = site.categories.map((c) => `"${c.slug}" (${c.name})`).join(", ");
  const prompt = `তুমি একটি বাংলাদেশি অনলাইন পত্রিকার অভিজ্ঞ সম্পাদক।
নিচের লেখার তথ্য ব্যবহার করে আমাদের পত্রিকার জন্য একটি সংবাদ লেখো${sourceName ? ` (মূল সূত্র: ${sourceName})` : ""}।

নিয়ম:
- সম্পূর্ণ নিজের ভাষায়; মূল লেখার বাক্য হুবহু নেবে না।
- শুধু দেওয়া তথ্য ব্যবহার করবে, নিজে থেকে কিছু যোগ করবে না।
- ৩ থেকে ৬টি অনুচ্ছেদ, প্রমিত ও নিরপেক্ষ সংবাদের ভাষা। প্রথম অনুচ্ছেদে মূল খবর।
- নতুন শিরোনাম, ১২ শব্দের মধ্যে।
- category এগুলোর একটি: ${cats}
- tags: ৩–৫টি ছোট বাংলা ট্যাগ।

শুধু এই JSON দাও:
{"title":"...","excerpt":"এক বাক্যে সারকথা","paragraphs":["..."],"category":"slug","tags":["..."]}

লেখা:
${text.slice(0, 8000)}`;

  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || `Gemini ${r.status}`);
    const out = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    return Response.json({
      title: out.title || "",
      excerpt: out.excerpt || "",
      body: (out.paragraphs || []).join("\n\n"),
      category: out.category || "",
      tags: (out.tags || []).join(", "),
    });
  } catch (e) {
    return Response.json({ error: `AI সমস্যা: ${e.message}` }, { status: 500 });
  }
}
