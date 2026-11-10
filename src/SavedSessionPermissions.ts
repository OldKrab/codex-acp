import {createReadStream} from "node:fs";
import {stat} from "node:fs/promises";
import path from "node:path";
import {createInterface} from "node:readline";
import {RequestError} from "@agentclientprotocol/sdk/unstable";
import {logger} from "./Logger";

/** Native Codex's built-in named permission profiles. */
export type BuiltInPermissionProfile = ":read-only" | ":workspace" | ":danger-full-access";

/**
 * What a resume must do to keep the permissions a session was saved with.
 *
 * - `none`: nothing was saved yet; the adapter's ordinary initial mode applies.
 * - `native`: the session saved a named profile, which native resume restores by itself
 *   when that profile still exists; the caller must check that it did.
 * - `preset`: the session saved an unnamed policy equal to a built-in profile; resume must name it.
 */
export type SavedPermissions =
    | {kind: "none"}
    | {kind: "native", profileId: string}
    | {kind: "preset", profile: BuiltInPermissionProfile};

/**
 * Why this module exists: native Codex (0.166) restores a resumed session's named
 * permission profile, approval policy and reviewer, but discards a saved *unnamed*
 * profile that grants read access to a concrete path. Every workspace-write session
 * has such paths (native protects `.git`, `.agents`, `.codex` and `.aws` read-only),
 * so it falls back to the current config, which can be broader than the session's
 * own policy. The adapter's modes send unnamed policies, so all of its sessions are
 * affected. Naming the equal built-in profile on resume restores the exact policy.
 *
 * TODO(codex-native-resume): drop this when native resume restores saved unnamed
 * workspace policies itself.
 */
export async function readSavedPermissions(historyPath: string, threadId: string): Promise<SavedPermissions> {
    const started = Date.now();
    const fields = {operation: "codex.saved_permissions_read", threadId};
    logger.log("Saved permissions read started", fields);
    let records = 0;
    let malformedRecords = 0;
    try {
        // A thread reports its planned history path before its first prompt writes it.
        const file = await stat(historyPath).catch((error: NodeJS.ErrnoException) => {
            if (error.code === "ENOENT") return null;
            throw error;
        });
        if (file === null) {
            logger.log("Saved permissions read completed", {
                ...fields, outcome: "success", result: "none", records, malformedRecords, durationMs: Date.now() - started,
            });
            return {kind: "none"};
        }
        if (!file.isFile()) throw unsupported();
        let latest: HistoryObject | undefined;
        // A damaged record cannot authorize falling back to an older policy; only a
        // later complete turn context establishes the policy again.
        let damaged = false;
        const lines = createInterface({input: createReadStream(historyPath, "utf8"), crlfDelay: Infinity});
        for await (const line of lines) {
            if (!line.trim()) continue;
            records += 1;
            let entry: unknown;
            try {
                entry = JSON.parse(line);
            } catch {
                malformedRecords += 1;
                damaged = true;
                latest = undefined;
                continue;
            }
            const policy = policyRecord(entry, threadId);
            if (policy === undefined) continue;
            latest = policy.settings;
            if (policy.complete) damaged = false;
        }
        if (damaged) throw unsupported();
        const result = latest === undefined ? {kind: "none" as const} : classifySavedPolicy(latest);
        logger.log("Saved permissions read completed", {
            ...fields, outcome: "success", result: result.kind, profile: result.kind === "preset" ? result.profile : null,
            records, malformedRecords, durationMs: Date.now() - started,
        });
        return result;
    } catch (error) {
        logger.log("Saved permissions read completed", {
            ...fields, outcome: "failure", records, malformedRecords, durationMs: Date.now() - started,
            errorCode: error instanceof RequestError ? "unsupported_permissions" : "history_unreadable",
        });
        throw error instanceof RequestError ? error : unsupported();
    }
}

/** The permission settings an entry records for this thread, if it records any. */
function policyRecord(entry: unknown, threadId: string): {settings: HistoryObject, complete: boolean} | undefined {
    if (!isRecord(entry) || !isRecord(entry.payload)) return undefined;
    const payload = entry.payload;
    if (entry.type === "turn_context") {
        return {settings: payload, complete: payload.permission_profile !== undefined || payload.sandbox_policy !== undefined};
    }
    if (entry.type === "event_msg" && payload.type === "thread_settings_applied" && isRecord(payload.thread_settings)) {
        // A fork copies its parent's history; the parent's settings are not this thread's.
        if (payload.thread_id != null && payload.thread_id !== threadId) return undefined;
        return {settings: payload.thread_settings, complete: false};
    }
    return undefined;
}

