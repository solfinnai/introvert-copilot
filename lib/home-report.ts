import { stripDashes } from "./draft";
import type { StoryReport } from "./story-context";

/** Markdown download. Notes are the only part the visitor typed. */
export function homeReportMarkdown(report: StoryReport, notes: string): string {
  const lines = [`# ${report.name}`, "", report.headline, ""];
  if (report.city) lines.push(report.city, "");
  if (report.chips.length) lines.push(report.chips.join(", "), "");
  for (const section of report.sections) {
    lines.push(`## ${section.heading}`, "");
    for (const paragraph of section.paragraphs) lines.push(paragraph, "");
    for (const item of section.items) {
      const label = item.label ? `${item.label}: ` : "";
      const href = item.href ? ` (${item.href})` : "";
      lines.push(`- ${label}${item.text}${href}`);
    }
    if (section.items.length) lines.push("");
  }
  const note = notes.replace(/\u2014/g, ", ").replace(/\u2013/g, ", ").trim();
  lines.push("## Notes", "", note || "None yet.", "");
  return stripDashes(lines.join("\n"));
}
