export function PendingNote({ label }: { label: string }) {
  return (
    <div className="mt-3" aria-busy="true">
      <p className="text-meta text-faint">{label}</p>
      <div className="mt-2 space-y-2" aria-hidden="true">
        <div className="skel h-3 w-2/3" />
        <div className="skel h-3 w-1/2" />
      </div>
    </div>
  );
}

export function BriefSkeleton() {
  return (
    <div className="mt-4 space-y-3" aria-busy="true" aria-label="Loading the conversation plan">
      <section className="panel p-3">
        <PendingNote label="Drafting a conversation plan..." />
      </section>
      <section className="panel p-3">
        <PendingNote label="Finding recent news..." />
      </section>
      <section className="panel p-3">
        <PendingNote label="Checking LinkedIn..." />
      </section>
      <section className="panel p-3">
        <PendingNote label="Opening their public page..." />
      </section>
    </div>
  );
}
