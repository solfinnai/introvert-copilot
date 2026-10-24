import { NextResponse } from "next/server";
import {
  buildOpenAiPayload,
  classifyAgent,
  localCoaching,
  readStreamDelta,
  splitFollowup,
  visibleCoachText,
  type AgentDecision,
} from "@/lib/agent";
import { consumeDailyBudget } from "@/lib/budget";
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
  const rateOk = callerAllowed(req);
  let decision = classifyAgent({ body, rateOk, hasKey: key.length > 0, budgetOk: true });
  if (decision.action === "openai") {
    const slot = consumeDailyBudget();
    if (!slot.ok) decision = classifyAgent({ body, rateOk, hasKey: true, budgetOk: false });
  }
  if (decision.action === "json") return jsonReply(decision);
  return streamReply(decision, key, req);
}

function jsonReply(decision: Extract<AgentDecision, { action: "json" }>) {
  return NextResponse.json(
    { ok: true, source: decision.reply.source, message: decision.reply.message, draft: decision.reply.draft },
    { headers: { "Cache-Control": "no-store" } },
  );
}

async function streamReply(
  decision: Extract<AgentDecision, { action: "openai" }>,
  key: string,
  req: Request,
): Promise<Response> {
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
      signal: upstreamSignal(req),
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
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      reader = upstream.body!.getReader();
      let buffer = "";
      let full = "";
      let shown = "";
      let sawDone = false;
      const send = (value: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
        } catch {
          closed = true;
        }
      };
      const reveal = () => {
        const next = visibleCoachText(full);
        if (next.length <= shown.length) return;
        send({ delta: next.slice(shown.length) });
        shown = next;
      };
      const takeLine = (line: string) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed === "data: [DONE]") {
          sawDone = true;
          return;
        }
        const delta = readStreamDelta(trimmed);
        if (!delta) return;
        full += delta;
        reveal();
      };
      const finish = (complete: boolean) => {
        if (complete) {
          const split = splitFollowup(full, decision.person);
          send({ done: true, source: "openai", message: split.message, draft: split.draft });
          return;
        }
        const reply = fallback(decision);
        send({ done: true, source: reply.source, message: reply.message, draft: reply.draft });
      };
      try {
        while (!closed) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) takeLine(line);
        }
        if (buffer.trim()) takeLine(buffer);
        finish(sawDone && !closed);
      } catch (err) {
        console.error(`agent stream failed: ${safeError(err, [key])}`);
        finish(false);
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // The browser already closed the stream.
        }
      }
    },
    cancel() {
      closed = true;
      void reader?.cancel().catch(() => undefined);
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

function callerAllowed(req: Request): boolean {
  const ipOk = rateLimit(`agent:${callerKey(req)}`, 12, 60_000).ok;
  const sid = cookieValue(req, "sid");
  const sidOk = sid ? rateLimit(`agent-sid:${sid}`, 12, 60_000).ok : true;
  return ipOk && sidOk;
}

function callerKey(req: Request): string {
  const real = req.headers.get("x-real-ip")?.split(",")[0]?.trim() ?? "";
  if (isIp(real)) return real;
  const hops = (req.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(isIp);
  return hops.at(-1) || clientIp(req);
}

function isIp(value: string): boolean {
  return value.length > 0 && value.length <= 64 && /^[0-9a-fA-F:.]+$/.test(value);
}

function cookieValue(req: Request, name: string): string {
  const header = req.headers.get("cookie") ?? "";
  const pair = header.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  const value = pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
  return /^[A-Za-z0-9-]{8,80}$/.test(value) ? value : "";
}

function upstreamSignal(req: Request): AbortSignal {
  const timeout = AbortSignal.timeout(25_000);
  if (typeof AbortSignal.any === "function") return AbortSignal.any([timeout, req.signal]);
  return timeout;
}

function fallback(decision: Extract<AgentDecision, { action: "openai" }>) {
  const ask = decision.messages.filter((turn) => turn.role === "user").at(-1)?.content ?? "";
  return localCoaching("fallback", decision.person, ask || "Help me prepare");
}
