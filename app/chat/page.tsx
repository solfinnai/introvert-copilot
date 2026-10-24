import { ChatStub } from "@/components/ChatStub";
import { getCatalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { person } = await searchParams;
  const found = person ? getCatalog().peopleById.get(person) : undefined;
  return <ChatStub name={found?.name ?? null} />;
}
