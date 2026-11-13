"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/* ---------------- helpers ---------------- */
const BN = "০১২৩৪৫৬৭৮৯";
const bn = (v) => String(v).replace(/\d/g, (d) => BN[d]);
const fmt = (iso) => {
  try {
    return new Intl.DateTimeFormat("bn-BD", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(iso));
  } catch { return ""; }
};
const left = (iso) => {
  const ms = new Date(iso) - Date.now();
  if (ms <= 0) return "শেষ";
  const h = Math.floor(ms / 3600e3), m = Math.floor((ms % 3600e3) / 60e3);
  return h ? `${bn(h)} ঘ. ${bn(m)} মি. বাকি` : `${bn(m)} মি. বাকি`;
};
const toLocalInput = (iso) => {
  const d = iso ? new Date(iso) : new Date();
  const off = d.getTimezoneOffset();
  return new Date(d - off * 60e3).toISOString().slice(0, 16);
};
const HOURS = [3, 6, 12, 24, 48, 72];

async function api(path, method = "GET", body) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `সমস্যা (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

function resizeImage(file, max = 1600, type = "image/jpeg") {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL(type, 0.85));
      URL.revokeObjectURL(img.src);
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

const EMPTY_POST = {
  id: null, title: "", excerpt: "", body: "", category: "national", image: "", imageCaption: "",
  author: "নিজস্ব প্রতিবেদক", source: "", sourceUrl: "", tags: "", publishedAt: "", status: "published",
  pinHours: 0, pinPosition: "top",
};

/* ---------------- main ---------------- */
export default function Admin() {
  const [auth, setAuth] = useState(null); // null = checking
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("list");
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(EMPTY_POST);
  const [me, setMe] = useState(null);

  const notify = (msg, bad = false) => {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), bad ? 6000 : 3500);
  };

  const load = useCallback(async () => {
    try {
      const [d, who] = await Promise.all([api("/api/admin/data"), api("/api/admin/me")]);
      setData(d);
      setMe(who);
      setAuth(true);
    } catch (e) {
      if (e.status === 401) setAuth(false);
      else { setAuth(true); notify(e.message, true); }
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (auth === null) return <div className="adm-center">লোড হচ্ছে…</div>;
  if (auth === false) return <Login onDone={load} />;

  const categories = data?.config?.categories || [];
  const startEdit = (p) => {
    setEditing(p ? {
      ...EMPTY_POST, ...p,
      body: (p.paragraphs || []).join("\n\n"),
      tags: (p.tags || []).join(", "),
      publishedAt: toLocalInput(p.publishedAt),
    } : { ...EMPTY_POST, publishedAt: toLocalInput() });
    setTab("edit");
  };

  return (
    <div className="adm-shell">
      <aside className="adm-side">
        <div className="adm-brand">
          <span className="adm-mark" aria-hidden="true">
            <svg viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="#006a4e" /><path d="M7 14c4.3-4 8.7-4 13 0s8.7 4 13 0M7 21c4.3-4 8.7-4 13 0s8.7 4 13 0" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" /><path d="M7 28c4.3-4 8.7-4 13 0s8.7 4 13 0" stroke="#e1251b" strokeWidth="3.2" fill="none" strokeLinecap="round" /></svg>
          </span>
          <span className="adm-brand-t">{data?.config?.name || "সংবাদ"}<small>পরিচালনা প্যানেল</small></span>
        </div>
        <nav className="adm-tabs" aria-label="অ্যাডমিন মেনু">
          {[
            ["list", "সব খবর", "M4 5h16M4 10h16M4 15h10M4 20h7"],
            ["edit", editing.id ? "খবর এডিট" : "নতুন খবর", "M12 5v14M5 12h14"],
            ["pins", "পিন করা", "M9 4h6l-1 6 4 3v2H6v-2l4-3-1-6zM12 15v6"],
            ["hidden", "লুকানো", "M3 3l18 18M10.6 10.6a3 3 0 0 0 4.2 4.2M9.9 5.1A10 10 0 0 1 22 12a14 14 0 0 1-2.2 3.2M6.6 6.6A14 14 0 0 0 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6"],
            ...(me?.role === "admin" ? [
              ["visitors", "ভিজিটর", "M4 20V10M10 20V4M16 20v-7M22 20H2"],
              ["settings", "সেটিংস", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
              ["users", "ইউজার", "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"],
            ] : []),
          ].map(([k, label, d]) => (
            <button key={k} className={tab === k ? "on" : ""} aria-current={tab === k ? "page" : undefined}
              onClick={() => (k === "edit" && tab !== "edit" && !editing.id ? startEdit(null) : setTab(k))}>
              <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="adm-user">
          <span className="adm-avatar" aria-hidden="true">{(me?.name || "অ").trim().charAt(0)}</span>
          <span className="adm-user-t">{me?.name}<small>{me?.role === "admin" ? "অ্যাডমিন" : "সম্পাদক"}</small></span>
          <a href="/" target="_blank" rel="noreferrer" className="adm-user-btn" title="সাইট দেখুন" aria-label="সাইট দেখুন">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
          </a>
          <button className="adm-user-btn" title="লগআউট" aria-label="লগআউট" onClick={async () => { await api("/api/admin/logout", "POST"); setAuth(false); }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </aside>

      <main className="adm-main">
        {!data ? <div className="adm-center">লোড হচ্ছে…</div> : (
          <>
            {tab === "list" && <NewsList data={data} categories={categories} reload={load} notify={notify} onEdit={startEdit} />}
            {tab === "edit" && (
              <Editor key={editing.id || "new"} initial={editing} categories={categories} notify={notify}
                onSaved={async () => { await load(); setEditing(EMPTY_POST); setTab("list"); }}
                onCancel={() => { setEditing(EMPTY_POST); setTab("list"); }} />
            )}
            {tab === "pins" && <Pins data={data} reload={load} notify={notify} />}
            {tab === "hidden" && <Hidden data={data} reload={load} notify={notify} />}
            {tab === "settings" && me?.role === "admin" && <Settings config={data.config} reload={load} notify={notify} />}
            {tab === "users" && me?.role === "admin" && <Users notify={notify} />}
            {tab === "visitors" && me?.role === "admin" && <Visitors />}
          </>
        )}
      </main>

      {toast && <div className={`adm-toast ${toast.bad ? "bad" : ""}`}>{toast.msg}</div>}
    </div>
  );
}

/* ---------------- login ---------------- */
function Login({ onDone }) {
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        try { await api("/api/admin/login", "POST", { username: user, password: pw }); onDone(); }
        catch (e2) { setErr(e2.message); }
        setBusy(false);
      }}>
        <h1>অ্যাডমিন লগইন</h1>
        <input placeholder="ইউজারনেম (মূল অ্যাডমিন হলে admin)" value={user} onChange={(e) => setUser(e.target.value)} autoFocus autoCapitalize="none" autoComplete="username" />
        <input type="password" placeholder="পাসওয়ার্ড" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
        {err && <p className="adm-err">{err}</p>}
        <button disabled={busy || !pw}>{busy ? "যাচাই হচ্ছে…" : "প্রবেশ করুন"}</button>
      </form>
    </div>
  );
}

/* ---------------- list ---------------- */
function NewsList({ data, categories, reload, notify, onEdit }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(null); // {id, kind: 'pin'|'image'}
  const [busy, setBusy] = useState("");

  const pins = useMemo(() => {
    const m = new Map();
    (data.controls.pins || []).filter((p) => new Date(p.until) > Date.now()).forEach((p) => m.set(p.id, p));
    return m;
  }, [data]);
  const hidden = useMemo(() => new Set(data.controls.hidden || []), [data]);
  const overrides = data.controls.overrides || {};
  const catName = (s) => categories.find((c) => c.slug === s)?.name || s;

  const items = useMemo(() => {
    const all = [
      ...(data.manual || []).map((n) => ({ ...n, _manual: true })),
      ...(data.auto || []).map((n) => ({ ...n, ...(overrides[n.id] || {}) })),
    ].sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return all.filter((n) => {
      if (type === "auto" && n._manual) return false;
      if (type === "manual" && !n._manual) return false;
      if (type === "draft" && n.status !== "draft") return false;
      if (type === "pinned" && !pins.has(n.id)) return false;
      if (type !== "hiddenView" && hidden.has(n.id)) return false;
      if (cat && n.category !== cat) return false;
      if (q && !(`${n.title} ${n.source || ""} ${n.originalTitle || ""}`.includes(q))) return false;
      return true;
    }).slice(0, 300);
  }, [data, q, cat, type, pins, hidden, overrides]);

  const control = async (body, okMsg) => {
    setBusy(body.id);
    try { await api("/api/admin/controls", "POST", body); notify(`${okMsg} সাইটে দেখাতে ১–২ মিনিট লাগবে।`); setOpen(null); await reload(); }
    catch (e) { notify(e.message, true); }
    setBusy("");
  };

  const todayCount = useMemo(() => {
    const d = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });
    return [...(data.auto || []), ...(data.manual || [])].filter((n) => new Date(n.publishedAt).toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }) === d).length;
  }, [data]);

  return (
    <section>
      <header className="adm-pagehead">
        <div>
          <h2 className="adm-h">সব খবর</h2>
          <p className="adm-sub">স্বয়ংক্রিয় ও নিজের লেখা সব খবর এখানে। পিন, লুকানো, ছবি বদল আর এডিট এখান থেকেই।</p>
        </div>
        <button onClick={() => onEdit(null)}>+ নতুন খবর</button>
      </header>
      <div className="adm-stats adm-stats-sm">
        <button className={`adm-stat ${type === "all" ? "on" : ""}`} onClick={() => setType("all")}><b>{bn((data.auto || []).length + (data.manual || []).length - hidden.size)}</b><span>মোট খবর</span></button>
        <div className="adm-stat"><b>{bn(todayCount)}</b><span>আজ প্রকাশিত</span></div>
        <button className={`adm-stat ${type === "pinned" ? "on" : ""}`} onClick={() => setType("pinned")}><b>{bn(pins.size)}</b><span>পিন করা</span></button>
        <button className={`adm-stat ${type === "draft" ? "on" : ""}`} onClick={() => setType("draft")}><b>{bn((data.manual || []).filter((n) => n.status === "draft").length)}</b><span>খসড়া</span></button>
      </div>
      <div className="adm-filters">
        <input placeholder="শিরোনাম দিয়ে খুঁজুন…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="">সব ক্যাটাগরি</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="all">সব ধরন</option>
          <option value="auto">অটো খবর</option>
          <option value="manual">নিজের লেখা</option>
          <option value="draft">খসড়া</option>
          <option value="pinned">পিন করা</option>
        </select>
      </div>
      <p className="adm-count">{bn(items.length)}টি খবর দেখানো হচ্ছে</p>

      <div className="adm-list">
        {items.map((n) => {
          const pin = pins.get(n.id);
          return (
            <div key={n.id} className="adm-row">
              <div className="adm-thumb">
                {n.image ? <img src={n.image} alt="" /> : <span>{catName(n.category)}</span>}
              </div>
              <div className="adm-row-main">
                <div className="adm-badges">
                  <span className="b-cat">{catName(n.category)}</span>
                  {n._manual ? <span className="b-man">নিজের</span> : <span className="b-auto">অটো · {n.source}</span>}
                  {n.status === "draft" && <span className="b-draft">খসড়া</span>}
                  {pin && <span className="b-pin">📌 {pin.position === "lead" ? "প্রধান" : "শীর্ষ"} · {left(pin.until)}</span>}
                  {n.alsoReportedBy?.length > 0 && <span className="b-also">+{bn(n.alsoReportedBy.length)} সূত্র</span>}
                </div>
                <div className="adm-title">{n.title}</div>
                <div className="adm-meta">{fmt(n.publishedAt)}</div>

                <div className="adm-actions">
                  {pin
                    ? <button disabled={busy === n.id} onClick={() => control({ action: "unpin", id: n.id }, "পিন সরানো হয়েছে।")}>আনপিন</button>
                    : <button onClick={() => setOpen(open?.id === n.id && open.kind === "pin" ? null : { id: n.id, kind: "pin" })}>📌 পিন</button>}
                  {n._manual ? (
                    <>
                      <button onClick={() => onEdit(n)}>এডিট</button>
                      <button className="danger" disabled={busy === n.id} onClick={async () => {
                        if (!confirm("খবরটি স্থায়ীভাবে ডিলিট করবেন?")) return;
                        setBusy(n.id);
                        try { await api("/api/admin/post", "DELETE", { id: n.id }); notify("ডিলিট হয়েছে।"); await reload(); }
                        catch (e) { notify(e.message, true); }
                        setBusy("");
                      }}>ডিলিট</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setOpen(open?.id === n.id && open.kind === "image" ? null : { id: n.id, kind: "image" })}>🖼 ছবি</button>
                      <button className="danger" disabled={busy === n.id} onClick={() => control({ action: "hide", id: n.id }, "খবরটি লুকানো হয়েছে।")}>লুকাও</button>
                    </>
                  )}
                  {n.status !== "draft" && <a href={`/news/${n.id}`} target="_blank" rel="noreferrer">দেখুন ↗</a>}
                  {n.sourceUrl && !n._manual && <a href={n.sourceUrl} target="_blank" rel="noreferrer">মূল ↗</a>}
                </div>

                {open?.id === n.id && open.kind === "pin" && (
                  <PinBox busy={busy === n.id} onPin={(position, hours) => control({ action: "pin", id: n.id, position, hours }, "পিন করা হয়েছে।")} />
                )}
                {open?.id === n.id && open.kind === "image" && (
                  <ImageBox item={n} notify={notify} busy={busy === n.id}
                    onSave={(img) => control({ action: "setImage", id: n.id, ...img }, "ছবি বদলানো হয়েছে।")} />
                )}
              </div>
            </div>
          );
        })}
        {!items.length && <p className="adm-empty">কোনো খবর নেই।</p>}
      </div>
    </section>
  );
}

function PinBox({ onPin, busy }) {
  const [position, setPosition] = useState("top");
  const [hours, setHours] = useState(12);
  const [custom, setCustom] = useState("");
  return (
    <div className="adm-box">
      <label>কোথায় দেখাবে
        <select value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="lead">প্রধান খবর (সবচেয়ে বড়)</option>
          <option value="top">শীর্ষ খবর (পাশের তালিকা)</option>
        </select>
      </label>
      <label>কতক্ষণ
        <select value={hours} onChange={(e) => setHours(+e.target.value)}>
          {HOURS.map((h) => <option key={h} value={h}>{bn(h)} ঘণ্টা</option>)}
          <option value={0}>নিজে লিখব…</option>
        </select>
      </label>
      {hours === 0 && (
        <label>ঘণ্টা
          <input type="number" min="0.5" step="0.5" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="যেমন 8" />
        </label>
      )}
      <button disabled={busy || (hours === 0 && !custom)} onClick={() => onPin(position, hours || +custom)}>
        {busy ? "সেভ হচ্ছে…" : "পিন করুন"}
      </button>
    </div>
  );
}

function ImageBox({ item, onSave, notify, busy }) {
  const [url, setUrl] = useState(item.image || "");
  const [caption, setCaption] = useState(item.imageCaption || "");
  const [credit, setCredit] = useState(item.imageCredit || "");
  const [uploading, setUploading] = useState(false);
  return (
    <div className="adm-box adm-box-col">
      {url && <img className="adm-preview" src={url} alt="" />}
      <label>ছবি আপলোড
        <input type="file" accept="image/*" onChange={async (e) => {
          const f = e.target.files?.[0]; if (!f) return;
          setUploading(true);
          try {
            const dataUrl = await resizeImage(f);
            const r = await api("/api/admin/upload", "POST", { dataUrl });
            setUrl(r.url); setCredit(""); notify("ছবি আপলোড হয়েছে। এবার সেভ করুন।");
          } catch (err) { notify(err.message, true); }
          setUploading(false);
        }} />
      </label>
      <label>অথবা ছবির লিংক<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" /></label>
      <div className="adm-grid2">
        <label>ক্যাপশন<input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="যেমন: প্রতীকী ছবি" /></label>
        <label>ছবির ক্রেডিট<input value={credit} onChange={(e) => setCredit(e.target.value)} placeholder="যেমন: নিজস্ব" /></label>
      </div>
      <div className="adm-row-btns">
        <button disabled={busy || uploading} onClick={() => onSave({ image: url, imageCaption: caption, imageCredit: credit })}>
          {uploading ? "আপলোড হচ্ছে…" : busy ? "সেভ হচ্ছে…" : "ছবি সেভ করুন"}
        </button>
        <button className="ghost" disabled={busy} onClick={() => onSave({ image: "", imageCaption: "", imageCredit: "" })}>ছবি সরান</button>
      </div>
    </div>
  );
}

/* ---------------- editor ---------------- */
function Editor({ initial, categories, notify, onSaved, onCancel }) {
  const [f, setF] = useState(initial);
  const [pendingImage, setPendingImage] = useState(null); // dataUrl, আপলোড হবে সেভের সময়
  const [aiText, setAiText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.type === "number" ? +e.target.value : e.target.value }));

  const runAI = async () => {
    const isUrl = /^https?:\/\/\S+$/.test(aiText.trim());
    setAiBusy(true);
    try {
      const r = await api("/api/admin/rewrite", "POST", isUrl ? { url: aiText.trim(), sourceName: f.source } : { text: aiText, sourceName: f.source });
      setF((x) => ({
        ...x,
        title: r.title || x.title,
        excerpt: r.excerpt || x.excerpt,
        body: r.body || x.body,
        category: categories.some((c) => c.slug === r.category) ? r.category : x.category,
        tags: r.tags || x.tags,
        sourceUrl: isUrl && !x.sourceUrl ? aiText.trim() : x.sourceUrl,
      }));
      notify("লেখা তৈরি হয়েছে। প্রকাশের আগে একবার পড়ে দেখে নিন।");
    } catch (e) { notify(e.message, true); }
    setAiBusy(false);
  };

  const save = async (status) => {
    if (!f.title.trim() || !f.body.trim()) return notify("শিরোনাম ও মূল লেখা দিন", true);
    setSaving(true);
    try {
      let image = f.image;
      if (pendingImage) {
        const r = await api("/api/admin/upload", "POST", { dataUrl: pendingImage });
        image = r.url;
      }
      await api("/api/admin/post", "POST", {
        ...f, image, status,
        publishedAt: f.publishedAt ? new Date(f.publishedAt).toISOString() : undefined,
        pinHours: status === "published" ? f.pinHours : 0,
      });
      notify(status === "draft" ? "খসড়া সেভ হয়েছে।" : "প্রকাশ হয়েছে! সাইটে দেখাতে ১–২ মিনিট লাগবে।");
      await onSaved();
    } catch (e) { notify(e.message, true); }
    setSaving(false);
  };

  return (
    <section className="adm-editor">
      <div className="adm-ai">
        <h3>✍️ রিরাইট সহকারী <small>(ঐচ্ছিক)</small></h3>
        <p>খবরের লেখা বা লিংক পেস্ট করুন। সহকারী নতুন করে লিখে নিচের ফর্মে বসিয়ে দেবে।</p>
        <textarea rows={4} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="খবরের লেখা বা https://… লিংক" />
        <button disabled={aiBusy || aiText.trim().length < 10} onClick={runAI}>{aiBusy ? "লিখছে…" : "নতুন করে লেখো"}</button>
      </div>

      <div className="adm-form">
        <label>শিরোনাম *<input className="big" value={f.title} onChange={set("title")} /></label>
        <label>সারকথা (এক লাইনে)<input value={f.excerpt} onChange={set("excerpt")} placeholder="খালি রাখলে প্রথম অনুচ্ছেদ থেকে নেবে" /></label>
        <label>মূল লেখা * <small>(অনুচ্ছেদের মাঝে একটা খালি লাইন দিন)</small>
          <textarea rows={14} value={f.body} onChange={set("body")} />
        </label>

        <div className="adm-grid3">
          <label>ক্যাটাগরি
            <select value={f.category} onChange={set("category")}>
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label>প্রতিবেদক<input value={f.author} onChange={set("author")} /></label>
          <label>প্রকাশের সময়<input type="datetime-local" value={f.publishedAt} onChange={set("publishedAt")} /></label>
        </div>

        <fieldset>
          <legend>ছবি</legend>
          {(pendingImage || f.image) && <img className="adm-preview" src={pendingImage || f.image} alt="" />}
          <div className="adm-grid2">
            <label>ছবি আপলোড
              <input type="file" accept="image/*" onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) setPendingImage(await resizeImage(file));
              }} />
            </label>
            <label>অথবা ছবির লিংক<input value={f.image || ""} onChange={(e) => { setPendingImage(null); set("image")(e); }} placeholder="https://…" /></label>
          </div>
          <label>ছবির ক্যাপশন<input value={f.imageCaption} onChange={set("imageCaption")} placeholder="যেমন: রাজধানীর মতিঝিলে আজ সকালে" /></label>
          {(pendingImage || f.image) && <button type="button" className="ghost" onClick={() => { setPendingImage(null); setF((x) => ({ ...x, image: "" })); }}>ছবি সরান</button>}
        </fieldset>

        <fieldset>
          <legend>ট্যাগ ও রেকর্ড</legend>
          <div className="adm-grid2">
            <label>সূত্রের নাম <small>(শুধু আপনার রেকর্ড, সাইটে দেখাবে না)</small><input value={f.source} onChange={set("source")} /></label>
            <label>মূল লিংক <small>(শুধু আপনার রেকর্ড)</small><input value={f.sourceUrl} onChange={set("sourceUrl")} placeholder="https://…" /></label>
          </div>
          <label>ট্যাগ <small>(কমা দিয়ে আলাদা)</small><input value={f.tags} onChange={set("tags")} placeholder="ঢাকা, নির্বাচন" /></label>
        </fieldset>

        <fieldset>
          <legend>প্রকাশের সাথে পিন <small>(ঐচ্ছিক)</small></legend>
          <div className="adm-grid2">
            <label>কতক্ষণ
              <select value={f.pinHours} onChange={set("pinHours")}>
                <option value={0}>পিন করব না</option>
                {HOURS.map((h) => <option key={h} value={h}>{bn(h)} ঘণ্টা</option>)}
              </select>
            </label>
            <label>কোথায়
              <select value={f.pinPosition} onChange={set("pinPosition")} disabled={!f.pinHours}>
                <option value="lead">প্রধান খবর</option>
                <option value="top">শীর্ষ খবর</option>
              </select>
            </label>
          </div>
        </fieldset>

        <div className="adm-row-btns sticky">
          <button disabled={saving} onClick={() => save("published")}>{saving ? "সেভ হচ্ছে…" : f.id ? "আপডেট ও প্রকাশ" : "প্রকাশ করুন"}</button>
          <button className="ghost" disabled={saving} onClick={() => save("draft")}>খসড়া হিসেবে রাখুন</button>
          <button className="ghost" disabled={saving} onClick={onCancel}>বাতিল</button>
        </div>
      </div>
    </section>
  );
}

/* ---------------- pins & hidden ---------------- */
function Pins({ data, reload, notify }) {
  const all = [...(data.manual || []), ...(data.auto || [])];
  const pins = (data.controls.pins || []).filter((p) => new Date(p.until) > Date.now());
  const [busy, setBusy] = useState("");
  return (
    <section>
      <h2 className="adm-h">পিন করা খবর</h2>
      {!pins.length && <p className="adm-empty">এখন কোনো খবর পিন করা নেই। “সব খবর” থেকে 📌 চাপুন।</p>}
      {pins.map((p) => {
        const n = all.find((x) => x.id === p.id);
        return (
          <div key={p.id} className="adm-row simple">
            <div className="adm-row-main">
              <div className="adm-badges"><span className="b-pin">{p.position === "lead" ? "প্রধান খবর" : "শীর্ষ খবর"}</span><span>{left(p.until)}</span></div>
              <div className="adm-title">{n?.title || "(খবরটি আর নেই)"}</div>
            </div>
            <button disabled={busy === p.id} onClick={async () => {
              setBusy(p.id);
              try { await api("/api/admin/controls", "POST", { action: "unpin", id: p.id }); notify("পিন সরানো হয়েছে।"); await reload(); }
              catch (e) { notify(e.message, true); }
              setBusy("");
            }}>আনপিন</button>
          </div>
        );
      })}
    </section>
  );
}

function Hidden({ data, reload, notify }) {
  const ids = data.controls.hidden || [];
  const all = [...(data.manual || []), ...(data.auto || [])];
  const [busy, setBusy] = useState("");
  const rows = ids.map((id) => ({ id, n: all.find((x) => x.id === id) })).filter((r) => r.n).reverse();
  return (
    <section>
      <h2 className="adm-h">লুকানো খবর</h2>
      {!rows.length && <p className="adm-empty">কোনো খবর লুকানো নেই।</p>}
      {rows.map(({ id, n }) => (
        <div key={id} className="adm-row simple">
          <div className="adm-row-main">
            <div className="adm-badges"><span className="b-auto">{n.source}</span></div>
            <div className="adm-title">{n.title}</div>
          </div>
          <button disabled={busy === id} onClick={async () => {
            setBusy(id);
            try { await api("/api/admin/controls", "POST", { action: "unhide", id }); notify("খবরটি আবার দেখাবে।"); await reload(); }
            catch (e) { notify(e.message, true); }
            setBusy("");
          }}>আবার দেখাও</button>
        </div>
      ))}
    </section>
  );
}

/* ---------------- settings ---------------- */
const FONTS = {
  solaimanlipi: "সোলায়মান লিপি (বাংলাদেশি পত্রিকার পরিচিত ফন্ট)",
  "noto-serif-bengali": "নোটো সেরিফ বাংলা (পত্রিকার মতো)",
  "noto-sans-bengali": "নোটো স্যান্স বাংলা (পরিষ্কার)",
  "hind-siliguri": "হিন্দ শিলিগুড়ি (সংখ্যা ১ অনেকটা ৯-এর মতো দেখায়)",
  "tiro-bangla": "তিরো বাংলা (ঐতিহ্যবাহী)",
  "anek-bangla": "অনেক বাংলা (চওড়া, আধুনিক)",
};
const FONT_FAMILY = {
  "hind-siliguri": "'Hind Siliguri'", solaimanlipi: "'SolaimanLipi'", "noto-serif-bengali": "'Noto Serif Bengali'",
  "noto-sans-bengali": "'Noto Sans Bengali'", "tiro-bangla": "'Tiro Bangla'", "anek-bangla": "'Anek Bangla'",
};
const ADS = {
  header: "হেডারের নিচে (৭২৮×৯০)",
  home_top: "প্রচ্ছদ: শীর্ষ খবরের পরে (৯৭০×৯০)",
  home_middle: "প্রচ্ছদ: বিভাগগুলোর মাঝে (৯৭০×২৫০)",
  sidebar: "পাশের কলাম (৩০০×২৫০)",
  article_inline: "খবরের ভেতরে, ২য় অনুচ্ছেদের পরে (৩০০×২৫০)",
  article_bottom: "খবরের শেষে (৭২৮×৯০)",
};
const SOCIAL = { facebook: "ফেসবুক", youtube: "ইউটিউব", x: "এক্স (টুইটার)", instagram: "ইনস্টাগ্রাম", tiktok: "টিকটক", linkedin: "লিংকডইন", telegram: "টেলিগ্রাম" };

function UploadField({ label, value, onChange, notify, accept = "image/*", max = 1600, hint }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm-upload">
      <span className="adm-upload-label">{label}{hint && <small> {hint}</small>}</span>
      <div className="adm-upload-row">
        <div className="adm-upload-prev">{value ? <img src={value} alt="" /> : <span>কিছু নেই</span>}</div>
        <div className="adm-upload-ctrl">
          <input type="file" accept={accept} disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return;
            setBusy(true);
            try {
              let dataUrl;
              if (/svg/.test(f.type)) throw new Error("SVG চলবে না, PNG বা JPG দিন");
              if (/icon/.test(f.type)) {
                dataUrl = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
              } else {
                dataUrl = await resizeImage(f, max, f.type === "image/png" ? "image/png" : "image/jpeg");
              }
              const r = await api("/api/admin/upload", "POST", { dataUrl });
              onChange(r.url);
              notify("আপলোড হয়েছে। নিচে সেভ চাপুন।");
            } catch (err) { notify(err.message, true); }
            setBusy(false);
          }} />
          <input value={value || ""} onChange={(e) => onChange(e.target.value)} placeholder="অথবা লিংক দিন: https://…" />
          {value && <button type="button" className="ghost" onClick={() => onChange("")}>সরান</button>}
          {busy && <small>আপলোড হচ্ছে…</small>}
        </div>
      </div>
    </div>
  );
}

function Settings({ config, reload, notify }) {
  const [c, setC] = useState(() => ({
    name: config.name || "",
    tagline: config.tagline || "",
    footerText: config.footerText ?? "সত্য ও নিরপেক্ষ সংবাদ, সবার আগে",
    deskName: config.deskName || "অনলাইন ডেস্ক",
    logo: config.logo || "",
    logoHeight: config.logoHeight || 46,
    favicon: config.favicon || "",
    editor: config.editor || "", publisher: config.publisher || "",
    phone: config.phone || "", email: config.email || "", address: config.address || "",
    social: { ...(config.social || {}) },
    fontHeadline: config.fontHeadline || "solaimanlipi",
    fontBody: config.fontBody || "solaimanlipi",
    headlineScale: config.headlineScale || 100,
    bodySize: config.bodySize || 18,
    about: config.about || "", privacy: config.privacy || "",
    ticker: { mode: "auto", label: "শিরোনাম", speed: 60, ...(config.ticker || {}), items: (config.ticker?.items || []).join("\n") },
    ads: Object.fromEntries(Object.keys(ADS).map((k) => [k, { enabled: false, image: "", link: "", html: "", ...(config.ads?.[k] || {}) }])),
    maxNewPerRun: config.maxNewPerRun || 12,
    keepDays: config.keepDays || 7,
    sources: (config.sources || []).map((s) => ({ ...s, rss: (s.rss || []).join("\n"), enabled: s.enabled !== false })),
  }));
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState("brand");
  const set = (k) => (e) => setC((x) => ({ ...x, [k]: e.target.type === "number" || e.target.type === "range" ? +e.target.value : e.target.value }));
  const setSrc = (i, k, v) => setC((x) => ({ ...x, sources: x.sources.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));
  const setAd = (k, field, v) => setC((x) => ({ ...x, ads: { ...x.ads, [k]: { ...x.ads[k], [field]: v } } }));

  useEffect(() => {
    // ফন্ট প্রিভিউর জন্য ফন্ট লোড
    const id = "adm-font-prev";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Noto+Serif+Bengali:wght@400;700&family=Noto+Sans+Bengali:wght@400;700&family=Tiro+Bangla&family=Anek+Bangla:wght@400;700&display=swap";
    document.head.appendChild(l);
  }, []);

  const Section = ({ id, title, children }) => (
    <section className={`adm-sec ${open === id ? "open" : ""}`}>
      <button type="button" className="adm-sec-h" onClick={() => setOpen(open === id ? "" : id)} aria-expanded={open === id}>
        <span>{title}</span><span aria-hidden="true">{open === id ? "−" : "+"}</span>
      </button>
      {open === id && <div className="adm-sec-b">{children}</div>}
    </section>
  );

  const save = async () => {
    setSaving(true);
    try {
      await api("/api/admin/settings", "POST", {
        ...c,
        ticker: { ...c.ticker, items: c.ticker.items.split("\n") },
        sources: c.sources.map((s) => ({ ...s, rss: s.rss.split(/\s+/).filter(Boolean) })),
      });
      notify("সেটিংস সেভ হয়েছে। সাইটে দেখাতে ১–২ মিনিট লাগবে।");
      await reload();
    } catch (e) { notify(e.message, true); }
    setSaving(false);
  };

  return (
    <div className="adm-settings">
      <h2 className="adm-h">সাইট সেটিংস</h2>

      {Section({ id: "brand", title: "নাম, লোগো ও ফ্যাভিকন", children: (
        <div className="adm-form-in">
          <div className="adm-grid2">
            <label>সাইটের নাম<input value={c.name} onChange={set("name")} /></label>
            <label>ট্যাগলাইন (ব্রাউজারের ট্যাব ও গুগলে দেখায়)<input value={c.tagline} onChange={set("tagline")} /></label>
            <label>ফুটারের স্লোগান<input value={c.footerText} onChange={set("footerText")} /></label>
            <label>অটো খবরের বাইলাইন<input value={c.deskName} onChange={set("deskName")} placeholder="যেমন: অনলাইন ডেস্ক" /></label>
          </div>
          <UploadField label="লোগো" hint="(স্বচ্ছ PNG বা SVG ভালো; না দিলে নাম দিয়ে লোগো দেখাবে)" value={c.logo} onChange={(v) => setC((x) => ({ ...x, logo: v }))} notify={notify} max={800} />
          {c.logo && <label>লোগোর উচ্চতা: {c.logoHeight}px<input type="range" min="24" max="90" value={c.logoHeight} onChange={set("logoHeight")} /></label>}
          <UploadField label="ফ্যাভিকন" hint="(ব্রাউজারের ট্যাবের ছোট আইকন, বর্গাকার ছবি)" value={c.favicon} onChange={(v) => setC((x) => ({ ...x, favicon: v }))} notify={notify} max={256} />
        </div>
      ) })}

      {Section({ id: "contact", title: "সম্পাদক, প্রকাশক ও যোগাযোগ", children: (
        <div className="adm-form-in">
          <div className="adm-grid2">
            <label>সম্পাদকের নাম<input value={c.editor} onChange={set("editor")} /></label>
            <label>প্রকাশকের নাম<input value={c.publisher} onChange={set("publisher")} /></label>
            <label>ফোন<input value={c.phone} onChange={set("phone")} placeholder="+৮৮০ ১৭xx xxxxxx" /></label>
            <label>ইমেইল<input type="email" value={c.email} onChange={set("email")} placeholder="news@example.com" /></label>
          </div>
          <label>অফিসের ঠিকানা<textarea rows={2} value={c.address} onChange={set("address")} /></label>
        </div>
      ) })}

      {Section({ id: "social", title: "সোশ্যাল মিডিয়া লিংক", children: (
        <div className="adm-grid2">
          {Object.entries(SOCIAL).map(([k, label]) => (
            <label key={k}>{label}<input value={c.social[k] || ""} onChange={(e) => setC((x) => ({ ...x, social: { ...x.social, [k]: e.target.value } }))} placeholder="https://…" /></label>
          ))}
        </div>
      ) })}

      {Section({ id: "fonts", title: "ফন্ট ও লেখার আকার", children: (
        <div className="adm-form-in">
          <div className="adm-grid2">
            <label>শিরোনামের ফন্ট<select value={c.fontHeadline} onChange={set("fontHeadline")}>{Object.entries(FONTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>লেখার ফন্ট<select value={c.fontBody} onChange={set("fontBody")}>{Object.entries(FONTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>শিরোনামের আকার: {c.headlineScale}%<input type="range" min="80" max="130" value={c.headlineScale} onChange={set("headlineScale")} /></label>
            <label>খবরের লেখার আকার: {c.bodySize}px<input type="range" min="15" max="22" value={c.bodySize} onChange={set("bodySize")} /></label>
          </div>
          <div className="adm-font-prev">
            <div style={{ fontFamily: FONT_FAMILY[c.fontHeadline], fontSize: 30 * c.headlineScale / 100, fontWeight: 700, lineHeight: 1.3 }}>রাজধানীতে নতুন উড়ালসড়ক চালু, যানজট কমার আশা</div>
            <p style={{ fontFamily: FONT_FAMILY[c.fontBody], fontSize: c.bodySize, lineHeight: 1.85 }}>যুক্তাক্ষর পরীক্ষা: ক্ষ, ঙ্গ, ন্ত্র, শ্রী, রূপ, কৃষি। আজ সকালে উড়ালসড়কটি যান চলাচলের জন্য খুলে দেওয়া হয়। এতে নগরবাসীর যাতায়াতের সময় অনেকটা কমবে বলে আশা করা হচ্ছে।</p>
          </div>
        </div>
      ) })}

      {Section({ id: "ticker", title: "শিরোনাম টিকার", children: (
        <div className="adm-form-in">
          <div className="adm-grid3">
            <label>কী দেখাবে<select value={c.ticker.mode} onChange={(e) => setC((x) => ({ ...x, ticker: { ...x.ticker, mode: e.target.value } }))}>
              <option value="auto">সর্বশেষ খবর (নিজে নিজে)</option>
              <option value="manual">আমার লেখা লাইন</option>
            </select></label>
            <label>লেবেল<input value={c.ticker.label} onChange={(e) => setC((x) => ({ ...x, ticker: { ...x.ticker, label: e.target.value } }))} placeholder="শিরোনাম / ব্রেকিং" /></label>
            <label>গতি: {c.ticker.speed}<input type="range" min="20" max="150" value={c.ticker.speed} onChange={(e) => setC((x) => ({ ...x, ticker: { ...x.ticker, speed: +e.target.value } }))} /></label>
          </div>
          {c.ticker.mode === "manual" && (
            <label>লাইনগুলো <small>(প্রতি লাইনে একটা)</small><textarea rows={4} value={c.ticker.items} onChange={(e) => setC((x) => ({ ...x, ticker: { ...x.ticker, items: e.target.value } }))} /></label>
          )}
        </div>
      ) })}

      {Section({ id: "ads", title: "বিজ্ঞাপনের জায়গা", children: (
        <div className="adm-ads">
          <p className="adm-note">প্রতিটা জায়গায় ছবি + লিংক অথবা বিজ্ঞাপনের কোড (যেমন Google AdSense) বসাতে পারবেন। চালু করে কিছু না দিলে সাইটে “বিজ্ঞাপনের জন্য নির্ধারিত জায়গা” দেখাবে।</p>
          {Object.entries(ADS).map(([k, label]) => (
            <div key={k} className={`adm-ad ${c.ads[k].enabled ? "" : "off"}`}>
              <label className="adm-switch">
                <input type="checkbox" checked={c.ads[k].enabled} onChange={(e) => setAd(k, "enabled", e.target.checked)} />
                <span>{label}</span>
              </label>
              {c.ads[k].enabled && (
                <div className="adm-form-in">
                  <UploadField label="বিজ্ঞাপনের ছবি" value={c.ads[k].image} onChange={(v) => setAd(k, "image", v)} notify={notify} max={1600} />
                  <label>ক্লিক করলে যে লিংকে যাবে<input value={c.ads[k].link} onChange={(e) => setAd(k, "link", e.target.value)} placeholder="https://…" /></label>
                  <label>অথবা বিজ্ঞাপনের কোড <small>(কোড দিলে ছবির বদলে কোড চলবে)</small><textarea rows={3} value={c.ads[k].html} onChange={(e) => setAd(k, "html", e.target.value)} placeholder="<script …></script>" spellCheck={false} /></label>
                </div>
              )}
            </div>
          ))}
        </div>
      ) })}

      {Section({ id: "pages", title: "“আমাদের সম্পর্কে” ও “গোপনীয়তা নীতি”", children: (
        <div className="adm-form-in">
          <p className="adm-note">খালি রাখলে একটা সাধারণ লেখা দেখাবে। অনুচ্ছেদের মাঝে খালি লাইন দিন। উপশিরোনাম দিতে লাইনের শুরুতে <code>## </code> লিখুন।</p>
          <label>আমাদের সম্পর্কে<textarea rows={8} value={c.about} onChange={set("about")} /></label>
          <label>গোপনীয়তা নীতি<textarea rows={8} value={c.privacy} onChange={set("privacy")} /></label>
        </div>
      ) })}

      {Section({ id: "sources", title: "স্বয়ংক্রিয় খবরের উৎস", children: (
        <div className="adm-form-in">
          <div className="adm-grid2">
            <label>প্রতিবারে সর্বোচ্চ নতুন খবর (প্রতি ৩০ মিনিটে)<input type="number" min="1" max="40" value={c.maxNewPerRun} onChange={set("maxNewPerRun")} /></label>
            <label>স্বয়ংক্রিয় খবর কত দিন থাকবে<input type="number" min="1" max="60" value={c.keepDays} onChange={set("keepDays")} /></label>
          </div>
          <div className="adm-sources">
            {c.sources.map((s, i) => (
              <div key={i} className={`adm-src ${s.enabled ? "" : "off"}`}>
                <label className="adm-switch">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => setSrc(i, "enabled", e.target.checked)} />
                  <span>{s.enabled ? "চালু" : "বন্ধ"}</span>
                </label>
                <label>নাম<input value={s.name} onChange={(e) => setSrc(i, "name", e.target.value)} /></label>
                <label>ওয়েবসাইট<input value={s.site} onChange={(e) => setSrc(i, "site", e.target.value)} placeholder="example.com" /></label>
                <label>RSS লিংক <small>(না জানলে খালি রাখুন)</small><textarea rows={2} value={s.rss} onChange={(e) => setSrc(i, "rss", e.target.value)} /></label>
                <button className="danger ghost" onClick={() => setC((x) => ({ ...x, sources: x.sources.filter((_, j) => j !== i) }))}>মুছুন</button>
              </div>
            ))}
          </div>
          <button className="ghost" onClick={() => setC((x) => ({ ...x, sources: [...x.sources, { name: "", site: "", rss: "", enabled: true }] }))}>+ নতুন উৎস</button>
        </div>
      ) })}

      <div className="adm-row-btns sticky">
        <button disabled={saving} onClick={save}>{saving ? "সেভ হচ্ছে…" : "সব সেটিংস সেভ করুন"}</button>
      </div>
    </div>
  );
}

/* ---------------- users ---------------- */
const EMPTY_USER = { username: "", name: "", role: "editor", password: "", disabled: false, isNew: true };

function Users({ notify }) {
  const [users, setUsers] = useState(null);
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setUsers((await api("/api/admin/users")).users); } catch (e) { notify(e.message, true); setUsers([]); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const r = await api("/api/admin/users", "POST", form);
      setUsers(r.users); setForm(null);
      notify(form.isNew ? "নতুন ইউজার যোগ হয়েছে।" : "ইউজার আপডেট হয়েছে।");
    } catch (e) { notify(e.message, true); }
    setBusy(false);
  };

  return (
    <section>
      <div className="adm-filters adm-filters-2">
        <h2 className="adm-h" style={{ margin: 0 }}>ইউজার</h2>
        <button onClick={() => setForm({ ...EMPTY_USER })}>+ নতুন ইউজার</button>
      </div>
      <p className="adm-note">
        <b>অ্যাডমিন</b> সব কিছু করতে পারেন। <b>সম্পাদক</b> খবর লেখা, এডিট, পিন, লুকানো ও ছবি বদলাতে পারেন, কিন্তু সেটিংস, ইউজার ও ভিজিটর দেখতে পারেন না।
        মূল অ্যাডমিন (ইউজারনেম <code>admin</code>) সবসময় Vercel-এর পাসওয়ার্ড দিয়ে ঢুকতে পারবেন।
      </p>

      {form && (
        <div className="adm-form adm-user-form">
          <div className="adm-grid2">
            <label>ইউজারনেম <small>(ইংরেজি ছোট হাতের)</small><input value={form.username} disabled={!form.isNew} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="যেমন: rahim" autoCapitalize="none" /></label>
            <label>পুরো নাম<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>ভূমিকা<select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="editor">সম্পাদক</option><option value="admin">অ্যাডমিন</option>
            </select></label>
            <label>{form.isNew ? "পাসওয়ার্ড" : "নতুন পাসওয়ার্ড (বদলাতে চাইলে)"} <small>(কমপক্ষে ৮ অক্ষর)</small><input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" /></label>
          </div>
          {!form.isNew && <label className="adm-switch"><input type="checkbox" checked={form.disabled} onChange={(e) => setForm({ ...form, disabled: e.target.checked })} /><span>সাময়িক বন্ধ (লগইন করতে পারবে না)</span></label>}
          <div className="adm-row-btns">
            <button disabled={busy} onClick={save}>{busy ? "সেভ হচ্ছে…" : "সেভ করুন"}</button>
            <button className="ghost" onClick={() => setForm(null)}>বাতিল</button>
          </div>
        </div>
      )}

      {!users ? <p className="adm-empty">লোড হচ্ছে…</p> : !users.length ? (
        <p className="adm-empty">এখনো কোনো ইউজার নেই। শুধু মূল অ্যাডমিন আছেন।</p>
      ) : users.map((u) => (
        <div key={u.username} className="adm-row simple">
          <div className="adm-row-main">
            <div className="adm-badges">
              <span className={u.role === "admin" ? "b-pin" : "b-man"}>{u.role === "admin" ? "অ্যাডমিন" : "সম্পাদক"}</span>
              {u.disabled && <span className="b-draft">বন্ধ</span>}
            </div>
            <div className="adm-title">{u.name} <small className="adm-muted">@{u.username}</small></div>
          </div>
          <div className="adm-row-btns">
            <button className="ghost" onClick={() => setForm({ ...u, password: "", isNew: false })}>এডিট</button>
            <button className="danger" onClick={async () => {
              if (!confirm(`${u.name}-কে মুছে ফেলবেন?`)) return;
              try { setUsers((await api("/api/admin/users", "DELETE", { username: u.username })).users); notify("ইউজার মুছে ফেলা হয়েছে।"); }
              catch (e) { notify(e.message, true); }
            }}>মুছুন</button>
          </div>
        </div>
      ))}
    </section>
  );
}

/* ---------------- visitors ---------------- */
const COUNTRY = { BD: "বাংলাদেশ", IN: "ভারত", US: "যুক্তরাষ্ট্র", GB: "যুক্তরাজ্য", SA: "সৌদি আরব", AE: "আমিরাত", MY: "মালয়েশিয়া", QA: "কাতার", KW: "কুয়েত", OM: "ওমান", IT: "ইতালি", CA: "কানাডা", AU: "অস্ট্রেলিয়া", SG: "সিঙ্গাপুর", JP: "জাপান", DE: "জার্মানি", FR: "ফ্রান্স" };
const cname = (c) => COUNTRY[c] || c || "অজানা";
const sortObj = (o) => Object.entries(o || {}).sort((a, b) => b[1] - a[1]);

function Bars({ data }) {
  const max = Math.max(1, ...Object.values(data));
  return (
    <div className="adm-bars">
      {sortObj(data).slice(0, 8).map(([k, v]) => (
        <div key={k} className="adm-bar">
          <span className="adm-bar-k">{k}</span>
          <span className="adm-bar-track"><span style={{ width: `${(v / max) * 100}%` }} /></span>
          <span className="adm-bar-v">{bn(v)}</span>
        </div>
      ))}
      {!Object.keys(data).length && <p className="adm-muted">এখনো তথ্য নেই</p>}
    </div>
  );
}

function Visitors() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState("");
  const load = useCallback(async () => {
    try { setD(await api("/api/admin/visitors")); setErr(""); } catch (e) { setErr(e.message); }
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  if (err) return <p className="adm-err">{err}</p>;
  if (!d) return <p className="adm-empty">লোড হচ্ছে…</p>;
  if (!d.ready) {
    return (
      <section className="adm-form">
        <h2 className="adm-h">ভিজিটর পরিসংখ্যান চালু করুন</h2>
        <ol className="adm-steps">
          <li>Vercel-এ আপনার প্রজেক্ট খুলুন → উপরে <b>Storage</b> ট্যাব।</li>
          <li><b>Create Database</b> → <b>Upstash</b> (Redis) → Free প্ল্যান → অঞ্চল <b>Singapore</b> → Create।</li>
          <li>প্রজেক্টের সাথে <b>Connect</b> করুন। Vercel নিজে থেকে দরকারি কী বসিয়ে দেবে।</li>
          <li><b>Deployments</b> → সর্বশেষটার ⋯ → <b>Redeploy</b>। এরপর থেকে এখানে তথ্য দেখাবে।</li>
        </ol>
      </section>
    );
  }

  const maxV = Math.max(1, ...d.series.map((s) => s.views));
  const fmtT = (t) => new Intl.DateTimeFormat("bn-BD", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short", timeZone: "Asia/Dhaka" }).format(new Date(t));

  return (
    <section className="adm-visitors">
      <div className="adm-stats">
        <div className="adm-stat is-live"><b>{bn(d.online)}</b><span>এখন সাইটে (৫ মিনিটে)</span></div>
        <div className="adm-stat"><b>{bn(d.today.visitors)}</b><span>আজকের ভিজিটর</span></div>
        <div className="adm-stat"><b>{bn(d.today.views)}</b><span>আজকের পেজভিউ</span></div>
        <div className="adm-stat"><b>{bn(d.series.slice(-7).reduce((a, s) => a + s.visitors, 0))}</b><span>গত ৭ দিনের ভিজিটর</span></div>
      </div>

      <div className="adm-card">
        <h3>গত ১৪ দিন</h3>
        <div className="adm-chart">
          {d.series.map((s) => (
            <div key={s.date} className="adm-col" title={`${s.date}: ${s.visitors} ভিজিটর, ${s.views} পেজভিউ`}>
              <span className="adm-col-v">{s.views ? bn(s.views) : ""}</span>
              <span className="adm-col-bar" style={{ height: `${(s.views / maxV) * 100}%` }}><span style={{ height: `${s.views ? (s.visitors / s.views) * 100 : 0}%` }} /></span>
              <span className="adm-col-d">{bn(Number(s.date.slice(8)))}</span>
            </div>
          ))}
        </div>
        <p className="adm-muted"><span className="lg lg-v" /> পেজভিউ &nbsp; <span className="lg lg-u" /> ভিজিটর</p>
      </div>

      <div className="adm-grid3">
        <div className="adm-card"><h3>দেশ (আজ)</h3><Bars data={Object.fromEntries(sortObj(d.countries).map(([k, v]) => [cname(k), v]))} /></div>
        <div className="adm-card"><h3>ডিভাইস (আজ)</h3><Bars data={d.devices} /></div>
        <div className="adm-card"><h3>কোথা থেকে এসেছে (আজ)</h3><Bars data={d.referrers} /></div>
      </div>

      <div className="adm-card">
        <h3>সবচেয়ে বেশি দেখা পাতা (আজ)</h3>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <tbody>
              {d.pages.map((p) => <tr key={p.path}><td><a href={p.path} target="_blank" rel="noreferrer">{p.path}</a></td><td className="num">{bn(p.views)}</td></tr>)}
              {!d.pages.length && <tr><td className="adm-muted">এখনো তথ্য নেই</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="adm-card">
        <h3>সাম্প্রতিক ভিজিটর <small className="adm-muted">(সর্বশেষ ৩০০টি পেজভিউ, প্রতি ৩০ সেকেন্ডে রিফ্রেশ)</small></h3>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead><tr><th>সময়</th><th>আইপি</th><th>অবস্থান</th><th>ডিভাইস</th><th>পাতা</th><th>উৎস</th></tr></thead>
            <tbody>
              {d.recent.map((h, i) => (
                <tr key={i}>
                  <td className="nowrap">{fmtT(h.t)}</td>
                  <td className="mono">{h.ip}</td>
                  <td>{[h.city, cname(h.country)].filter(Boolean).join(", ")}</td>
                  <td>{h.device} · {h.os} · {h.browser}</td>
                  <td className="path"><a href={h.path} target="_blank" rel="noreferrer">{h.path}</a></td>
                  <td>{h.ref || "সরাসরি"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
