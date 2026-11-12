import crypto from "node:crypto";
import { cookies } from "next/headers";
import { readJSON } from "@/lib/github";

const COOKIE = "admin_session";
const MAX_AGE = 60 * 60 * 24 * 7; // ৭ দিন

/**
 * ভূমিকা (role):
 *  - admin  : সব কিছু (খবর, পিন, সেটিংস, ইউজার, ভিজিটর)
 *  - editor : খবর লেখা/এডিট, পিন, লুকানো, ছবি; সেটিংস ও ইউজার নয়
 * Vercel-এর ADMIN_PASSWORD দিয়ে "admin" নামে সবসময় ঢোকা যায় (মূল অ্যাডমিন)।
 */
export const ROLES = { admin: "অ্যাডমিন", editor: "সম্পাদক" };

function secret() {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function hashPassword(pw, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(String(pw), salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(pw, salt, hash) {
  try {
    return safeEqual(crypto.scryptSync(String(pw), salt, 64).toString("hex"), hash);
  } catch {
    return false;
  }
}

/** ইউজারনেম + পাসওয়ার্ড যাচাই; ঠিক হলে {username, name, role} */
export async function authenticate(username, password) {
  const u = String(username || "").trim().toLowerCase();
  if (!secret() || !password) return null;
  if ((u === "" || u === "admin") && safeEqual(password, secret())) {
    return { username: "admin", name: "মূল অ্যাডমিন", role: "admin" };
  }
  try {
    const { data } = await readJSON("data/users.json", []);
    const user = (data || []).find((x) => x.username === u && !x.disabled);
    if (user && verifyPassword(password, user.salt, user.hash)) {
      return { username: user.username, name: user.name || user.username, role: user.role === "admin" ? "admin" : "editor" };
    }
  } catch {}
  return null;
}

export async function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ u: user.username, n: user.name, r: user.role, e: Date.now() + MAX_AGE * 1000 })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

/** লগইন করা ইউজার, না থাকলে null */
export async function getSession() {
  if (!secret()) return null;
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value || "";
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!s.e || s.e < Date.now()) return null;
    return { username: s.u, name: s.n, role: s.r };
  } catch {
    return null;
  }
}

export async function isAuthed() {
  return Boolean(await getSession());
}

export async function isAdmin() {
  return (await getSession())?.role === "admin";
}

export function unauthorized() {
  return Response.json({ error: "লগইন করুন" }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "এই কাজের অনুমতি শুধু অ্যাডমিনের আছে" }, { status: 403 });
}
