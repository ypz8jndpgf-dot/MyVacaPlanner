import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Refund Policy — MyVacaPlanner",
  description:
    "A pass is refundable if the trip is cancelled before its start date. Otherwise sales are final — except when the failure is ours.",
};

export default function RefundsPage() {
  return (
    <LegalPage
      eyebrow="Fair, in writing"
      title="Refund Policy"
      intro="Planning a trip is free, and the Organizer Pass is the only thing we sell. This policy explains when a pass is refundable."
    >
      <LegalSection title="Cancelled trip? Full refund.">
        <p>
          <strong>
            If your trip is cancelled before its start date, your Organizer Pass is refundable in
            full.
          </strong>{" "}
          Email{" "}
          <a
            href="mailto:support@moylineai.com"
            className="font-semibold text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
          >
            support@moylineai.com
          </a>{" "}
          with your trip link, tell us the trip is cancelled, and we will refund the $19.99 to
          your original payment method.
        </p>
      </LegalSection>

      <LegalSection title="Otherwise, all pass sales are final">
        <p>
          The pass is a one-time $19.99 unlock for a single trip, and the price and what&rsquo;s
          included are shown before you pay. We do not offer refunds for a change of mind, for a
          trip that goes ahead without using the pass features, or for a trip that ends early —
          the pass is priced for the trip, not for how much of it you use.
        </p>
      </LegalSection>

      <LegalSection title="The exception: when the failure is ours">
        <p>
          If something on our side goes wrong, we make it right. That covers situations like:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>You were charged twice for the same trip&rsquo;s pass.</li>
          <li>
            You were charged, but a technical failure on our side blocks the pass features you
            paid for.
          </li>
          <li>
            A pass you bought never unlocks on its trip.
          </li>
        </ul>
        <p>
          In those cases we will restore the pass or refund the charge — whichever actually fixes
          the problem. Email{" "}
          <a
            href="mailto:support@moylineai.com"
            className="font-semibold text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
          >
            support@moylineai.com
          </a>{" "}
          with your trip link and a short description of what happened, and we will sort it out.
        </p>
        <p>
          For claims under this exception, please write to us within 30 days of the charge.
          Duplicate-charge claims are exempt from that window — duplicates often surface later on
          a statement, and a duplicate is a duplicate whenever you spot it.
        </p>
      </LegalSection>

      <LegalSection title="How refunds are paid">
        <p>
          We review each refund request against the trip record. Approved refunds are issued to
          your original payment method through Stripe; once issued, banks typically take 5–10
          business days to post them to your account.
        </p>
      </LegalSection>

      <LegalSection title="If a charge never unlocks anything">
        <p>
          A paid pass that never unlocks is our failure by definition — see the exception above.
          You will never be left charged for a pass you could not open.
        </p>
        <p>
          Nothing in this policy limits any rights you may have under Massachusetts or other
          applicable consumer-protection law.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
