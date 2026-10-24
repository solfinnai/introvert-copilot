"use client";

import { useState } from "react";

export function SiteFavicon({ domain }: { domain: string }) {
  const [failed, setFailed] = useState(false);
  if (!domain || failed) {
    return <span className="inline-block h-4 w-4 shrink-0 rounded-sm bg-[#e7e0d4]" aria-hidden="true" />;
  }
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
      alt=""
      width={16}
      height={16}
      className="h-4 w-4 shrink-0 rounded-sm"
      onError={() => setFailed(true)}
    />
  );
}
