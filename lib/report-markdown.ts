import { sanitizeCopy } from "./sanitize";
import { describeFetches, formatStamp, type Claim, type FetchReport, type PersonIntel } from "./intel";
import type { ConversationPlan } from "./plan";
import type { PublicLink } from "./public-links";

export interface ReportSessionLine {
  title: string;
  line: string;
}

export function buildReportMarkdown(input: {
  name: string;
  titleLine: string;
  catchLine: string;
  sessions: ReportSessionLine[];
  plan: ConversationPlan;
  intel: PersonIntel;
  report: FetchReport;
  links: PublicLink[];
}): string {
  const parts: string[] = [
    `# ${line(input.name) || "Speaker"}`,
    "",
    line(input.titleLine) || "Title and company not listed",
    "",
    `Catch them: ${line(input.catchLine) || "Time to be confirmed"}`,
    "",
    "## Sessions",
    "",
  ];
  if (input.sessions.length) {
    for (const session of input.sessions) {
      parts.push(`- ${line(session.title) || "Session title not listed"}. ${line(session.line)}`);
    }
  } else {
    parts.push("No session is listed in the catalog.");
  }
  parts.push(
    "",
    "## Conversation plan",
    "",
    "### Why you should meet",
    "",
    line(input.plan.why) || "Not listed in the sources we have.",
    "",
    "### How to talk about yourself",
    "",
  );
  pushList(parts, input.plan.angles);
  parts.push("", "### Openers", "");
  pushList(parts, input.plan.openers);
  parts.push(
    "",
    "### Follow-up idea",
    "",
    line(input.plan.followUp) || "Not listed in the sources we have.",
    "",
    "Nothing is sent. This is a note you can use later.",
    "",
    "## Intel",
    "",
    line(input.intel.label) || "Cached snapshot",
    "",
    line(describeFetches(input.report, input.intel.mode)),
    "",
    "Public sources only. Nothing in this file sends a message.",
    "",
    "## Work",
    "",
  );
  pushClaims(parts, input.intel.work, input.intel.workGap);
  parts.push("", "## Education", "");
  pushClaims(parts, input.intel.education, input.intel.educationGap);
  parts.push(
    "",
    "## Personality and communication",
    "",
    line(input.intel.personality.label),
    "",
    line(input.intel.personality.summary) || "Not listed in the sources we have.",
    "",
    line(input.intel.personality.communication),
    "",
    sourceLine(input.intel.personality.sourceLabel, input.intel.personality.sourceUrl, input.intel.personality.fetchedAt),
    "",
    "## Psychographics",
    "",
  );
  pushClaims(parts, input.intel.psychographics, null);
  parts.push("", "## Recent news", "");
  if (input.intel.newsNote) parts.push(line(input.intel.newsNote), "");
  pushClaims(parts, input.intel.news, null);
  parts.push("", "## What makes them stand out", "");
  pushClaims(parts, input.intel.standout, null);
  parts.push("", "## Public talking points", "");
  pushClaims(parts, input.intel.talkingPoints, null);
  parts.push("", "## Public links", "");
  if (input.links.length) {
    for (const link of input.links) {
      const url = safeUrl(link.url);
      const title = line(link.title) || url || "Link";
      parts.push(url ? `- ${title} (${url})` : `- ${title}`);
    }
  } else {
    parts.push("No public articles, sites, or news in the cached snapshot.");
  }
  parts.push("");
  return parts.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

function pushList(parts: string[], items: string[]): void {
  const rows = items.map((item) => line(item)).filter(Boolean);
  if (!rows.length) {
    parts.push("Not listed in the sources we have.");
    return;
  }
  for (const row of rows) parts.push(`- ${row}`);
}

function pushClaims(parts: string[], claims: Claim[], gap: string | null): void {
  if (gap) parts.push(line(gap), "");
  if (!claims.length && !gap) {
    parts.push("Nothing public in this section.");
    return;
  }
  for (const claim of claims) {
    parts.push(`- ${line(claim.text) || "Not listed in the sources we have."}`);
    parts.push(`  ${sourceLine(claim.sourceLabel, claim.sourceUrl, claim.fetchedAt)}`);
  }
}

function sourceLine(label: string, url: string, fetchedAt: string): string {
  const name = line(label) || "Source";
  const href = safeUrl(url);
  const when = line(formatStamp(fetchedAt));
  const source = href ? `${name} (${href})` : name;
  return `Source: ${source}. Fetched ${when}.`;
}

function line(value: string): string {
  return sanitizeCopy(value.replace(/\s+/g, " "));
}

function safeUrl(url: string): string {
  const clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) return "";
  return clean.replace(/\s/g, "");
}
