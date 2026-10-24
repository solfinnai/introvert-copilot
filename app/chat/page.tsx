import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ person?: string; start?: string }>;
}) {
  const { person, start } = await searchParams;
  const id = typeof person === "string" && /^[a-z0-9-]{1,80}$/.test(person) ? person : "";
  const params = new URLSearchParams();
  if (id) params.set("person", id);
  if (start === "story") params.set("start", "story");
  const query = params.toString();
  redirect(query ? `/agent?${query}` : "/agent");
}
