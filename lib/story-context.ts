import { demoProfile, displayHonestLine, publicProfileLinks } from "./demo-user";
import { stripDashes } from "./draft";
import { henryPublic } from "./henry-profile";

export interface StoryItem {
  label: string;
  text: string;
  href: string | null;
}

export interface StorySection {
  heading: string;
  paragraphs: string[];
  items: StoryItem[];
}

export interface StoryReport {
  name: string;
  headline: string;
  city: string;
  chips: string[];
  linkedin: string | null;
  sections: StorySection[];
}

interface SourceRow {
  url?: string;
  via?: string;
}

const AUDIENCES = [
  { label: "Developers", line: () => demoProfile.personality_note.one_liners_by_audience.developers },
  { label: "Creators", line: () => demoProfile.personality_note.one_liners_by_audience.creators },
  { label: "Investors", line: () => demoProfile.personality_note.one_liners_by_audience.investors },
] as const;

/** Plain-English report from the verified profile. Nothing here is guessed. */
export function storyReport(): StoryReport {
  const henry = henryPublic();
  const me = demoProfile;
  const sections: StorySection[] = [
    whoSection(henry.followers),
    buildSection(henry.demoGoal),
    talkingSection(henry.talkingPoints),
    avoidSection(),
    introSection(),
    gapSection(henry.experienceGap, henry.educationGap),
    sourceSection(henry.fetchedAt, henry.posts),
  ];
  return {
    name: plain(me.name),
    headline: plain(me.headline),
    city: plain(me.city),
    chips: me.topic_chips.map((chip) => plain(chip)).filter(Boolean),
    linkedin: https(me.linkedin_url),
    sections: sections.map(cleanSection),
  };
}

/** Block appended to the coach prompt. Facts only, gaps stay gaps. */
export function storyPromptBlock(): string {
  const report = storyReport();
  const lines = [
    "VERIFIED STORY",
    "These lines are the saved profile. If a line says gap, leave it blank. Do not add NDA material, unreleased intellectual property, or any fact that is not written here.",
    "Voice: introvert, honest, no hype. He hates selling himself and hates being put in a box.",
    `name: ${report.name}`,
    `headline: ${report.headline}`,
    `city: ${report.city}`,
  ];
  for (const section of report.sections) {
    lines.push(section.heading.toUpperCase());
    for (const paragraph of section.paragraphs) lines.push(paragraph);
    for (const item of section.items) {
      const label = item.label ? `${item.label}: ` : "";
      const href = item.href ? ` (${item.href})` : "";
      lines.push(`- ${label}${item.text}${href}`);
    }
  }
  return stripDashes(lines.join("\n"));
}

export function reportPlainText(report: StoryReport): string {
  const chunks = [report.name, report.headline, report.city, ...report.chips];
  for (const section of report.sections) {
    chunks.push(section.heading, ...section.paragraphs);
    for (const item of section.items) chunks.push(item.label, item.text, item.href ?? "");
  }
  return chunks.join("\n");
}

function whoSection(followers: number | null): StorySection {
  const about = plain(demoProfile.about);
  const paragraphs = [
    about,
    plain(displayHonestLine()),
    demoProfile.aka ? `Also known as ${plain(demoProfile.aka)}.` : "",
    followers != null ? `The LinkedIn snapshot lists ${followers} followers.` : "",
    demoProfile.city ? `Based in ${plain(demoProfile.city)}.` : "",
  ].filter(Boolean);
  return { heading: "Who you are", paragraphs, items: [] };
}

function buildSection(demoGoal: string): StorySection {
  const items: StoryItem[] = demoProfile.experience.map((job) => {
    const when = [job.start, job.end].filter(Boolean).join(" to ");
    const description = job.description?.trim() ? plain(job.description) : "Description: gap.";
    const text = [when, description].filter(Boolean).join(". ");
    return { label: `${plain(job.title)}, ${plain(job.company)}`, text, href: null };
  });
  for (const proof of demoProfile.proof_points) {
    items.push({ label: "Proof", text: plain(proof), href: null });
  }
  const paragraphs = [
    demoProfile.goals ? `Goal: ${plain(demoProfile.goals)}` : "",
    demoProfile.event_goal ? `Event goal: ${plain(demoProfile.event_goal)}` : "",
    demoGoal ? `Demo goal set for this product: ${plain(demoGoal)}` : "",
    demoProfile.current_company?.name
      ? `Current company on the profile: ${plain(demoProfile.current_company.title)} at ${plain(demoProfile.current_company.name)}.`
      : "",
  ].filter(Boolean);
  return { heading: "What you build", paragraphs, items };
}

