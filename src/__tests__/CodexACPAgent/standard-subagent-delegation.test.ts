import {afterEach, describe, expect, it, vi} from "vitest";
import type {ServerNotification} from "../../app-server";
import type {ThreadItem} from "../../app-server/v2";
import {
    agentMessageDelta, codexResponse, connectSession, createThread, createTurn, cwd, itemCompleted, itemStarted,
    sessionId, turnCompleted, turnStarted, userMessageItem, type PromptSession,
} from "./v2-prompt-harness";
import {expectConformingV2SessionUpdates} from "./v2-session-update-guard";

const worker = "worker";
const childId = `${sessionId}:subagent:${worker}`;
const secondId = `${sessionId}:subagent:second`;
type Collab = Extract<ThreadItem, {type: "collabAgentToolCall"}>;
const collab = (tool: Collab["tool"], id: string, prompt: string | null, overrides: Partial<Collab> = {}): Collab =>
    ({type: "collabAgentToolCall", id, tool, status: "completed", senderThreadId: sessionId, receiverThreadIds: [worker],
        prompt, model: null, reasoningEffort: null, agentsStates: {}, ...overrides});
const activity = (id: string, kind: "started" | "interacted" | "completed", thread = worker): ThreadItem =>
    ({type: "subAgentActivity", id, kind, model: null, reasoningEffort: null, agentThreadId: thread, agentPath: `/root/${thread}`});
const answer = (id: string, text: string) => ({type: "agentMessage", id, text} as ThreadItem);
const delegated = (id: string, text: string): ThreadItem => ({...userMessageItem(null, text), id});
const onWorker = (event: ServerNotification): ServerNotification =>
    ({...event, params: {...event.params, threadId: worker}} as ServerNotification);

