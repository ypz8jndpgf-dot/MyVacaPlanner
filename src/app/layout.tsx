import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";

const display = Baloo_2({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const sans = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://myvacaplanner.com"),
  title: "MyVacaPlanner — your trip, in one link",
  description:
    "One shared space for your trip: invites & RSVP, flight arrivals, the group schedule, and expenses split and settled. No accounts, no app install — just the link.",
  keywords: [
    "group trip planner",
    "trip planner",
    "vacation planner",
    "group travel itinerary",
    "split trip expenses",
    "golf trip planner",
    "bachelor party trip planner",
    "family reunion planner",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "MyVacaPlanner",
    title: "MyVacaPlanner — your trip, in one link",
    description:
      "Invites & RSVP, flight arrivals, the group schedule, polls, and expenses split and settled — one link for the whole crew. No accounts, no app install.",
    url: "https://myvacaplanner.com",
    images: [{ url: "/logo.webp", alt: "MyVacaPlanner" }],
  },
  twitter: {
    card: "summary",
    title: "MyVacaPlanner — your trip, in one link",
    description:
      "One link for the whole trip: RSVP, schedule, flights, polls, and split expenses. No accounts — just the link.",
    images: ["/logo.webp"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B5563",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} font-sans`}>{children}</body>
    </html>
  );
}
