export function BriefSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading the conversation plan">
      <div className="h-72 animate-pulse rounded-3xl border border-line bg-card" />
      <div className="h-36 animate-pulse rounded-2xl border border-line bg-[#faf7f2]" />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-44 animate-pulse rounded-3xl border border-line bg-card md:col-span-2" />
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-48 animate-pulse rounded-3xl border border-line bg-card md:col-span-2" />
      </div>
    </div>
  );
}