describe.each([1, 2] as const)("ACP v%s delegated prompts", version => {
    let h: PromptSession;
    afterEach(async () => {
        if (h) { await flush(); h.connection.close(); }
        expectConformingV2SessionUpdates();
    });
    async function flush() {
        await h.waitForNotifications();
        await h.request("session/list", {});
    }
    const connect = async () => { h = await connectSession(version, {v1ClientCapabilities: {subagents: {}}}); };
    const messages = (session: string) => h.scopedUpdates
        .filter(entry => entry.sessionId === session && entry.update.sessionUpdate === "session_message")
        .map(entry => entry.update as {content: Array<{text: string}>; senderSessionId: string; recipientSessionId: string; messageId: string});
    const texts = (session: string) => messages(session).map(message => message.content[0]?.text);
    const gap = () => h.scopedUpdates.filter(entry => entry.update.sessionUpdate === "agent_thought_chunk"
        && entry.update.messageId === `${sessionId}:subagent-history-gap`);
    const childOrder = () => h.scopedUpdates.filter(entry => entry.sessionId === childId).flatMap(({update}) =>
        update.sessionUpdate === "session_message" ? [(update.content as Array<{text: string}>)[0]!.text]
            : update.sessionUpdate === "agent_message_chunk" ? [(update.content as {text: string}).text] : []);

    const titles = () => h.scopedUpdates.flatMap(({update}) => update.sessionUpdate === "subagent_update"
        && (update as {title?: string}).title !== undefined ? [(update as {title?: string}).title] : []);
    const readableNickname = (agentNickname: string) => h.setCodexResponse("thread/read", async params => ({thread: {
        ...createThread(), id: (params as {threadId: string}).threadId, parentThreadId: sessionId, agentNickname,
        status: {type: "idle" as const}, turns: [],
    }}));

    it("names a child with no path after its thread's nickname", async () => {
        await connect();
        readableNickname("Cicero");
        h.emit(itemCompleted(collab("spawnAgent", "spawn", "Work")));
        await vi.waitFor(() => expect(titles()).toEqual(["Cicero"]));
    });

    it("keeps the name from an agent path over the nickname", async () => {
        await connect();
        readableNickname("Cicero");
        h.emit(itemStarted(activity("one", "started")));
        await flush();
        await h.waitForNotifications();
        expect(titles()).toEqual(["Worker"]);
    });

    it("announces a spawn with no activity item and opens the child with its prompt", async () => {
        await connect();
        const spawn = collab("spawnAgent", "spawn", "Compute 17 * 19");
        h.emit(itemStarted({...spawn, status: "inProgress", receiverThreadIds: []}));
        h.emit(itemCompleted(spawn));
        h.emit(onWorker(turnStarted("child-turn")));
        h.emit(onWorker(agentMessageDelta("323", "child-turn", "answer")));
        h.emit(onWorker(turnCompleted("child-turn")));
        await flush();
        const child = h.scopedUpdates.filter(entry => entry.sessionId === childId).map(entry => entry.update.sessionUpdate);
        expect(child.indexOf("session_message")).toBeGreaterThanOrEqual(0);
        expect(child.indexOf("session_message")).toBeLessThan(child.indexOf("agent_message_chunk"));
        // The spawn call has no Tool row, so the parent's view is what shows the delegation.
        const [outgoing] = messages(sessionId);
        const [incoming] = messages(childId);
        expect(outgoing).toMatchObject({senderSessionId: sessionId, recipientSessionId: childId, recipientMessageId: outgoing!.messageId});
        expect(incoming).toMatchObject({senderSessionId: sessionId, recipientSessionId: childId, senderMessageId: outgoing!.messageId});
        expect(texts(childId)).toEqual(["Compute 17 * 19"]);
    });

    it("waits for a late parent before publishing a buffered spawn's prompt", async () => {
        await connect();
        h.emit(itemCompleted(collab("spawnAgent", "nested", "Inner task", {senderThreadId: "middle", receiverThreadIds: ["inner"]})));
        await flush();
        expect(h.scopedUpdates.some(entry => entry.update.sessionUpdate === "session_message")).toBe(false);
        h.emit(itemCompleted(collab("spawnAgent", "outer", "Outer task", {receiverThreadIds: ["middle"]})));
        await flush();
        // The middle child also holds its own outgoing view of the inner launch.
        expect(texts(`${sessionId}:subagent:middle`)).toEqual(["Outer task", "Inner task"]);
        expect(texts(`${sessionId}:subagent:inner`)).toEqual(["Inner task"]);
    });

    it.each(["sendInput", "followupTask"] as const)("appends a %s prompt to the same child and leaves its Tool row", async tool => {
        await connect();
        h.emit(itemCompleted(collab("spawnAgent", "spawn", "First")));
        h.emit(itemCompleted(collab(tool, "again", "Second")));
        h.emit(itemCompleted(collab(tool, "refused", "Third", {status: "failed"})));
        await flush();
        expect(texts(childId)).toEqual(["First", "Second"]);
        expect(texts(sessionId)).toEqual(["First"]);
        expect(h.scopedUpdates.filter(entry => entry.update.sessionUpdate === "subagent_update"
            && (entry.update as {title?: string}).title !== undefined)).toHaveLength(0);
    });

    it("names a replayed child after its thread's nickname", async () => {
        await connect();
        recordHistory(undefined, undefined, "Cicero");
        await load();
        expect(titles()).toEqual(["Cicero"]);
    });

    it("keeps the path name of a child restored after the session closed", async () => {
        await connect();
        h.emit(itemStarted(activity("one", "started")));
        await flush();
        await h.request("session/close", {sessionId});
        recordHistory(undefined, [activity("one", "started")], "Cicero");
        await load();
        expect(titles()).not.toContain("Cicero");
    });

    it("titles a control tool for the reader, except the names clients match", async () => {
        await connect();
        h.emit(itemCompleted(collab("spawnAgent", "spawn", "First")));
        for (const [tool, id] of [["sendInput", "send"], ["followupTask", "follow"], ["resumeAgent", "resume"],
            ["closeAgent", "close"], ["wait", "wait"]] as const) {
            h.emit(itemStarted(collab(tool, id, null, {status: "inProgress"})));
            h.emit(itemCompleted(collab(tool, id, null)));
        }
        await flush();
        // ACP v2 reports a new row as a `tool_call_update`.
        const rows = h.scopedUpdates.flatMap(({update}) =>
            (update.sessionUpdate === "tool_call" || update.sessionUpdate === "tool_call_update") && update.title ? [update.title] : []);
        expect(rows).toEqual(["Send message to agent", "Send follow-up task to agent", "Resume agent", "Close agent", "wait"]);
    });

    it("opens every activity-only child once with the root prompt that caused it", async () => {
        await connect();
        h.emit(itemStarted(userMessageItem("root", "Check both")));
        h.emit(itemStarted(activity("one", "started")));
        h.emit(itemCompleted(activity("one", "started")));
        h.emit(itemStarted(activity("two", "started", "second")));
        h.emit(itemStarted(activity("three", "completed")));
        await flush();
        expect(texts(childId)).toEqual(["Check both"]);
        expect(texts(secondId)).toEqual(["Check both"]);
        h.emit(turnCompleted());
        h.emit(turnStarted("turn-2"));
        h.emit(itemStarted({...userMessageItem("root-2", "Again"), id: "user-2"}, "turn-2"));
        h.emit(itemStarted(activity("four", "interacted"), "turn-2"));
        await flush();
        expect(texts(childId)).toEqual(["Check both", "Again"]);
    });

    it("does not replace an exact prompt with the root prompt", async () => {
        await connect();
        h.emit(itemStarted(userMessageItem("root", "Human words")));
        h.emit(itemCompleted(collab("spawnAgent", "spawn", "Exact words")));
        h.emit(itemStarted(activity("one", "started")));
        await flush();
        expect(texts(childId)).toEqual(["Exact words"]);
    });

    function recordHistory(
        childItems: ThreadItem[] = [answer("answer", "Recorded answer")],
        rootItems: ThreadItem[] = [userMessageItem("root", "Human words"), collab("spawnAgent", "spawn", "Recorded task")],
        nickname: string | null = null,
    ) {
        const thread = (id: string) => ({...createThread(), id, parentThreadId: id === worker ? sessionId : null, status: {type: "idle" as const},
            agentNickname: id === worker ? nickname : null});
        h.setCodexResponse("thread/resume", async params => ({...codexResponse("thread/start") as object, thread: thread((params as {threadId: string}).threadId)}));
        h.setCodexResponse("thread/read", async params => {
            const id = (params as {threadId: string}).threadId;
            const items = id === sessionId ? rootItems : childItems;
            return {thread: {...thread(id), turns: [{...createTurn("completed"), itemsView: "full", items}]}};
        });
    }
    const load = async () => {
        await h.request(version === 1 ? "session/load" : "session/resume", {
            sessionId, cwd, mcpServers: [], ...(version === 2 ? {replayFrom: {type: "start"}} : {}),
        });
        await flush();
    };

    it("replays the launch prompt before the child's history", async () => {
        await connect();
        recordHistory();
        await load();
        const child = h.scopedUpdates.filter(entry => entry.sessionId === childId).map(entry => entry.update.sessionUpdate);
        expect(texts(childId)).toEqual(["Recorded task"]);
        expect(child.indexOf("session_message")).toBeLessThan(child.findIndex(kind => kind.includes("agent_message")));
    });

    it("opens an activity-only child with the root prompt on replay", async () => {
        await connect();
        recordHistory([answer("answer", "Recorded answer")],
            [userMessageItem("root", "Human words"), activity("one", "started"), activity("two", "completed")]);
        await load();
        expect(texts(sessionId)).toEqual(["Human words"]);
        expect(childOrder()).toEqual(["Human words", "Recorded answer"]);
        expect(gap()).toEqual([]);
    });

    // Real multi-agent v2 history: the root has activity items and no spawn, the child has no input of its own.
    function recordTurns(
        childTurns: Array<[number | null, ThreadItem[]]>,
        rootTurns: Array<[number | null, ThreadItem[]]> = [
            [100, [userMessageItem("root", "First"), activity("one", "started")]],
            [200, [{...userMessageItem("root-2", "Again"), id: "user-2"}, activity("two", "interacted")]],
        ],
        childHistoryMode: "legacy" | "paginated" = "legacy",
    ) {
        const thread = (id: string) => ({...createThread(), id, parentThreadId: id === worker ? sessionId : null,
            status: {type: "idle" as const}, turns: [], historyMode: id === worker ? childHistoryMode : "legacy" as const});
        const turns = (records: typeof childTurns, prefix: string) => records.map(([startedAt, items], index) =>
            ({...createTurn("completed"), id: `${prefix}-${index}`, startedAt, itemsView: "full" as const, items}));
        h.setCodexResponse("thread/resume", async params =>
            ({...codexResponse("thread/start") as object, thread: thread((params as {threadId: string}).threadId)}));
        h.setCodexResponse("thread/read", async params => {
            const id = (params as {threadId: string}).threadId;
            return {thread: {...thread(id), turns: id === sessionId ? turns(rootTurns, "root-turn") : turns(childTurns, "child-turn")}};
        });
    }

    it("replays a later root prompt before the child turn that followed it", async () => {
        await connect();
        recordTurns([[110, [answer("a1", "One")]], [210, [answer("a2", "Two")]]]);
        await load();
        expect(childOrder()).toEqual(["First", "One", "Again", "Two"]);
        expect(gap()).toEqual([]);
    });

    it("keeps a child turn whole when a root prompt arrived during it", async () => {
        await connect();
        recordTurns([[110, [answer("a1", "One"), answer("a2", "Two")]]]);
        await load();
        expect(childOrder()).toEqual(["First", "One", "Two", "Again"]);
    });

    it("places several prompts between the turns they fall between", async () => {
        await connect();
        recordTurns([[110, [answer("a1", "One")]], [120, [answer("a2", "Two")]], [310, [answer("a3", "Three")]]], [
            [100, [userMessageItem("root", "First"), activity("one", "started")]],
            [200, [{...userMessageItem("root-2", "Again"), id: "user-2"}, activity("two", "interacted"), activity("three", "interacted")]],
            [300, [{...userMessageItem("root-3", "Third"), id: "user-3"}, activity("four", "interacted")]],
        ]);
        await load();
        expect(childOrder()).toEqual(["First", "One", "Two", "Again", "Third", "Three"]);
    });

    it.each([[null, 210], [200, null]] as const)("loses no history when the recorded times are missing (%s, %s)", async (root, child) => {
        await connect();
        recordTurns([[110, [answer("a1", "One")]], [child, [answer("a2", "Two")]]], [
            [100, [userMessageItem("root", "First"), activity("one", "started")]],
            [root, [{...userMessageItem("root-2", "Again"), id: "user-2"}, activity("two", "interacted")]],
        ]);
        await load();
        expect(childOrder()).toEqual(["First", "One", "Two", "Again"]);
    });

    /** Pages of one recorded item each, with a read observer: the root's second prompt is at 200 seconds. */
    function recordPages(onPage: (cursor: string | null) => Promise<void>) {
        recordTurns([], undefined, "paginated");
        const page = (id: string, text: string, startedAtMs: number) =>
            ({item: answer(id, text), turnId: "child-turn", startedAtMs, completedAtMs: startedAtMs + 1});
        const pages = [page("a1", "One", 110_000), page("a2", "Two", 210_000), page("a3", "Three", 220_000), page("a4", "Four", 230_000)];
        h.setCodexResponse("thread/items/list", async params => {
            const {sortDirection, cursor} = params as {sortDirection: string; cursor: string | null};
            if (sortDirection === "desc") return {data: [pages.at(-1)], nextCursor: null, backwardsCursor: null};
            await onPage(cursor);
            const index = Number(cursor ?? 0);
            return {data: [pages[index]], nextCursor: index < pages.length - 1 ? String(index + 1) : null, backwardsCursor: null};
        });
        h.setCodexResponse("thread/turns/list", async () => ({data: []}));
    }

    it("reads a held child no further than one page ahead of the root", async () => {
        await connect();
        const seenAtLastPage: string[] = [];
        recordPages(async cursor => { if (cursor === "3") seenAtLastPage.push(...childOrder()); });
        await load();
        expect(seenAtLastPage).toEqual(["First", "One", "Again", "Two"]);
        expect(childOrder()).toEqual(["First", "One", "Again", "Two", "Three", "Four"]);
        expect(gap()).toEqual([]);
    });

    it("publishes nothing from a held child after the parent closes", async () => {
        await connect();
        let release!: () => void;
        const closed = new Promise<void>(resolve => { release = resolve; });
        let reading = false;
        recordPages(async cursor => { if (cursor === "2") { reading = true; await closed; } });
        const replay = h.request(version === 1 ? "session/load" : "session/resume", {
            sessionId, cwd, mcpServers: [], ...(version === 2 ? {replayFrom: {type: "start"}} : {}),
        });
        void replay.catch(() => {});
        try {
            await vi.waitFor(() => expect(reading).toBe(true));
            await h.request("session/close", {sessionId});
            release();
            await expect(replay).rejects.toMatchObject({code: -32600});
            expect(childOrder()).not.toContain("Three");
        } finally { release(); }
    });

    it("does not repeat or report the launch prompt a child recorded in its own history", async () => {
        await connect();
        recordHistory([delegated("launch", "Recorded task"), answer("answer", "Recorded answer")]);
        await load();
        expect(texts(sessionId)).toEqual(["Recorded task"]);
        expect(texts(childId)).toEqual(["Recorded task"]);
        expect(gap()).toEqual([]);
    });

    it("replays a later prompt in place, without a second row in the parent", async () => {
        await connect();
        recordHistory([delegated("launch", "Recorded task"), answer("one", "First answer"),
            delegated("again", "Second task"), answer("two", "Second answer")]);
        await load();
        expect(childOrder()).toEqual(["Recorded task", "First answer", "Second task", "Second answer"]);
        expect(texts(sessionId)).toEqual(["Recorded task"]);
        expect(gap()).toEqual([]);
    });

    it("keeps a later prompt that repeats the launch words", async () => {
        await connect();
        recordHistory([delegated("launch", "Recorded task"), answer("one", "First answer"), delegated("again", "Recorded task")]);
        await load();
        expect(childOrder()).toEqual(["Recorded task", "First answer", "Recorded task"]);
    });

    it("replays history a forked child inherited before its launch prompt", async () => {
        await connect();
        recordHistory([delegated("inherited", "Human words"), delegated("launch", "Recorded task"), answer("answer", "Recorded answer")]);
        await load();
        expect(childOrder()).toEqual(["Recorded task", "Human words", "Recorded answer"]);
        expect(gap()).toEqual([]);
    });

    it("reports a gap for delegated input with no text to show", async () => {
        await connect();
        recordHistory([{...userMessageItem(null), id: "picture", content: [{type: "image", url: "data:image/png;base64,AA"}]} as ThreadItem]);
        await load();
        expect(gap()).toHaveLength(1);
    });

    it("repeats the launch prompt each time a live session reloads, without repeating it live", async () => {
        await connect();
        recordHistory();
        await load();
        await load();
        expect(texts(sessionId)).toEqual(["Recorded task", "Recorded task"]);
        expect(texts(childId)).toEqual(["Recorded task", "Recorded task"]);
        h.emit(itemCompleted(collab("spawnAgent", "spawn", "Recorded task")));
        await flush();
        expect(texts(childId)).toEqual(["Recorded task", "Recorded task"]);
    });
});
