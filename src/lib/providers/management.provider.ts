import { z } from "zod";
import { IToolProvider, ToolHandler } from "../helpers/tool_registry.js";
import { TaskAdapter } from "../adapters/tasks.adapter.js";
import { DependencyAdapter } from "../adapters/dependency.adapter.js";
import { SchedulerAdapter } from "../adapters/scheduler.adapter.js";

export class ManagementProvider implements IToolProvider {
  constructor(
    private tasks: TaskAdapter,
    private dependencies: DependencyAdapter,
    private scheduler: SchedulerAdapter
  ) {}

  getTools() {
    return [
      {
        name: "create_task",
        description: "Create a new task in the shared board.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            assignee: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["title", "description", "agentId"]
        }
      },
      {
        name: "update_task_status",
        description: "Update task status.",
        inputSchema: {
          type: "object",
          properties: {
            taskId: { type: "string" },
            status: { type: "string", enum: ["todo", "in_progress", "review_pending", "done"] },
            agentId: { type: "string" }
          },
          required: ["taskId", "status", "agentId"]
        }
      },
      {
        name: "list_tasks",
        description: "List tasks.",
        inputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["todo", "in_progress", "review_pending", "done"] },
            agentId: { type: "string" }
          },
          required: ["agentId"]
        }
      },
      {
        name: "add_dependency",
        description: "Add a prerequisite relationship between tasks.",
        inputSchema: {
          type: "object",
          properties: {
            childId: { type: "string" },
            parentId: { type: "string" },
            agentId: { type: "string" }
          },
          required: ["childId", "parentId", "agentId"]
        }
      }
    ];
  }

  getHandlers(): Record<string, ToolHandler> {
    return {
      create_task: async (args) => {
        const input = z.object({ title: z.string(), description: z.string(), assignee: z.string().optional() }).parse(args);
        return await this.tasks.create(input.title, input.description, input.assignee);
      },
      update_task_status: async (args) => {
        const input = z.object({ taskId: z.string(), status: z.any() }).parse(args);
        return await this.tasks.updateStatus(input.taskId, input.status);
      },
      list_tasks: async (args) => {
        const input = z.object({ status: z.any().optional() }).parse(args);
        return await this.tasks.list(input.status);
      },
      add_dependency: async (args) => {
        const input = z.object({ childId: z.string(), parentId: z.string() }).parse(args);
        return await this.dependencies.addDependency(input.childId, input.parentId);
      }
    };
  }
}
