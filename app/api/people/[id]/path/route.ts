import { describePerson } from "@/lib/graph";
import { clientIp, rateLimit } from "@/lib/limits";
import { personCard } from "@/lib/rank";
import { getCatalog } from "@/lib/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 10;

const ID = /^[a-z0-9-]{1,80}$/;
const PATH_MS = 2_500;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return json({ card: null }, 404);
  const limit = rateLimit(`path:${clientIp(req)}`, 30, 60_000);
  if (!limit.ok) return json({ card: null }, 429);

  const looked = await Promise.race([
    describePerson(id),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), PATH_MS)),
  ]);
  if (looked) return json(looked, 200);
  const card = personCard(getCatalog(), id, null, { day: "both", metIds: [], limit: 1 });
  if (!card) return json({ card: null }, 404);
  return json({ card, backend: "memory", ms: PATH_MS }, 200);
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
