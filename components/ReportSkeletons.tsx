const SECTIONS = [
  { label: "Conversation plan", className: "h-64" },
  { label: "Graph path", className: "h-28" },
  { label: "Intel", className: "h-28" },
  { label: "Work and education", className: "h-44" },
  { label: "Personality and communication", className: "h-40" },
  { label: "News and talking points", className: "h-40" },
  { label: "Public links", className: "h-36" },
];

export function ReportSkeletons() {
  return (
    <div className="mt-6 space-y-4" aria-busy="true" aria-label="Loading the full report">
      {SECTIONS.map((section) => (
        <section key={section.label} className={`rounded-3xl border border-line bg-card p-5 ${section.className}`}>
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{section.label}</p>
          <p className="mt-3 text-sm text-mute">Loading this section.</p>
        </section>
      ))}
    </div>
  );
}
