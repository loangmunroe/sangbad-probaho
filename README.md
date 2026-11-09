# সংবাদ প্রবাহ: সেটআপ গাইড (ধাপে ধাপে)

সব কিছু ফ্রি। প্রথমবার সেটআপ করতে মোটামুটি ২০–৩০ মিনিট লাগবে।

```
প্রতি ৩০ মিনিটে:  GitHub Actions → পত্রিকার RSS → Gemini লেখে → data/news.json কমিট
                                                                   ↓
অ্যাডমিন প্যানেল (/admin) → GitHub-এ সেভ ─────────────→ Vercel নিজে থেকে সাইট আপডেট করে
```

---

## ধাপ ১: যা যা জোগাড় করবেন

| জিনিস | কোথায় পাবেন | কোথায় বসবে |
|---|---|---|
| Gemini API key | https://aistudio.google.com/apikey | GitHub Secret ও Vercel |
| Unsplash Access Key (ছবির জন্য) | https://unsplash.com/developers → Your apps → New Application → **Access Key** | GitHub Secret |
| GitHub টোকেন | নিচে ধাপ ৪-এ দেখুন | Vercel |
| অ্যাডমিন পাসওয়ার্ড | নিজে একটা শক্ত পাসওয়ার্ড বানান | Vercel |

---

## ধাপ ২: GitHub-এ রিপো বানানো ও ফাইল আপলোড

