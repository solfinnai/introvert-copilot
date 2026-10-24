export function PendingNote({ label }: { label: string }) {
  return (
    <div className="mt-3 rounded-2xl border border-dashed border-line bg-[#faf7f2] px-3 py-3" aria-busy="true">
      <p className="text-sm text-mute">{label}</p>
      <div className="mt-3 h-3 w-2/3 animate-pulse rounded bg-[#e7e0d4]" />
      <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-[#efe8dc]" />
    </div>
  );
}

export function BriefSkeleton() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading the conversation plan">
      <PendingNote label="Drafting a conversation plan..." />
      <PendingNote label="Finding recent news..." />
      <PendingNote label="Checking LinkedIn..." />
      <PendingNote label="Opening their public page..." />
    </div>
  );
}
