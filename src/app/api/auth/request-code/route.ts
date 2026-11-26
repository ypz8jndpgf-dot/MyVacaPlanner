import { NextResponse } from "next/server";
import { cleanEmail } from "@/lib/email";
import { issueCode } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Email a 6-digit sign-in code. Always answers ok (never reveals whether
 *  an address is known); delivery failure still answers ok so the verify
 *  step can offer a retry without leaking account state. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = cleanEmail(body?.email);
  if (!email)
    return NextResponse.json({ error: "A valid email is required.", code: "EMAIL_REQUIRED" }, { status: 400 });

  const code = await issueCode(email);
  const key = process.env.MVP_RESEND_API_KEY;
  const from = process.env.MVP_EMAIL_FROM ?? "MyVacaPlanner <support@noblebeaststudio.com>";
  if (key) {
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email],
          subject: `Your MyVacaPlanner code: ${code}`,
          text: `Your MyVacaPlanner sign-in code is ${code}.\n\nIt expires in 10 minutes. Enter it on the trip page to verify it's you — no password, ever.\n\nDidn't ask for this? Just ignore it; nothing happens without the code.`,
          html: `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:24px">
  <div style="font-size:15px;font-weight:700;color:#0d2b33">Your MyVacaPlanner sign-in code</div>
  <div style="font-size:40px;font-weight:900;letter-spacing:8px;color:#0b5563;margin:14px 0">${code}</div>
  <p style="font-size:14px;line-height:1.5;color:#3d5a63">It expires in 10 minutes. Enter it on the trip page to verify it's you — no password, ever.</p>
  <p style="font-size:12px;color:#93a1a8">Didn't ask for this? Just ignore it; nothing happens without the code.</p>
</div>`,
        }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      // The code stays valid; the client can request another.
    }
  }
  return NextResponse.json({ ok: true });
}
