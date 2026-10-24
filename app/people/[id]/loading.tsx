export default function PersonLoading() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-label="Loading this person">
      <div className="h-4 w-32 animate-pulse rounded bg-[#e7e0d4]" />
      <div className="mt-3 flex items-center gap-4">
        <div className="h-[72px] w-[72px] shrink-0 animate-pulse rounded-full bg-[#f6d7cb]" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-8 w-48 max-w-full animate-pulse rounded bg-[#e7e0d4]" />
          <div className="h-4 w-64 max-w-full animate-pulse rounded bg-[#efe8dc]" />
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <div className="h-11 w-11 animate-pulse rounded-full bg-[#e7e0d4]" />
        <div className="h-11 w-11 animate-pulse rounded-full bg-[#e7e0d4]" />
        <div className="h-11 w-11 animate-pulse rounded-full bg-[#e7e0d4]" />
      </div>
      <div className="mt-4 h-10 w-40 animate-pulse rounded-full bg-[#e7e0d4]" />
      <div className="mt-6 space-y-4">
        <div className="h-72 animate-pulse rounded-3xl border border-line bg-card" />
        <div className="h-36 animate-pulse rounded-2xl border border-line bg-[#faf7f2]" />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-44 animate-pulse rounded-3xl border border-line bg-card md:col-span-2" />
          <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
          <div className="h-40 animate-pulse rounded-3xl border border-line bg-card" />
        </div>
      </div>
    </div>
  );
}
