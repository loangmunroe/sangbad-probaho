import { getSession, unauthorized, forbidden, hashPassword } from "@/lib/auth";
import { readJSON, updateJSON } from "@/lib/github";

export const dynamic = "force-dynamic";

const clean = (u) => ({ username: u.username, name: u.name, role: u.role, disabled: Boolean(u.disabled), createdAt: u.createdAt });

async function adminOnly() {
  const s = await getSession();
  if (!s) return unauthorized();
  if (s.role !== "admin") return forbidden();
  return null;
}

// ইউজারের তালিকা (পাসওয়ার্ড ছাড়া)
export async function GET() {
  const deny = await adminOnly();
  if (deny) return deny;
  try {
    const { data } = await readJSON("data/users.json", []);
    return Response.json({ users: (data || []).map(clean) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}

// নতুন ইউজার / নাম-ভূমিকা বদল / পাসওয়ার্ড রিসেট / বন্ধ-চালু
export async function POST(req) {
  const deny = await adminOnly();
  if (deny) return deny;
  const b = await req.json().catch(() => ({}));
  const username = String(b.username || "").trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username) || username === "admin") {
    return Response.json({ error: "ইউজারনেম ৩–৩০ অক্ষরের ইংরেজি ছোট হাতের অক্ষর/সংখ্যা হতে হবে, আর 'admin' নেওয়া যাবে না" }, { status: 400 });
  }
  if (b.password && String(b.password).length < 8) {
    return Response.json({ error: "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের দিন" }, { status: 400 });
  }
  try {
    const users = await updateJSON("data/users.json", [], (list) => {
      const i = list.findIndex((u) => u.username === username);
      const base = i >= 0 ? list[i] : { username, createdAt: new Date().toISOString() };
      if (i < 0 && !b.password) throw new Error("নতুন ইউজারের পাসওয়ার্ড দিন");
      const next = {
        ...base,
        name: String(b.name ?? base.name ?? username).slice(0, 60),
        role: b.role === "admin" ? "admin" : "editor",
        disabled: Boolean(b.disabled),
        ...(b.password ? hashPassword(b.password) : {}),
      };
      if (i >= 0) list[i] = next;
      else list.push(next);
      return list;
    }, `admin: user ${username}`);
    return Response.json({ ok: true, users: users.map(clean) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  const deny = await adminOnly();
  if (deny) return deny;
  const { username } = await req.json().catch(() => ({}));
  try {
    const users = await updateJSON("data/users.json", [], (list) => list.filter((u) => u.username !== username), `admin: remove user ${username}`);
    return Response.json({ ok: true, users: users.map(clean) });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
