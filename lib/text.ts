export function humanList(items: string[]): string {
  const clean = items.map((item) => item.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} and ${clean[clean.length - 1]}`;
}

export function leadSentences(bio: string, max = 260): string {
  const clean = bio.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const parts = clean.split(/(?<=[.!?])\s+/);
  let out = "";
  for (const part of parts) {
    const next = out ? `${out} ${part}` : part;
    if (out && next.length > max) break;
    out = next;
    if (out.length > 180) break;
  }
  if (!out) return "";
  return /[.!?]$/.test(out) ? out : `${out}.`;
}

export function shortTitle(title: string, max = 48): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > 24 ? cut.slice(0, space) : cut).trim()}...`;
}

export function clockLabel(start: string): string {
  const match = start.trim().match(/^0?(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return start.trim();
  return `${Number(match[1])}:${match[2]} ${match[3].toUpperCase()}`;
}

export function startMinutes(start: string): number {
  const match = start.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 24 * 60;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") hour += 12;
  return hour * 60 + Number(match[2]);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
