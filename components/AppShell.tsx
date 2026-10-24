"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { SessionProvider, useSession } from "./session";

const NAV = [
  { href: "/", label: "Home", n: "01" },
  { href: "/story", label: "Your story", n: "02" },
  { href: "/meet", label: "Who to meet", n: "03" },
  { href: "/saved", label: "Saved", n: "04" },
  { href: "/chat", label: "Agent chat", n: "05" },
];

export function AppShell({
  children,
  fetchedLabel,
}: {
  children: ReactNode;
  fetchedLabel: string;
}) {
  return (
    <SessionProvider>
      <div className="min-h-screen md:grid md:grid-cols-[220px_1fr]">
        <Sidebar />
        <div className="min-w-0">
          <TopBar fetchedLabel={fetchedLabel} />
          <MobileNav />
          <main className="px-5 py-6 md:px-10 md:py-8">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}

function Sidebar() {
  return (
    <aside className="hidden border-r border-[#e3d9cb] bg-side md:flex md:min-h-screen md:flex-col md:justify-between md:px-3 md:py-4">
      <div>
        <Brand />
        <NavList />
      </div>
      <Footer />
    </aside>
  );
}

function Brand() {
  return (
    <Link href="/" className="mb-6 flex items-center gap-2 px-2">
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
      </span>
      <span className="text-sm font-semibold tracking-tight">Introvert Co-pilot</span>
    </Link>
  );
}

function NavList() {
  const pathname = usePathname();
  const { state, ready } = useSession();
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
            {item.href === "/saved" && ready && state.saved.length > 0 && (
              <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-semibold text-white">
                {state.saved.length}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-2 overflow-x-auto border-b border-line bg-side px-4 py-2 md:hidden">
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

function Footer() {
  return (
    <p className="px-3 pb-2 text-[11px] leading-4 text-mute">
      Powered by Bright Data (public web intel), FalkorDB (graph memory), OpenAI + TrueForge
      (agent). PRs reviewed by Qodo.
    </p>
  );
}

function TopBar({ fetchedLabel }: { fetchedLabel: string }) {
  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-line bg-[#f7f4ee] px-5 py-3 md:px-8">
      <div className="mr-auto flex items-baseline gap-3">
        <p className="text-sm font-semibold">GitHub Universe 2026</p>
        <p className="hidden text-sm text-mute sm:block">Oct 28 to 29, Fort Mason, SF</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-xs text-[#3f3a34]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#b5812a]" />
        Cached snapshot, {fetchedLabel}
      </span>
      <Link href="/story" className="inline-flex items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 text-xs font-medium">
        <img src="/henry.jpg" alt="" className="h-6 w-6 rounded-full object-cover" />
        Demo as Henry Finn
      </Link>
      <ResetButton />
    </header>
  );
}

function ResetButton() {
  const { resetLocal } = useSession();
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium hover:bg-[#fff]"
      onClick={() => {
        resetLocal();
        void fetch("/api/reset", { method: "POST" }).finally(() => {
          router.refresh();
          window.location.href = "/";
        });
      }}
    >
      Reset demo
    </button>
  );
}
