"use client";

import { useState } from "react";

export function PersonPhoto({
  src,
  fallbackSrc,
  name,
  size = 48,
  fallbacks = [],
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  name: string;
  size?: number;
  fallbacks?: string[];
}) {
  const [index, setIndex] = useState(0);
  const sources = [src, fallbackSrc, ...fallbacks].filter((item): item is string => Boolean(item));
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
        className="inline-flex shrink-0 items-center justify-center rounded-full bg-fill text-meta font-medium text-mute"
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
      className="shrink-0 rounded-full bg-fill object-cover"
      onError={() => setIndex((value) => value + 1)}
    />
  );
}
