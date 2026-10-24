import { SpeakerDirectory } from "@/components/SpeakerDirectory";
import { getCatalog } from "@/lib/catalog";
import { directoryFromCatalog } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SpeakersPage() {
  const directory = directoryFromCatalog(getCatalog());
  return <SpeakerDirectory speakers={directory.speakers} topics={directory.topics} />;
}
