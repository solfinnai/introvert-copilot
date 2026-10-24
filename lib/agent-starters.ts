/** Shared chat labels. No catalog reads, so client components can import this file. */

export interface SpeakerOption {
  id: string;
  name: string;
  titleLine: string;
  photoUrl: string;
}

export const GENERAL_STARTERS = [
  "Talk about my story",
  "Talk about a speaker",
  "Help me understand the conference",
  "Who should I meet first?",
  "Draft a follow-up I can copy",
] as const;

export const STORY_STARTER: (typeof GENERAL_STARTERS)[number] = "Talk about my story";

export const STORY_CHAT_HREF = "/agent?start=story";

export const STORY_CHAT_LABEL = "Chat with the agent about my story";

export const AGENT_GREETING = "I know your story and every GitHub Universe speaker. Ask me anything.";

export function speakerStarterChips(firstName: string): string[] {
  const first = firstName.trim() || "them";
  return [
    `Give me an opener for ${first}`,
    "What should I say about myself?",
    "Give me 2 questions",
    "Draft a follow-up I can copy",
  ];
}

export function isGeneralStarter(value: string): boolean {
  return (GENERAL_STARTERS as readonly string[]).includes(value.trim());
}
