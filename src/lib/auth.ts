import { createHmac, randomInt, createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { rawGet, rawSet } from "./store";
import type { Attendee, Trip } from "./types";

/**
 * Passwordless identity (Nov 26, 2026): an email is verified once with a
 * 6-digit code, then a signed, httpOnly session cookie (180 days) carries
 * that email. Viewing a trip stays open to anyone with the link; claiming a
 * name, joining, creating a trip, and money/organizer actions require the
 * session email to match the attendee record they act as. No passwords, no
 * accounts — the inbox is the key.
 */

export const SESSION_COOKIE = "mvp_session";
const SESSION_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const CODE_TTL_MS = 10 * 60 * 1000;
const CODES_KEY = "mvp:authcodes";

function secret(): string {
  const s = process.env.MVP_AUTH_SECRET;
  if (!s) throw new Error("MVP_AUTH_SECRET is not set");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Mint a session token for a verified email. */
export function mintSession(email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ e: email, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

/** Validate a session token; returns the email or null. */
export function readSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      e?: string;
      exp?: number;
    };
    if (!data.e || !data.exp || data.exp < Date.now()) return null;
    return data.e;
  } catch {
    return null;
  }
}

/** The verified email for this request, or null. */
export async function getSessionEmail(): Promise<string | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  };
}

// ---------- one-time codes ----------

type CodeEntry = { email: string; hash: string; exp: number; attempts: number };

function codeHash(email: string, code: string): string {
  return createHash("sha256").update(`${email}:${code}:${secret()}`).digest("hex");
}

async function loadCodes(): Promise<CodeEntry[]> {
  try {
    const raw = await rawGet(CODES_KEY);
    const arr = raw ? (JSON.parse(raw) as CodeEntry[]) : [];
    return Array.isArray(arr) ? arr.filter((c) => c.exp > Date.now()) : [];
  } catch {
    return [];
  }
}

/** Issue a fresh 6-digit code for an email (replaces any previous one). */
export async function issueCode(email: string): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codes = (await loadCodes()).filter((c) => c.email !== email);
  codes.push({ email, hash: codeHash(email, code), exp: Date.now() + CODE_TTL_MS, attempts: 0 });
  await rawSet(CODES_KEY, JSON.stringify(codes));
  return code;
}

/** Check a code; consumes it on success. Max 5 attempts per issued code. */
export async function checkCode(email: string, code: string): Promise<boolean> {
  const codes = await loadCodes();
  const entry = codes.find((c) => c.email === email);
  if (!entry) return false;
  if (entry.attempts >= 5) return false;
  entry.attempts += 1;
  const ok = entry.hash === codeHash(email, code.trim());
  const kept = ok ? codes.filter((c) => c.email !== email) : codes;
  await rawSet(CODES_KEY, JSON.stringify(kept));
  return ok;
}

// ---------- actor gates ----------

export type Gate = "verify" | "forbidden" | null;

/**
 * May this request act as `actorId` on this trip? When the attendee record
 * carries an email, the verified session must be that email — a forwarded
 * link alone can't spend, settle, or organize as someone else. Records with
 * no email yet (legacy shells added by others) stay actable until claimed.
 */
export function actorGate(trip: Trip, actorId: string | undefined, sessionEmail: string | null): Gate {
  if (!actorId) return "forbidden";
  const actor: Attendee | undefined = trip.attendees.find((a) => a.id === actorId);
  if (!actor) return "forbidden";
  if (actor.email && sessionEmail !== actor.email) return "verify";
  return null;
}

/** Organizer actions additionally require the actor to be the organizer. */
export function organizerGate(trip: Trip, actorId: string | undefined, sessionEmail: string | null): Gate {
  if (!actorId) return "forbidden";
  const actor = trip.attendees.find((a) => a.id === actorId);
  if (!actor?.isOrganizer) return "forbidden";
  if (actor.email && sessionEmail !== actor.email) return "verify";
  return null;
}

export const VERIFY_MSG =
  "🔐 Quick email check needed — verify it's you at the top of the trip, then try again.";
