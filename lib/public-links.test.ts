import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildPublicBundle,
  hrefsFromHtml,
  isGithubProfile,
  isPersonalSite,
  linkFreshness,
  pickPagesToOpen,
  profilesLabel,
  seedProfiles,
} from "./public-links";

const fetched = "2026-10-24T10:45:03-07:00";

test("seed profiles keep catalog LinkedIn and X when the handle matches", () => {
  const profiles = seedProfiles({
    name: "Maggie Appleton",
    linkedinUrl: "https://www.linkedin.com/in/maggieappleton/",
    twitterHandle: "mappletons",
    sources: [
      { url: "https://maggieappleton.com/planning-agents", title: "Planning with agents" },
      { url: "https://github.com/microsoft", title: "Not her GitHub" },
    ],
    snapshotFetchedAt: fetched,
  });
  assert.deepEqual(
    profiles.map((profile) => profile.platform),
    ["linkedin", "x", "website"],
  );
  assert.equal(profiles[1].url, "https://x.com/mappletons");
  assert.equal(profiles[1].label, "Follow on X");
  assert.equal(profiles.every((profile) => profile.origin === "snapshot"), true);
  assert.equal(profiles.some((profile) => profile.url.includes("microsoft")), false);
});

test("a seed handle that does not match the person is dropped", () => {
  const profiles = seedProfiles({
    name: "Maggie Appleton",
    linkedinUrl: null,
    twitterHandle: "design",
    sources: [],
    snapshotFetchedAt: fetched,
  });
  assert.equal(profiles.length, 0);
});

test("live discovery checks the domain and the handle, and does not guess", () => {
  const { profiles, links } = buildPublicBundle({
    name: "Maggie Appleton",
    company: "GitHub",
    linkedinUrl: "https://www.linkedin.com/in/maggieappleton/",
    twitterHandle: "mappletons",
    sources: [{ url: "https://maggieappleton.com/planning-agents", title: "Planning with agents" }],
    snapshotFetchedAt: fetched,
    liveFetchedAt: "2026-10-24T20:56:00.000Z",
    hits: [
      { url: "https://github.com/maggieappleton", title: "Maggie Appleton", snippet: "GitHub", kind: "organic" },
      { url: "https://github.com/microsoft", title: "Microsoft", snippet: "GitHub", kind: "organic" },
      { url: "https://www.youtube.com/@mappletons", title: "Maggie Appleton", snippet: "Talks", kind: "organic" },
      { url: "https://www.youtube.com/watch?v=abc123", title: "Maggie Appleton talk", snippet: "Agents", kind: "organic" },
      { url: "https://www.youtube.com/channel/UC1234567890", title: "Maggie Appleton", snippet: "Channel", kind: "organic" },
      { url: "https://bsky.app/profile/maggieappleton.bsky.social", title: "Maggie", snippet: "", kind: "organic" },
      { url: "https://www.instagram.com/notmaggie/", title: "Maggie Appleton", snippet: "", kind: "organic" },
      { url: "https://www.theverge.com/maggie-appleton-agents", title: "Maggie Appleton on agents", snippet: "News", kind: "news" },
      { url: "https://example.com/shoes", title: "Buy shoes", snippet: "Sale", kind: "organic" },
    ],
    pages: [
      {
        url: "https://maggieappleton.com/planning-agents",
        title: "Planning with agents",
        fetchedAt: "2026-10-24T20:56:00.000Z",
        html: `<a href="https://mastodon.social/@mappletons">Mastodon</a>
          <a href="https://twitter.com/someoneelse">Nope</a>
          <a href="https://medium.com/@maggieappleton">Medium</a>`,
      },
    ],
  });
  const platforms = profiles.map((profile) => profile.platform);
  assert.ok(platforms.includes("linkedin"));
  assert.ok(platforms.includes("x"));
  assert.ok(platforms.includes("github"));
  assert.ok(platforms.includes("youtube"));
  assert.ok(platforms.includes("website"));
  assert.ok(platforms.includes("bluesky"));
  assert.ok(platforms.includes("mastodon"));
  assert.ok(platforms.includes("medium"));
  assert.equal(platforms.includes("instagram"), false);
  assert.equal(profiles.some((profile) => profile.url.includes("microsoft")), false);
  assert.equal(profiles.some((profile) => profile.url.includes("channel")), false);
  assert.equal(profiles.some((profile) => profile.url.includes("someoneelse")), false);
  const github = profiles.find((profile) => profile.platform === "github");
  assert.equal(github?.origin, "live");
  assert.equal(profiles.find((profile) => profile.platform === "x")?.origin, "snapshot");
  assert.ok(links.some((link) => link.group === "news" && link.url.includes("theverge.com")));
  assert.ok(links.some((link) => link.group === "articles" && link.url.includes("watch?v=abc123")));
  assert.equal(links.some((link) => link.url.includes("example.com")), false);
  assert.ok(links.length <= 12);
});

