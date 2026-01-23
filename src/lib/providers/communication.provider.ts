import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { MessageAdapter } from "../adapters/messages.adapter.js";
import { EventStreamAdapter } from "../adapters/event_stream.adapter.js";
import { NotificationAdapter } from "../adapters/notifications.adapter.js";
import { NotificationPrioritySchema } from "../../../contracts/notifications.contract.js";

export class CommunicationProvider implements IToolProvider {
  constructor(
    private messages: MessageAdapter,
    private eventStream: EventStreamAdapter,
    private notifications: NotificationAdapter
  ) {}

  getTools() {
    return [
      {
        name: "post_message",
        description: "Post a message to the shared log.",
        inputSchema: {
          type: "object",
          properties: {
            content: { type: "string" },
            sender: { type: "string" },
            metadata: { type: "object" },
            channelId: { type: "string" },
            threadId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["content", "sender", "agentId"]
        }
      },
      {
        name: "list_messages",
        description: "List recent messages.",
        inputSchema: {
          type: "object",
          properties: {
            channelId: { type: "string" },
            limit: { type: "number", default: 50 },
            before: { type: "number" },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "publish_event",
        description: "Publish a system event to the global stream. AI DIRECTIVE: Use this to signal state changes that other agents might be waiting for.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", description: "Event type (e.g. 'build_complete')" },
            data: { type: "object" },
            agentId: { type: "string" }
          },
          required: ["type", "agentId"]
        }
      },
      {
        name: "list_events",
        description: "List recent system events.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            since: { type: "number" },
            limit: { type: "number", default: 10 },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "wait_for_events",
        description: "Wait for a specific event type to be published (Long Polling). AI DIRECTIVE: Use this to synchronize with other agents without spinning.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string" },
            since: { type: "number" },
            timeoutMs: { type: "number", default: 30000 },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "send_notification",
        description: "Send a priority notification alert.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            message: { type: "string" },
            priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
            agentId: { type: "string" }
          },
          required: ["title", "message", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      post_message: async (args) => {
        const input = z.object({
          content: z.string(),
          sender: z.string(),
          metadata: z.record(z.string(), z.any()).optional(),
          channelId: z.string().optional(),
          threadId: z.string().optional()
        }).parse(args);
        return await this.messages.post(input.sender, input.content, input);
      },
      list_messages: async (args) => {
        const input = z.object({ channelId: z.string().optional(), limit: z.number().optional(), before: z.number().optional() }).parse(args);
        return await this.messages.list(input);
      },
      publish_event: async (args) => {
        const input = z.object({ type: z.string(), data: z.record(z.string(), z.any()).optional() }).parse(args);
        return await this.eventStream.publish(input);
      },
      list_events: async (args) => {
        const input = z.object({ type: z.string().optional(), since: z.number().optional(), limit: z.number().optional() }).parse(args);
        return await this.eventStream.list(input);
      },
      wait_for_events: async (args) => {
        const input = z.object({ type: z.string().optional(), since: z.number().optional(), timeoutMs: z.number().optional() }).parse(args);
        return await this.eventStream.waitForEvents(input);
      },
      send_notification: async (args) => {
        const input = z.object({ title: z.string(), message: z.string(), priority: NotificationPrioritySchema.optional() }).parse(args);
        return await this.notifications.send(input);
      }
    };
  }
}
