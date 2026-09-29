import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, test } from "vitest";

const prepareScript = path.resolve("scripts/prepare-upstream-sync.mjs");
const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) {
    rmSync(repository, { recursive: true, force: true });
  }
});

function git(repository: string, ...args: string[]) {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

function write(repository: string, relativePath: string, contents: string) {
  const target = path.join(repository, relativePath);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, contents);
}

function writeJson(repository: string, relativePath: string, value: unknown) {
  write(repository, relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

function packageLock(name: string, version: string, dependencies: Record<string, string>) {
  return {
    name,
    version,
    lockfileVersion: 3,
    requires: true,
    packages: {
      "": { name, version, dependencies },
    },
  };
}

describe("upstream update branch", () => {
  test("is mergeable while preserving fork-owned release metadata", () => {
    const repository = mkdtempSync(path.join(tmpdir(), "codex-acp-upstream-sync-"));
    temporaryRepositories.push(repository);
    git(repository, "init", "--initial-branch=main");
    git(repository, "config", "user.name", "Upstream Sync Test");
    git(repository, "config", "user.email", "upstream-sync@example.invalid");

    const upstreamPackage = {
      name: "@agentclientprotocol/codex-acp",
      version: "1.0.0",
      scripts: {
        "generate-types": "upstream-generate",
        test: "vitest",
      },
      dependencies: { alpha: "1.0.0" },
      homepage: "https://github.com/agentclientprotocol/codex-acp#readme",
      bugs: { url: "https://github.com/agentclientprotocol/codex-acp/issues" },
      repository: {
        type: "git",
        url: "git+https://github.com/agentclientprotocol/codex-acp.git",
      },
    };
    writeJson(repository, "package.json", upstreamPackage);
    writeJson(
      repository,
      "package-lock.json",
      packageLock(upstreamPackage.name, upstreamPackage.version, upstreamPackage.dependencies),
    );
    write(repository, ".github/workflows/publish.yml", "name: Upstream publish v1\n");
    write(repository, "CHANGELOG.md", "Upstream releases\n");
    write(repository, "docs/RELEASES.md", "Upstream publishing\n");
    writeJson(repository, ".release-please-manifest.json", { ".": "1.0.0" });
    write(repository, "src/product.ts", "export const product = 1;\n");
    git(repository, "add", ".");
    git(repository, "commit", "-m", "upstream v1");
    const base = git(repository, "rev-parse", "HEAD");

    const forkPackage = {
      ...upstreamPackage,
      name: "@openaide/codex-acp",
      version: "1.0.0",
      openaideUpstream: "agentclientprotocol/codex-acp@v1.0.0",
      scripts: {
        ...upstreamPackage.scripts,
        "generate-types": "fork-generate",
        "release:preflight": "bash scripts/release-preflight.sh",
      },
      homepage: "https://github.com/OldKrab/codex-acp#readme",
      bugs: { url: "https://github.com/OldKrab/codex-acp/issues" },
      repository: {
        type: "git",
        url: "git+https://github.com/OldKrab/codex-acp.git",
      },
    };
    writeJson(repository, "package.json", forkPackage);
    writeJson(
      repository,
      "package-lock.json",
      packageLock(forkPackage.name, forkPackage.version, forkPackage.dependencies),
    );
    write(repository, ".github/workflows/publish.yml", "name: OpenAIDE publish\n");
    write(repository, "CHANGELOG.md", "Fork releases\n");
    write(repository, "docs/RELEASES.md", "Fork publishing\n");
    writeJson(repository, ".release-please-manifest.json", { ".": "1.0.0" });
    git(repository, "add", ".");
    git(repository, "commit", "-m", "fork release metadata");

    git(repository, "switch", "--create", "upstream", base);
    const nextUpstreamPackage = {
      ...upstreamPackage,
      version: "2.0.0",
      scripts: {
        ...upstreamPackage.scripts,
        "new-upstream-check": "node check.mjs",
      },
      dependencies: { alpha: "2.0.0", beta: "1.0.0" },
    };
    writeJson(repository, "package.json", nextUpstreamPackage);
    writeJson(
      repository,
      "package-lock.json",
      packageLock(
        nextUpstreamPackage.name,
        nextUpstreamPackage.version,
        nextUpstreamPackage.dependencies,
      ),
    );
    write(repository, ".github/workflows/publish.yml", "name: Upstream publish v2\n");
    write(repository, "CHANGELOG.md", "Upstream v2 releases\n");
    write(repository, "docs/RELEASES.md", "Upstream v2 publishing\n");
    writeJson(repository, ".release-please-manifest.json", { ".": "2.0.0" });
    write(repository, "src/product.ts", "export const product = 2;\n");
    git(repository, "add", ".");
    git(repository, "commit", "-m", "upstream v2");
    const release = git(repository, "rev-parse", "HEAD");
    git(repository, "switch", "main");

    execFileSync(
      process.execPath,
      [prepareScript, "--release", release, "--tag", "v2.0.0", "--branch", "sync/v2.0.0"],
      { cwd: repository, stdio: "pipe" },
    );

    const mergeability = spawnSync("git", ["merge-tree", "--write-tree", "main", "sync/v2.0.0"], {
      cwd: repository,
      encoding: "utf8",
    });
    expect(mergeability.status, mergeability.stdout + mergeability.stderr).toBe(0);
    expect(spawnSync("git", ["merge-base", "--is-ancestor", release, "sync/v2.0.0"], {
      cwd: repository,
    }).status).toBe(0);

    const mergedPackage = JSON.parse(readFileSync(path.join(repository, "package.json"), "utf8"));
    expect(mergedPackage).toMatchObject({
      name: "@openaide/codex-acp",
      version: "1.0.0",
      openaideUpstream: "agentclientprotocol/codex-acp@v2.0.0",
      dependencies: { alpha: "2.0.0", beta: "1.0.0" },
      homepage: "https://github.com/OldKrab/codex-acp#readme",
      scripts: {
        "generate-types": "fork-generate",
        "release:preflight": "bash scripts/release-preflight.sh",
        "new-upstream-check": "node check.mjs",
      },
    });
    const mergedLock = JSON.parse(
      readFileSync(path.join(repository, "package-lock.json"), "utf8"),
    );
    expect(mergedLock).toMatchObject({
      name: "@openaide/codex-acp",
      version: "1.0.0",
      packages: {
        "": {
          name: "@openaide/codex-acp",
          version: "1.0.0",
          dependencies: { alpha: "2.0.0", beta: "1.0.0" },
        },
      },
    });
    expect(readFileSync(path.join(repository, ".github/workflows/publish.yml"), "utf8"))
      .toBe("name: OpenAIDE publish\n");
    expect(JSON.parse(readFileSync(path.join(repository, ".release-please-manifest.json"), "utf8")))
      .toEqual({ ".": "1.0.0" });
    expect(readFileSync(path.join(repository, "src/product.ts"), "utf8"))
      .toBe("export const product = 2;\n");
    expect(readFileSync(path.join(repository, "CHANGELOG.md"), "utf8")).toBe("Fork releases\n");
    expect(readFileSync(path.join(repository, "docs/RELEASES.md"), "utf8")).toBe("Fork publishing\n");
    expect(git(repository, "show", "-s", "--format=%(trailers:key=Upstream-Sync-Base,valueonly)"))
      .toBe(git(repository, "rev-parse", "main"));
    expect(git(repository, "show", "-s", "--format=%(trailers:key=Upstream-Sync-Release,valueonly)"))
      .toBe(release);
  });

  test.each(["source", "dependency"])("reports a %s conflict for a draft PR without leaving a partial merge", (conflict) => {
    const repository = mkdtempSync(path.join(tmpdir(), "codex-acp-upstream-conflict-"));
    temporaryRepositories.push(repository);
    git(repository, "init", "--initial-branch=main");
    git(repository, "config", "user.name", "Upstream Sync Test");
    git(repository, "config", "user.email", "upstream-sync@example.invalid");
    const metadata = {name: "adapter", version: "1.0.0", dependencies: {alpha: "1.0.0"}};
    writeJson(repository, "package.json", metadata);
    writeJson(repository, "package-lock.json", packageLock(metadata.name, metadata.version, metadata.dependencies));
    write(repository, "src/product.ts", "base\n");
    write(repository, ".github/workflows/publish.yml", "name: Publish\n");
    writeJson(repository, ".release-please-manifest.json", {".": "1.0.0"});
    git(repository, "add", ".");
    git(repository, "commit", "-m", "base");
    const base = git(repository, "rev-parse", "HEAD");

    for (const [branch, version] of [["fork", "1.1.0"], ["upstream", "2.0.0"]] as const) {
      git(repository, "switch", "--create", branch, base);
      if (conflict === "source") write(repository, "src/product.ts", `${branch}\n`);
      else writeJson(repository, "package.json", {...metadata, dependencies: {alpha: version}});
      git(repository, "add", ".");
      git(repository, "commit", "-m", `${branch} changes`);
    }
    const release = git(repository, "rev-parse", "HEAD");
    git(repository, "switch", "fork");
    const fork = git(repository, "rev-parse", "HEAD");
    const result = spawnSync(process.execPath,
      [prepareScript, "--release", release, "--tag", "v2.0.0", "--branch", "shushakov/update"],
      {cwd: repository, encoding: "utf8"});

    expect(result.status, result.stderr).toBe(2);
    expect(result.stderr).toContain('"errorClass":"merge_conflict"');
    expect(git(repository, "rev-parse", "HEAD")).toBe(fork);
    expect(git(repository, "status", "--porcelain")).toBe("");
    expect(spawnSync("git", ["rev-parse", "--verify", "MERGE_HEAD"], {cwd: repository}).status).not.toBe(0);
  });
});
