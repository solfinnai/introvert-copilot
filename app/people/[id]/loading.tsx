export default function PersonLoading() {
  return (
    <div className="mx-auto max-w-3xl" aria-busy="true" aria-label="Opening this person">
      <section className="panel p-3">
        <p className="text-meta font-medium text-mute">Opening this person...</p>
        <div className="mt-3 space-y-2" aria-hidden="true">
          <div className="skel h-4 w-40" />
          <div className="skel h-3 w-64 max-w-full" />
          <div className="skel h-3 w-48 max-w-full" />
        </div>
      </section>
    </div>
  );
}
