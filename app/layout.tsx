import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getCatalog } from "@/lib/catalog";
import "./globals.css";

const sans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Introvert Co-pilot",
  description: "Walk into GitHub Universe knowing exactly what to say.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fetchedLabel = getCatalog().fetchedLabel;
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} font-sans antialiased`}>
        <AppShell fetchedLabel={fetchedLabel}>{children}</AppShell>
      </body>
    </html>
  );
}
