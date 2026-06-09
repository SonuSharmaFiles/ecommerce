/**
 * In-memory dev auth — for local exploration without a real Supabase.
 * Gated by DEV_AUTH=true. Users live in memory and reset on server restart.
 * Never enable in production.
 */

import { cookies } from "next/headers";
import crypto from "crypto";

export const DEV_AUTH_COOKIE = "sf_dev_session";

export function isDevAuthEnabled(): boolean {
  return process.env.DEV_AUTH === "true" || process.env.NEXT_PUBLIC_DEV_AUTH === "true";
}

interface DevUser {
  id: string;
  email: string;
  full_name: string;
  password_hash: string;
  role: "customer" | "support" | "editor" | "manager" | "admin" | "super_admin";
  created_at: string;
}

// Module-level store. Lives for the life of the Node process.
const STORE: Map<string, DevUser> = (globalThis as unknown as { __devUsers?: Map<string, DevUser> })
  .__devUsers ?? new Map();
(globalThis as unknown as { __devUsers: Map<string, DevUser> }).__devUsers = STORE;

function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw + "shopflow-dev-salt").digest("hex");
}

// Seed a default super_admin so there's always a way to log in.
const BOOTSTRAP_EMAIL = (process.env.DEV_BOOTSTRAP_EMAIL ?? "admin@local.test").toLowerCase();
const BOOTSTRAP_PASSWORD = process.env.DEV_BOOTSTRAP_PASSWORD ?? "admin123";

function ensureBootstrap() {
  if (STORE.has(BOOTSTRAP_EMAIL)) return;
  STORE.set(BOOTSTRAP_EMAIL, {
    id: crypto.randomUUID(),
    email: BOOTSTRAP_EMAIL,
    full_name: "Local Admin",
    password_hash: hashPassword(BOOTSTRAP_PASSWORD),
    role: "super_admin",
    created_at: new Date().toISOString(),
  });
}

export function devLogin(email: string, password: string) {
  ensureBootstrap();
  email = email.toLowerCase();
  const user = STORE.get(email);
  if (!user || user.password_hash !== hashPassword(password)) {
    return { ok: false as const, error: "Invalid email or password." };
  }
  return { ok: true as const, user };
}

export function devGetUser(id: string): DevUser | null {
  for (const u of STORE.values()) {
    if (u.id === id) return u;
  }
  return null;
}

export async function setDevSession(userId: string) {
  const store = await cookies();
  store.set(DEV_AUTH_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearDevSession() {
  const store = await cookies();
  store.delete(DEV_AUTH_COOKIE);
}

export async function getDevSessionUser() {
  if (!isDevAuthEnabled()) return null;
  ensureBootstrap();
  const store = await cookies();
  const id = store.get(DEV_AUTH_COOKIE)?.value;
  if (!id) return null;
  return devGetUser(id);
}
