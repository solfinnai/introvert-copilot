import { profilesLabel, type SocialProfile } from "@/lib/public-links";
import type { IntelMode } from "@/lib/intel";

export function SocialIcons({ profiles, mode }: { profiles: SocialProfile[]; mode: IntelMode }) {
  if (!profiles.length) return null;
  const note = profilesLabel(mode, profiles);
  return (
    <div className="min-w-0">
      <ul
        className="flex flex-wrap items-center gap-2"
        data-social-count={profiles.length}
        data-social-platforms={profiles.map((profile) => profile.platform).join(",")}
      >
        {profiles.map((profile) => (
          <li key={profile.platform} className="shrink-0">
            <a
              href={profile.url}
              target="_blank"
              rel="noreferrer"
              aria-label={profile.label}
              title={profile.label}
              className="inline-flex h-7 w-7 items-center justify-center rounded-control border border-line bg-surface text-ink transition-colors duration-ui hover:bg-fill"
            >
              <PlatformIcon platform={profile.platform} />
            </a>
          </li>
        ))}
      </ul>
      {note ? <p className="mt-2 text-xs text-mute">{note}</p> : null}
    </div>
  );
}

function PlatformIcon({ platform }: { platform: SocialProfile["platform"] }) {
  const common = {
    viewBox: "0 0 24 24",
    "aria-hidden": true as const,
    className: "h-4 w-4",
    fill: "currentColor",
  };
  if (platform === "linkedin") {
    return (
      <svg {...common}>
        <path d="M4.7 3.2a1.8 1.8 0 1 0 .1 3.6 1.8 1.8 0 0 0-.1-3.6zM3 8.4h3.4V21H3zM9.2 8.4h3.2v1.7h.1c.5-.9 1.6-1.8 3.3-1.8 3.5 0 4.2 2.3 4.2 5.3V21h-3.4v-6.3c0-1.5 0-3.4-2.1-3.4s-2.4 1.6-2.4 3.3V21H9.2z" />
      </svg>
    );
  }
  if (platform === "x") {
    return (
      <svg {...common}>
        <path d="M14.7 10.3 21.4 3h-1.6l-5.8 6.4L9.2 3H3.4l7 9.7L3.4 21h1.6l6.2-6.8L14.8 21h5.8l-5.9-10.7zm-2.2 2.4-.7-1L5.6 4.2h2.4l4.6 6.3.7 1 6 8.2h-2.4l-4.4-6z" />
      </svg>
    );
  }
  if (platform === "github") {
    return (
      <svg {...common}>
        <path d="M12 2C6.5 2 2 6.6 2 12.2c0 4.5 2.9 8.3 6.9 9.6.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.4-3.4-1.4-.5-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.7.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7 1 .7 2v2.8c0 .3.2.6.7.5A10.2 10.2 0 0 0 22 12.2C22 6.6 17.5 2 12 2z" />
      </svg>
    );
  }
  if (platform === "youtube") {
    return (
      <svg {...common}>
        <path d="M23 12.2s0-3.2-.4-4.6c-.2-.9-.9-1.6-1.8-1.8C19.2 5.4 12 5.4 12 5.4s-7.2 0-8.8.4c-.9.2-1.6.9-1.8 1.8C1 9 1 12.2 1 12.2s0 3.2.4 4.6c.2.9.9 1.6 1.8 1.8 1.6.4 8.8.4 8.8.4s7.2 0 8.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.4.4-4.6.4-4.6zM9.8 15.5v-6.6l6 3.3-6 3.3z" />
      </svg>
    );
  }
  if (platform === "website") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="8.2" />
        <path d="M3.8 12h16.4M12 3.8c2.2 2.4 3.4 5.2 3.4 8.2s-1.2 5.8-3.4 8.2c-2.2-2.4-3.4-5.2-3.4-8.2s1.2-5.8 3.4-8.2z" />
      </svg>
    );
  }
  if (platform === "instagram") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="4" y="4" width="16" height="16" rx="5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="17.2" cy="6.8" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (platform === "mastodon") {
    return (
      <svg {...common}>
        <path d="M7.2 7.4c0-2.4 2.1-4.2 4.8-4.2s4.8 1.8 4.8 4.2V14h1.6c.5 0 .8.4.8.9 0 1.6-1.3 2.8-2.9 2.8H15v1.2c0 .8-.7 1.5-1.6 1.5s-1.6-.7-1.6-1.5V17H8.4v2.6H6.6V7.4h.6zm2.2 3.2a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2zm5.2 0a1.1 1.1 0 1 0 0 2.2 1.1 1.1 0 0 0 0-2.2z" />
      </svg>
    );
  }
  if (platform === "bluesky") {
    return (
      <svg {...common}>
        <path d="M12 13.2C10.7 10.8 7.4 6.4 4.4 4.3 3 3.3 2 4 2 5.8c0 .6.3 5 .6 5.7.6 2.4 3.1 3.2 5.4 2.8-3.3.5-4.6 2.3-3.5 4.3 2.1 3.5 4.6.6 6.1-.9.4-.3.9-.3 1.3 0 1.5 1.5 4 4.4 6.1.9 1.1-2-.2-3.8-3.5-4.3 2.3.4 4.8-.4 5.4-2.8.3-.7.6-5.1.6-5.7 0-1.8-1-2.5-2.4-1.5-3 2.1-6.3 6.5-7.6 8.9z" />
      </svg>
    );
  }
  if (platform === "medium") {
    return (
      <svg {...common}>
        <path d="M4.2 7.2 7.2 17l3.2-9.8h2L8.8 19H5.4L2 7.2h2.2zm8.6 0H15l3.1 8.2L21.2 7.2H23v11.2h-1.8V9.6l-3.2 8.4h-1.5L13.3 9.6v8.8h-1.8V7.2h1.3z" />
      </svg>
    );
  }
  if (platform === "devto") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="14" rx="3" />
        <path d="M8 9.2h2.2v5.6H8zM11.2 9.2h2.4l1.6 2.8-1.6 2.8h-2.4V9.2z" fill="white" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M5 7h14v2.2H5zM5 11h14v2.2H5zM5 15h10v2.2H5z" />
    </svg>
  );
}
