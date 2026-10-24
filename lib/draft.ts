export interface FollowupDraft {
  subject: string;
  body: string;
  linkedinNote: string;
  linkedinUrl: string | null;
  email: string | null;
}

export interface SharePayload {
  title: string;
  text: string;
}

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

export interface ShareDeps {
  share?: (data: SharePayload) => Promise<void>;
  canShare?: (data: SharePayload) => boolean;
  copy: (text: string) => Promise<boolean>;
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export function stripDashes(input: string): string {
  return input.replace(/\u2014/g, ", ").replace(/\u2013/g, ", ");
}

export function isEmail(value: string | null | undefined): value is string {
  if (!value) return false;
  const clean = value.trim();
  return clean.length <= 120 && EMAIL_RE.test(clean);
}

export function isLinkedInUrl(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host !== "linkedin.com" && host !== "www.linkedin.com") return false;
    return /^\/in\/[A-Za-z0-9_-]+\/?$/.test(url.pathname);
  } catch {
    return false;
  }
}

export function channelsFromGraph(input: {
  email?: string | null;
  linkedinUrl?: string | null;
}): { email: string | null; linkedinUrl: string | null } {
  return {
    email: isEmail(input.email) ? input.email.trim() : null,
    linkedinUrl: isLinkedInUrl(input.linkedinUrl) ? input.linkedinUrl.trim() : null,
  };
}

export function linkedinNoteFromBody(body: string, max = 280): string {
  const clean = stripDashes(body).replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > 80 ? cut.slice(0, space) : cut).trim()}...`;
}

export function attachChannels(
  draft: FollowupDraft | null,
  channels: { email?: string | null; linkedinUrl?: string | null },
): FollowupDraft | null {
  if (!draft) return null;
  const safe = channelsFromGraph(channels);
  const body = stripDashes(draft.body).trim();
  const subject = stripDashes(draft.subject).replace(/\s+/g, " ").trim().slice(0, 120) || "Follow-up";
  return {
    subject,
    body,
    linkedinNote: linkedinNoteFromBody(draft.linkedinNote || body),
    linkedinUrl: safe.linkedinUrl,
    email: safe.email,
  };
}

/** Opens the visitor's own email app. No recipient unless the graph has one. */
export function mailtoHref(draft: Pick<FollowupDraft, "subject" | "body" | "email">): string {
  const to = isEmail(draft.email) ? draft.email.trim() : "";
  const subject = encodeURIComponent(draft.subject);
  const body = encodeURIComponent(draft.body);
  return `mailto:${to}?subject=${subject}&body=${body}`;
}

export function emailText(draft: Pick<FollowupDraft, "subject" | "body">): string {
  return `${draft.subject}\n\n${draft.body}`.trim();
}

export function shareData(draft: Pick<FollowupDraft, "subject" | "body">): SharePayload {
  return { title: draft.subject, text: emailText(draft) };
}

/**
 * Opens the OS share sheet with the draft text.
 * If share is missing or fails (desktop), copies the same text.
 * A cancelled share sheet does not also copy.
 */
export async function deliverShare(draft: FollowupDraft, deps: ShareDeps): Promise<ShareResult> {
  const data = shareData(draft);
  if (deps.share) {
    try {
      if (!deps.canShare || deps.canShare(data)) {
        await deps.share(data);
        return "shared";
      }
    } catch (err) {
      if (errorName(err) === "AbortError") return "cancelled";
    }
  }
  const copied = await deps.copy(data.text);
  return copied ? "copied" : "failed";
}

function errorName(err: unknown): string {
  if (err && typeof err === "object" && "name" in err) return String((err as { name: unknown }).name);
  return "";
}
