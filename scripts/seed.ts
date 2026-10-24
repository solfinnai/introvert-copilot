import { ensureCypher } from "../lib/seed-graph";

async function main(): Promise<void> {
  if (!process.env.FALKORDB_URL) {
    console.log("Graph backend: memory (FALKORDB_URL unset). Nothing was written.");
    return;
  }
  const status = await ensureCypher();
  console.log(
    `Graph backend: ${status.backend} (nodes=${status.nodes}, edges=${status.edges}, seeded=${status.seeded})`,
  );
  if (status.backend !== "falkordb") process.exitCode = 1;
}

main().catch(() => {
  console.error("Graph seed failed");
  process.exitCode = 1;
});
