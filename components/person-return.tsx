"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { personHref } from "@/lib/speakers";
import { PersonPhoto } from "./PersonPhoto";

const RETURN_PATH_KEY = "ic-person-return";
const RETURN_LEN_KEY = "ic-person-return-len";
const RETURN_SCROLL_KEY = "ic-person-return-scroll";

export function rememberPersonReturn() {
  if (typeof window === "undefined") return;
  if (window.location.pathname.startsWith("/people")) return;
  try {
    sessionStorage.setItem(RETURN_PATH_KEY, `${window.location.pathname}${window.location.search}`);
    sessionStorage.setItem(RETURN_LEN_KEY, String(window.history.length));
    sessionStorage.setItem(RETURN_SCROLL_KEY, String(window.scrollY || 0));
  } catch {
    // Private mode can block storage. Back still has the /meet fallback.
  }
}

export function PersonNameLink({ id, name, className }: { id: string; name: string; className?: string }) {
  return (
    <Link href={personHref(id)} onClick={rememberPersonReturn} className={className ?? "hover:text-accent hover:underline"}>
      {name}
    </Link>
  );
}

export function PersonPhotoLink({
  id,
  name,
  src,
  size,
}: {
  id: string;
  name: string;
  src?: string | null;
  size: number;
}) {
  return (
    <Link href={personHref(id)} aria-label={`${name} photo`} onClick={rememberPersonReturn} className="inline-flex shrink-0 rounded-full">
      <PersonPhoto src={src} name={name} size={size} />
    </Link>
  );
}

export function PersonBack() {
  const router = useRouter();
  return (
    <button type="button" className="border-0 bg-transparent p-0 text-meta text-accent hover:underline" onClick={() => leavePerson(router)}>
      Back
    </button>
  );
}

export function RestoreListScroll() {
  const pathname = usePathname();
  useEffect(() => {
    let path = "";
    let y = Number.NaN;
    try {
      path = sessionStorage.getItem(RETURN_PATH_KEY) ?? "";
      y = Number(sessionStorage.getItem(RETURN_SCROLL_KEY));
    } catch {
      return;
    }
    if (!path || !Number.isFinite(y)) return;
    if (`${window.location.pathname}${window.location.search}` !== path) return;
    let stopped = false;
    const apply = () => {
      if (Math.abs(window.scrollY - y) > 2) window.scrollTo(0, y);
    };
    const onScroll = () => {
      if (!stopped && Math.abs(window.scrollY - y) > 40) apply();
    };
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    const timers = [0, 50, 150, 400, 800].map((ms) => window.setTimeout(apply, ms));
    const stop = window.setTimeout(() => {
      stopped = true;
      window.removeEventListener("scroll", onScroll);
      try {
        sessionStorage.removeItem(RETURN_SCROLL_KEY);
      } catch {
        // Ignore a blocked clear. The next visit compares the path again.
      }
    }, 900);
    return () => {
      stopped = true;
      window.removeEventListener("scroll", onScroll);
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(stop);
    };
  }, [pathname]);
  return null;
}

function leavePerson(router: { back: () => void; push: (href: string) => void }) {
  let stored: string | null = null;
  let savedLen = Number.NaN;
  try {
    stored = sessionStorage.getItem(RETURN_PATH_KEY);
    savedLen = Number(sessionStorage.getItem(RETURN_LEN_KEY));
  } catch {
    stored = null;
  }
  const path = safeReturn(stored);
  if (path && Number.isFinite(savedLen) && window.history.length > savedLen) {
    router.back();
    return;
  }
  router.push(path ?? "/meet");
}

function safeReturn(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/people")) return null;
  if (raw.includes("://") || raw.includes("\\")) return null;
  return raw;
}
