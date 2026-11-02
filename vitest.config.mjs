import {configDefaults, defineConfig} from "vitest/config";

export default defineConfig({
    test: {
        globalSetup: ["./src/__tests__/test-run-tmpdir.ts"],
        // Codex fixtures can download plugins with their own tests outside these owned directories.
        include: configDefaults.include.flatMap(pattern => [
            `src/__tests__/${pattern}`,
            `scripts/${pattern}`,
        ]),
    },
});