/** Map a saved policy to what resume must do, refusing anything it cannot restore exactly. */
export function classifySavedPolicy(settings: HistoryObject): SavedPermissions {
    const active = settings.active_permission_profile;
    if (active != null) {
        if (!isRecord(active) || typeof active.id !== "string") throw unsupported();
        return {kind: "native", profileId: active.id};
    }
    const profile = settings.permission_profile;
    if (profile === undefined) return classifyLegacy(settings.sandbox_policy);
    if (!isRecord(profile)) throw unsupported();
    if (profile.type === "disabled") return {kind: "preset", profile: ":danger-full-access"};
    if (profile.type !== "managed" || profile.network !== "restricted") throw unsupported();
    const fileSystem = profile.file_system;
    if (!isRecord(fileSystem) || fileSystem.type !== "restricted" || !Array.isArray(fileSystem.entries)) throw unsupported();
    if (fileSystem.glob_scan_max_depth !== undefined) throw unsupported();

    let rootRead = false;
    const temporaryWrites = new Set<string>();
    const writeRoots = new Set<string>();
    const protectedPaths = new Set<string>();
    for (const entry of fileSystem.entries) {
        if (!isRecord(entry) || !isRecord(entry.path)) throw unsupported();
        const target = entry.path;
        const skipMissing = entry.missing_path_behavior === "skip";
        if (entry.missing_path_behavior !== undefined && !skipMissing) throw unsupported();
        if (target.type === "special" && isRecord(target.value) && target.value.subpath === undefined && !skipMissing) {
            const kind = target.value.kind;
            if (kind === "root" && entry.access === "read") rootRead = true;
            else if ((kind === "tmpdir" || kind === "slash_tmp") && entry.access === "write") temporaryWrites.add(kind);
            else throw unsupported();
        } else if (target.type === "path" && isLiteralPath(target.path)) {
            if (entry.access === "write" && !skipMissing) writeRoots.add(target.path);
            else if (entry.access === "read" && skipMissing) protectedPaths.add(target.path);
            else throw unsupported();
        } else {
            throw unsupported();
        }
    }
    if (!rootRead) throw unsupported();
    if (writeRoots.size === 0 && temporaryWrites.size === 0 && protectedPaths.size === 0) {
        return {kind: "preset", profile: ":read-only"};
    }
    // The built-in workspace profile writes both temporary directories and protects
    // these names in every writable root. A saved policy is equal only when it has no
    // other rule that the built-in profile would drop.
    if (writeRoots.size === 0 || temporaryWrites.size !== 2) throw unsupported();
    for (const protectedPath of protectedPaths) {
        const root = [...writeRoots].find(writeRoot => path.dirname(protectedPath) === writeRoot);
        // A read-only rule outside every writable root changes nothing: that path is
        // only readable anyway. Inside a root, only the built-in protections are known.
        if (root !== undefined && !BUILT_IN_PROTECTED_NAMES.has(path.basename(protectedPath))) throw unsupported();
        if (root === undefined && [...writeRoots].some(writeRoot => isInside(protectedPath, writeRoot))) throw unsupported();
    }
    return {kind: "preset", profile: ":workspace"};
}

const BUILT_IN_PROTECTED_NAMES = new Set([".git", ".agents", ".codex", ".aws"]);

/** Turn contexts written before permission profiles carry only the legacy sandbox enum. */
function classifyLegacy(policy: unknown): SavedPermissions {
    if (!isRecord(policy)) throw unsupported();
    if (policy.type === "danger-full-access") return {kind: "preset", profile: ":danger-full-access"};
    if (policy.network_access === true) throw unsupported();
    if (policy.type === "read-only") return {kind: "preset", profile: ":read-only"};
    if (policy.type === "workspace-write" && policy.exclude_tmpdir_env_var !== true && policy.exclude_slash_tmp !== true) {
        return {kind: "preset", profile: ":workspace"};
    }
    throw unsupported();
}

function isInside(candidate: string, root: string): boolean {
    const relative = path.relative(root, candidate);
    return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

function isLiteralPath(value: unknown): value is string {
    return typeof value === "string" && path.isAbsolute(value) && !/[*?[\]\0]/.test(value);
}

/** A JSON object from native history, naming only the fields this module reads. */
interface HistoryObject {
    [key: string]: unknown;
    type?: unknown; payload?: unknown; thread_id?: unknown; thread_settings?: unknown;
    active_permission_profile?: unknown; permission_profile?: unknown; sandbox_policy?: unknown;
    network?: unknown; file_system?: unknown; entries?: unknown; glob_scan_max_depth?: unknown;
    id?: unknown; path?: unknown; value?: unknown; kind?: unknown; subpath?: unknown; access?: unknown;
    missing_path_behavior?: unknown; network_access?: unknown;
    exclude_tmpdir_env_var?: unknown; exclude_slash_tmp?: unknown;
}

function isRecord(value: unknown): value is HistoryObject {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function unsupported(): RequestError {
    return RequestError.invalidRequest(
        undefined,
        "Cannot safely restore this session's permissions. Choose a built-in permission mode for it in Codex, then reopen it.",
    );
}
