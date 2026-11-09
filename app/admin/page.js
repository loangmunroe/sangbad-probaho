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

function resizeImage(file, max = 1600) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.82));
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

  const notify = (msg, bad = false) => {
    setToast({ msg, bad });
    setTimeout(() => setToast(null), bad ? 6000 : 3500);
  };

  const load = useCallback(async () => {
    try {
      const d = await api("/api/admin/data");
      setData(d);
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
      <header className="adm-top">
        <div className="adm-brand">{data?.config?.name || "সংবাদ"} <span>অ্যাডমিন</span></div>
        <nav className="adm-tabs">
          {[
            ["list", "সব খবর"],
            ["edit", editing.id ? "এডিট" : "নতুন খবর"],
            ["pins", "পিন করা"],
            ["hidden", "লুকানো"],
            ["settings", "সেটিংস"],
          ].map(([k, label]) => (
            <button key={k} className={tab === k ? "on" : ""} onClick={() => (k === "edit" && tab !== "edit" && !editing.id ? startEdit(null) : setTab(k))}>{label}</button>
          ))}
        </nav>
        <div className="adm-top-r">
          <a href="/" target="_blank" rel="noreferrer">সাইট দেখুন ↗</a>
          <button className="ghost" onClick={async () => { await api("/api/admin/logout", "POST"); setAuth(false); }}>লগআউট</button>
        </div>
      </header>

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
            {tab === "settings" && <Settings config={data.config} reload={load} notify={notify} />}
          </>
        )}
      </main>

      {toast && <div className={`adm-toast ${toast.bad ? "bad" : ""}`}>{toast.msg}</div>}
    </div>
  );
}

/* ---------------- login ---------------- */
function Login({ onDone }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="adm-center">
      <form className="adm-login" onSubmit={async (e) => {
        e.preventDefault(); setBusy(true); setErr("");
        try { await api("/api/admin/login", "POST", { password: pw }); onDone(); }
        catch (e2) { setErr(e2.message); }
        setBusy(false);
      }}>
        <h1>অ্যাডমিন লগইন</h1>
        <input type="password" placeholder="পাসওয়ার্ড" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
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

  return (
    <section>
      <div className="adm-filters">
        <input placeholder="শিরোনাম বা সূত্র দিয়ে খুঁজুন…" value={q} onChange={(e) => setQ(e.target.value)} />
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
        <button onClick={() => onEdit(null)}>+ নতুন খবর</button>
      </div>
      <p className="adm-count">মোট {bn(items.length)}টি খবর দেখানো হচ্ছে</p>

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
      notify("AI লিখে দিয়েছে। একবার পড়ে দেখে নিন।");
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
        <h3>🤖 AI দিয়ে রিরাইট <small>(ঐচ্ছিক)</small></h3>
        <p>অন্য কোথাও থেকে খবর আনলে তার লেখা বা লিংক এখানে পেস্ট করুন। Gemini নিজস্ব ভাষায় লিখে নিচের ফর্মে বসিয়ে দেবে।</p>
        <textarea rows={4} value={aiText} onChange={(e) => setAiText(e.target.value)} placeholder="খবরের লেখা বা https://… লিংক" />
        <button disabled={aiBusy || aiText.trim().length < 10} onClick={runAI}>{aiBusy ? "লিখছে…" : "AI দিয়ে লেখাও"}</button>
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
          <legend>সূত্র ও ট্যাগ</legend>
          <div className="adm-grid2">
            <label>সূত্রের নাম<input value={f.source} onChange={set("source")} placeholder="অন্য কোথাও থেকে হলে, যেমন: প্রথম আলো" /></label>
            <label>মূল লিংক<input value={f.sourceUrl} onChange={set("sourceUrl")} placeholder="https://…" /></label>
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
function Settings({ config, reload, notify }) {
  const [c, setC] = useState(() => ({
    name: config.name || "",
    tagline: config.tagline || "",
    maxNewPerRun: config.maxNewPerRun || 12,
    keepDays: config.keepDays || 7,
    sources: (config.sources || []).map((s) => ({ ...s, rss: (s.rss || []).join("\n"), enabled: s.enabled !== false })),
  }));
  const [saving, setSaving] = useState(false);
  const setSrc = (i, k, v) => setC((x) => ({ ...x, sources: x.sources.map((s, j) => (j === i ? { ...s, [k]: v } : s)) }));

  return (
    <section className="adm-form">
      <h2 className="adm-h">সাইট সেটিংস</h2>
      <div className="adm-grid2">
        <label>সাইটের নাম<input value={c.name} onChange={(e) => setC({ ...c, name: e.target.value })} /></label>
        <label>ট্যাগলাইন<input value={c.tagline} onChange={(e) => setC({ ...c, tagline: e.target.value })} /></label>
        <label>প্রতিবারে সর্বোচ্চ নতুন খবর (প্রতি ৩০ মিনিটে)<input type="number" min="1" max="40" value={c.maxNewPerRun} onChange={(e) => setC({ ...c, maxNewPerRun: +e.target.value })} /></label>
        <label>অটো খবর কত দিন থাকবে<input type="number" min="1" max="60" value={c.keepDays} onChange={(e) => setC({ ...c, keepDays: +e.target.value })} /></label>
      </div>

      <h3 className="adm-h3">খবরের উৎস (পত্রিকা)</h3>
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
      <button className="ghost" onClick={() => setC((x) => ({ ...x, sources: [...x.sources, { name: "", site: "", rss: "", enabled: true }] }))}>+ নতুন পত্রিকা</button>

      <div className="adm-row-btns sticky">
        <button disabled={saving} onClick={async () => {
          setSaving(true);
          try {
            await api("/api/admin/settings", "POST", { ...c, sources: c.sources.map((s) => ({ ...s, rss: s.rss.split(/\s+/).filter(Boolean) })) });
            notify("সেটিংস সেভ হয়েছে। সাইটে দেখাতে ১–২ মিনিট লাগবে।");
            await reload();
          } catch (e) { notify(e.message, true); }
          setSaving(false);
        }}>{saving ? "সেভ হচ্ছে…" : "সেটিংস সেভ করুন"}</button>
      </div>
    </section>
  );
}
