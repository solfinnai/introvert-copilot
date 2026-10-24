import { getCatalog } from "@/lib/catalog";
import { describePerson } from "@/lib/graph";
import { clientIp, rateLimit } from "@/lib/limits";
import { loadPersonBrief } from "@/lib/person-brief";
import { buildReportMarkdown } from "@/lib/report-markdown";
import { formatSessionLine, sessionsForPerson } from "@/lib/speakers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ID = /^[a-z0-9-]{1,80}$/;

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(`report:${clientIp(req)}`, 6, 60_000);
  if (!limit.ok) {
    return text("Slow down a little and try one report at a time.", 429, "0");
  }
  const { id } = await ctx.params;
  if (!ID.test(id)) return text("That person is not in the catalog.", 404, String(limit.remaining));
  try {
    const described = await describePerson(id);
    if (!described) return text("That person is not in the catalog.", 404, String(limit.remaining));
    const brief = await loadPersonBrief(described.card);
    const sessions = sessionsForPerson(getCatalog(), id).map((session) => ({
      title: session.title || "Session title not listed",
      line: formatSessionLine(session),
    }));
    const markdown = buildReportMarkdown({
      name: described.card.name,
      titleLine: described.card.titleLine,
      catchLine: described.card.catchLine,
      sessions,
      plan: brief.plan,
      intel: brief.intel,
      report: brief.report,
      links: brief.links,
    });
    return new Response(markdown, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}-report.md"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "X-RateLimit-Remaining": String(limit.remaining),
      },
    });
  } catch {
    return text("The report did not finish. Try again in a moment.", 500, String(limit.remaining));
  }
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
