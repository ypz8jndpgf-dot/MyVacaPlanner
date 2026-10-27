import TripClient from "@/components/TripClient";

export default async function TripPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <TripClient slug={slug} />;
}
