import { WARM_LIMIT, warmSpeakers } from "../lib/warm";

/**
 * Warm live intel for the top 18 speakers.
 * Two at a time, and each Bright Data call already has its own timeout.
 * A speaker counts as warmed only after FalkorDB stores the brief.
 */
if (!(process.env.FALKORDB_URL || "").trim()) {
  console.error("FALKORDB_URL is not set, so warm-intel cannot save briefs.");
  process.exitCode = 1;
} else {
  warmSpeakers({ limit: WARM_LIMIT, concurrency: 2, budgetMs: 8 * 60 * 1000 })
    .then((result) => {
      console.log(`Warmed ${result.warmed}, skipped ${result.skipped}, failed ${result.failed}.`);
      if (result.failed > 0) process.exitCode = 1;
    })
    .catch(() => {
      console.error("Warm failed.");
      process.exitCode = 1;
    });
}
