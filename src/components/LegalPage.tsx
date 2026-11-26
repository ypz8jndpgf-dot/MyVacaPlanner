import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Shared shell for MyVacaPlanner's legal pages — same visual language as
 * the homepage (teal hero, white card, Manrope), modeled on Noble Beast
 * Studio's legal pages but written for this product.
 */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-7 first:mt-0">
      <h2 className="font-display text-xl font-extrabold tracking-tight text-teal-dark">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] font-medium leading-relaxed text-ink">
        {children}
      </div>
    </section>
  );
}

export default function LegalPage({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  children: ReactNode;
}) {
  return (
    <main className="pb-16">
      <section className="bg-gradient-to-b from-teal-deep via-teal to-teal-light">
        <div className="mx-auto max-w-3xl px-5 pb-12 pt-10 sm:pt-14">
          <Link
            href="/"
            className="text-sm font-bold text-teal-mist underline decoration-dotted underline-offset-2"
          >
            ← Back to MyVacaPlanner
          </Link>
          <p className="mt-6 text-[11px] font-extrabold uppercase tracking-[0.28em] text-teal-mist/90">
            {eyebrow}
          </p>
          <h1 className="mt-2 font-display text-4xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          <p className="mt-3 max-w-xl text-[16px] font-medium leading-relaxed text-teal-mist">
            {intro}
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-5">
        <div className="card -mt-6 px-6 py-7 sm:px-8">
          {children}
          <p className="mt-8 border-t border-cream-edge/70 pt-4 text-xs font-semibold text-ink-soft">
            Last updated: November 17, 2026 · MyVacaPlanner is operated by MOYLINEAI LLC, 82
            Wendell Ave, Ste 100, Pittsfield, MA 01201.
          </p>
        </div>
        <footer className="px-4 pb-2 pt-6 text-center">
          <p className="text-xs font-semibold text-ink-soft">
            <Link href="/terms" className="underline decoration-dotted underline-offset-2">
              Terms
            </Link>
            {" · "}
            <Link href="/privacy" className="underline decoration-dotted underline-offset-2">
              Privacy
            </Link>
            {" · "}
            <Link href="/refunds" className="underline decoration-dotted underline-offset-2">
              Refunds
            </Link>
            {" · "}
            <Link href="/" className="underline decoration-dotted underline-offset-2">
              MyVacaPlanner
            </Link>
          </p>
        </footer>
      </div>
    </main>
  );
}
