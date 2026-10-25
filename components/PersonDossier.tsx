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
  savedLabel,
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
  savedLabel?: string | null;
}) {
  return (
    <div
      className="mt-4 space-y-3"
      data-intel-mode={intel.mode}
      data-plan-mode={plan.mode}
      data-serp={report.serp}
      data-unlock={report.unlock}
      data-linkedin={report.linkedin}
      data-serp-reason={report.serpReason}
      data-unlock-reason={report.unlockReason}
      data-linkedin-reason={report.linkedinReason}
    >
      <section className="panel p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="type-display text-[18px] leading-6">Conversation plan</h2>
          <p className="text-meta text-faint">
            {plan.mode === "openai" ? "Drafted for this conversation" : "Template from your graph path"}
          </p>
        </div>
        {pending?.plan ? <PendingNote label={pending.plan} /> : null}
        <h3 className="mt-3 text-body font-medium">Why you should meet</h3>
        <p className="measure mt-1 text-body leading-5">{plan.why}</p>
        <h3 className="mt-4 text-body font-medium">How to talk about yourself</h3>
        <ol className="mt-1 divide-y divide-line border-t border-line">
          {plan.angles.map((angle, index) => (
            <li key={`${index}-${angle.slice(0, 24)}`} className="measure py-2 text-body leading-5">
              {angle}
            </li>
          ))}
        </ol>
        <h3 className="mt-4 text-body font-medium">Openers</h3>
        {plan.openers.map((opener, index) => (
          <p key={`${index}-${opener.slice(0, 24)}`} className="measure mt-2 border-l border-accent pl-3 text-body leading-5">
            {opener}
          </p>
        ))}
        <h3 className="mt-4 text-body font-medium">Follow-up idea</h3>
        <p className="measure mt-1 text-body leading-5">{plan.followUp}</p>
        <p className="mt-2 text-meta text-faint">Nothing is sent. This is a note you can use later.</p>
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

      <section className="panel p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="type-display text-[18px] leading-6">Intel</h2>
          <p className="text-meta text-faint">{intel.label}</p>
        </div>
        {savedLabel ? (
          <p className="mt-1 text-meta text-faint" data-saved-intel="">
            {savedLabel}
          </p>
        ) : null}
        <p className="measure mt-2 text-body leading-5 text-mute">{pending?.note ?? describeFetches(report, intel.mode)}</p>
        <p className="mt-2 text-meta text-faint">Public sources only. Nothing on this page sends a message.</p>
      </section>

      <section className="panel p-3">
        <h2 className="type-display text-[18px] leading-6">Work and education</h2>
        {pending?.work ? <PendingNote label={pending.work} /> : null}
        <div className="mt-3 space-y-4">
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
      <section className="panel p-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="type-display text-[18px] leading-6">Personality and communication</h2>
          <p className="text-meta text-faint">{sectionLabel(intel.mode, [intel.personality.origin])}</p>
        </div>
        <p className="mt-2 text-meta text-mute">
          {intel.personality.label} {intel.personality.confidence} confidence.
        </p>
        <p className="measure mt-2 text-body leading-5">{intel.personality.summary}</p>
        <p className="measure mt-2 text-body leading-5">{intel.personality.communication}</p>
        <SourceLine
          label={intel.personality.sourceLabel}
          url={intel.personality.sourceUrl}
          fetchedAt={intel.personality.fetchedAt}
          inference
          confidence={intel.personality.confidence}
        />
      </section>
      <div className="grid gap-3 md:grid-cols-2">
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
    <section className="panel p-3" data-links-count={links.length} data-links-live={liveCount}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-display text-[18px] leading-6">All public links and data</h2>
        <p className="text-meta text-faint">{sectionLabel(mode, links.map((link) => link.origin))}</p>
      </div>
      <p className="measure mt-2 text-body leading-5 text-mute">Open these yourself. Nothing on this page sends a message.</p>
      {pendingLabel ? <PendingNote label={pendingLabel} /> : null}
      {links.length ? (
        <div className="mt-3 space-y-4">
          {LINK_GROUPS.map((group) => {
            const rows = links.filter((link) => link.group === group.id);
            if (!rows.length) return null;
            return (
              <div key={group.id} className="min-w-0">
                <h3 className="text-body font-medium">{group.title}</h3>
                <ul className="mt-1 divide-y divide-line border-t border-line">
                  {rows.map((link) => (
                    <li key={`${group.id}-${link.url}`} className="min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex min-w-0 items-start gap-2 py-2 transition-colors duration-ui hover:bg-fill"
                      >
                        <span className="mt-0.5">
                          <SiteFavicon domain={link.domain} />
                        </span>
                        <span className="min-w-0">
                          <span className="block break-words text-body leading-5 text-accent">{link.title}</span>
                          <span className="block break-words text-meta leading-4 text-faint">
                            {link.domain}, {linkFreshness(mode, link.origin)}
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
        <p className="mt-3 text-body leading-5 text-mute">No public articles, sites, or news in the cached snapshot.</p>
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
        <h3 className="text-body font-medium">{title}</h3>
        <p className="text-meta text-faint">{sectionLabel(mode, origins)}</p>
      </div>
      {gap ? <p className="measure mt-2 text-body leading-5 text-mute">{gap}</p> : null}
      {claims.length ? (
        <ul className="mt-2 space-y-3">
          {claims.map((claim, index) => (
            <li key={`${claim.sourceUrl}-${index}`}>
              <p className="measure break-words text-body leading-5">{claim.text}</p>
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
        <p className="mt-2 text-body leading-5 text-mute">Nothing public in this section.</p>
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
    <section className="panel min-w-0 p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="type-display text-[18px] leading-6">{title}</h2>
        <p className="text-meta text-faint">{sectionLabel(mode, origins)}</p>
      </div>
      {note ? <p className="measure mt-2 text-body leading-5 text-mute">{note}</p> : null}
      {pendingLabel ? <PendingNote label={pendingLabel} /> : null}
      {gap ? <p className="measure mt-2 text-body leading-5 text-mute">{gap}</p> : null}
      {claims.length ? (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {claims.map((claim, index) => (
            <li key={`${claim.sourceUrl}-${index}`} className="py-2">
              <p className="measure break-words text-body leading-5">{claim.text}</p>
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
        <p className="mt-2 text-body leading-5 text-mute">Nothing public in this section.</p>
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
    <p className="mt-1 break-words text-meta leading-4 text-faint">
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="text-accent hover:underline">
          {label || "Source"}
        </a>
      ) : (
        <span>{label || "Source"}</span>
      )}
      {`, fetched ${formatStamp(fetchedAt)}`}
      {inference ? `, inference, ${confidence} confidence` : ""}
    </p>
  );
}