1. github.com → **New repository** → নাম দিন, যেমন `sangbad-probaho`
2. **Public** রাখার পরামর্শ দিচ্ছি। Public রিপোতে GitHub Actions আনলিমিটেড ফ্রি। Private রিপোতে মাসে ২০০০ মিনিট পাওয়া যায়, প্রতি ৩০ মিনিটে চালালে সেটা মাসের মাঝামাঝি শেষ হয়ে যেতে পারে। আপনার API key-গুলো Secrets-এ থাকবে, তাই Public রাখলেও কেউ দেখতে পাবে না।
3. **Create repository** চাপুন
4. zip খুলে ভেতরের সব ফাইল আপলোড করুন:
   - সবচেয়ে সহজ উপায় [GitHub Desktop](https://desktop.github.com/)
   - অথবা ওয়েবসাইটে **Add file → Upload files**-এ ফোল্ডারের সব কিছু টেনে আনুন
5. ⚠️ **`.github` ফোল্ডারটা আপলোড হয়েছে কিনা দেখে নিন।** এটা লুকানো ফোল্ডার, অনেক সময় বাদ পড়ে যায়। না থাকলে:
   **Add file → Create new file** → নাম লিখুন `.github/workflows/fetch-news.yml` → zip-এর ওই ফাইলের লেখা কপি করে পেস্ট করুন → Commit

---

## ধাপ ৩: GitHub Secrets যোগ করা

রিপো → **Settings → Secrets and variables → Actions → New repository secret**

| Name | Value |
|---|---|
| `GEMINI_API_KEY` | আপনার Gemini key |
| `UNSPLASH_ACCESS_KEY` | আপনার Unsplash Access Key (না দিলেও চলবে, তখন শুধু Wikimedia ছবি দেখাবে) |
| `PEXELS_API_KEY` | ঐচ্ছিক। Pexels key থাকলে দ্বিতীয় উৎস হিসেবে কাজ করবে |

তারপর **Settings → Actions → General → Workflow permissions**-এ গিয়ে **Read and write permissions** সিলেক্ট করে Save করুন।

---

## ধাপ ৪: GitHub টোকেন বানানো (অ্যাডমিন প্যানেলের জন্য)

1. github.com → ডান কোণে ছবি → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Token name:** `sangbad-admin`
3. **Expiration:** ১ বছর বা যেটা চান
4. **Repository access:** *Only select repositories* → আপনার রিপো
5. **Permissions → Repository permissions → Contents:** **Read and write**
6. **Generate token** চাপুন, তারপর টোকেনটা কপি করে রাখুন। এটা আর একবারই দেখাবে।

---

## ধাপ ৫: Vercel-এ ডিপ্লয়

1. vercel.com → **Continue with GitHub** দিয়ে লগইন
2. **Add New → Project** → আপনার রিপো → **Import**
3. **Environment Variables** খুলে এগুলো যোগ করুন:

| Name | Value |
|---|---|
| `ADMIN_PASSWORD` | আপনার অ্যাডমিন পাসওয়ার্ড |
| `GITHUB_TOKEN` | ধাপ ৪-এর টোকেন |
| `GITHUB_REPO` | `আপনার-username/sangbad-probaho` |
| `GITHUB_BRANCH` | `main` |
| `GEMINI_API_KEY` | আপনার Gemini key (অ্যাডমিনের "AI দিয়ে রিরাইট"-এর জন্য) |

4. **Deploy** চাপুন। ১–২ মিনিটে সাইট লাইভ হবে, ঠিকানা হবে `xxx.vercel.app`

> পরে কোনো Environment Variable বদলালে Vercel → Deployments → সর্বশেষটায় **⋯ → Redeploy** করতে হবে।

---

## ধাপ ৬: প্রথমবার নিউজ আনা

1. GitHub রিপো → **Actions** ট্যাব। "workflows aren't being run" ধরনের কিছু দেখালে **Enable** চাপুন
2. বাঁ পাশে **Fetch news** → **Run workflow** → **Run workflow**
3. ২–৪ মিনিট পর সবুজ ✓ দেখাবে। তারপর Vercel নিজে থেকে নতুন ডিপ্লয় করবে, আর সাইটে খবর চলে আসবে
4. এরপর থেকে প্রতি ৩০ মিনিটে এটা নিজে নিজে চলবে

> GitHub-এর শিডিউল মাঝে মাঝে ৫–১৫ মিনিট দেরিতে চলে। এটা স্বাভাবিক।

---

## অ্যাডমিন প্যানেল: `আপনার-সাইট.vercel.app/admin`

| ট্যাব | কী করা যায় |
|---|---|
| **সব খবর** | সার্চ ও ফিল্টার। 📌 পিন (প্রধান বা শীর্ষ খবর, ৩–৭২ ঘণ্টা বা নিজের সময়)। অটো খবর লুকানো। ছবি বদলানো। নিজের খবর এডিট ও ডিলিট |
| **নতুন খবর** | শিরোনাম, সারকথা, লেখা, ক্যাটাগরি, ছবি আপলোড, ক্যাপশন, প্রতিবেদক, সূত্র, ট্যাগ, প্রকাশের সময়। খসড়া বা প্রকাশ। প্রকাশের সাথে পিন। **AI দিয়ে রিরাইট:** লেখা বা লিংক পেস্ট করুন |
| **পিন করা** | কোনগুলো পিন আছে আর কতক্ষণ বাকি |
| **লুকানো** | লুকানো খবর আবার দেখানো |
| **সেটিংস** | সাইটের নাম ও ট্যাগলাইন, পত্রিকা চালু/বন্ধ বা যোগ, প্রতিবারে কত খবর আসবে, কত দিন থাকবে |

অ্যাডমিনে যা সেভ করবেন তা সাইটে দেখাতে **১–২ মিনিট** লাগবে, কারণ Vercel নতুন করে বিল্ড করে।
পিনের সময় শেষ হলে খবরটা ৫ মিনিটের মধ্যে নিজে থেকে নিচে নেমে যাবে।

---

## অটোমেশন কীভাবে কাজ করে

- **উৎস:** `config/site.json`-এর পত্রিকাগুলোর RSS। কোনো পত্রিকার RSS না পেলে Google News থেকে ওই সাইটের খবর নেয়
- **ডুপ্লিকেট আটকানো:** প্রথমে শিরোনামের শব্দ মেলানো হয়, তারপর Gemini গত ৩৬ ঘণ্টার খবরের সাথে মিলিয়ে দেখে একই ঘটনা কিনা। একই ঘটনা হলে নতুন পোস্ট হয় না, আগের খবরে "আরও প্রকাশ করেছে" অংশে যোগ হয়
- **লেখা:** Gemini নতুন শিরোনাম, সারকথা আর ২–৪ অনুচ্ছেদ নিজস্ব ভাষায় লেখে, ক্যাটাগরিও ঠিক করে
- **ছবি:** পরিচিত ব্যক্তি বা জায়গা থাকলে Wikimedia Commons থেকে "ফাইল ছবি"। না হলে Unsplash (বা Pexels) থেকে "প্রতীকী ছবি", ক্রেডিটসহ। কিছু না মিললে ক্যাটাগরির রঙিন কার্ড
- **পরিষ্কার রাখা:** `keepDays` (ডিফল্ট ৭) দিনের পুরনো অটো খবর মুছে যায়। নিজের লেখা খবর কখনো নিজে থেকে মোছে না

---

## কাস্টমাইজ

- **Gemini মডেল বদলাতে:** GitHub → Settings → Secrets and variables → Actions → **Variables** ট্যাব → `GEMINI_MODEL` = যেমন `gemini-2.5-pro`। ডিফল্ট হলো `gemini-2.5-flash`, যেটা দ্রুত আর এই কাজের জন্য যথেষ্ট
- **কত ঘন ঘন চলবে:** `.github/workflows/fetch-news.yml`-এ `*/30 * * * *`। ঘণ্টায় একবার চালাতে চাইলে লিখুন `0 * * * *`
- **ক্যাটাগরি, রং, পত্রিকা:** `config/site.json`
- **ডিজাইন:** `app/globals.css`

---

## সমস্যা হলে

| সমস্যা | সমাধান |
|---|---|
| Actions-এ লাল ✗ | ক্লিক করে লগ দেখুন। "GEMINI_API_KEY সেট করা নেই" দেখালে ধাপ ৩ আবার দেখুন |
| push-এ 403 error | ধাপ ৩-এর *Read and write permissions* চালু করুন |
| কোনো পত্রিকা থেকে খবর আসছে না | লগে "✓ RSS" না দেখালে Google News fallback চলছে। অ্যাডমিন → সেটিংসে সঠিক RSS লিংক দিন |
| অ্যাডমিনে "GITHUB_TOKEN … সেট করা নেই" | ধাপ ৫-এর Environment Variables দিন, তারপর Redeploy করুন |
| অ্যাডমিনে 404 / 401 GitHub error | `GITHUB_REPO` বানান ঠিক আছে কিনা, আর টোকেনে *Contents: Read and write* আছে কিনা দেখুন |
| Gemini 429 error | রেট লিমিট। অ্যাডমিন → সেটিংসে "প্রতিবারে সর্বোচ্চ নতুন খবর" কমিয়ে দিন |

---

## লোকালি চালাতে (ঐচ্ছিক)

```bash
npm install
npm run dev                       # http://localhost:3000

pip install -r scripts/requirements.txt
GEMINI_API_KEY=xxx python scripts/fetch_news.py
```
