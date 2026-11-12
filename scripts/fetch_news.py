"""
সংবাদ প্রবাহ — অটোমেটিক নিউজ ফেচার (Groq Version)

কী করে:
  1. config/site.json-এ থাকা প্রতিটি পত্রিকার RSS পড়ে (না পেলে Google News থেকে)
  2. নতুন খবরের মূল লেখা থেকে তথ্য নিয়ে Groq (Llama 3) দিয়ে নিজস্ব বাংলা সারাংশ লেখায়
  3. সূত্র ও মূল লিংকসহ data/news.json-এ সেভ করে
"""

import datetime as dt
import hashlib
import html
import json
import os
import re
import sys
import time
from pathlib import Path
from urllib.parse import quote_plus

import feedparser
import requests

ROOT = Path(__file__).resolve().parent.parent
CONFIG_PATH = ROOT / "config" / "site.json"
DATA_PATH = ROOT / "data" / "news.json"

UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
HEADERS = {"User-Agent": UA, "Accept-Language": "bn-BD,bn;q=0.9,en;q=0.8"}
TIMEOUT = 20

API_KEY = os.environ.get("GROQ_API_KEY", "").strip()

# Groq-এর ফ্রি প্ল্যানে প্রতিটা মডেলের আলাদা দৈনিক টোকেন সীমা থাকে (যেমন gpt-oss-120b: ২ লাখ/দিন, ৮ হাজার/মিনিট)।
# তাই একটার সীমা শেষ হলে পরেরটায় চলে যায়। GROQ_MODEL দিলে সেটা সবার আগে চেষ্টা হবে।
DEFAULT_MODELS = [
    "openai/gpt-oss-120b",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
]
_first = (os.environ.get("GROQ_MODEL") or "").strip()
MODELS = ([_first] if _first else []) + [m for m in DEFAULT_MODELS if m != _first]
_dead_models = set()   # এই রানে যেগুলোর দৈনিক সীমা শেষ বা মডেল আর নেই
TPM_BUDGET = 7000      # প্রতি মিনিটে এর বেশি টোকেন না পাঠানোর চেষ্টা
_last_call = {"t": 0.0, "tokens": 0}


def log(*a):
    print(*a, flush=True)


def now_utc():
    return dt.datetime.now(dt.timezone.utc)


def make_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


def strip_html(s: str) -> str:
    s = re.sub(r"<[^>]+>", " ", s or "")
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


# ---------------------------------------------------------------- feeds

def parse_feed(url: str):
    try:
        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return []
        return feedparser.parse(r.content).entries or []
    except Exception as e:  # noqa: BLE001
        log(f"   ! feed error {url}: {e}")
        return []


def entry_time(e) -> dt.datetime:
    for key in ("published_parsed", "updated_parsed"):
        t = e.get(key)
        if t:
            return dt.datetime(*t[:6], tzinfo=dt.timezone.utc)
    return now_utc()


def decode_google_link(url: str) -> str | None:
    try:
        from googlenewsdecoder import gnewsdecoder

        res = gnewsdecoder(url, interval=1)
        if res.get("status"):
            return res["decoded_url"]
    except Exception as e:  # noqa: BLE001
        log(f"   ! google link decode failed: {e}")
    return None


def get_source_entries(src: dict):
    """Return list of dicts: title, link, summary, published."""
    items = []
    for url in src.get("rss", []):
        entries = parse_feed(url)
        if entries:
            log(f"   ✓ RSS {url} → {len(entries)}")
            for e in entries[:25]:
                link = e.get("link")
                if not link:
                    continue
                items.append({
                    "title": strip_html(e.get("title", "")),
                    "link": link,
                    "summary": strip_html(e.get("summary", "")),
                    "published": entry_time(e),
                    "google": False,
                })
            return items

    # Fallback: Google News search feed for this site
    if src.get("site"):
        q = quote_plus(f"site:{src['site']} when:1d")
        gurl = f"https://news.google.com/rss/search?q={q}&hl=bn&gl=BD&ceid=BD:bn"
        entries = parse_feed(gurl)
        log(f"   ↺ Google News fallback → {len(entries)}")
        for e in entries[:25]:
            title = strip_html(e.get("title", ""))
            title = re.sub(r"\s+-\s+[^-]+$", "", title)  # remove " - পত্রিকার নাম"
            items.append({
                "title": title,
                "link": e.get("link"),
                "summary": "",
                "published": entry_time(e),
                "google": True,
            })
    return items


