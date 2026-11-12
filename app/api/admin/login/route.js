import { authenticate, createSession } from "@/lib/auth";

export async function POST(req) {
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Vercel-এ ADMIN_PASSWORD সেট করা নেই" }, { status: 500 });
  }
  const { username, password } = await req.json().catch(() => ({}));
  const user = await authenticate(username, password);
  if (!user) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "ইউজারনেম বা পাসওয়ার্ড ভুল" }, { status: 401 });
  }
  await createSession(user);
  return Response.json({ ok: true, user });
}
