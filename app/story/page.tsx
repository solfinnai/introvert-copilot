import Link from "next/link";
import { PersonPhoto } from "@/components/PersonPhoto";
import { DEFAULT_INTERESTS } from "@/lib/catalog";
import { henryPublic } from "@/lib/henry-profile";
import { formatStamp } from "@/lib/intel";

export const metadata = { title: "Your story · Introvert Co-pilot" };

export default function StoryPage() {
  const henry = henryPublic();
  const fetched = formatStamp(henry.fetchedAt);
  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
      <section className="min-w-0">
        <div className="flex items-center gap-4">
          <PersonPhoto src={henry.avatar} fallbackSrc="/henry.jpg" name={henry.name} size={64} />
          <div className="min-w-0">
            <h1 className="font-serif text-4xl tracking-tight">Your story, ready to say out loud</h1>
            <p className="text-sm text-mute">
              {henry.name}, {henry.company}, {henry.location}. Cached snapshot of the public LinkedIn profile.
            </p>
          </div>
        </div>
        <article className="mt-6 rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-mute">
            <span>10 second version</span>
            <span>for the coffee line</span>
          </div>
          <p className="mt-3 border-l-2 border-accent pl-3 font-serif text-xl leading-8">
            I am Henry. I build entertainment companies and intellectual property at Unicorn Studios.
          </p>
        </article>
        <article className="mt-4 rounded-3xl border border-line bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-mute">
            <span>30 second version</span>
            <span>when they ask a follow-up</span>
          </div>
          <p className="mt-3 border-l-2 border-accent pl-3 text-[15px] leading-7">
            I am Henry Finn, in {henry.location}. I build entertainment companies and intellectual
            property at {henry.company}. The public site is unicornstudios.ai. LinkedIn did not list
            past roles or schools, so I stay with that.
          </p>
        </article>
        <article className="mt-4 rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Public about</p>
          <p className="mt-2 text-sm leading-6">{henry.about || "LinkedIn returned no about text."}</p>
          <p className="mt-3 text-sm leading-6 text-mute">
            {henry.followers == null
              ? "Follower count was not on the snapshot."
              : `The public profile lists ${henry.followers} followers.`}{" "}
            {henry.companyUrl ? (
              <a
                href={henry.companyUrl}
                className="text-[#b33b12] underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {henry.companyUrl.replace(/^https?:\/\//, "")}
              </a>
            ) : null}
          </p>
        </article>
        <article className="mt-4 rounded-3xl border border-dashed border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Demo goal, not a LinkedIn field</p>
          <p className="mt-2 text-sm leading-6">{henry.demoGoal}</p>
        </article>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/meet" className="rounded-full bg-ink px-4 py-2 text-sm text-white">
            See who to meet
          </Link>
          <span className="rounded-full border border-line bg-white px-4 py-2 text-sm text-mute">
            Edit in my own words, next pass
          </span>
        </div>
        <p className="mt-4 text-xs leading-5 text-mute">
          Cached snapshot, fetched {fetched}. Source:{" "}
          <a
            href={henry.linkedinUrl}
            className="text-[#b33b12] underline-offset-2 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn profile
          </a>
          . Experience and education came back empty, so they are left as gaps.
        </p>
      </section>
      <aside className="min-w-0 space-y-4">
        <article className="rounded-3xl border border-dashed border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Work history</p>
          <p className="mt-2 text-sm leading-6">
            Gap. LinkedIn returned no experience entries. Current company on the profile is {henry.company}.
            Nothing else is filled in.
          </p>
        </article>
        <article className="rounded-3xl border border-dashed border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Education</p>
          <p className="mt-2 text-sm leading-6">Gap. LinkedIn returned no education entries.</p>
        </article>
        <article className="rounded-3xl border border-line bg-card p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">Posts you shared</p>
          <ul className="mt-3 space-y-3">
            {henry.posts.map((post) => (
              <li key={post.url} className="text-sm leading-6">
                <a
                  href={post.url}
                  className="break-words text-[#b33b12] underline-offset-2 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {post.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-5 text-mute">
            These are public posts, not job titles. Liked posts from other people stay out of this card.
          </p>
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
            Who to meet uses these official GitHub Universe topics, plus whole-word hits for film, video,
            story, storytelling, creator, design, media, AI, anime, and comics. Toggles land in the next pass.
          </p>
        </article>
      </aside>
    </div>
  );
}
