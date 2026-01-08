import {
  IScheduler,
  SchedulerAgent,
  SchedulerInput,
  SchedulerInputSchema,
  SchedulerResult,
  SchedulerRole,
} from "../../../contracts/scheduler.contract.js";
import { AppError } from "../../../contracts/store.contract.js";
import type { Task } from "../../../contracts/tasks.contract.js";

type AgentState = SchedulerAgent & { remaining: number };

export class SchedulerAdapter implements IScheduler {
  async schedule(input: SchedulerInput): Promise<SchedulerResult> {
    const parsed = SchedulerInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION_FAILED", "Invalid scheduler input.", {
        issues: parsed.error.issues,
      });
    }

    const tasks = parsed.data.tasks;
    const agents = parsed.data.agents.map((agent) => ({
      ...agent,
      remaining: Math.max(0, agent.capacity - agent.currentLoad),
    }));

    const taskById = new Map(tasks.map((task) => [task.id, task]));
    const assignments: SchedulerResult["assignments"] = [];
    const unassigned: string[] = [];

    for (const task of tasks) {
      if (task.assignee) continue;
      if (task.status !== "todo") continue;
      if (!dependenciesSatisfied(task, taskById)) continue;

      const preferredRole = classifyTaskRole(task);
      const candidate =
        pickAgent(agents, preferredRole) ?? pickAgent(agents);

      if (!candidate) {
        unassigned.push(task.id);
        continue;
      }

      candidate.remaining -= 1;
      assignments.push({ taskId: task.id, agentId: candidate.agentId });
    }

    return { assignments, unassigned };
  }
}

function classifyTaskRole(task: Task): SchedulerRole {
  const text = `${task.title} ${task.description}`.toLowerCase();
  if (/\b(review|critique|verify|qa|test)\b/.test(text)) return "follower";
  if (/\b(implement|build|code|fix|deploy)\b/.test(text)) return "leader";
  return "leader";
}

function dependenciesSatisfied(task: Task, taskById: Map<string, Task>): boolean {
  if (!task.blockedBy || task.blockedBy.length === 0) return true;
  return task.blockedBy.every((dependencyId) => {
    const dependency = taskById.get(dependencyId);
    return dependency?.status === "done";
  });
}

function pickAgent(agents: AgentState[], role?: SchedulerRole): AgentState | null {
  const candidates = agents.filter((agent) => {
    if (role && agent.role !== role) return false;
    return agent.remaining > 0;
  });

  if (candidates.length === 0) return null;
  let best = candidates[0];
  for (const candidate of candidates) {
    if (candidate.remaining > best.remaining) {
      best = candidate;
    }
  }
  return best;
}
