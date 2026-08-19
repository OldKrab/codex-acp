import { execFileSync, spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { isDeepStrictEqual } from "node:util";

const missing = Symbol("missing");
const allowedConflicts = new Set([
  ".github/workflows/publish.yml",
  ".release-please-manifest.json",
  "package-lock.json",
  "package.json",
]);
const forkOwnedPackagePaths = new Set([
  "bugs",
  "homepage",
  "name",
  "repository",
  "scripts/generate-types",
  "scripts/release:preflight",
  "version",
]);
const forkOwnedLockPaths = new Set([
  "name",
  "packages//name",
  "packages//version",
  "version",
]);

function git(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...options }).trim();
}

function requiredArgument(name) {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing ${name}`);
  }
  return value;
}

function jsonAt(ref, file) {
  return JSON.parse(git(["show", `${ref}:${file}`]));
}

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function mergeJson(base, fork, upstream, forkOwnedPaths, path = []) {
  const pathKey = path.join("/");
  if (forkOwnedPaths.has(pathKey)) return fork;
  if (isDeepStrictEqual(fork, upstream)) return fork;
  if (isDeepStrictEqual(fork, base)) return upstream;
  if (isDeepStrictEqual(upstream, base)) return fork;

  if (isObject(base) || isObject(fork) || isObject(upstream)) {
    const keys = new Set([
      ...Object.keys(isObject(base) ? base : {}),
      ...Object.keys(isObject(fork) ? fork : {}),
      ...Object.keys(isObject(upstream) ? upstream : {}),
    ]);
    const merged = {};
    for (const key of keys) {
      const value = mergeJson(
        isObject(base) && key in base ? base[key] : missing,
        isObject(fork) && key in fork ? fork[key] : missing,
        isObject(upstream) && key in upstream ? upstream[key] : missing,
        forkOwnedPaths,
        [...path, key],
      );
      if (value !== missing) merged[key] = value;
    }
    return merged;
  }

  throw new Error(`Package metadata changed in both fork and upstream at ${pathKey}`);
}

function writeJson(file, value) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

const release = requiredArgument("--release");
const tag = requiredArgument("--tag");
const branch = requiredArgument("--branch");
if (!/^v\d+\.\d+\.\d+(?:[.-][0-9A-Za-z.-]+)?$/.test(tag)) {
  throw new Error(`Invalid release tag: ${tag}`);
}

const forkHead = git(["rev-parse", "HEAD"]);
const mergeBase = git(["merge-base", forkHead, release]);
const basePackage = jsonAt(mergeBase, "package.json");
const forkPackage = jsonAt(forkHead, "package.json");
const upstreamPackage = jsonAt(release, "package.json");
const baseLock = jsonAt(mergeBase, "package-lock.json");
const forkLock = jsonAt(forkHead, "package-lock.json");
const upstreamLock = jsonAt(release, "package-lock.json");

const mergedPackage = mergeJson(
  basePackage,
  forkPackage,
  upstreamPackage,
  forkOwnedPackagePaths,
);
mergedPackage.openaideUpstream = `agentclientprotocol/codex-acp@${tag}`;
const mergedLock = mergeJson(baseLock, forkLock, upstreamLock, forkOwnedLockPaths);

git(["switch", "--create", branch]);
const merge = spawnSync("git", ["merge", "--no-ff", "--no-commit", release], {
  encoding: "utf8",
});
if (merge.status !== 0) {
  const conflicts = git(["diff", "--name-only", "--diff-filter=U"])
    .split("\n")
    .filter(Boolean);
  if (conflicts.length === 0) {
    throw new Error(`Unable to merge upstream ${tag}: ${merge.stderr || merge.stdout}`);
  }
  const unexpected = conflicts.filter((file) => !allowedConflicts.has(file));
  if (unexpected.length > 0) {
    git(["merge", "--abort"]);
    throw new Error(`Unexpected upstream conflicts: ${unexpected.join(", ")}`);
  }
}

git([
  "checkout",
  forkHead,
  "--",
  ".github/workflows/publish.yml",
  ".release-please-manifest.json",
]);
writeJson("package.json", mergedPackage);
writeJson("package-lock.json", mergedLock);
git([
  "add",
  ".github/workflows/publish.yml",
  ".release-please-manifest.json",
  "package.json",
  "package-lock.json",
]);
const unresolved = git(["diff", "--name-only", "--diff-filter=U"]);
if (unresolved) {
  git(["merge", "--abort"]);
  throw new Error(`Unresolved upstream conflicts: ${unresolved.replaceAll("\n", ", ")}`);
}
git(["commit", "--message", `Merge upstream ${tag}`]);
