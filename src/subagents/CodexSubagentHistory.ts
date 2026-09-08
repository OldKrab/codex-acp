import type {Thread, ThreadItem} from "../app-server/v2";
import {ACPSessionConnection, type AcpClientConnection, type UpdateSessionEvent} from "../ACPSessionConnection";
import {logger} from "../Logger";
import {nameFromAgentPath} from "./CodexAgentPath";
import type {SubagentState} from "./AcpSubagents";

type HistoryContext = {
    connection: AcpClientConnection;
    readThread(id: string): Promise<Thread>;
    createUpdates(item: ThreadItem): Promise<UpdateSessionEvent[]>;
    recover(id: string, sessionId: string, commandIds: Set<string>): Promise<void>;
};

/** Replays each announced generation before its terminal state, caching child reads. */
export async function streamNativeThreadHistory(
    context: HistoryContext,
    sessionId: string,
    thread: Thread,
    ancestry: Set<string>,
    threadCache: Map<string, Thread | null>,
): Promise<void> {
    const session = new ACPSessionConnection(context.connection, sessionId);
    const announced = new Map<string, {generation: number; sessionId: string; terminal: boolean}>();
    for (const turn of thread.turns) {
        for (const item of turn.items) {
            const events = lifecycleEvents(item);
            for (const event of events) {
                if (!event.agentThreadId.trim() || ancestry.has(event.agentThreadId)) continue;
                const activityKind = event.kind;
                const fallbackName = `Agent ${event.agentThreadId.slice(-8)}`;
                const name = event.agentPath ? nameFromAgentPath(event.agentPath, fallbackName) : fallbackName;
                if (activityKind === "started") {
                    const previous = announced.get(event.agentThreadId);
                    if (previous && !previous.terminal) continue;
                    const generation = (previous?.generation ?? 0) + 1;
                    const childSessionId = event.agentThreadId;
                    await session.update({
                        sessionUpdate: "subagent_spawned",
                        subagentSessionId: childSessionId,
                        name,
                        task: event.task ?? `Delegated task for ${name}`,
                        capabilities: {},
                    });
                    announced.set(event.agentThreadId, {generation, sessionId: childSessionId, terminal: false});
                    let child = threadCache.get(event.agentThreadId);
                    if (child === undefined) {
                        try {
                            child = await context.readThread(event.agentThreadId);
                            threadCache.set(event.agentThreadId, child);
                        }
                        catch (error) {
                            threadCache.set(event.agentThreadId, null);
                            logger.error(`Failed to read subagent history ${event.agentThreadId}`, error);
                            child = null;
                        }
                    }
                    const childTurn = child?.turns[generation - 1];
                    if (child && childTurn) {
                        await streamNativeThreadHistory(
                            context,
                            childSessionId,
                            {...child, turns: [childTurn]},
                            new Set([...ancestry, event.agentThreadId]),
                            threadCache,
                        );
                        try {
                            await context.recover(
                                event.agentThreadId,
                                childSessionId,
                                commandItemIds(childTurn.items),
                            );
                        } catch (error) {
                            logger.error(`Failed to restore background terminals for ${event.agentThreadId}`, error);
                        }
                    }
                }
                else {
                    const child = announced.get(event.agentThreadId);
                    if (!child) {
                        await session.update({
                            sessionUpdate: "subagent_spawned",
                            subagentSessionId: event.agentThreadId,
                            name,
                            task: event.task ?? `Delegated task for ${name}`,
                            capabilities: {},
                        });
                        announced.set(event.agentThreadId, {
                            generation: 1,
                            sessionId: event.agentThreadId,
                            terminal: false,
                        });
                        continue;
                    }
                    if (child.terminal) continue;
                    await session.update({
                        sessionUpdate: "subagent_state_update",
                        subagentSessionId: child.sessionId,
                        state: activityKind,
                    });
                    child.terminal = true;
                }
            }
            if (item.type === "collabAgentToolCall" || item.type === "subAgentActivity") continue;
            for (const update of await context.createUpdates(item)) {
                await session.update(update);
            }
        }
    }
    for (const child of announced.values()) {
        if (child.terminal) continue;
        await session.update({
            sessionUpdate: "subagent_state_update",
            subagentSessionId: child.sessionId,
            state: "disconnected",
        });
    }
}

type LifecycleEvent = {
    kind: "started" | SubagentState;
    agentThreadId: string;
    agentPath?: string;
    task?: string;
};

// Native history must accept the same spawn proof as live routing. Activity paths
// are optional; collaboration completion alone does not mean a child completed.
function lifecycleEvents(item: ThreadItem): LifecycleEvent[] {
    if (item.type === "subAgentActivity") {
        if (item.kind === "started") return [{...item, kind: "started"}];
        if (item.kind === "interrupted") return [{...item, kind: "cancelled"}];
        if ((item.kind as string) === "completed") return [{...item, kind: "completed"}];
        return [];
    }
    if (item.type !== "collabAgentToolCall") return [];
    const events: LifecycleEvent[] = [];
    if (item.status === "completed" && ["spawnAgent", "sendInput", "resumeAgent"].includes(item.tool)) {
        for (const id of item.receiverThreadIds) {
            events.push({kind: "started", agentThreadId: id, ...(item.prompt?.trim() ? {task: item.prompt.trim()} : {})});
        }
    }
    for (const [id, state] of Object.entries(item.agentsStates)) {
        switch (state?.status) {
            case "completed": events.push({kind: "completed", agentThreadId: id}); break;
            case "interrupted": events.push({kind: "cancelled", agentThreadId: id}); break;
            case "errored":
            case "shutdown":
            case "notFound": events.push({kind: "failed", agentThreadId: id}); break;
        }
    }
    return events;
}

function commandItemIds(items: ThreadItem[]): Set<string> {
    return new Set(items
        .filter((item): item is Extract<ThreadItem, {type: "commandExecution"}> => item.type === "commandExecution")
        .map(item => item.id));
}
