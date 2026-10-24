import { GraphPath } from "./GraphPath";
import { PendingNote } from "./BriefSkeleton";
import { SiteFavicon } from "./SiteFavicon";
import {
  describeFetches,
  formatStamp,
  sectionLabel,
  type Claim,
  type FetchReport,
  type Origin,
  type PersonIntel,
} from "@/lib/intel";
import type { LivePending } from "@/lib/live-labels";
import { linkFreshness, type LinkGroup, type PublicLink } from "@/lib/public-links";
import type { ConversationPlan } from "@/lib/plan";
import type { GraphBackend, RankedPerson } from "@/lib/types";

export function PersonDossier({
  card,
  intel,
  plan,
  report,
  links,
  backend,
  ms,
  cypher,
  fetchedLabel,
  pending,
}: {
  card: RankedPerson;
  intel: PersonIntel;
  plan: ConversationPlan;
  report: FetchReport;
  links: PublicLink[];
  backend: GraphBackend;
  ms: number;
  cypher: string;
  fetchedLabel: string;
  pending?: LivePending | null;
}) {
  return (
    <div
      className="mt-6 space-y-4"
      data-intel-mode={intel.mode}
      data-plan-mode={plan.mode}
      data-serp={report.serp}
      data-unlock={report.unlock}
      data-linkedin={report.linkedin}
      data-serp-reason={report.serpReason}
      data-unlock-reason={report.unlockReason}
      data-linkedin-reason={report.linkedinReason}
    >
      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#b33b12]">Conversation plan</p>
          <p className="text-xs text-mute">
            {plan.mode === "openai" ? "Drafted for this conversation" : "Template from your graph path"}
          </p>
        </div>
        {pending?.plan ? <p className="mt-2 text-sm text-mute" aria-busy="true">{pending.plan}</p> : null}
        <h2 className="mt-3 font-serif text-2xl tracking-tight">Why you should meet</h2>
        <p className="mt-2 text-[15px] leading-7">{plan.why}</p>
        <h2 className="mt-5 font-serif text-2xl tracking-tight">How to talk about yourself</h2>
        <ol className="mt-3 space-y-3">
          {plan.angles.map((angle, index) => (
            <li key={`${index}-${angle.slice(0, 24)}`} className="rounded-2xl bg-[#faf7f2] px-4 py-3 text-sm leading-6">
              {angle}
            </li>
          ))}
        </ol>
        <h3 className="mt-5 text-[11px] uppercase tracking-[0.14em] text-mute">Openers</h3>
        {plan.openers.map((opener, index) => (
          <p key={`${index}-${opener.slice(0, 24)}`} className="mt-3 border-l-2 border-accent pl-3 font-serif text-lg leading-7">
            {opener}
          </p>
        ))}
        <h3 className="mt-5 text-[11px] uppercase tracking-[0.14em] text-mute">Follow-up idea</h3>
        <p className="mt-2 text-sm leading-6">{plan.followUp}</p>
        <p className="mt-3 text-xs text-mute">Nothing is sent. This is a note you can use later.</p>
      </section>

      <GraphPath
        name={card.name}
        sessionTitle={card.sessionTitle}
        sessionType={card.sessionType}
        path={card.path}
        introPath={card.introPath}
        introName={card.introVia?.name ?? null}
        hops={card.hops}
        ms={ms}
        backend={backend}
        cypher={cypher}
        keywordHits={card.keywordHits}
        fetchedLabel={fetchedLabel}
      />

      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#b33b12]">Intel</p>
          <p className="text-xs font-semibold">{intel.label}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-mute">{pending?.note ?? describeFetches(report, intel.mode)}</p>
        <p className="mt-2 text-xs text-mute">Public sources only. Nothing on this page sends a message.</p>
      </section>

      <section className="rounded-3xl border border-line bg-card p-5">
        <h2 className="font-serif text-2xl tracking-tight">Work and education</h2>
        {pending?.work ? <PendingNote label={pending.work} /> : null}
        <div className="mt-4 space-y-5">
          <ClaimGroup
            title="Work"
            mode={intel.mode}
            claims={intel.work}
            gap={intel.workGap}
            gapOrigin={intel.workGapOrigin}
          />
          <ClaimGroup
            title="Education"
            mode={intel.mode}
            claims={intel.education}
            gap={intel.educationGap}
            gapOrigin={intel.educationGapOrigin}
          />
        </div>
      </section>
      <section className="rounded-3xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-2xl tracking-tight">Personality and communication</h2>
          <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
            {sectionLabel(intel.mode, [intel.personality.origin])}
          </p>
        </div>
        <p className="mt-2 text-sm text-mute">
          {intel.personality.label} {intel.personality.confidence} confidence.
        </p>
        <p className="mt-3 text-sm leading-6">{intel.personality.summary}</p>
        <p className="mt-3 text-sm leading-6">{intel.personality.communication}</p>
        <SourceLine
          label={intel.personality.sourceLabel}
          url={intel.personality.sourceUrl}
          fetchedAt={intel.personality.fetchedAt}
          inference
          confidence={intel.personality.confidence}
        />
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        <IntelSection title="Psychographics" mode={intel.mode} claims={intel.psychographics} gap={null} gapOrigin={null} />
        <IntelSection
          title="Recent news"
          mode={intel.mode}
          claims={intel.news}
          gap={null}
          gapOrigin={null}
          note={intel.newsNote}
          pendingLabel={pending?.news}
        />
        <IntelSection
          title="What makes them stand out"
          mode={intel.mode}
          claims={intel.standout}
          gap={null}
          gapOrigin={null}
          pendingLabel={pending?.standout}
        />
        <IntelSection title="Public talking points" mode={intel.mode} claims={intel.talkingPoints} gap={null} gapOrigin={null} />
      </div>
      <PublicLinks links={links} mode={intel.mode} pendingLabel={pending?.links} />
    </div>
  );
}

