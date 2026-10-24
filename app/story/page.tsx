import Link from "next/link";
import henry from "@/data/demo/henry.json";
import { DEFAULT_INTERESTS } from "@/lib/catalog";

export const metadata = { title: "Your story · Introvert Co-pilot" };

const STORIES = [
  {
    n: "01",
    title: "Launch and brand films",
    body: "Use with media and music people. The public record includes Salesforce, Spotify x BLACKPINK, Google, Samsung, Kia, and Sam's Club.",
  },
  {
    n: "02",
    title: "Interviewing founders on camera",
    body: "Use with founders, DevRel, and execs. Henry hosts Silicon Valley Insider and spends his time asking builders why they build.",
  },
  {
    n: "03",
    title: "Building with AI",
    body: "Use with researchers and platform teams. His event goal is AI agents, creator tools, and dev storytelling, including anime IP.",
  },
];

const PARTS = [
  ["Film director and producer", "Unicorn Studios", "Designers, creative technologists"],
  ["Talks to builders on camera", "Silicon Valley Insider", "Founders, DevRel, execs"],
  ["AI and entertainment", "Matching interest", "Researchers, platform teams"],
];

export default function StoryPage() {
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section>
        <div className="flex items-center gap-4">
          <img src="/henry.jpg" alt="" className="h-16 w-16 rounded-full object-cover" />
          <div>
            <h1 className="font-serif text-4xl tracking-tight">Your story, ready to say out loud</h1>
            <p className="text-sm text-mute">
              Built from the cached public profile. Editing lands in the next pass.
            </p>
          </div>
        </div>
        <article className="mt-6 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-mute">
            <span>10 second version</span>
            <span>for the coffee line</span>
          </div>
          <p className="mt-3 border-l-2 border-accent pl-3 font-serif text-xl leading-8">
            I&apos;m Henry. I make films for tech companies, and I build stories with AI on the side.
          </p>
        </article>
        <article className="mt-4 rounded-3xl border border-line bg-card p-5">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-mute">
            <span>30 second version</span>
            <span>when they ask a follow-up</span>
          </div>
          <p className="mt-3 border-l-2 border-accent pl-3 text-[15px] leading-7">
            I run Unicorn Studios. We make launch and brand films for technology companies, and the
            work includes Google, Salesforce, and Spotify x BLACKPINK. I also host Silicon Valley
            Insider, so I spend a lot of time asking builders why they build. I came to GitHub
            Universe to meet people working on AI agents, creator tools, and developer experience.
          </p>
        </article>
        <article className="mt-4 rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">What makes you interesting</p>
          <p className="mt-2 text-sm leading-6">
            You sit where story meets technology. Most people here can explain how a tool works. You
            can explain why anyone would care, and you have the reel to prove it.
          </p>
          <p className="mt-3 text-sm text-mute">{henry.headline}. {henry.city}.</p>
        </article>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/meet" className="rounded-full bg-ink px-4 py-2 text-sm text-white">
            See who to meet
          </Link>
          <span className="rounded-full border border-line bg-white px-4 py-2 text-sm text-mute">
            Edit in my own words, next pass
          </span>
        </div>
        <p className="mt-4 text-xs text-mute">
          Cached public profile, {henry.fetched_at.slice(0, 16).replace("T", " ")} PT. LinkedIn was
          blocked on a plain fetch, so this file is the fallback snapshot.
        </p>
      </section>
      <aside className="space-y-4">
        <article className="rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Your 3 best stories</p>
          <ol className="mt-3 space-y-4">
            {STORIES.map((story) => (
              <li key={story.n}>
                <p className="font-mono text-xs text-[#b33b12]">{story.n}</p>
                <p className="font-semibold">{story.title}</p>
                <p className="text-sm leading-6 text-[#4a453e]">{story.body}</p>
              </li>
            ))}
          </ol>
        </article>
        <article className="rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Parts of you, and who they land with</p>
          <ul className="mt-3 space-y-3">
            {PARTS.map(([part, place, lands]) => (
              <li key={part} className="flex items-start justify-between gap-4 text-sm">
                <span>
                  <span className="block font-semibold">{part}</span>
                  <span className="text-mute">{place}</span>
                </span>
                <span className="max-w-[11rem] text-right text-mute">{lands}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Topics on the graph</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEFAULT_INTERESTS.map((topic) => (
              <span key={topic} className="rounded-full border border-line bg-white px-3 py-1 text-xs">
                {topic}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs leading-5 text-mute">
            Who to meet uses these official GitHub Universe topics, plus whole-word hits for film,
            video, story, storytelling, creator, design, media, AI, anime, and comics. Toggles land
            in the next pass.
          </p>
        </article>
      </aside>
    </div>
  );
}
