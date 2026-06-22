// Set the same version on every publishable package (fixed-version monorepo).
// Called by semantic-release's @semantic-release/exec prepare step.
// pnpm replaces `workspace:*` internal deps with this version at publish time.
import { readFileSync, writeFileSync } from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("usage: node scripts/set-version.mjs <version>");
  process.exit(1);
}

const packages = [
  "packages/core/package.json",
  "packages/tools/package.json",
  "packages/react/package.json",
  "packages/ai-sdk/package.json",
];

for (const path of packages) {
  const pkg = JSON.parse(readFileSync(path, "utf8"));
  pkg.version = version;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`set ${pkg.name} → ${version}`);
}
