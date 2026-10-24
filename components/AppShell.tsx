"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { DEMO_PHOTO_SRC, demoPhotoFallbacks } from "@/lib/demo-user";
import { CueLogo, CueMark } from "./CueLogo";
import { Icon } from "./Icons";
import { PersonPhoto } from "./PersonPhoto";
import { PoweredBy } from "./PoweredBy";
import { SessionProvider, useSession } from "./session";

const NAV = [
  { href: "/", label: "Home", icon: "home" as const },
  { href: "/me", label: "Your story", icon: "user" as const },
  { href: "/meet", label: "Who to meet", icon: "users" as const },
  { href: "/speakers", label: "Speakers", icon: "list" as const },
  { href: "/saved", label: "Saved", icon: "bookmark" as const },
  { href: "/agent", label: "Agent chat", icon: "message" as const },
];

export function AppShell({
  children,
  henryAvatar,
  henryName,
}: {
  children: ReactNode;
  fetchedLabel: string;
  henryAvatar: string;
  henryName: string;
}) {
  return (
    <SessionProvider>
      <div className="app-shell min-h-screen bg-bg text-ink md:grid md:grid-cols-[220px_1fr]">
        <Sidebar />
        <div className="flex min-h-screen min-w-0 flex-col">
          <div className="sticky top-0 z-20 bg-bg">
            <TopBar henryAvatar={henryAvatar} henryName={henryName} />
            <MobileNav />
          </div>
          <main className="flex-1 px-4 py-4 md:px-6 md:py-5">{children}</main>
          <div className="no-print px-4 pb-2 md:hidden">
            <ResetDemo />
          </div>
          <PoweredBy />
        </div>
        <MetToast />
      </div>
    </SessionProvider>
  );
}

function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-[220px] flex-col border-r border-line bg-bg md:flex">
      <Brand />
      <NavList />
      <div className="mt-auto px-2 pb-3">
        <ResetDemo />
      </div>
    </aside>
  );
}

function Brand() {
  return (
    <Link href="/" aria-label="CUE home" className="flex h-11 items-center px-3 text-ink">
      <CueLogo height={18} />
    </Link>
  );
}

function NavList() {
  const pathname = usePathname();
  const { state, ready } = useSession();
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const count = item.href === "/saved" && ready ? state.saved.length : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 items-center gap-2 rounded-control px-2 text-[13px] transition-colors duration-ui ${
              active ? "bg-fill text-ink" : "text-mute hover:bg-fill hover:text-ink"
            }`}
          >
            <Icon name={item.icon} />
            <span className="min-w-0 truncate">{item.label}</span>
            {count > 0 && <span className="ml-auto text-meta text-faint">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="no-print flex flex-wrap gap-1 border-b border-line px-3 py-1.5 md:hidden">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-8 shrink-0 items-center rounded-control px-2 text-[13px] ${
              active ? "bg-fill text-ink" : "text-mute"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

function TopBar({ henryAvatar, henryName }: { henryAvatar: string; henryName: string }) {
  const pathname = usePathname();
  return (
    <header className="flex h-11 items-center gap-3 border-b border-line bg-bg px-4 md:px-5">
      <Link href="/" aria-label="CUE home" className="text-ink md:hidden">
        <CueMark height={20} />
      </Link>
      <div className="flex min-w-0 flex-1 items-baseline gap-3">
        <p className="truncate text-[13px] font-medium">{titleFor(pathname)}</p>
        <p className="hidden truncate text-meta text-faint lg:block">GitHub Universe 2026</p>
      </div>
      <Link
        href="/me"
        className="inline-flex h-7 max-w-[46%] items-center gap-2 rounded-control px-1.5 text-meta text-mute transition-colors duration-ui hover:bg-fill hover:text-ink"
      >
        <PersonPhoto
          src={DEMO_PHOTO_SRC}
          fallbackSrc={henryAvatar}
          fallbacks={demoPhotoFallbacks()}
          name={henryName}
          size={18}
        />
        <span className="truncate">{henryName}</span>
      </Link>
    </header>
  );
}

function matches(pathname: string, base: string) {
  return pathname === base || pathname.startsWith(`${base}/`);
}

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : matches(pathname, href);
}

function titleFor(pathname: string) {
  if (pathname === "/") return "Home";
  if (matches(pathname, "/me") || matches(pathname, "/story")) return "Your story";
  if (matches(pathname, "/meet")) return "Who to meet";
  if (matches(pathname, "/speakers")) return "Speakers";
  if (matches(pathname, "/saved")) return "Saved";
  if (matches(pathname, "/agent") || matches(pathname, "/chat")) return "Agent chat";
  if (matches(pathname, "/people")) return "Person";
  return "CUE";
}

function MetToast() {
  const { toast, undoToast } = useSession();
  if (!toast) return null;
  return (
    <div className="no-print pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-panel border border-line bg-raised px-3 py-2"
      >
        <p className="min-w-0 flex-1 text-body leading-5">{toast.message}</p>
        <button type="button" className="btn btn-primary shrink-0" onClick={undoToast}>
          Undo
        </button>
      </div>
    </div>
  );
}

function ResetDemo() {
  const { resetLocal } = useSession();
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-quiet"
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