# ---------------------------------------------------------- article text

def fetch_article_text(url: str) -> str:
    try:
        import trafilatura

        r = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        if r.status_code != 200:
            return ""
        text = trafilatura.extract(
            r.text, include_comments=False, include_tables=False, favor_precision=True
        )
        return (text or "").strip()
    except Exception as e:  # noqa: BLE001
        log(f"   ! article fetch failed: {e}")
        return ""


# ---------------------------------------------------------------- groq

_client = None

def get_groq_client():
    global _client
    if _client is None:
        from groq import Groq
        _client = Groq(api_key=API_KEY)
    return _client


def build_prompt(title: str, text: str, source_name: str, categories: list, recent: list) -> str:
    cat_list = ", ".join(f'"{c["slug"]}" ({c["name"]})' for c in categories)
    recent_block = "\n".join(f'{n["id"]}: {n["title"]}' for n in recent) or "(নেই)"
    return f"""তুমি একটি বাংলাদেশি অনলাইন পত্রিকার অভিজ্ঞ সম্পাদক।

প্রথমে দেখো: নিচের "ইতিমধ্যে প্রকাশিত" তালিকার কোনো খবর আর এই নতুন খবরটি কি একই ঘটনা নিয়ে?
(একই ঘটনা = একই ঘটনা/ঘোষণা/ম্যাচ/দুর্ঘটনা, শুধু ভিন্ন পত্রিকার ভাষায়। একই বিষয়ের ভিন্ন ঘটনা হলে ডুপ্লিকেট নয়।)
হলে "duplicate_of"-এ সেই খবরের id দাও এবং বাকি ঘরগুলো খালি রাখতে পারো। না হলে null দাও।

ইতিমধ্যে প্রকাশিত:
{recent_block}

তারপর (ডুপ্লিকেট না হলে) সংবাদটি লেখো:
নিচের প্রতিবেদনটি "{source_name}" থেকে নেওয়া। এর তথ্য ব্যবহার করে আমাদের পাঠকদের জন্য একটি সংক্ষিপ্ত সংবাদ লেখো।

নিয়ম:
- সম্পূর্ণ নিজের ভাষায় লিখবে। মূল লেখার কোনো বাক্য হুবহু বা প্রায় হুবহু নেবে না।
- শুধু মূল লেখায় থাকা তথ্য ব্যবহার করবে। নিজে থেকে কোনো তথ্য, সংখ্যা, নাম বা উদ্ধৃতি যোগ করবে না।
- ২ থেকে ৪টি ছোট অনুচ্ছেদ, মোট ১২০–২২০ শব্দ। প্রথম অনুচ্ছেদে মূল খবর।
- প্রমিত বাংলা, নিরপেক্ষ সংবাদের ভাষা।
- লেখায় কোনো সংবাদমাধ্যম, পত্রিকা বা টিভি চ্যানেলের নাম উল্লেখ করবে না (যেমন "প্রথম আলোকে বলেন" না লিখে শুধু "বলেন")।
- নতুন একটি শিরোনাম দেবে (মূল শিরোনাম হুবহু নয়), ১২ শব্দের মধ্যে।
- category অবশ্যই এগুলোর একটি: {cat_list}
- image_subject: খবরের কেন্দ্রে কোনো সুপরিচিত ব্যক্তি, স্থাপনা বা জায়গা থাকলে তার ইংরেজি নাম (যেমন "Jatiya Sangsad Bhaban", "Shakib Al Hasan"), না থাকলে null।
- image_query: খবরের বিষয় বোঝায় এমন একটি সাধারণ ছবির জন্য ২–৪ শব্দের ইংরেজি সার্চ (যেমন "flood rescue boat", "classroom students", "stock market screen")। কোনো ব্যক্তির নাম দেবে না।

শুধু এই JSON ফেরত দাও:
{{"duplicate_of": null, "title": "...", "excerpt": "এক বাক্যের সারকথা", "paragraphs": ["...", "..."], "category": "slug", "image_subject": null, "image_query": "..."}}

মূল শিরোনাম: {title}

মূল লেখা:
{text[:3000]}
"""


