import site from "@/config/site.json";
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
  if (!lead) lead = news.find((n) => !used.has(n.id)) || null;
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
