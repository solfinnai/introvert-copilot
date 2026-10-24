/** How the home import splits one ranked list. Pure, so the page and tests share it. */

export const HOME_TOP = 6;
export const HOME_STRONG = 12;
export const HOME_ALSO = 30;
export const HOME_RANK_LIMIT = HOME_TOP + HOME_STRONG + HOME_ALSO;

export interface HomeMatch {
  id: string;
  name: string;
  titleLine: string;
  photoUrl: string;
  why: string;
  opener: string;
  catchLine: string;
  company: string;
  sharedTopics: string[];
}

export function splitHomeMatches<T>(people: readonly T[]): { top: T[]; strong: T[]; also: T[] } {
  return {
    top: people.slice(0, HOME_TOP),
    strong: people.slice(HOME_TOP, HOME_TOP + HOME_STRONG),
    also: people.slice(HOME_TOP + HOME_STRONG, HOME_RANK_LIMIT),
  };
}

export function homeTheme(person: { sharedTopics: readonly string[]; company: string }): string {
  const topic = person.sharedTopics.find((item) => item.trim());
  if (topic) return topic.trim();
  const company = person.company.trim();
  if (company) return company;
  return "Other";
}

export function groupHomeMatches<T extends { sharedTopics: readonly string[]; company: string }>(
  people: readonly T[],
): { theme: string; people: T[] }[] {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const person of people) {
    const theme = homeTheme(person);
    const list = map.get(theme);
    if (list) list.push(person);
    else {
      map.set(theme, [person]);
      order.push(theme);
    }
  }
  return order.map((theme) => ({ theme, people: map.get(theme) ?? [] }));
}

export function firstSentence(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  const match = /^.*?[.!?](?=\s|$)/.exec(clean);
  return (match?.[0] ?? clean).trim();
}

export function shownCount(people: readonly unknown[]): number {
  return Math.min(people.length, HOME_RANK_LIMIT);
}