def _pace():
    """মিনিটপ্রতি টোকেন সীমা (TPM) পার না করতে আগের কলের আকার বুঝে অপেক্ষা।"""
    need = 60.0 * _last_call["tokens"] / TPM_BUDGET
    gap = time.time() - _last_call["t"]
    if gap < need:
        time.sleep(need - gap)


def _call_groq(model, prompt):
    kwargs = dict(
        model=model,
        messages=[
            {"role": "system", "content": "You are a professional Bengali news editor. Output only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.4,
        max_completion_tokens=1800,
        response_format={"type": "json_object"},
    )
    if "gpt-oss" in model:
        kwargs["reasoning_effort"] = "low"  # কম চিন্তা = কম টোকেন খরচ
    _pace()
    resp = get_groq_client().chat.completions.create(**kwargs)
    used = getattr(getattr(resp, "usage", None), "total_tokens", 0) or 3000
    _last_call.update(t=time.time(), tokens=used)
    return resp.choices[0].message.content


def summarize(title, text, source_name, categories, recent):
    prompt = build_prompt(title, text, source_name, categories, recent)
    recent_ids = {n["id"] for n in recent}
    for model in MODELS:
        if model in _dead_models:
            continue
        for attempt in range(2):
            try:
                data = json.loads(_call_groq(model, prompt))
                if isinstance(data, list):
                    data = data[0]
                dup = data.get("duplicate_of")
                if dup and dup in recent_ids:
                    return {"duplicate_of": dup}
                paras = [p.strip() for p in data.get("paragraphs", []) if p and p.strip()]
                if not data.get("title") or not paras:
                    raise ValueError("empty AI output")
                slugs = {c["slug"] for c in categories}
                cat = data.get("category") if data.get("category") in slugs else categories[0]["slug"]
                return {
                    "title": data["title"].strip(),
                    "excerpt": (data.get("excerpt") or paras[0][:160]).strip(),
                    "paragraphs": paras,
                    "category": cat,
                    "_image_subject": (data.get("image_subject") or "").strip() or None,
                    "_image_query": (data.get("image_query") or "").strip() or None,
                }
            except Exception as e:  # noqa: BLE001
                msg = str(e)
                code = getattr(e, "status_code", None)
                low = msg.lower()
                if "tokens per day" in low or "requests per day" in low or "(tpd)" in low or "(rpd)" in low:
                    log(f"   ! {model}: আজকের সীমা শেষ, পরের মডেলে যাচ্ছি")
                    _dead_models.add(model)
                    break
                if code in (400, 404) and ("model" in low and ("not found" in low or "decommission" in low or "does not exist" in low)):
                    log(f"   ! {model}: মডেল পাওয়া যায়নি, বাদ")
                    _dead_models.add(model)
                    break
                if code == 413 or "request too large" in low:
                    log(f"   ! {model}: লেখা বেশি বড়, পরের মডেলে যাচ্ছি")
                    break
                wait = 60 if (code == 429 or "429" in msg) else 5
                log(f"   ! {model} error (try {attempt + 1}): {msg[:160]}")
                time.sleep(wait)
    return None


# ------------------------------------------------------------ duplicates

STOP = set("""ও এ এর করে করা করেছে হয় হয়েছে হবে না নয় এক একটি জন্য থেকে দিয়ে নিয়ে সঙ্গে সাথে বলে
বললেন যে তার তাদের এই সেই কি কী আর বা আজ গতকাল মধ্যে পর আগে নতুন বিরুদ্ধে প্রতি""".split())


def tokens(s: str) -> set:
    s = re.sub(r"[^\w\s]", " ", s or "")
    return {w for w in s.split() if len(w) > 1 and w not in STOP}


def similar(a: str, b: str) -> float:
    ta, tb = tokens(a), tokens(b)
    if not ta or not tb or len(ta & tb) < 3:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def lexical_duplicate(title: str, recent: list):
    best, best_score = None, 0.0
    for n in recent:
        score = max(similar(title, n.get("originalTitle", "")), similar(title, n["title"]))
        if score > best_score:
            best, best_score = n, score
    return best if best_score >= 0.6 else None


def mark_also(item: dict, src: dict, url: str):
    also = item.setdefault("alsoReportedBy", [])
    if src["name"] != item.get("source") and all(a["name"] != src["name"] for a in also):
        also.append({"name": src["name"], "url": url})


# ---------------------------------------------------------------- images

WIKI_UA = "SangbadProbahoBot/1.0 (news aggregator; contact via GitHub repo)"
JUNK = re.compile(r"map|logo|flag|coat.of.arms|seal|emblem|diagram|chart|graph|icon|signature|locator|svg|banner|poster|stamp", re.I)
FREE_FIRST = ("pd", "public domain", "cc0", "cc-zero")


def wikimedia_image(subject: str, used: set, strict: bool = True):
    """
    Wikimedia Commons থেকে মুক্ত লাইসেন্সের আসল ছবি।
    strict=True: ফাইলের নামে ব্যক্তি/জায়গার নাম থাকতেই হবে (ভুল মানুষের ছবি এড়াতে)।
    পাবলিক ডোমেইন / CC0 ছবি আগে, বড় ও আড়াআড়ি ছবি আগে।
    """
    try:
        r = requests.get(
            "https://commons.wikimedia.org/w/api.php",
            params={
                "action": "query", "format": "json", "generator": "search",
                "gsrsearch": f"{subject} filetype:bitmap", "gsrnamespace": 6, "gsrlimit": 20,
                "prop": "imageinfo", "iiprop": "url|extmetadata|size", "iiurlwidth": 1280,
            },
            headers={"User-Agent": WIKI_UA}, timeout=TIMEOUT,
        )
        pages = (r.json().get("query", {}).get("pages", {}) or {}).values()
        key_words = {w.lower() for w in re.findall(r"[A-Za-z]{3,}", subject) if w.lower() not in {"the", "and", "bangladesh"}}
        candidates = []
        for p in pages:
            info = (p.get("imageinfo") or [{}])[0]
            title = p.get("title", "").lower()
            url = info.get("thumburl") or info.get("url")
            w, h = info.get("width", 0), info.get("height", 0)
            if not url or url in used or not re.search(r"\.(jpe?g|png|webp)$", title):
                continue
            if JUNK.search(title) or w < 900 or h < 500:
                continue
            hits = sum(1 for k in key_words if k in title)
            if strict and key_words and hits == 0:
                continue  # নাম না মিললে ভুল ছবির ঝুঁকি, বাদ
            if not strict and key_words and hits == 0:
                continue
            meta = info.get("extmetadata", {})
            lic = strip_html(meta.get("LicenseShortName", {}).get("value", ""))
            artist = strip_html(meta.get("Artist", {}).get("value", ""))[:50]
            free = any(f in lic.lower() for f in FREE_FIRST)
            score = hits * 10 + (5 if free else 0) + (3 if w >= h * 1.2 else 0) + min(w, 3000) / 1000 - p.get("index", 20) / 10
            credit = "উইকিমিডিয়া কমন্স" if free else ", ".join(x for x in [artist, lic] if x) or "উইকিমিডিয়া কমন্স"
            candidates.append((score, {
                "image": url,
                "imageCaption": "ফাইল ছবি" if strict else "প্রতীকী ছবি",
                "imageCredit": credit,
            }))
        if candidates:
            candidates.sort(key=lambda c: -c[0])
            return candidates[0][1]
    except Exception as e:  # noqa: BLE001
        log(f"   ! wikimedia: {e}")
    return None


def find_image(subject, query, used: set, category: str = ""):
    """
    শুধু Wikimedia Commons-এর মুক্ত লাইসেন্সের আসল ছবি (স্টক ফটো নয়)।
    আগে খবরের মূল ব্যক্তি/জায়গার নাম দিয়ে খোঁজে, না পেলে বিষয়ের শব্দ দিয়ে।
    কিছু না মিললে খবর ছবি ছাড়াই যায়, সাইট সেটা সুন্দরভাবে দেখায়।
    """
    img = None
    if subject:
        img = wikimedia_image(subject, used)
    if not img and query:
        img = wikimedia_image(f"{query} Bangladesh", used, strict=False)
    return img or {}


# ------------------------------------------------------------------ main

def main():
    log(f"মডেল ক্রম: {', '.join(MODELS)}")
    if not API_KEY:
        log("GROQ_API_KEY সেট করা নেই। GitHub → Settings → Secrets-এ যোগ করুন।")
        sys.exit(1)

    cfg = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    categories = cfg["categories"]
    news = json.loads(DATA_PATH.read_text(encoding="utf-8")) if DATA_PATH.exists() else []

    seen = {n["sourceUrl"] for n in news} | {n.get("feedUrl") for n in news}
    seen_titles = {n.get("originalTitle", "").strip() for n in news}

    # 1) collect candidates per source
    per_source = []
    for src in cfg["sources"]:
        if src.get("enabled") is False:
            continue
        log(f"→ {src['name']}")
        fresh = [
            it for it in get_source_entries(src)
            if it["link"] and it["link"] not in seen and it["title"] not in seen_titles
        ]
        fresh.sort(key=lambda x: x["published"], reverse=True)
        per_source.append((src, fresh))

    # 2) round-robin so every paper gets a turn
    queue = []
    while any(lst for _, lst in per_source):
        for src, lst in per_source:
            if lst:
                queue.append((src, lst.pop(0)))

    limit = int(os.environ.get("MAX_NEW", cfg.get("maxNewPerRun", 12)))
    added = 0
    for src, it in queue:
        if added >= limit:
            break
        feed_url = it["link"]
        url = feed_url
        if it["google"]:
            url = decode_google_link(feed_url)
            if not url:
                continue
        if url in seen:
            continue

        log(f"  • {it['title'][:70]}")
        recent_cut = now_utc() - dt.timedelta(hours=36)
        recent = [n for n in news if dt.datetime.fromisoformat(n["fetchedAt"]) >= recent_cut]

        # ধাপ ১: শিরোনামের শব্দ মিলিয়ে দ্রুত ডুপ্লিকেট চেক
        dup = lexical_duplicate(it["title"], recent)
        if dup:
            log(f"   ↳ ডুপ্লিকেট (শব্দ মিল): {dup['title'][:50]}")
            mark_also(dup, src, url)
            seen.update({url, feed_url})
            continue

        text = fetch_article_text(url)
        if len(text) < 300 and len(it["summary"]) > len(text):
            text = it["summary"]
        if len(text) < 150:
            log("   (যথেষ্ট লেখা পাওয়া যায়নি, বাদ)")
            seen.add(url)
            continue

        # ধাপ ২: Groq একই কলে ঘটনা মিলিয়ে দেখে + লেখে
        ai = summarize(it["title"], text, src["name"], categories, recent[:40])
        if not ai:
            continue
        if ai.get("duplicate_of"):
            target = next((n for n in news if n["id"] == ai["duplicate_of"]), None)
            if target:
                log(f"   ↳ ডুপ্লিকেট (একই ঘটনা): {target['title'][:50]}")
                mark_also(target, src, url)
            seen.update({url, feed_url})
            continue

        used_images = {n.get("image") for n in news if n.get("image")}
        image = find_image(ai.pop("_image_subject"), ai.pop("_image_query"), used_images, ai["category"])

        news.append({
            "id": make_id(url),
            **ai,
            **image,
            "source": src["name"],
            "sourceId": src["id"],
            "sourceUrl": url,
            "feedUrl": feed_url,
            "originalTitle": it["title"],
            "publishedAt": it["published"].isoformat(),
            "fetchedAt": now_utc().isoformat(),
        })
        seen.add(url)
        seen.add(feed_url)
        added += 1

    # স্টক ফটো (Unsplash/Pexels) আর ব্যবহার হয় না, পুরনো খবর থেকেও সরানো
    for n in news:
        if re.search(r"unsplash\.com|pexels\.com", n.get("image") or ""):
            for k in ("image", "imageCaption", "imageCredit", "imageCreditUrl"):
                n.pop(k, None)

    # 3) prune & save
    cutoff = now_utc() - dt.timedelta(days=cfg.get("keepDays", 7))
    news = [n for n in news if dt.datetime.fromisoformat(n["fetchedAt"]) >= cutoff]
    news.sort(key=lambda n: n["fetchedAt"], reverse=True)
    news = news[: cfg.get("maxItems", 800)]

    DATA_PATH.write_text(json.dumps(news, ensure_ascii=False, indent=1), encoding="utf-8")
    log(f"\nনতুন খবর যোগ হয়েছে: {added} | মোট: {len(news)}")


if __name__ == "__main__":
    main()
