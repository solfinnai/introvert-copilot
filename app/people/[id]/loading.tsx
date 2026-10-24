export default function PersonLoading() {
  return (
    <div className="mx-auto max-w-4xl" aria-busy="true" aria-label="Opening this person">
      <p className="text-sm text-mute">Opening this person...</p>
    </div>
  );
}
