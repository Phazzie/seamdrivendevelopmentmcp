import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { MessageAdapter } from "../adapters/messages.adapter.js";
import { EventStreamAdapter } from "../adapters/event_stream.adapter.js";
import { NotificationAdapter } from "../adapters/notifications.adapter.js";

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
      }
    };
  }
}
