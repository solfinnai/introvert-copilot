import { ConferenceImport } from "@/components/home/ConferenceImport";
import { ProfileCard } from "@/components/home/ProfileCard";
import { getCatalog } from "@/lib/catalog";
import { DEMO_PHOTO_SRC, demoPhotoFallbacks, demoUser } from "@/lib/demo-user";
import { conferenceFacts } from "@/lib/home-conference";
import { HOME_RANK_LIMIT, type HomeMatch } from "@/lib/home-matches";
import { rankPeople } from "@/lib/rank";
import { storyReport } from "@/lib/story-context";
import type { RankedPerson } from "@/lib/types";

export const runtime = "nodejs";

export default function HomePage() {
  const me = demoUser();
  const catalog = getCatalog();
  const people = rankPeople(catalog, null, { day: "both", metIds: [], limit: HOME_RANK_LIMIT }).map(toMatch);
  return (
    <div className="mx-auto w-full max-w-3xl">
      <ProfileCard
        name={me.name}
        headline={me.headline}
        photo={DEMO_PHOTO_SRC}
        photoFallbacks={demoPhotoFallbacks()}
        report={storyReport()}
      />
      <ConferenceImport conference={conferenceFacts(catalog)} people={people} speakerCount={catalog.speakerCount} />
    </div>
  );
}

function toMatch(person: RankedPerson): HomeMatch {
  return {
    id: person.id,
    name: person.name,
    titleLine: person.titleLine,
    photoUrl: person.photoUrl,
    why: person.why,
    opener: person.opener,
    catchLine: person.catchLine,
    company: person.company,
    sharedTopics: person.sharedTopics,
  };
}
