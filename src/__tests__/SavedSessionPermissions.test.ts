import {mkdtemp, rm, writeFile} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {afterEach, describe, expect, it} from "vitest";
import {AgentMode} from "../AgentMode";
import {classifySavedPolicy, readSavedPermissions} from "../SavedSessionPermissions";

const root = "/work/project";
const special = (kind: string, access: string) => ({path: {type: "special", value: {kind}}, access});
const literal = (target: string, access: string, skip = false) => ({
    path: {type: "path", path: target}, access, ...(skip ? {missing_path_behavior: "skip"} : {}),
});
const managed = (entries: unknown[], network = "restricted") => ({
    permission_profile: {type: "managed", network, file_system: {type: "restricted", entries}},
});
/** The shape native records for a legacy workspace-write session, duplicates included. */
const workspaceEntries = (roots: string[]) => [
    special("root", "read"), special("tmpdir", "write"), special("slash_tmp", "write"),
    ...roots.flatMap(writable => [
        literal(writable, "write"),
        ...[".git", ".git", ".agents", ".codex", ".codex", ".aws"].map(name => literal(path.join(writable, name), "read", true)),
    ]),
];

describe("classifySavedPolicy", () => {
    it("lets native restore a session saved with a named profile", () => {
        expect(classifySavedPolicy({active_permission_profile: {id: "dev"}, ...managed([])})).toEqual({kind: "native", profileId: "dev"});
    });

    it.each([
        ["full access", {permission_profile: {type: "disabled"}}, ":danger-full-access"],
        ["read-only", managed([special("root", "read")]), ":read-only"],
        ["workspace", managed(workspaceEntries([root])), ":workspace"],
        ["workspace with an extra root", managed(workspaceEntries([root, "/work/extra"])), ":workspace"],
        ["workspace with a worktree's git directory", managed([
            ...workspaceEntries([root]), literal("/work/main/.git/worktrees/project", "read", true),
        ]), ":workspace"],
        ["legacy read-only", {sandbox_policy: {type: "read-only"}}, ":read-only"],
        ["legacy workspace", {sandbox_policy: {type: "workspace-write", writable_roots: [], network_access: false}}, ":workspace"],
        ["legacy full access", {sandbox_policy: {type: "danger-full-access"}}, ":danger-full-access"],
    ])("names the built-in profile equal to a saved %s policy", (_name, settings, profile) => {
        expect(classifySavedPolicy(settings)).toEqual({kind: "preset", profile});
    });

    it.each([
        ["network access", managed(workspaceEntries([root]), "enabled")],
        ["no temporary-directory write", managed(workspaceEntries([root]).filter(entry => entry.path.type !== "special"
            || (entry.path as {value: {kind: string}}).value.kind !== "tmpdir"))],
        ["a custom protected path in the workspace", managed([...workspaceEntries([root]), literal(`${root}/secrets`, "read", true)])],
        ["a denied path", managed([...workspaceEntries([root]), literal(`${root}/private`, "deny")])],
        ["a write outside the special roots without root read", managed([literal(root, "write")])],
        ["a glob rule", managed([special("root", "read"), {path: {type: "glob_pattern", pattern: "/work/*.key"}, access: "deny"}])],
        ["legacy network access", {sandbox_policy: {type: "workspace-write", network_access: true}}],
        ["legacy temporary-directory exclusion", {sandbox_policy: {type: "workspace-write", exclude_slash_tmp: true}}],
        ["an external sandbox", {permission_profile: {type: "external"}}],
    ])("refuses a policy with %s rather than rounding it", (_name, settings) => {
        expect(() => classifySavedPolicy(settings)).toThrow("Cannot safely restore this session's permissions");
    });
});

describe("readSavedPermissions", () => {
    const threadId = "thread-1";
    let directory: string | undefined;
    afterEach(async () => {
        if (directory) await rm(directory, {recursive: true, force: true});
        directory = undefined;
    });
    async function history(lines: unknown[]): Promise<string> {
        directory = await mkdtemp(path.join(os.tmpdir(), "saved-permissions-"));
        const file = path.join(directory, "rollout.jsonl");
        await writeFile(file, lines.map(line => typeof line === "string" ? line : JSON.stringify(line)).join("\n") + "\n");
        return file;
    }
    const meta = {type: "session_meta", payload: {id: threadId}};
    const turn = (settings: object) => ({type: "turn_context", payload: settings});
    const applied = (settings: object, owner: string | null = threadId) => ({
        type: "event_msg", payload: {type: "thread_settings_applied", thread_id: owner, thread_settings: settings},
    });

    it("reports nothing saved for a thread that was never prompted", async () => {
        directory = await mkdtemp(path.join(os.tmpdir(), "saved-permissions-"));
        await expect(readSavedPermissions(path.join(directory, "missing.jsonl"), threadId)).resolves.toEqual({kind: "none"});
        expect(await readSavedPermissions(await history([meta]), threadId)).toEqual({kind: "none"});
    });

    it("uses the latest settings this thread recorded", async () => {
        const file = await history([meta, turn(managed(workspaceEntries([root]))), applied(managed([special("root", "read")]))]);
        expect(await readSavedPermissions(file, threadId)).toEqual({kind: "preset", profile: ":read-only"});
    });

    it("ignores settings a fork copied from its parent", async () => {
        const file = await history([meta, turn(managed([special("root", "read")])), applied({permission_profile: {type: "disabled"}}, "parent")]);
        expect(await readSavedPermissions(file, threadId)).toEqual({kind: "preset", profile: ":read-only"});
    });

    it("refuses a damaged record unless a later complete turn context follows it", async () => {
        const damaged = await history([meta, turn(managed([special("root", "read")])), "{damaged", applied({permission_profile: {type: "disabled"}})]);
        await expect(readSavedPermissions(damaged, threadId)).rejects.toThrow("Cannot safely restore");
        const recovered = await history([meta, "{damaged", turn(managed([special("root", "read")]))]);
        expect(await readSavedPermissions(recovered, threadId)).toEqual({kind: "preset", profile: ":read-only"});
    });
});

describe("AgentMode.forResumedSession", () => {
    const modes = AgentMode.all();

    it.each([
        [":read-only", "on-request", "user", "read-only"],
        [":workspace", "on-request", "user", "workspace-write"],
        [":workspace", "on-request", "auto_review", "agent"],
        [":danger-full-access", "never", "user", "agent-full-access"],
    ] as const)("continues %s with %s/%s in the equal preset", (profile, approvalPolicy, approvalsReviewer, modeId) => {
        const {agentMode, availableAgentModes} = AgentMode.forResumedSession(modes, profile, {approvalPolicy, approvalsReviewer});
        expect(agentMode.id).toBe(modeId);
        expect(availableAgentModes).toBe(modes);
    });

    it("keeps a saved policy no preset equals in a mode of its own", () => {
        const {agentMode, availableAgentModes} = AgentMode.forResumedSession(
            modes, ":workspace", {approvalPolicy: "never", approvalsReviewer: "user"},
        );
        expect(agentMode).toMatchObject({
            id: "session-policy", approvalPolicy: "never", approvalsReviewer: "user", sandboxMode: "workspace-write",
            sandboxPolicy: AgentMode.WorkspaceWrite.sandboxPolicy,
        });
        expect(availableAgentModes.map(mode => mode.id)).toEqual([...modes.map(mode => mode.id), "session-policy"]);
    });

    it("keeps the initial mode when nothing was restored", () => {
        expect(AgentMode.forResumedSession(modes, null, undefined).agentMode).toBe(AgentMode.DEFAULT_AGENT_MODE);
    });
});
