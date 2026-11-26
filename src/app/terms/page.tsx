import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — MyVacaPlanner",
  description:
    "The terms for MyVacaPlanner: the free trip planner, the optional $19.99 one-time Organizer Pass, refunds, and how disputes are handled.",
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="The fine print, minus the fine print"
      title="Terms of Service"
      intro="MyVacaPlanner (the Planner, we, us) is operated by MOYLINEAI LLC, a Massachusetts limited liability company. By using myvacaplanner.com or buying an Organizer Pass, you agree to these terms. If you don't agree, please don't use the Planner."
    >
      <LegalSection title="1. What MyVacaPlanner does">
        <p>
          MyVacaPlanner is a group trip planner that lives at one shareable link: crew and RSVPs,
          a shared schedule, flight arrivals, a place to stay, polls, a packing list, and expenses
          split and settled. There is no account and no password. Your trip lives at a private
          link, and that link is your key — anyone who has it can view the trip and add to it.
          Treat it the way you would a password and share it only with people you trust.
        </p>
        <p>
          Planning a trip is free, and the whole current product stays free. The only thing we
          ever sell is the optional Organizer Pass (section 4).
        </p>
      </LegalSection>

      <LegalSection title="2. Who can use it">
        <p>
          You must be at least 18 years old (or the age of majority where you live) to buy an
          Organizer Pass, and able to form a binding contract. When you check out, you represent
          that the payment method you use is yours or that you&rsquo;re authorized to use it.
          Anyone may join a trip from its link; the organizer is responsible for who they share
          the link with.
        </p>
      </LegalSection>

      <LegalSection title="3. Your trip, your content">
        <p>
          The names, dates, flights, expenses, and notes your crew adds stay yours. By adding
          content to a trip, you give MOYLINEAI LLC a limited license to store it and transmit it
          to the service providers we use to run the Planner, for the purpose of operating and
          re-serving your trip — nothing more. We do not use your trip content for advertising,
          and we do not use it to train AI models.
        </p>
        <p>
          Only add content you have the right to share. Do not post anything unlawful,
          infringing, or abusive, and do not use the Planner to harass anyone. We may remove
          content or a trip that violates this section.
        </p>
      </LegalSection>

      <LegalSection title="4. The Organizer Pass — $19.99, one-time, per trip">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>$19.99 one-time per trip.</strong> The pass is bought by the trip organizer,
            for one trip only. It is never a subscription, and there are no recurring charges.
          </li>
          <li>
            <strong>Optional, always.</strong> The pass is an optional upgrade, never a condition
            of organizing a trip. An organizer can create and run a complete trip on the free tier,
            forever — including on trips created after the pass launched. The price and
            what&rsquo;s included are stated before purchase.
          </li>
          <li>
            <strong>What it unlocks:</strong> paid-up tracking (see who has actually paid each
            split), a group fund for shared costs, co-organizers, a pinned announcement for the
            crew, and locking the itinerary when it&rsquo;s final.
          </li>
          <li>
            <strong>Attendees never pay.</strong> Only the organizer buys the pass. Attendees
            never see pricing and are never asked to pay anything to use a trip.
          </li>
          <li>
            <strong>Grandfathering:</strong> every trip created before the pass launched keeps
            the full current feature set free, forever. A trip created after launch that has not
            bought the pass still gets the complete free product.
          </li>
          <li>
            Payments are processed by <strong>Stripe</strong>. We never see or store your full
            card number. By completing checkout you authorize the charge shown. A pass unlocks
            when our payment processor confirms payment — which is normally immediate.
          </li>
          <li>
            Prices are in U.S. dollars, are shown before you pay, and may change for future
            trips. The price on your checkout page is the price you pay.
          </li>
          <li>
            If a payment is reversed or charged back after a pass unlocks, we may suspend the
            pass features on that trip while the dispute is resolved.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Refunds">
        <p>
          Our{" "}
          <Link
            href="/refunds"
            className="font-semibold text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
          >
            Refund Policy
          </Link>{" "}
          is part of these terms. In short: <strong>a pass is refundable if the trip is cancelled
          before its start date</strong> — write to us and we will refund it to your original
          payment method. Otherwise sales are final, except when the failure is ours (a duplicate
          charge, or a technical failure on our side that blocks the pass you paid for), in which
          case we will restore the pass or refund the charge.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable use">
        <p>
          Don&rsquo;t misuse the Planner: no scraping or automated bulk trip creation, no
          reselling access to the service, no interfering with how the site runs, and no content
          described in section 3. We may suspend a trip link that is being abused; a pass
          suspended for abuse of the <em>service</em> (as opposed to the content of a trip) will
          be refunded if we cannot restore it.
        </p>
      </LegalSection>

      <LegalSection title="7. The service as-is">
        <p>
          We work hard to keep the Planner running well, but the service is provided &ldquo;as
          is,&rdquo; without warranties of any kind, express or implied. To the extent permitted
          by law, MOYLINEAI LLC&rsquo;s liability for any claim arising from a trip or a pass is
          limited to the amount you paid for that pass, and we are not liable for indirect or
          consequential damages. Some jurisdictions do not allow certain limitations, so parts of
          this section may not apply to you.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to the Planner and these terms">
        <p>
          We may update these terms as the Planner grows. The version on this page is the current
          one; material changes will be reflected in the &ldquo;last updated&rdquo; date above.
          Changes apply going forward —{" "}
          <strong>the price and refund terms in force when you bought a pass govern that
          pass.</strong>
        </p>
      </LegalSection>

      <LegalSection title="9. Disputes and governing law">
        <p>
          These terms are governed by the laws of the <strong>Commonwealth of
          Massachusetts</strong>. If something goes wrong, contact us first at
          support@moylineai.com and give us 30 days to make it right — most problems in a trip
          planner are fixable, and we&rsquo;d rather fix yours.
        </p>
        <p>
          If we can&rsquo;t resolve it together, the dispute will be resolved by{" "}
          <strong>binding arbitration</strong> conducted in Massachusetts under the rules of a
          nationally recognized arbitration administrator, rather than in court, and the
          arbitrator&rsquo;s award will be final and binding.{" "}
          <strong>You and we each waive any right to a jury trial and to bring, join, or
          participate in a class action or other representative proceeding</strong> — disputes
          between us are resolved only on an individual basis. Either of us may still bring an
          individual claim in a Massachusetts small-claims court if the claim qualifies.
        </p>
      </LegalSection>

      <LegalSection title="10. The rest">
        <p>
          If any part of these terms is found unenforceable, the rest stands. These terms, the
          Refund Policy, and the Privacy Policy are the whole agreement between us about the
          Planner. Our not enforcing a provision once isn&rsquo;t a waiver of it. We may assign
          these terms if the business is sold or reorganized.
        </p>
      </LegalSection>

      <LegalSection title="11. Contact">
        <p>
          Questions about a trip, a pass, or these terms:{" "}
          <strong>support@moylineai.com</strong> — include your trip link.
          <br />
          MOYLINEAI LLC, 82 Wendell Ave, Ste 100, Pittsfield, MA 01201 (our registered-agent
          mailing address — the same address shown on your Stripe receipt).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
