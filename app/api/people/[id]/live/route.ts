import { getCatalog } from "@/lib/catalog";
import { intelCacheControl, readBriefCache } from "@/lib/intel-cache";
import type { LiveUpdate } from "@/lib/live-update";
import { clientIp, rateLimit } from "@/lib/limits";
import { buildSeedBrief, watchPersonBrief, type PersonBrief } from "@/lib/person-brief";
import { personCard } from "@/lib/rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const ID = /^[a-z0-9-]{1,80}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!ID.test(id)) return text("That person is not in the catalog.", 404, "0");
  const catalog = getCatalog();
  const card = personCard(catalog, id, null, { day: "both", metIds: [], limit: 1 });
  if (!card) return text("That person is not in the catalog.", 404, "0");

  // A cached brief is already paid for. Don't spend the rate limit on a reload.
  const memory = await readBriefCache(id).catch(() => null);
  if (memory) {
    return ndjson(
      [
        {
          section: "done",
          status: "cached",
          brief: {
            intel: memory.intel,
            plan: memory.plan,
            report: memory.report,
            profiles: memory.profiles,
            links: memory.links,
            fromCache: true,
          },
        },
      ],
      "hit",
      null,
      memory.savedAt,
    );
  }

  const limit = rateLimit(`live:${clientIp(req)}`, 12, 60_000);
  if (!limit.ok) return text("Slow down a little and open one person at a time.", 429, "0");

  const buffered: LiveUpdate[] = [];
  let sink: ((update: LiveUpdate) => void) | null = null;
  const pending = watchPersonBrief(card, (update) => {
    if (sink) sink(update);
    else buffered.push(update);
  });
  const quick = await Promise.race([
    pending.then((brief) => ({ kind: "brief" as const, brief })),
    new Promise<{ kind: "wait" }>((resolve) => setTimeout(() => resolve({ kind: "wait" }), 150)),
  ]);
  if (quick.kind === "brief" && quick.brief.fromCache) {
    const stored = await readBriefCache(id).catch(() => null);
    return ndjson(
      [{ section: "done", status: "cached", brief: quick.brief }],
      "hit",
      String(limit.remaining),
      stored?.savedAt ?? new Date().toISOString(),
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const send = (update: LiveUpdate) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(update)}\n`));
        } catch {
          closed = true;
        }
      };
      const close = () => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          closed = true;
        }
      };
      const finish = (brief: PersonBrief) => {
        send({ section: "done", status: brief.fromCache ? "cached" : "live", brief });
        close();
      };
      sink = send;
      for (const update of buffered.splice(0)) send(update);
      if (quick.kind === "brief") {
        finish(quick.brief);
        return;
      }
      pending
        .then(finish)
        .catch(() => {
          send({ section: "done", status: "timeout", brief: buildSeedBrief(card) });
          close();
        });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Intel-Cache": "miss",
      "X-RateLimit-Remaining": String(limit.remaining),
      "X-Accel-Buffering": "no",
    },
  });
}

function ndjson(
  updates: LiveUpdate[],
  cache: "hit" | "miss",
  remaining: string | null,
  savedAt: string,
): Response {
  const body = updates.map((update) => JSON.stringify(update)).join("\n") + "\n";
  const headers: Record<string, string> = {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": intelCacheControl(savedAt),
    "X-Content-Type-Options": "nosniff",
    "X-Intel-Cache": cache,
  };
  if (remaining !== null) headers["X-RateLimit-Remaining"] = remaining;
  return new Response(body, { status: 200, headers });
}

function text(message: string, status: number, remaining: string) {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-RateLimit-Remaining": remaining,
    },
  });
}
