import type { Metadata } from "next";
import LegalPage, { LegalSection } from "@/components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — MyVacaPlanner",
  description:
    "Your trip data is stored only to run your trip. We never sell personal data, and you can ask us to delete a trip at any time.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Your trip, your data"
      title="Privacy Policy"
      intro="MyVacaPlanner is operated by MOYLINEAI LLC. This page explains what we collect, why, and the control you keep over your trip."
    >
      <LegalSection title="What we collect">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            The trip details your crew adds — trip name, destination, dates, attendee names,
            RSVPs, schedule items, flights, lodging, polls, packing and shopping lists, expenses
            and settle-up notes.
          </li>
          <li>
            Basic pass-purchase records — which trip bought a pass, when, and the Stripe session
            reference.
          </li>
        </ul>
        <p>
          There are no accounts: we do not ask for your email address to plan a trip. Payments
          are handled by our payment processor. We never see or store your full card number.
        </p>
      </LegalSection>

      <LegalSection title="How your trip data is used">
        <p>
          Your trip data is stored for one reason: to run your trip and serve it back to anyone
          holding the trip link — the schedule, the crew, the flights, the money tab. It is not
          used for advertising, and it is not used for any purpose beyond your trip.
        </p>
        <p>
          We keep your trip data while its link is live, so the trip can be re-served whenever
          the crew returns. If you ask us to delete a trip, we delete its trip data; basic pass
          and financial records may be kept longer where bookkeeping and tax law require.
        </p>
      </LegalSection>

      <LegalSection title="Who helps us run the Planner">
        <p>
          A small number of service providers process data on our behalf, each receiving only what
          it needs to do its job:
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Stripe</strong> — processes Organizer Pass payments. We never see or store
            your full card number.
          </li>
          <li>
            <strong>Viator</strong> — powers the activities catalog for a trip&rsquo;s city; it
            receives only the destination, not your trip data.
          </li>
          <li>
            <strong>Vercel and Upstash</strong> — host the site and store your trips.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your trip link is the key">
        <p>
          There are no accounts at MyVacaPlanner. Access to a trip is controlled entirely by its
          private link, which means anyone you share the link with can see that trip&rsquo;s crew,
          schedule, flights, and expenses. Share it the way you would share a password.
        </p>
      </LegalSection>

      <LegalSection title="What we never do">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>We never sell your personal data — not your name, not your trip, not anything.</li>
          <li>We never use your data for anything but your trip and your support requests.</li>
          <li>We do not run advertising trackers on this site.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Deleting a trip">
        <p>
          Your trip is yours, and you can have it removed. Email{" "}
          <a
            href="mailto:support@moylineai.com"
            className="font-semibold text-teal-dark underline decoration-amber decoration-2 underline-offset-2"
          >
            support@moylineai.com
          </a>{" "}
          with your trip link and ask us to delete it. We will delete the trip data associated
          with that link. (A trip link stops working once the trip is deleted, so save anything
          you want to keep first.)
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          MyVacaPlanner is a trip-planning service for adults organizing group travel and is not
          directed at children under 13. Please do not add a child&rsquo;s personal information
          to a trip.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If this policy changes in a way that matters, we will update this page and its
          &ldquo;last updated&rdquo; date. The commitments above — no sale of personal data, trip
          data used only for your trip, deletion on request — are the foundation of the Planner
          and are not moving.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
