import { isAuthed, unauthorized } from "@/lib/auth";
import { readJSON } from "@/lib/github";

export const dynamic = "force-dynamic";

// অ্যাডমিন প্যানেলের জন্য রিপো থেকে সর্বশেষ ডাটা (ডিপ্লয়ের অপেক্ষা ছাড়াই)
export async function GET() {
  if (!(await isAuthed())) return unauthorized();
  try {
    const [auto, manual, controls, config] = await Promise.all([
      readJSON("data/news.json", []),
      readJSON("data/manual.json", []),
      readJSON("data/controls.json", { pins: [], hidden: [] }),
      readJSON("config/site.json", {}),
    ]);
    return Response.json({
      auto: auto.data,
      manual: manual.data,
      controls: controls.data,
      config: config.data,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
