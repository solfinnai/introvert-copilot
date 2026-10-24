import { SkeletonBlock } from "@/components/Skeleton";

export default function PersonLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-3" aria-busy="true" aria-label="Loading this person">
      <SkeletonBlock label="Navigation" lines={1} />
      <section className="panel flex items-start gap-3 p-3" aria-busy="true">
        <div className="skel h-10 w-10 shrink-0 rounded-full" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-meta font-medium text-mute">Person</p>
          <p className="mt-1 text-meta text-faint">Loading name, title, and session.</p>
          <div className="mt-3 space-y-2" aria-hidden="true">
            <div className="skel h-4 w-40" />
            <div className="skel h-3 w-56 max-w-full" />
          </div>
        </div>
      </section>
      <SkeletonBlock label="Social profiles" lines={1} />
      <SkeletonBlock label="Actions" lines={1} />
      <SkeletonBlock label="Conversation plan" lines={4} />
      <SkeletonBlock label="Graph path" lines={3} />
      <SkeletonBlock label="Work and education" lines={3} />
    </div>
  );
}
