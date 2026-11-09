import type { Metadata } from "next";
import TripClient from "@/components/TripClient";

// Trip pages are private group spaces shared by link — never indexed.
export const metadata: Metadata = {
  title: "Trip — MyVacaPlanner",
  robots: { index: false, follow: false },
};

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TripClient slug={slug} />;
}
