import { site } from "@/lib/site";
import autoNews from "@/data/news.json";
import manualNews from "@/data/manual.json";
import controls from "@/data/controls.json";

export { site };

/** সব প্রকাশিত খবর (অটো + নিজের লেখা), লুকানোগুলো বাদ, নতুনটা আগে */
export function getAllNews() {
  const hidden = new Set(controls.hidden || []);
  const now = Date.now();
  const manual = (manualNews || []).filter(
    (n) => n.status === "published" && new Date(n.publishedAt).getTime() <= now
  );
  const overrides = controls.overrides || {};
  return [...manual, ...(autoNews || [])]
    .filter((n) => n && n.id && !hidden.has(n.id))
    .map((n) => (overrides[n.id] ? { ...n, ...overrides[n.id] } : n))
    .map((n) => (/unsplash\.com|pexels\.com/.test(n.image || "") ? { ...n, image: null, imageCaption: "", imageCredit: "" } : n))
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

/** এখনো মেয়াদ আছে এমন পিন */
export function getActivePins() {
  const now = Date.now();
  return (controls.pins || []).filter((p) => new Date(p.until).getTime() > now);
}

/**
 * প্রচ্ছদের ক্রম: পিন করা লিড → সাধারণ লিড; পিন করা শীর্ষ → বাকি।
 * সাইটে পিনের কোনো চিহ্ন দেখানো হয় না।
 */
export function getHomeOrder(news) {
  const pins = getActivePins().sort((a, b) => new Date(b.pinnedAt) - new Date(a.pinnedAt));
  const byId = new Map(news.map((n) => [n.id, n]));
  const leadPin = pins.find((p) => p.position === "lead" && byId.has(p.id));
  const topPins = pins.filter((p) => p !== leadPin && byId.has(p.id));

  const used = new Set();
  const take = (n) => { used.add(n.id); return n; };

  let lead = leadPin ? take(byId.get(leadPin.id)) : null;
  const top = [];
  for (const p of topPins) if (!used.has(p.id)) top.push(take(byId.get(p.id)));
  // পিন না থাকলে সাম্প্রতিক (৬ ঘণ্টার মধ্যে) ছবিওয়ালা খবরকে প্রধান খবর করা হয়
  if (!lead) {
    const fresh = news.filter((n) => !used.has(n.id) && Date.now() - new Date(n.publishedAt) < 6 * 3600e3);
    lead = fresh.find((n) => n.image) || news.find((n) => !used.has(n.id)) || null;
  }
  if (lead) used.add(lead.id);
  const rest = news.filter((n) => !used.has(n.id));

  return [...(lead ? [lead] : []), ...top, ...rest];
}

export function getCategory(slug) {
  return site.categories.find((c) => c.slug === slug) || site.categories[0];
}

export function byCategory(news, slug) {
  return news.filter((n) => n.category === slug);
}

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";
export const toBn = (v) => String(v).replace(/\d/g, (d) => BN_DIGITS[d]);

export function formatTime(iso) {
  try {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(d);
    const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }).format(d));
    const m = new Intl.DateTimeFormat("en-GB", { minute: "2-digit", timeZone: "Asia/Dhaka" }).format(d).padStart(2, "0");
    const part = h < 4 ? "রাত" : h < 12 ? "সকাল" : h < 15 ? "দুপুর" : h < 18 ? "বিকেল" : h < 20 ? "সন্ধ্যা" : "রাত";
    return toBn(`${date.replace(/,/g, "")}, ${part} ${h % 12 || 12}:${m}`);
  } catch {
    return "";
  }
}

/** সম্পর্কিত খবর: একই ট্যাগ বেশি মিললে আগে, তারপর একই বিভাগ, তারপর সর্বশেষ */
export function getRelated(item, news, n = 6) {
  const tags = new Set(item.tags || []);
  const scored = news
    .filter((x) => x.id !== item.id)
    .map((x) => {
      let s = 0;
      for (const t of x.tags || []) if (tags.has(t)) s += 3;
      if (x.category === item.category) s += 2;
      return { x, s };
    })
    .filter((o) => o.s > 0)
    .sort((a, b) => b.s - a.s || new Date(b.x.publishedAt) - new Date(a.x.publishedAt))
    .map((o) => o.x);
  const out = scored.slice(0, n);
  for (const x of news) {
    if (out.length >= n) break;
    if (x.id !== item.id && !out.includes(x)) out.push(x);
  }
  return out;
}

/** টিকারের লেখা: সেটিংসে "নিজে লিখব" বাছলে সেগুলো, না হলে সর্বশেষ খবর */
export function tickerItems(news) {
  const t = site.ticker;
  if (t.mode === "manual" && t.items?.length) {
    return t.items.filter(Boolean).map((title) => ({ title }));
  }
  return news.slice(0, 12).map((n) => ({ title: n.title, href: `/news/${n.id}` }));
}
