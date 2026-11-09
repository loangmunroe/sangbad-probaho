import { isAuthed, unauthorized } from "@/lib/auth";
import { updateJSON } from "@/lib/github";

// পিন / আনপিন / লুকানো / দেখানো
export async function POST(req) {
  if (!(await isAuthed())) return unauthorized();
  const { action, id, position, hours, image, imageCaption, imageCredit } = await req.json().catch(() => ({}));
  if (!id || !action) return Response.json({ error: "তথ্য অসম্পূর্ণ" }, { status: 400 });

  try {
    const controls = await updateJSON("data/controls.json", { pins: [], hidden: [] }, (c) => {
      c.pins = (c.pins || []).filter((p) => new Date(p.until).getTime() > Date.now()); // মেয়াদোত্তীর্ণ সাফ
      c.hidden = c.hidden || [];
      if (action === "pin") {
        const h = Math.min(Math.max(Number(hours) || 12, 0.5), 24 * 30);
        c.pins = c.pins.filter((p) => p.id !== id);
        c.pins.push({
          id,
          position: position === "lead" ? "lead" : "top",
          until: new Date(Date.now() + h * 3600e3).toISOString(),
          pinnedAt: new Date().toISOString(),
        });
      } else if (action === "unpin") {
        c.pins = c.pins.filter((p) => p.id !== id);
      } else if (action === "hide") {
        if (!c.hidden.includes(id)) c.hidden.push(id);
        c.pins = c.pins.filter((p) => p.id !== id);
      } else if (action === "unhide") {
        c.hidden = c.hidden.filter((x) => x !== id);
      } else if (action === "setImage") {
        // অটো খবরের ছবি বদলানো (image খালি দিলে ছবি সরিয়ে ক্যাটাগরি কার্ড দেখাবে)
        c.overrides = c.overrides || {};
        c.overrides[id] = {
          image: image ? String(image).slice(0, 500) : null,
          imageCaption: String(imageCaption || "").slice(0, 200),
          imageCredit: String(imageCredit || "").slice(0, 200),
          imageCreditUrl: "",
        };
      }
      c.hidden = c.hidden.slice(-2000);
      return c;
    }, `admin: ${action} ${id}`);
    return Response.json({ ok: true, controls });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
