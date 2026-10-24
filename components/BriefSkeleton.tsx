import { SkeletonBlock } from "./Skeleton";

const SECTIONS = [
  "Conversation plan",
  "Graph path",
  "Intel",
  "Work and education",
  "Personality and communication",
  "News and talking points",
  "Public links",
];

export function BriefSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading the conversation plan">
      {SECTIONS.map((label) => (
        <SkeletonBlock key={label} label={label} />
      ))}
    </div>
  );
}
