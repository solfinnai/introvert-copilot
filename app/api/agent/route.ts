import { NextResponse } from "next/server";
import {
  buildOpenAiPayload,
  classifyAgent,
  localCoaching,
  readStreamDelta,
  splitFollowup,
  type AgentDecision,
} from "@/lib/agent";
import { consumeDailyBudget } from "@/lib/budget";
import { stripDashes } from "@/lib/draft";
import { clientIp, rateLimit } from "@/lib/limits";
import { safeError } from "@/lib/redact";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  return NextResponse.json(
    { ok: true, drafts: "visitor sends from their own email or share sheet" },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  const key = process.env.OPENAI_API_KEY?.trim() ?? "";
  let body: unknown = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }
  const rateOk = rateLimit(`agent:${clientIp(req)}`, 12, 60_000).ok;
  let decision = classifyAgent({ body, rateOk, hasKey: key.length > 0, budgetOk: true });
  if (decision.action === "openai") {
    const slot = consumeDailyBudget();
    if (!slot.ok) decision = classifyAgent({ body, rateOk, hasKey: true, budgetOk: false });
  }
  if (decision.action === "json") return jsonReply(decision);
  return streamReply(decision, key);
}

function jsonReply(decision: Extract<AgentDecision, { action: "json" }>) {
  return NextResponse.json(
    { ok: true, source: decision.reply.source, message: decision.reply.message, draft: decision.reply.draft },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function streamReply(decision: Extract<AgentDecision, { action: "openai" }>, key: string): Promise<Response> {
  const payload = buildOpenAiPayload({ person: decision.person, messages: decision.messages });
  let upstream: Response;
  try {
    upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.error(`agent openai failed: ${safeError(err, [key])}`);
    return jsonReply({ action: "json", reply: fallback(decision) });
  }
  if (!upstream.ok || !upstream.body) {
    console.error(`agent openai status ${upstream.status}`);
    return jsonReply({ action: "json", reply: fallback(decision) });
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      let full = "";
      const send = (value: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
      };
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const delta = readStreamDelta(line);
            if (!delta) continue;
            const clean = stripDashes(delta);
            full += clean;
            send({ delta: clean });
          }
        }
        const split = splitFollowup(full, decision.person);
        send({ done: true, source: "openai", message: split.message, draft: split.draft });
      } catch (err) {
        console.error(`agent stream failed: ${safeError(err, [key])}`);
        if (!full) {
          const reply = fallback(decision);
          send({ done: true, source: reply.source, message: reply.message, draft: reply.draft });
        } else {
          const split = splitFollowup(full, decision.person);
          send({ done: true, source: "openai", message: split.message, draft: split.draft });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function fallback(decision: Extract<AgentDecision, { action: "openai" }>) {
  const ask = decision.messages.filter((turn) => turn.role === "user").at(-1)?.content ?? "";
  return localCoaching("fallback", decision.person, ask || "Help me prepare");
}
