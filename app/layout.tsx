import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { getCatalog } from "@/lib/catalog";
import { demoProfile } from "@/lib/demo-user";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  axes: ["opsz"],
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Introvert Co-pilot",
  description: "Walk into every conversation knowing what to say about yourself and what to ask them.",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fetchedLabel = getCatalog().fetchedLabel;
  return (
    <html lang="en">
      <body className={`${sans.variable} ${mono.variable} bg-bg font-sans text-ink antialiased`}>
        <AppShell
          fetchedLabel={fetchedLabel}
          henryAvatar={demoProfile.photo.linkedin_avatar_url}
          henryName={demoProfile.name}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
