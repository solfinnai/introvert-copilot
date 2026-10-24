import { SpeakerDirectory } from "@/components/SpeakerDirectory";
import { getCatalog } from "@/lib/catalog";
import { directoryFromCatalog } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const directory = directoryFromCatalog(getCatalog());

export default function SpeakersPage() {
  return <SpeakerDirectory speakers={directory.speakers} topics={directory.topics} />;
}
