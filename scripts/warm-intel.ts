import { WARM_LIMIT, warmSpeakers } from "../lib/warm";

/**
 * Warm live intel for the top 18 speakers.
 * Two at a time, and each Bright Data call already has its own timeout.
 * Skips anyone already in the 6 hour cache.
 */
warmSpeakers({ limit: WARM_LIMIT, concurrency: 2, budgetMs: 8 * 60 * 1000 })
  .then((result) => {
    console.log(`Warmed ${result.warmed}, skipped ${result.skipped}, failed ${result.failed}.`);
  })
  .catch(() => {
    console.error("Warm failed.");
    process.exitCode = 1;
  });
