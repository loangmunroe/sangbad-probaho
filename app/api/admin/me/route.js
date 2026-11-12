import { getSession, unauthorized } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await getSession();
  if (!s) return unauthorized();
  return Response.json(s);
}
