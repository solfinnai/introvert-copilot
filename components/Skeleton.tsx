export function SkeletonBlock({
  label,
  lines = 3,
}: {
  label: string;
  lines?: number;
}) {
  return (
    <section className="panel p-3" aria-busy="true">
      <p className="text-meta font-medium text-mute">{label}</p>
      <p className="mt-1 text-meta text-faint">Loading {label.toLowerCase()}.</p>
      <div className="mt-3 space-y-2" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="skel h-3" style={{ width: `${94 - index * 14}%` }} />
        ))}
      </div>
    </section>
  );
}
