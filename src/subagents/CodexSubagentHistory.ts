import type {ThreadItem} from "../app-server/v2";
import {ACPSessionConnection, type AcpClientConnection, type UpdateSessionEvent} from "../ACPSessionConnection";
import {logger} from "../Logger";
import {nameFromAgentPath} from "./CodexAgentPath";
import type {SubagentState} from "./AcpSubagents";

type HistoryContext = {
    connection: AcpClientConnection;
    readTurnItems(id: string, index: number): Promise<AsyncIterable<ThreadItem[]> | null>;
    ensureOpen(): void;
    createUpdates(item: ThreadItem): Promise<UpdateSessionEvent[]>;
    recover(id: string, sessionId: string, commandIds: Set<string>): Promise<void>;
};

/** Replays paged generations before their terminal state, preserving the native child identity. */
export async function streamNativeThreadHistory(
    context: HistoryContext,
    sessionId: string,
    itemPages: AsyncIterable<ThreadItem[]>,
    ancestry: Set<string>,
    unreadableChildren: Set<string>,
): Promise<void> {
    const session = new ACPSessionConnection(context.connection, sessionId);
    const announced = new Map<string, {generation: number; sessionId: string; terminal: boolean}>();
    for await (const items of itemPages) {
        for (const item of items) {
            context.ensureOpen();
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
                    if (!unreadableChildren.has(event.agentThreadId)) {
                        const commandIds = new Set<string>();
                        try {
                            const childItems = await context.readTurnItems(event.agentThreadId, generation - 1);
                            if (!childItems) continue;
                            await streamNativeThreadHistory(
                                context,
                                childSessionId,
                                withCommandIds(childItems, commandIds),
                                new Set([...ancestry, event.agentThreadId]),
                                unreadableChildren,
                            );
                        }
                        catch (error) {
                            // Closing the parent cancels the load, including any lazy child page.
                            context.ensureOpen();
                            unreadableChildren.add(event.agentThreadId);
                            logger.error(`Failed to read subagent history ${event.agentThreadId}`, error);
                        }
                        try {
                            await context.recover(
                                event.agentThreadId,
                                childSessionId,
                                commandIds,
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
            // Control calls remain tools, as they are during live routing; only spawns are replaced.
            if (item.type === "subAgentActivity" || (item.type === "collabAgentToolCall" && item.tool === "spawnAgent")) continue;
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
    if (item.status === "completed" && ["spawnAgent", "sendInput", "resumeAgent", "followupTask"].includes(item.tool)) {
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

/** Collect only command identities while consuming one page at a time. */
async function* withCommandIds(pages: AsyncIterable<ThreadItem[]>, commandIds: Set<string>): AsyncGenerator<ThreadItem[]> {
    for await (const items of pages) {
        for (const item of items) {
            if (item.type === "commandExecution") commandIds.add(item.id);
        }
        yield items;
    }
}
