import { isAuthed, unauthorized } from "@/lib/auth";
import { writeFile } from "@/lib/github";

// ছবি আপলোড: ব্রাউজার আগেই ছোট করে JPEG/WebP data URL পাঠায়
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const { dataUrl } = await req.json().catch(() => ({}));
  const m = /^data:image\/(jpeg|png|webp|x-icon|vnd\.microsoft\.icon);base64,(.+)$/.exec(dataUrl || "");
  if (!m) return Response.json({ error: "ছবি পড়া যায়নি" }, { status: 400 });

  const ext = m[1] === "jpeg" ? "jpg" : /icon/.test(m[1]) ? "ico" : m[1];
  const b64 = m[2];
  if (b64.length > 4_000_000) return Response.json({ error: "ছবি অনেক বড়" }, { status: 400 });

  const now = new Date();
  const name = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${Date.now().toString(36)}.${ext}`;
  try {
    await writeFile(`public/uploads/${name}`, b64, `admin: upload image ${name}`);
    return Response.json({ ok: true, url: `/uploads/${name}` });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
