import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string }>;
}) {
  const { person } = await searchParams;
  const id = typeof person === "string" && /^[a-z0-9-]{1,80}$/.test(person) ? person : "";
  redirect(id ? `/agent?person=${id}` : "/agent");
}
