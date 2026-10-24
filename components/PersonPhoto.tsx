"use client";

import { useState } from "react";

export function PersonPhoto({
  src,
  fallbackSrc,
  name,
  size = 48,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  name: string;
  size?: number;
}) {
  const sources = [src, fallbackSrc].filter((item): item is string => Boolean(item));
  const [index, setIndex] = useState(0);
  const current = sources[index];
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const style = { width: size, height: size };
  if (!current) {
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
      src={current}
      alt=""
      width={size}
      height={size}
      style={style}
      className="shrink-0 rounded-full object-cover bg-[#f6d7cb]"
      onError={() => setIndex((value) => value + 1)}
    />
  );
}
