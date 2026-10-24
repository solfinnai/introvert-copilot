import type { FetchReport, PersonIntel } from "./intel";
import type { ConversationPlan } from "./plan";
import type { PersonBrief } from "./person-brief";
import type { PublicLink, SocialProfile } from "./public-links";

export type LiveSection = "news" | "linkedin" | "site" | "links" | "plan" | "done";

export interface LiveUpdate {
  section: LiveSection;
  status: "live" | "timeout" | "failed" | "skipped" | "cached" | "openai" | "template";
  intel?: PersonIntel;
  plan?: ConversationPlan;
  report?: FetchReport;
  links?: PublicLink[];
  profiles?: SocialProfile[];
  brief?: PersonBrief;
}
