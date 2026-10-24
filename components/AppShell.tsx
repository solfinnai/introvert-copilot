"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DEMO_PHOTO_SRC, demoPhotoFallbacks } from "@/lib/demo-user";
import { PersonPhoto } from "./PersonPhoto";
import { PoweredBy } from "./PoweredBy";
import { SessionProvider } from "./session";

const NAV = [
  { href: "/", label: "Home", n: "01" },
  { href: "/meet", label: "Who to meet", n: "02" },
  { href: "/speakers", label: "Speakers", n: "03" },
  { href: "/saved", label: "Saved", n: "04" },
  { href: "/agent", label: "Ask agent", n: "05" },
  { href: "/me", label: "Your story", n: "06" },
];

export function AppShell({
  children,
  henryAvatar,
  henryName,
}: {
  children: ReactNode;
  henryAvatar: string;
  henryName: string;
}) {
  return (
    <SessionProvider>
      <div className="app-shell min-h-screen md:grid md:grid-cols-[220px_1fr]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-col">
          <TopBar henryAvatar={henryAvatar} henryName={henryName} />
          <MobileNav />
          <main className="flex-1 px-5 py-6 md:px-10 md:py-8">{children}</main>
          <PoweredBy />
        </div>
      </div>
    </SessionProvider>
  );
}

function Sidebar() {
  return (
    <aside className="hidden border-r border-[#e3d9cb] bg-side md:flex md:min-h-screen md:flex-col md:px-3 md:py-4">
      <Brand className="mb-6 px-2" />
      <NavList />
    </aside>
  );
}

function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Introvert Co-pilot</span>
    </Link>
  );
}

function NavList() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
              active ? "bg-white shadow-card" : "text-[#3f3a34] hover:bg-white/60"
            }`}
          >
            <span className="w-6 font-mono text-[11px] text-[#b33b12]">{item.n}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="no-print flex gap-2 overflow-x-auto border-b border-line bg-side px-4 py-2 md:hidden">
      {NAV.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${active ? "bg-white" : ""}`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function TopBar({ henryAvatar, henryName }: { henryAvatar: string; henryName: string }) {
  return (
    <header className="border-b border-line bg-[#f7f4ee] px-5 py-3 md:px-8">
      <div className="flex items-center gap-3">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <Brand className="md:hidden" />
          <div className="hidden min-w-0 items-baseline gap-3 md:flex">
            <p className="text-sm font-semibold">GitHub Universe 2026</p>
            <p className="text-sm text-mute">Oct 28 to 29, Fort Mason, SF</p>
          </div>
        </div>
        <Link href="/me" className="inline-flex max-w-[46%] items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-xs font-medium md:max-w-full">
          <PersonPhoto
            src={DEMO_PHOTO_SRC}
            fallbackSrc={henryAvatar}
            fallbacks={demoPhotoFallbacks()}
            name={henryName}
            size={24}
          />
          <span className="truncate">Signed in as {henryName}</span>
        </Link>
      </div>
      <p className="mt-1 truncate text-xs text-mute md:hidden">GitHub Universe 2026, Oct 28 to 29, Fort Mason, SF</p>
    </header>
  );
}
