"use client";

import { useState } from "react";
import { cleanEmail } from "@/lib/email";

/**
 * Passwordless email verification: enter an email, get a 6-digit code,
 * enter the code, and this device holds a verified session for months.
 * Used at claim/join time, for trip creation, and by the re-verify banner
 * when a claimed identity is used from a new device.
 */
export default function VerifyEmail({
  initialEmail = "",
  onVerified,
  cta = "Email me a code",
}: {
  initialEmail?: string;
  onVerified: (email: string) => void;
  cta?: string;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [step, setStep] = useState<"email" | "code">("email");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestCode() {
    const em = cleanEmail(email);
    if (!em) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Could not send the code");
      setEmail(em);
      setStep("code");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "That code didn't match");
      onVerified(email);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That code didn't match");
    } finally {
      setBusy(false);
    }
  }

  if (step === "email") {
    return (
      <div>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-warm min-w-0 flex-1"
            autoComplete="email"
          />
          <button
            type="button"
            disabled={busy || !cleanEmail(email)}
            onClick={requestCode}
            className="btn-teal shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
          >
            {busy ? "Sending…" : cta}
          </button>
        </div>
        {error && <p className="mt-1.5 text-xs font-bold text-coral-deep">{error}</p>}
        <p className="mt-1.5 text-[11px] font-semibold text-ink-soft">
          We email you a 6-digit code — no password, ever. This device stays verified for months.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm font-bold text-teal-dark">
        Code sent to {email} — check your inbox 📬
      </p>
      <div className="mt-2 flex gap-2">
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="6-digit code"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
          className="input-warm min-w-0 flex-1 text-center font-display text-lg font-extrabold tracking-[0.3em]"
        />
        <button
          type="button"
          disabled={busy || code.length !== 6}
          onClick={verify}
          className="btn-coral shrink-0 px-4 py-2.5 text-sm disabled:opacity-50"
        >
          {busy ? "Checking…" : "Verify ✓"}
        </button>
      </div>
      {error && <p className="mt-1.5 text-xs font-bold text-coral-deep">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={requestCode}
        className="mt-1.5 text-[11px] font-bold text-teal underline disabled:opacity-50"
      >
        Send a fresh code
      </button>
    </div>
  );
}
