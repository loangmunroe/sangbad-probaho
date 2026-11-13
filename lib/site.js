import raw from "@/config/site.json";

// সেটিংসে কিছু খালি থাকলে এই ডিফল্ট মান কাজ করবে
export const FONT_PRESETS = {
  "hind-siliguri": { label: "হিন্দ শিলিগুড়ি (সংখ্যা ১ অনেকটা ৯-এর মতো দেখায়)", family: "'Hind Siliguri'", google: "Hind+Siliguri:wght@400;500;600;700" },
  solaimanlipi: { label: "সোলায়মান লিপি (বাংলাদেশি পত্রিকার পরিচিত ফন্ট)", family: "'SolaimanLipi', 'Noto Sans Bengali'", local: true },
  "noto-serif-bengali": { label: "নোটো সেরিফ বাংলা (পত্রিকার মতো, শিরোনামে সেরা)", family: "'Noto Serif Bengali'", google: "Noto+Serif+Bengali:wght@500;600;700;800" },
  "noto-sans-bengali": { label: "নোটো স্যান্স বাংলা (পরিষ্কার, লেখায় সেরা)", family: "'Noto Sans Bengali'", google: "Noto+Sans+Bengali:wght@400;500;600;700" },
  "tiro-bangla": { label: "তিরো বাংলা (ঐতিহ্যবাহী)", family: "'Tiro Bangla'", google: "Tiro+Bangla" },
  "anek-bangla": { label: "অনেক বাংলা (চওড়া, আধুনিক)", family: "'Anek Bangla'", google: "Anek+Bangla:wght@400;500;600;700" },
};

export const AD_SLOTS = {
  header: { label: "হেডারের নিচে (৭২৮×৯০)", size: "728 × 90" },
  home_top: { label: "প্রচ্ছদ: শীর্ষ খবরের পরে (৯৭০×৯০)", size: "970 × 90" },
  home_middle: { label: "প্রচ্ছদ: বিভাগগুলোর মাঝে (৯৭০×২৫০)", size: "970 × 250" },
  sidebar: { label: "পাশের কলাম (৩০০×২৫০)", size: "300 × 250" },
  article_inline: { label: "খবরের ভেতরে, ২য় অনুচ্ছেদের পরে (৩০০×২৫০)", size: "300 × 250" },
  article_bottom: { label: "খবরের শেষে (৭২৮×৯০)", size: "728 × 90" },
};

const DEFAULTS = {
  name: "সংবাদ প্রবাহ",
  tagline: "সত্য ও নিরপেক্ষ সংবাদ, সবার আগে",
  footerText: "সত্য ও নিরপেক্ষ সংবাদ, সবার আগে",
  logo: "",
  logoHeight: 46,
  favicon: "",
  deskName: "অনলাইন ডেস্ক",
  editor: "",
  publisher: "",
  phone: "",
  email: "",
  address: "",
  social: { facebook: "", youtube: "", x: "", instagram: "", tiktok: "", linkedin: "", telegram: "" },
  fontHeadline: "solaimanlipi",
  fontBody: "solaimanlipi",
  headlineScale: 100,
  bodySize: 18,
  about: "",
  privacy: "",
  ticker: { mode: "auto", items: [], speed: 60, label: "শিরোনাম" },
  ads: {},
};

export const site = {
  ...DEFAULTS,
  ...raw,
  social: { ...DEFAULTS.social, ...(raw.social || {}) },
  ticker: { ...DEFAULTS.ticker, ...(raw.ticker || {}) },
  ads: Object.fromEntries(Object.keys(AD_SLOTS).map((k) => [k, { enabled: false, image: "", link: "", html: "", ...(raw.ads?.[k] || {}) }])),
  tagline: raw.tagline && !/শীর্ষ পত্রিকাগুলোর খবর/.test(raw.tagline) ? raw.tagline : DEFAULTS.tagline,
};

export function fontStylesheets() {
  const keys = [...new Set([site.fontHeadline, site.fontBody])].map((k) => FONT_PRESETS[k] || FONT_PRESETS["noto-sans-bengali"]);
  const google = keys.filter((f) => f.google).map((f) => `family=${f.google}`);
  if (keys.some((f) => f.local)) google.push("family=Noto+Sans+Bengali:wght@400;600;700"); // বিকল্প হিসেবে
  const urls = [];
  if (google.length) urls.push(`https://fonts.googleapis.com/css2?${google.join("&")}&family=Inter:wght@400;500;600;700&display=swap`);
  else urls.push("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");
  keys.filter((f) => f.css).forEach((f) => urls.push(f.css));
  return urls;
}

export function fontVars() {
  const h = (FONT_PRESETS[site.fontHeadline] || FONT_PRESETS["noto-serif-bengali"]).family;
  const b = (FONT_PRESETS[site.fontBody] || FONT_PRESETS["noto-sans-bengali"]).family;
  return {
    "--f-head": `Inter, ${h}, sans-serif`,
    "--f-body": `Inter, ${b}, system-ui, sans-serif`,
    "--h-scale": String((Number(site.headlineScale) || 100) / 100),
    "--body-size": `${Number(site.bodySize) || 18}px`,
  };
}

/** খবরের নিচে কার নাম যাবে: নিজের খবরে প্রতিবেদক, অটো খবরে ডেস্ক */
export function bylineOf(item) {
  if (item.manual) return item.author || site.deskName;
  return site.deskName;
}
