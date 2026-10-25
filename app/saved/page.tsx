import { SavedBoard } from "@/components/SavedBoard";
import { getCatalog } from "@/lib/catalog";
import { directoryFromCatalog } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const speakers = directoryFromCatalog(getCatalog()).speakers;

export default function SavedPage() {
  return <SavedBoard speakers={speakers} />;
}