test("snapshot links remain when nothing live came back", () => {
  const { links, profiles } = buildPublicBundle({
    name: "John Maeda",
    company: "Microsoft",
    linkedinUrl: "https://www.linkedin.com/in/johnmaeda",
    twitterHandle: null,
    sources: [
      { url: "https://reg.githubuniverse.com/flow/github/universe26/attendee-portal/page/speakers", title: "Speakers" },
      { url: "https://johnmaeda.medium.com/design-in-tech-report-2026", title: "Design in Tech Report" },
    ],
    snapshotFetchedAt: fetched,
    hits: [],
    pages: [],
    liveFetchedAt: null,
  });
  assert.equal(profiles.length, 1);
  assert.equal(profiles[0].platform, "linkedin");
  assert.equal(links.length, 1);
  assert.equal(links[0].origin, "snapshot");
  assert.match(links[0].title, /Design in Tech/);
  assert.equal(links.some((link) => link.url.includes("githubuniverse")), false);
  assert.equal(profilesLabel("snapshot", profiles), "Cached snapshot");
  assert.equal(linkFreshness("live", "snapshot"), "Cached snapshot");
  assert.equal(linkFreshness("live", "live"), "Fetched just now");
  assert.equal(linkFreshness("cache", "live"), "Cached live fetch");
});

test("pages to open prefer a personal site and a matching GitHub profile", () => {
  const urls = pickPagesToOpen(
    [
      { url: "https://www.theverge.com/maeda" },
      { url: "https://github.com/microsoft" },
      { url: "https://github.com/johnmaeda" },
      { url: "https://maeda.design/about" },
      { url: "https://www.linkedin.com/in/johnmaeda" },
    ],
    "John Maeda",
  );
  assert.deepEqual(urls, ["https://maeda.design/about", "https://github.com/johnmaeda"]);
  assert.equal(isPersonalSite("https://www.microsoft.com", "John Maeda"), false);
  assert.equal(isGithubProfile("https://github.com/johnmaeda", "John Maeda"), true);
  assert.equal(isGithubProfile("https://github.com/features", "John Maeda"), false);
});

test("a city that shares the last name is not her public page", () => {
  const { links, profiles } = buildPublicBundle({
    name: "Maggie Appleton",
    company: "GitHub",
    linkedinUrl: null,
    twitterHandle: null,
    sources: [{ url: "https://maggieappleton.com/planning-agents", title: "Planning with agents" }],
    snapshotFetchedAt: fetched,
    liveFetchedAt: "2026-10-24T21:10:00.000Z",
    hits: [
      {
        url: "https://www.nbc26.com/news/petition-to-allow-dogs-in-appleton-city-parks",
        title: "Petition to allow dogs in Appleton city parks",
        snippet: "Appleton Wisconsin",
        kind: "news",
      },
      {
        url: "https://www.instagram.com/cityofappleton/",
        title: "City of Appleton",
        snippet: "Appleton",
        kind: "organic",
      },
      {
        url: "https://www.theverge.com/maggie-appleton-agents",
        title: "Maggie Appleton on agents",
        snippet: "A profile",
        kind: "news",
      },
    ],
    pages: [],
  });
  assert.equal(links.some((link) => link.url.includes("nbc26.com")), false);
  assert.equal(profiles.some((profile) => profile.url.includes("cityofappleton")), false);
  assert.ok(links.some((link) => link.group === "sites" && link.url.includes("maggieappleton.com")));
  assert.ok(links.some((link) => link.group === "news" && link.url.includes("theverge.com")));
});

test("html hrefs are resolved and junk schemes are dropped", () => {
  const hrefs = hrefsFromHtml(
    `<a href="/about">About</a><a href="mailto:a@b.c">Mail</a><a href="https://x.com/mappletons">X</a>`,
    "https://maggieappleton.com/planning-agents",
  );
  assert.ok(hrefs.includes("https://maggieappleton.com/about"));
  assert.ok(hrefs.includes("https://x.com/mappletons"));
  assert.equal(hrefs.some((href) => href.startsWith("mailto:")), false);
});
