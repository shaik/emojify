// Build step: assemble the static site into dist/ and generate derived assets.
//
// The site is dependency-free static files, but two things are genuinely
// "built" here:
//   1. emoji-palette.json — the flattened curated emoji list, derived from the
//      single source of truth (src/emoji-source.mjs) so external tools/SEO can
//      read it without executing JS.
//   2. build-info.json — version + timestamp + counts, and a validation pass
//      that fails the build if the emoji source has duplicates or empties.
//
// Run: node build.mjs   (CI does this before deploying dist/)

import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GROUPS, DEFAULT_GROUPS, ALL_GROUP_NAMES, buildPalette } from "./src/emoji-source.mjs";

const root = dirname(fileURLToPath(import.meta.url));
const SRC = join(root, "src");
const DIST = join(root, "dist");

async function main() {
  // Validate the emoji source.
  const all = buildPalette(ALL_GROUP_NAMES);
  const seen = new Set();
  for (const ch of all) {
    if (!ch || !ch.trim()) throw new Error("Empty emoji in source list");
    if (seen.has(ch)) throw new Error(`Duplicate emoji across groups: ${ch}`);
    seen.add(ch);
  }
  console.log(`✓ validated ${all.length} unique emojis across ${ALL_GROUP_NAMES.length} groups`);

  // Fresh dist/.
  await rm(DIST, { recursive: true, force: true });
  await mkdir(DIST, { recursive: true });

  // Copy the static site.
  await cp(SRC, DIST, { recursive: true });

  // Generated assets.
  const palette = {
    groups: GROUPS,
    defaultGroups: DEFAULT_GROUPS,
    all,
    count: all.length,
  };
  await writeFile(join(DIST, "emoji-palette.json"), JSON.stringify(palette, null, 2));

  const buildInfo = {
    name: "emojify",
    builtAt: new Date().toISOString(),
    emojiCount: all.length,
    groups: ALL_GROUP_NAMES,
  };
  await writeFile(join(DIST, "build-info.json"), JSON.stringify(buildInfo, null, 2));

  // GitHub Pages: skip Jekyll so files/dirs starting with _ are served as-is.
  await writeFile(join(DIST, ".nojekyll"), "");

  console.log(`✓ built site -> ${DIST}`);
}

main().catch((err) => {
  console.error("Build failed:", err.message);
  process.exit(1);
});