const LINK_GROUPS: { id: LinkGroup; title: string }[] = [
  { id: "articles", title: "Articles and talks" },
  { id: "sites", title: "Their sites" },
  { id: "news", title: "News" },
];

function PublicLinks({
  links,
  mode,
  pendingLabel,
}: {
  links: PublicLink[];
  mode: PersonIntel["mode"];
  pendingLabel?: string;
}) {
  const liveCount = links.filter((link) => link.origin === "live").length;
  return (
    <section
      className="rounded-3xl border border-line bg-card p-5"
      data-links-count={links.length}
      data-links-live={liveCount}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl tracking-tight">All public links and data</h2>
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">
          {sectionLabel(mode, links.map((link) => link.origin))}
        </p>
      </div>
      <p className="mt-2 text-sm leading-6 text-mute">Open these yourself. Nothing on this page sends a message.</p>
      {pendingLabel ? <PendingNote label={pendingLabel} /> : null}
      {links.length ? (
        <div className="mt-4 space-y-5">
          {LINK_GROUPS.map((group) => {
            const rows = links.filter((link) => link.group === group.id);
            if (!rows.length) return null;
            return (
              <div key={group.id} className="min-w-0">
                <h3 className="text-sm font-semibold">{group.title}</h3>
                <ul className="mt-2 space-y-2">
                  {rows.map((link) => (
                    <li key={`${group.id}-${link.url}`} className="min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-start gap-3 rounded-2xl px-1 py-1 hover:bg-[#faf7f2]"
                      >
                        <span className="mt-1">
                          <SiteFavicon domain={link.domain} />
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words text-sm leading-6 text-[#b33b12]">{link.title}</span>
                          <span className="block break-words text-xs leading-5 text-mute">
                            {link.domain} · {linkFreshness(mode, link.origin)}
                          </span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-3 py-2 text-sm leading-6">
          No public articles, sites, or news in the cached snapshot.
        </p>
      )}
    </section>
  );
}

function ClaimGroup({
  title,
  mode,
  claims,
  gap,
  gapOrigin,
}: {
  title: string;
  mode: PersonIntel["mode"];
  claims: Claim[];
  gap: string | null;
  gapOrigin: Origin | null;
}) {
  const origins = [...claims.map((claim) => claim.origin), gapOrigin];
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{sectionLabel(mode, origins)}</p>
      </div>
      {gap ? (
        <p className="mt-2 rounded-2xl border border-dashed border-line px-3 py-2 text-sm leading-6">{gap}</p>
      ) : null}
      {claims.length ? (
        <ul className="mt-3 space-y-3">
          {claims.map((claim, index) => (
            <li key={`${claim.sourceUrl}-${index}`}>
              <p className="break-words text-sm leading-6">{claim.text}</p>
              <SourceLine
                label={claim.sourceLabel}
                url={claim.sourceUrl}
                fetchedAt={claim.fetchedAt}
                inference={claim.inference}
                confidence={claim.confidence}
              />
            </li>
          ))}
        </ul>
      ) : !gap ? (
        <p className="mt-2 text-sm leading-6 text-mute">Nothing public in this section.</p>
      ) : null}
    </div>
  );
}

function IntelSection({
  title,
  mode,
  claims,
  gap,
  gapOrigin,
  note,
  wide,
  pendingLabel,
}: {
  title: string;
  mode: PersonIntel["mode"];
  claims: Claim[];
  gap: string | null;
  gapOrigin: Origin | null;
  note?: string | null;
  wide?: boolean;
  pendingLabel?: string;
}) {
  const origins = [...claims.map((claim) => claim.origin), gapOrigin];
  return (
    <section className={`rounded-3xl border border-line bg-card p-5 ${wide ? "" : "min-w-0"}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
        <p className="text-[11px] uppercase tracking-[0.14em] text-mute">{sectionLabel(mode, origins)}</p>
      </div>
      {note ? <p className="mt-2 text-sm leading-6 text-mute">{note}</p> : null}
      {pendingLabel ? <PendingNote label={pendingLabel} /> : null}
      {gap ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line px-3 py-2 text-sm leading-6">{gap}</p>
      ) : null}
      {claims.length ? (
        <ul className="mt-3 space-y-3">
          {claims.map((claim, index) => (
            <li key={`${claim.sourceUrl}-${index}`} className="border-t border-line pt-3 first:border-t-0 first:pt-0">
              <p className="break-words text-sm leading-6">{claim.text}</p>
              <SourceLine
                label={claim.sourceLabel}
                url={claim.sourceUrl}
                fetchedAt={claim.fetchedAt}
                inference={claim.inference}
                confidence={claim.confidence}
              />
            </li>
          ))}
        </ul>
      ) : !gap && !pendingLabel ? (
        <p className="mt-3 text-sm leading-6 text-mute">Nothing public in this section.</p>
      ) : null}
    </section>
  );
}

function SourceLine({
  label,
  url,
  fetchedAt,
  inference,
  confidence,
}: {
  label: string;
  url: string;
  fetchedAt: string;
  inference?: boolean;
  confidence?: string;
}) {
  return (
    <p className="mt-1 break-words text-xs leading-5 text-mute">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-[#b33b12] underline-offset-2 hover:underline">
          {label || "Source"}
        </a>
      ) : (
        <span>{label || "Source"}</span>
      )}
      {` · fetched ${formatStamp(fetchedAt)}`}
      {inference ? ` · inference, ${confidence} confidence` : ""}
    </p>
  );
}
