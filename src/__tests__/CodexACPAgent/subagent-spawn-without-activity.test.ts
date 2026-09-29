import {expect, it} from "vitest";
import {ACPSessionConnection} from "../../ACPSessionConnection";
import {CodexSubagentEventRouter} from "../../subagents/CodexSubagentEventRouter";
import {createCodexMockTestFixture, createTestSessionState, setupPromptAndSendNotifications} from "../acp-test-utils";

it.each([false, true].flatMap(lateActivity =>
    (["sendInput", "followupTask"] as const).map(tool => ({lateActivity, tool})),
))("routes child history with stale completed state ($tool, late activity: $lateActivity)", async ({lateActivity, tool}) => {
    const fixture = createCodexMockTestFixture();
    const sessionId = "parent";
    await fixture.getCodexAcpAgent().initialize({
        protocolVersion: 1,
        clientCapabilities: {_meta: {openaide: {nativeSubagentSessions: true}}},
    });
    const state = createTestSessionState({sessionId});
    state.subagents = new CodexSubagentEventRouter(sessionId, true,
        new ACPSessionConnection(fixture.getAcpConnection(), sessionId), () => {});
    const spawn = {
        type: "collabAgentToolCall" as const, id: "spawn", tool: "spawnAgent" as const,
        status: "completed" as const, senderThreadId: sessionId, receiverThreadIds: ["child"],
        prompt: "Compute 17 * 19", model: null, reasoningEffort: null,
        agentsStates: {child: {status: "pendingInit" as const, message: null}},
    };
    await setupPromptAndSendNotifications(fixture, sessionId, state, [
        {method: "item/started", params: {threadId: sessionId, turnId: "turn", startedAtMs: 0,
            item: {...spawn, status: "inProgress", receiverThreadIds: [], agentsStates: {}}}},
        {method: "item/completed", params: {threadId: sessionId, turnId: "turn", completedAtMs: 0, item: spawn}},
        ...(lateActivity ? [{method: "item/started" as const, params: {
            threadId: sessionId, turnId: "turn", startedAtMs: 0,
            item: {type: "subAgentActivity" as const, id: "late-path", kind: "started" as const,
                agentThreadId: "child", agentPath: "/root/arithmetic"},
        }}] : []),
        {method: "item/agentMessage/delta", params: {threadId: "child", turnId: "child-turn", itemId: "answer", delta: "323"}},
        {method: "item/completed", params: {threadId: sessionId, turnId: "turn", completedAtMs: 0,
            item: {...spawn, id: "wait", tool: "wait", prompt: null,
                agentsStates: {child: {status: "completed", message: "323"}}}}},
        {method: "item/completed", params: {threadId: sessionId, turnId: "turn", completedAtMs: 0,
            item: {...spawn, id: "followup", tool, prompt: "Compute 7 * 11",
                agentsStates: {child: {status: "completed", message: "323"}}}}},
        {method: "item/agentMessage/delta", params: {threadId: "child", turnId: "followup-turn", itemId: "followup-answer", delta: "77"}},
        {method: "item/completed", params: {threadId: sessionId, turnId: "turn", completedAtMs: 0,
            item: {...spawn, id: "followup-wait", tool: "wait", prompt: null,
                agentsStates: {child: {status: "completed", message: "77"}}}}},
    ]);
    const updates = fixture.getAcpConnectionEvents([])
        .filter(event => event.method === "sessionUpdate").map(event => event.args[0]);
    const childLifecycle = updates.filter(event => event.update.subagentSessionId === "child"
        || event.sessionId === "child");
    expect(childLifecycle.map(event => [event.sessionId, event.update.sessionUpdate])).toEqual([
        [sessionId, "subagent_spawned"],
        ["child", "user_message_chunk"],
        ["child", "agent_message_chunk"],
        [sessionId, "subagent_state_update"],
        [sessionId, "subagent_spawned"],
        ["child", "user_message_chunk"],
        ["child", "agent_message_chunk"],
        [sessionId, "subagent_state_update"],
    ]);
    expect(childLifecycle[2].update.content.text).toBe("323");
    expect(childLifecycle[3].update.state).toBe("completed");
    expect(childLifecycle[6].update.content.text).toBe("77");
    expect(childLifecycle[7].update.state).toBe("completed");
});
