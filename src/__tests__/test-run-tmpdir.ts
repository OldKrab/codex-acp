import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * Vitest global setup: gives the whole run one temporary directory and removes it at the end.
 * Per-test cleanup misses directories when Codex outlives its fixture or is still cloning plugins.
 */
export default function setup(): () => void {
    const previousTmpdir = process.env["TMPDIR"];
    const runDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "codex-acp-test-run-"));
    process.env["TMPDIR"] = runDirectory;

    return () => {
        if (previousTmpdir === undefined) {
            delete process.env["TMPDIR"];
        } else {
            process.env["TMPDIR"] = previousTmpdir;
        }
        try {
            fs.rmSync(runDirectory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
        } catch (error) {
            console.warn(`Failed to remove test run directory ${runDirectory}:`, error);
        }
    };
}
