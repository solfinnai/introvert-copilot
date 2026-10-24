import { unstable_cache } from "next/cache";
import { BRIEF_CACHE_VERSION, INTEL_CACHE_SECONDS, isStoredBrief } from "./intel-cache";
import type { PersonBrief } from "./person-brief";

export interface RuntimeRecord {
  savedAt: string;
  brief: PersonBrief;
}

export const loadRuntimeBrief = unstable_cache(
  async (id: string): Promise<RuntimeRecord | null> => {
    const { computePersonBrief } = await import("./person-brief");
    const brief = await computePersonBrief(id);
    if (!brief) return null;
    if (!cacheableBrief(brief)) {
      const { holdUncachedBrief } = await import("./person-brief");
      holdUncachedBrief(id, brief);
      // Throwing keeps Next from pinning a skipped or unconfigured brief for 6 hours.
      throw new Error("Live intel was not stored.");
    }
    return { savedAt: new Date().toISOString(), brief };
  },
  ["person-live-brief", String(BRIEF_CACHE_VERSION)],
  { revalidate: INTEL_CACHE_SECONDS },
);

function cacheableBrief(brief: PersonBrief): boolean {
  return isStoredBrief({
    version: BRIEF_CACHE_VERSION,
    savedAt: new Date().toISOString(),
    intel: brief.intel,
    plan: brief.plan,
    report: brief.report,
    profiles: brief.profiles,
    links: brief.links,
  });
}
