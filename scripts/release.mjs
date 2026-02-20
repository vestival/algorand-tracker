#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const changelogPath = path.join(root, "CHANGELOG.md");
const packageJsonPath = path.join(root, "package.json");

const bumpArg = process.argv.find((arg) => arg.startsWith("--bump="));
const bump = (bumpArg?.split("=")[1] ?? "minor").toLowerCase();

if (!["patch", "minor", "major"].includes(bump)) {
  console.error("Invalid bump type. Use --bump=patch|minor|major");
  process.exit(1);
}

function nextVersionFrom(currentVersion, bumpType) {
  const [major, minor, patch] = currentVersion.split(".").map((part) => Number.parseInt(part, 10));
  if (![major, minor, patch].every((n) => Number.isFinite(n))) {
    throw new Error(`Invalid semantic version: ${currentVersion}`);
  }

  if (bumpType === "major") return `${major + 1}.0.0`;
  if (bumpType === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function getTodayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

function hasReleaseForDate(changelog, date) {
  const dateRegex = new RegExp(`^## \\[[^\\]]+\\] - ${date}$`, "m");
  return dateRegex.test(changelog);
}

function releaseUnreleased(changelog, version, date) {
  const unreleasedMatch = changelog.match(/^## \[Unreleased\]\s*$/m);
  if (!unreleasedMatch || unreleasedMatch.index === undefined) {
    throw new Error("CHANGELOG.md does not contain an '## [Unreleased]' section.");
  }

  const unreleasedHeaderIndex = unreleasedMatch.index;
  const unreleasedHeaderEnd = unreleasedHeaderIndex + unreleasedMatch[0].length;

  const afterUnreleased = changelog.slice(unreleasedHeaderEnd);
  const nextReleaseMatch = afterUnreleased.match(/\n## \[[^\]]+\] - \d{4}-\d{2}-\d{2}\s*$/m);
  const nextReleaseRelativeIndex = nextReleaseMatch?.index ?? afterUnreleased.length;
  const unreleasedBody = afterUnreleased.slice(0, nextReleaseRelativeIndex).trim();

  if (!unreleasedBody) {
    throw new Error("Unreleased section is empty; nothing to release.");
  }

  const remainder = afterUnreleased.slice(nextReleaseRelativeIndex).trimStart();
  const releaseHeader = `## [${version}] - ${date}`;

  const before = changelog.slice(0, unreleasedHeaderEnd);
  const releasedSection = `\n\n${releaseHeader}\n\n${unreleasedBody}\n`;
  const after = remainder ? `\n${remainder}` : "";

  return `${before}${releasedSection}${after}`;
}

async function main() {
  const [changelogRaw, packageRaw] = await Promise.all([readFile(changelogPath, "utf8"), readFile(packageJsonPath, "utf8")]);
  const packageJson = JSON.parse(packageRaw);
  const today = getTodayUtcDate();

  if (hasReleaseForDate(changelogRaw, today)) {
    throw new Error(`A release already exists for ${today}. Max one version per day is enforced.`);
  }

  const currentVersion = packageJson.version;
  const nextVersion = nextVersionFrom(currentVersion, bump);
  const nextChangelog = releaseUnreleased(changelogRaw, nextVersion, today);

  packageJson.version = nextVersion;

  await Promise.all([
    writeFile(changelogPath, `${nextChangelog.trimEnd()}\n`, "utf8"),
    writeFile(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8")
  ]);

  console.log(`Released ${nextVersion} on ${today} (bump=${bump}).`);
  console.log("Next steps:");
  console.log(`- git add CHANGELOG.md package.json package-lock.json`);
  console.log(`- npm install --package-lock-only`);
  console.log(`- git commit -m "release: v${nextVersion}"`);
  console.log(`- git tag v${nextVersion}`);
  console.log("- git push origin main --tags");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
