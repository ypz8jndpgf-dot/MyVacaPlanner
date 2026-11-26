import { NextResponse } from "next/server";
import { cleanEmail } from "@/lib/email";
import { checkCode, mintSession, SESSION_COOKIE, sessionCookieOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Verify a 6-digit code; on success, set the long-lived session cookie. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string; code?: string } | null;
  const email = cleanEmail(body?.email);
  const code = (body?.code ?? "").trim();
  if (!email || !/^\d{6}$/.test(code))
    return NextResponse.json({ error: "Enter the 6-digit code from your email." }, { status: 400 });
  const ok = await checkCode(email, code);
  if (!ok)
    return NextResponse.json(
      { error: "That code didn't match or expired — request a fresh one.", code: "BAD_CODE" },
      { status: 401 }
    );
  const res = NextResponse.json({ ok: true, email });
  res.cookies.set(SESSION_COOKIE, mintSession(email), sessionCookieOptions());
  return res;
}
