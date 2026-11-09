import { isAuthed, unauthorized } from "@/lib/auth";
import { updateJSON } from "@/lib/github";

const clean = (s, max = 5000) => String(s ?? "").trim().slice(0, max);

// নতুন খবর তৈরি বা এডিট
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const b = await req.json().catch(() => null);
  if (!b || !clean(b.title) || !clean(b.body, 50000)) {
    return Response.json({ error: "শিরোনাম ও মূল লেখা দিতে হবে" }, { status: 400 });
  }

  const paragraphs = clean(b.body, 50000).split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.trim()).filter(Boolean);
  const now = new Date().toISOString();
  const id = b.id || `m-${Date.now().toString(36)}`;

  const post = {
    id,
    manual: true,
    status: b.status === "draft" ? "draft" : "published",
    title: clean(b.title, 300),
    excerpt: clean(b.excerpt, 400) || paragraphs[0].slice(0, 160),
    paragraphs,
    category: clean(b.category, 40) || "national",
    image: clean(b.image, 500) || null,
    imageCaption: clean(b.imageCaption, 300),
    author: clean(b.author, 100) || "নিজস্ব প্রতিবেদক",
    source: clean(b.source, 100),
    sourceUrl: /^https?:\/\//.test(clean(b.sourceUrl)) ? clean(b.sourceUrl, 1000) : "",
    tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || "").split(","))
      .map((t) => clean(t, 40)).filter(Boolean).slice(0, 10),
    publishedAt: b.publishedAt ? new Date(b.publishedAt).toISOString() : now,
    updatedAt: now,
  };

  try {
    await updateJSON("data/manual.json", [], (list) => {
      const i = list.findIndex((p) => p.id === id);
      if (i >= 0) list[i] = { ...list[i], ...post, createdAt: list[i].createdAt || now };
      else list.unshift({ ...post, createdAt: now });
      return list;
    }, `admin: ${b.id ? "edit" : "add"} "${post.title.slice(0, 50)}"`);

    if (b.pinHours && post.status === "published") {
      const until = new Date(Date.now() + Number(b.pinHours) * 3600e3).toISOString();
      await updateJSON("data/controls.json", { pins: [], hidden: [] }, (c) => {
        c.pins = (c.pins || []).filter((p) => p.id !== id);
        c.pins.push({ id, position: b.pinPosition === "lead" ? "lead" : "top", until, pinnedAt: now });
        return c;
      }, `admin: pin ${id}`);
    }
    return Response.json({ ok: true, id });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  if (!(await isAuthed())) return unauthorized();
  const { id } = await req.json().catch(() => ({}));
  if (!id) return Response.json({ error: "id নেই" }, { status: 400 });
  try {
    await updateJSON("data/manual.json", [], (list) => list.filter((p) => p.id !== id), `admin: delete ${id}`);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
