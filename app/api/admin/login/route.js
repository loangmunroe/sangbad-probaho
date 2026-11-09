import { checkPassword, createSession } from "@/lib/auth";

export async function POST(req) {
  if (!process.env.ADMIN_PASSWORD) {
    return Response.json({ error: "Vercel-এ ADMIN_PASSWORD সেট করা নেই" }, { status: 500 });
  }
  const { password } = await req.json().catch(() => ({}));
  if (!checkPassword(password)) {
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "পাসওয়ার্ড ভুল" }, { status: 401 });
  }
  await createSession();
  return Response.json({ ok: true });
}
