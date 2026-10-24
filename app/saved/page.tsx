import { SavedBoard } from "@/components/SavedBoard";
import { getCatalog } from "@/lib/catalog";
import { directoryFromCatalog } from "@/lib/speakers";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function SavedPage() {
  const directory = directoryFromCatalog(getCatalog());
  return <SavedBoard speakers={directory.speakers} />;
}
