import {afterEach, describe, expect, it} from "vitest";
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

    it("replays the launch prompt before the child's history", async () => {
        await connect();
        const thread = (id: string) => ({...createThread(), id, parentThreadId: id === worker ? sessionId : null, status: {type: "idle" as const}});
        h.setCodexResponse("thread/resume", async params => ({...codexResponse("thread/start") as object, thread: thread((params as {threadId: string}).threadId)}));
        h.setCodexResponse("thread/read", async params => {
            const id = (params as {threadId: string}).threadId;
            const items: ThreadItem[] = id === sessionId
                ? [userMessageItem("root", "Human words"), collab("spawnAgent", "spawn", "Recorded task")]
                : [{type: "agentMessage", id: "answer", text: "Recorded answer"} as ThreadItem];
            return {thread: {...thread(id), turns: [{...createTurn("completed"), itemsView: "full", items}]}};
        });
        await h.request(version === 1 ? "session/load" : "session/resume", {
            sessionId, cwd, mcpServers: [], ...(version === 2 ? {replayFrom: {type: "start"}} : {}),
        });
        await flush();
        const child = h.scopedUpdates.filter(entry => entry.sessionId === childId).map(entry => entry.update.sessionUpdate);
        expect(texts(childId)).toEqual(["Recorded task"]);
        expect(child.indexOf("session_message")).toBeLessThan(child.findIndex(kind => kind.includes("agent_message")));
    });
});
