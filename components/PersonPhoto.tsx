"use client";

import { useState } from "react";

export function PersonPhoto({
  src,
  name,
  size = 48,
}: {
  src?: string | null;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const style = { width: size, height: size };
  if (!src || failed) {
    return (
      <span
        style={style}
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#f6d7cb] text-sm font-semibold text-[#b33b12]"
      >
        {initials}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      style={style}
      className="shrink-0 rounded-full object-cover bg-[#f6d7cb]"
      onError={() => setFailed(true)}
    />
  );
}
