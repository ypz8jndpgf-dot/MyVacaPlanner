import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyVacaPlanner — your trip, in one link",
  description:
    "One shared space for your trip: invites & RSVP, flight arrivals, the group schedule, and expenses split and settled. No accounts, no app install — just the link.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B5563",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
