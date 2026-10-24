export const LIVE_LABELS = {
  news: "Finding recent news...",
  work: "Checking LinkedIn...",
  standout: "Opening their public page...",
  links: "Collecting public links...",
  plan: "Drafting a conversation plan...",
  note: "Looking up the public web. The saved snapshot is already on this page.",
} as const;

export type LivePending = {
  news?: string;
  work?: string;
  standout?: string;
  links?: string;
  plan?: string;
  note?: string;
};
