"use server";

import { redis } from "../client";
import { nanoid } from "nanoid";

export interface TodoItem {
    id: string;
    text: string;
    isDone: boolean;
    createdAt: number;
    updatedAt: number;
}

export interface TodoPlan {
    chatId: string;
    title?: string;
    items: TodoItem[];
    createdAt: number;
    updatedAt: number;
}

export type TodoOperation =
    | { type: "complete"; id: string }
    | { type: "uncomplete"; id: string }
    | { type: "add"; text: string; afterId?: string }
    | { type: "remove"; id: string }
    | { type: "rename"; id: string; text: string }
    | { type: "reorder"; id: string; afterId?: string }
    | { type: "clear" };

const TTL_SECONDS = 86400; // 24h

function key(chatId: string): string {
    return `todo_plan:${chatId}`;
}

function now(): number {
    return Date.now();
}

function normalizeItems(
    inputs: Array<{ id?: string; text: string; isDone?: boolean }>
): TodoItem[] {
    const t = now();
    return inputs.map((input) => ({
        id: input.id || nanoid(),
        text: input.text,
        isDone: Boolean(input.isDone),
        createdAt: t,
        updatedAt: t,
    }));
}

export async function getTodoPlan(chatId: string): Promise<TodoPlan | null> {
    if (!chatId) return null;
    const plan = await redis.get<TodoPlan>(key(chatId));
    return plan ?? null;
}

export async function replaceTodos(
    chatId: string,
    items: Array<{ id?: string; text: string; isDone?: boolean }>,
    title?: string
): Promise<TodoPlan> {
    const t = now();
    const normalized = normalizeItems(items);
    const plan: TodoPlan = {
        chatId,
        title,
        items: normalized,
        createdAt: t,
        updatedAt: t,
    };
    await redis.set(key(chatId), plan, { ex: TTL_SECONDS });
    return plan;
}

export async function updateTodos(
    chatId: string,
    operations: TodoOperation[],
    title?: string
): Promise<TodoPlan> {
    const t = now();
    let plan = (await getTodoPlan(chatId)) || {
        chatId,
        title,
        items: [] as TodoItem[],
        createdAt: t,
        updatedAt: t,
    };

    let items = [...plan.items];

    for (const op of operations) {
        switch (op.type) {
            case "complete": {
                items = items.map((it) =>
                    it.id === op.id ? { ...it, isDone: true, updatedAt: t } : it
                );
                break;
            }
            case "uncomplete": {
                items = items.map((it) =>
                    it.id === op.id
                        ? { ...it, isDone: false, updatedAt: t }
                        : it
                );
                break;
            }
            case "add": {
                const newItem: TodoItem = {
                    id: nanoid(),
                    text: op.text,
                    isDone: false,
                    createdAt: t,
                    updatedAt: t,
                };
                if (!op.afterId) {
                    items = [...items, newItem];
                } else {
                    const idx = items.findIndex((i) => i.id === op.afterId);
                    if (idx === -1) items = [...items, newItem];
                    else
                        items = [
                            ...items.slice(0, idx + 1),
                            newItem,
                            ...items.slice(idx + 1),
                        ];
                }
                break;
            }
            case "remove": {
                items = items.filter((it) => it.id !== op.id);
                break;
            }
            case "rename": {
                items = items.map((it) =>
                    it.id === op.id
                        ? { ...it, text: op.text, updatedAt: t }
                        : it
                );
                break;
            }
            case "reorder": {
                const idx = items.findIndex((i) => i.id === op.id);
                if (idx !== -1) {
                    const [moved] = items.splice(idx, 1);
                    if (!op.afterId) {
                        // Move to end
                        items = [...items, moved];
                    } else {
                        const afterIdx = items.findIndex(
                            (i) => i.id === op.afterId
                        );
                        if (afterIdx === -1) items = [...items, moved];
                        else
                            items = [
                                ...items.slice(0, afterIdx + 1),
                                moved,
                                ...items.slice(afterIdx + 1),
                            ];
                    }
                }
                break;
            }
            case "clear": {
                items = [];
                break;
            }
        }
    }

    plan = {
        ...plan,
        title: title ?? plan.title,
        items,
        updatedAt: t,
    };

    await redis.set(key(chatId), plan, { ex: TTL_SECONDS });
    return plan;
}

export async function clearTodoPlan(chatId: string): Promise<void> {
    await redis.del(key(chatId));
}

// ------------------------------------------------------------
// Legacy exports (compatibility shims)
// The old temp-plan API used arbitrary plan IDs. We map those IDs to
// chat IDs for compatibility. These are kept to avoid compile issues in
// unused code paths and should be considered deprecated.
// ------------------------------------------------------------

export async function storeTempPlan(
    plan: { subtasks: Array<{ id: number; description: string }> },
    query: string
): Promise<string> {
    // Treat the returned id as a synthetic chatId for legacy callers
    const syntheticChatId = nanoid();
    await replaceTodos(
        syntheticChatId,
        (plan.subtasks || []).map((t) => ({ text: t.description })),
        query
    );
    return syntheticChatId;
}

export async function getTempPlan(planId: string) {
    return await getTodoPlan(planId);
}

export async function updateTempPlan(
    planId: string,
    plan: {
        subtasks: Array<{ id: number; description: string; status?: string }>;
    }
) {
    // Replace with the provided subtasks (best-effort mapping)
    await replaceTodos(
        planId,
        (plan.subtasks || []).map((t) => ({
            text: t.description,
            isDone: t.status === "completed",
        }))
    );
}

export async function deleteTempPlan(planId: string) {
    await clearTodoPlan(planId);
}

// Optional: enumerate pending todo plans (used by deprecated inbox UI)
function getTodoStatus(
    items: TodoItem[]
): "inactive" | "running" | "completed" | "failed" {
    if (!items.length) return "inactive";
    if (items.every((i) => i.isDone)) return "completed";
    if (items.some((i) => i.isDone)) return "running";
    return "inactive";
}

export async function getPendingPlans() {
    const keys = await redis.keys("todo_plan:*");
    const plans = await Promise.all(
        keys.map(async (k) => {
            const plan = await redis.get<TodoPlan>(k);
            if (!plan) return null;
            return {
                id: plan.chatId,
                createdAt: plan.createdAt,
                query: plan.title || "",
                taskCount: (plan.items || []).length,
                status: getTodoStatus(plan.items || []),
            };
        })
    );
    return plans.filter(Boolean).sort((a, b) => b!.createdAt - a!.createdAt);
}
