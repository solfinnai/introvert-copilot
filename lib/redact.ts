const URL_RE = /(falkors?|rediss?):\/\/\S+/gi;

export function redact(text: string): string {
  return text.replace(URL_RE, "[redacted]");
}

let lastLine = "";

/** Log the active graph backend. Never include the connection URL. */
export function logBackend(backend: "falkordb" | "memory", detail: string): void {
  const line = `Graph backend: ${backend} (${redact(detail)})`;
  if (line === lastLine) return;
  lastLine = line;
  console.log(line);
}

export function safeError(err: unknown, secrets: string[] = []): string {
  let msg = err instanceof Error ? err.message : "unknown error";
  msg = redact(msg);
  for (const secret of secrets) {
    if (secret && secret.length > 2) msg = msg.split(secret).join("[redacted]");
  }
  return msg.slice(0, 180);
}
