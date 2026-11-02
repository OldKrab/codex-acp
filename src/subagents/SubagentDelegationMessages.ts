import type {ThreadItem} from "../app-server/v2";
import type {ACPSessionConnection} from "../ACPSessionConnection";
import {logger} from "../Logger";

type DelegatedChild = {sessionId: string; parentSessionId: string};

export const userMessageText = (item: ThreadItem & {type: "userMessage"}): string =>
    item.content.filter(content => content.type === "text").map(content => content.text).join("").trim();

/**
 * Publishes delegated input as ACP `session_message`s. Fork-owned, so that a sync only
 * reconciles the router's call sites.
 *
 * Codex streams a child no input item, so live the parent's items are the only source: a
 * `collabAgentToolCall` names the exact prompt, and a `subAgentActivity` names none. A
 * child's recorded history does hold its input, as user messages no human wrote.
 */
export class SubagentDelegationMessages {
    private readonly published = new Set<string>();
    private rootPrompt?: {turnId: string; sourceId: string; text: string};

    constructor(private readonly session: ACPSessionConnection) {}

    /** Published ids dedupe one stream of updates; a client rebuilding from a replay must get every prompt again. */
    forgetPublished(): void {
        this.published.clear();
    }

    /** One root turn runs at a time, so only the latest prompt can have caused an activity. */
    rememberRootPrompt(turnId: string, item: ThreadItem & {type: "userMessage"}): void {
        const text = userMessageText(item);
        if (text) this.rootPrompt = {turnId, sourceId: item.id, text};
    }

    /** The prompt a child opens each run with; `inParent` adds the view for a call with no Tool row of its own. */
    async publish(child: DelegatedChild, sourceId: string, prompt: string, inParent: boolean): Promise<void> {
        const text = prompt.trim();
        const messageId = `${child.sessionId}:${sourceId}:prompt`;
        if (!text || this.published.has(messageId)) return;
        this.published.add(messageId);
        const message = {
            sessionUpdate: "session_message" as const, messageId,
            senderSessionId: child.parentSessionId, recipientSessionId: child.sessionId,
            content: [{type: "text" as const, text}],
        };
        if (inParent) await this.session.update({...message, recipientMessageId: messageId}, child.parentSessionId);
        await this.session.update({...message, senderMessageId: messageId}, child.sessionId);
    }

    /** Input a child recorded, in place: each child replays whole at its spawn, so a parent's later call would land after the work. */
    async publishRecorded(child: DelegatedChild, item: ThreadItem & {type: "userMessage"}): Promise<boolean> {
        const text = userMessageText(item);
        if (!text) {
            logger.log("Recorded child input has no text to replay", {subagentSessionId: child.sessionId});
            return false;
        }
        await this.publish(child, item.id, text, false);
        return true;
    }

    /** Multi-agent v2 hides the delegated text, so the child opens with the human prompt that caused its run. */
    async publishRootPrompt(child: DelegatedChild, turnId: string): Promise<void> {
        const prompt = this.rootPrompt;
        if (prompt?.turnId !== turnId) {
            logger.log("No root prompt for a subagent activity", {subagentSessionId: child.sessionId});
            return;
        }
        await this.publish(child, prompt.sourceId, prompt.text, true);
    }
}
