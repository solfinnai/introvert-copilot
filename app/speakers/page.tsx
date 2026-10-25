import { SpeakerDirectory } from "@/components/SpeakerDirectory";
import { getCatalog } from "@/lib/catalog";
import { directoryFromCatalog, parseSpeakerListState } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const directory = directoryFromCatalog(getCatalog());

export default async function SpeakersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    day?: string | string[];
    topic?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}) {
  const initial = parseSpeakerListState(await searchParams);
  return <SpeakerDirectory speakers={directory.speakers} topics={directory.topics} initial={initial} />;
}
