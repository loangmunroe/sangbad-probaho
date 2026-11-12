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

// পেস্ট করা লেখা বা লিংক থেকে Groq (Llama 3) দিয়ে নিজস্ব ভাষায় খবর
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  
  // Groq API Key চেক করা
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "Vercel-এ GROQ_API_KEY সেট করা নেই" }, { status: 500 });

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
${text.slice(0, 5000)}`;

  const models = [
    process.env.GROQ_MODEL,
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
  ].filter((m, i, a) => m && a.indexOf(m) === i);

  try {
    let out = null;
    let lastErr = "";
    // একটা মডেলের সীমা শেষ হলে পরেরটা চেষ্টা করে
    for (const model of models) {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: "You are a professional Bengali news editor. Output only valid JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_completion_tokens: 2500,
          response_format: { type: "json_object" },
          ...(model.includes("gpt-oss") ? { reasoning_effort: "low" } : {}),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (r.ok) {
        out = JSON.parse(data.choices?.[0]?.message?.content || "{}");
        break;
      }
      lastErr = data?.error?.message || `Groq ${r.status}`;
      if (![400, 404, 413, 429, 503].includes(r.status)) break;
    }
    if (!out) throw new Error(lastErr || "কোনো মডেল সাড়া দেয়নি");

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
