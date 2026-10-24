import raw from "../data/demo-user.json";

export interface DemoExperience {
  title: string;
  company: string;
  start: string | null;
  end: string | null;
  description: string | null;
  source_url: string;
  ceo_since?: string;
  display?: string;
}

export interface DemoEducation {
  school: string;
  field: string;
  degree: string | null;
  start: string | null;
  end: string | null;
  source_url: string;
}

export interface DemoLink {
  title: string;
  url: string;
  source: string;
  why: string;
  kind: string;
}

export interface DemoSocial {
  platform: string;
  handle: string;
  url: string;
  verified_via: string;
}

export interface DemoProfile {
  id: string;
  name: string;
  linkedin_url: string;
  aka: string;
  headline: string;
  city: string;
  about: string;
  current_company: { name: string; url: string; title: string };
  experience: DemoExperience[];
  education: DemoEducation[];
  proof_points: string[];
  interests: string[];
  interests_for_matching: string[];
  goals: string;
  event_goal: string;
  personality_note: {
    summary: string;
    one_liners_by_audience: {
      developers: string;
      creators: string;
      investors: string;
    };
    openers: string[];
  };
  fun_fact: string;
  topic_chips: string[];
  links: DemoLink[];
  socials: DemoSocial[];
  photo: {
    local: string;
    linkedin_avatar_url: string;
    fallback_url: string;
  };
  salesforce_case_study?: {
    result: string;
    budget: string;
    still_live: boolean;
    confirmed_by: string;
    source_url: string;
  };
  fetched_at: string;
  source: string;
}

export const demoProfile = raw as DemoProfile;

/** Local portrait. The img falls back to the avatar URL if this file fails. */
export const DEMO_PHOTO_SRC = "/demo-user/photo.jpg";

export function demoPhotoFallbacks(): string[] {
  return [demoProfile.photo.linkedin_avatar_url, demoProfile.photo.fallback_url].filter((url) =>
    url.startsWith("https://"),
  );
}

export interface DemoUserView {
  name: string;
  headline: string;
  company: string;
  title: string;
  city: string;
  goal: string;
  interests: string[];
  linkedin: string;
  about: string;
  honestLine: string;
  oneLiners: DemoProfile["personality_note"]["one_liners_by_audience"];
  chips: string[];
  proof: string[];
  openers: string[];
}

/** The self-description, without the note that tells the coach what to do. */
export function displayHonestLine(): string {
  return demoProfile.personality_note.summary.replace(/\s*Coach him\b[\s\S]*$/, "").trim();
}

/** Stable shape the agent and ranking copy already expect, filled from the profile. */
export function demoUser(): DemoUserView {
  const about = demoProfile.about.replace(/\s*\(truncated[^)]*\)/gi, "").replace(/\s+/g, " ").trim();
  return {
    name: demoProfile.name,
    headline: demoProfile.headline,
    company: demoProfile.current_company.name,
    title: demoProfile.current_company.title,
    city: demoProfile.city,
    goal: demoProfile.event_goal,
    interests: [...demoProfile.interests_for_matching],
    linkedin: demoProfile.linkedin_url,
    about,
    honestLine: demoProfile.personality_note.summary,
    oneLiners: demoProfile.personality_note.one_liners_by_audience,
    chips: [...demoProfile.topic_chips],
    proof: [...demoProfile.proof_points],
    openers: [...demoProfile.personality_note.openers],
  };
}

export function experienceByCompany(company: string): DemoExperience | undefined {
  return demoProfile.experience.find((job) => job.company === company);
}

/** Facts Henry confirmed. Missing degree stays GAP. */
export function confirmedBrief(): string[] {
  const edu = demoProfile.education[0];
  const force = experienceByCompany("0N1 Force");
  const luminous = experienceByCompany("Luminous US Productions");
  const exec = experienceByCompany("Executive Intelligence");
  const sales = demoProfile.salesforce_case_study;
  const lines: string[] = [];
  if (edu) {
    const degree = edu.degree && edu.degree.trim() ? edu.degree : "GAP";
    lines.push(`${edu.field} at ${edu.school}, ${edu.start} to ${edu.end}. Degree: ${degree}.`);
  }
  if (force?.display) lines.push(`0N1 Force: ${force.display}.`);
  if (luminous) lines.push(`${luminous.title}, ${luminous.company}.`);
  if (exec?.start) lines.push(`Co-founder, ${exec.company}, from ${exec.start}.`);
  if (sales) {
    lines.push(
      `Salesforce case study: ${sales.result} on ${sales.budget}. Confirmed by ${sales.confirmed_by}.`,
    );
  }
  return lines;
}

export interface PublicLink {
  href: string;
  label: string;
}

/** Socials and sites only, so the row stays a row. News stays on the proof points. */
export function publicProfileLinks(): PublicLink[] {
  const seen = new Set<string>();
  const out: PublicLink[] = [];
  const add = (href: string, label: string) => {
    const key = href.replace(/\/$/, "").toLowerCase();
    if (!href.startsWith("https://") || seen.has(key)) return;
    seen.add(key);
    out.push({ href, label });
  };
  for (const social of demoProfile.socials) add(social.url, socialLabel(social.platform, social.handle));
  for (const link of demoProfile.links) {
    if (link.kind !== "site") continue;
    add(link.url, siteLabel(link));
  }
  return out;
}

function socialLabel(platform: string, handle: string): string {
  if (platform === "linkedin") return "LinkedIn";
  if (platform === "x") return "X";
  if (platform === "luma") return "Luma";
  if (platform === "website") return handle;
  return platform;
}

function siteLabel(link: DemoLink): string {
  const url = link.url.toLowerCase();
  if (url.includes("unicornstudios")) return "Unicorn Studios";
  if (url.includes("animori.com")) return "Animori";
  if (url.includes("silicon-valley-insider")) return "Silicon Valley Insider";
  if (url.includes("henryfinn.com")) return "henryfinn.com";
  return link.title;
}