function talkingSection(points: { text: string; source: "linkedin" | "confirmed" }[]): StorySection {
  const items: StoryItem[] = AUDIENCES.map((audience) => ({
    label: audience.label,
    text: plain(audience.line()),
    href: null,
  }));
  for (const point of points) {
    items.push({
      label: point.source === "linkedin" ? "LinkedIn" : "Confirmed by Henry",
      text: plain(point.text),
      href: null,
    });
  }
  return {
    heading: "Strongest talking points",
    paragraphs: ["Each line is already on the profile. The label says where it came from."],
    items,
  };
}

function avoidSection(): StorySection {
  const note = demoProfile.personality_note.summary;
  const lead = /Coach him\s+to\s+([\s\S]+)$/i.exec(note);
  const items: StoryItem[] = [
    { label: "Profile", text: plain(displayHonestLine()), href: null },
    ...demoProfile.personality_note.openers.map((line) => ({ label: "Profile", text: plain(line), href: null })),
  ];
  if (lead?.[1]) {
    const sentence = lead[1].trim();
    const text = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    items.push({ label: "Profile", text, href: null });
  }
  return {
    heading: "What to avoid saying",
    paragraphs: ["Taken from the profile note. Nothing here was added."],
    items,
  };
}

function introSection(): StorySection {
  return {
    heading: "Three ways to introduce yourself",
    paragraphs: ["These are the three one-line introductions already written for each kind of person."],
    items: AUDIENCES.map((audience, index) => ({
      label: `${index + 1}. ${audience.label}`,
      text: plain(audience.line()),
      href: null,
    })),
  };
}

function gapSection(experienceGap: boolean, educationGap: boolean): StorySection {
  const items: StoryItem[] = [];
  if (experienceGap) {
    items.push({
      label: "LinkedIn",
      text: "Experience history: gap. The live LinkedIn snapshot does not list roles.",
      href: null,
    });
  }
  if (educationGap) {
    items.push({
      label: "LinkedIn",
      text: "Education history: gap. The live LinkedIn snapshot does not list schools.",
      href: null,
    });
  }
  const school = demoProfile.education[0];
  if (school) {
    const degree = school.degree?.trim() ? plain(school.degree) : "gap";
    items.push({
      label: "Degree",
      text: `${plain(school.field)} at ${plain(school.school)}, ${school.start ?? ""} to ${school.end ?? ""}. Degree: ${degree}.`,
      href: null,
    });
  }
  for (const job of demoProfile.experience) {
    if (job.description?.trim()) continue;
    items.push({
      label: plain(job.company),
      text: "Description: gap.",
      href: null,
    });
  }
  return {
    heading: "Gaps",
    paragraphs: ["A gap means the profile does not have that fact. It is not filled in."],
    items,
  };
}

function sourceSection(fetchedAt: string, posts: { title: string; url: string }[]): StorySection {
  const items: StoryItem[] = [];
  const seen = new Set<string>();
  const add = (label: string, text: string, href: string | null) => {
    const key = (href ?? text).replace(/\/$/, "").toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    items.push({ label, text: plain(text), href });
  };
  const rows = (demoProfile as { sources?: SourceRow[] }).sources ?? [];
  for (const row of rows) {
    const href = https(row.url ?? "");
    if (href) add("Source", row.via?.trim() || href, href);
    else if (row.via?.trim()) add("Confirmed", row.via.trim(), null);
  }
  for (const link of publicProfileLinks()) add(link.label, link.label, link.href);
  if (fetchedAt) add("LinkedIn snapshot", `Fetched at ${fetchedAt}.`, null);
  for (const post of posts) {
    const href = https(post.url);
    if (href) add("LinkedIn post", post.title, href);
  }
  return {
    heading: "Sources",
    paragraphs: ["Public pages and lines Henry confirmed. The LinkedIn history fields above are still gaps."],
    items,
  };
}

function cleanSection(section: StorySection): StorySection {
  return {
    heading: plain(section.heading),
    paragraphs: section.paragraphs.map((line) => plain(line)).filter(Boolean),
    items: section.items
      .map((item) => ({ label: plain(item.label), text: plain(item.text), href: item.href }))
      .filter((item) => item.text || item.label),
  };
}

function plain(value: string): string {
  return stripDashes(value).replace(/\s+/g, " ").trim();
}

function https(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}
