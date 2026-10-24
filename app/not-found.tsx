import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-xl">
      <h1 className="type-display text-[22px] leading-7">That page is not in the demo.</h1>
      <Link href="/meet" className="mt-3 inline-block text-body text-accent hover:underline">
        Back to who to meet
      </Link>
    </div>
  );
}
