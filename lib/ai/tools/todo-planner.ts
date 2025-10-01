import { tool, type UIMessageStreamWriter } from "ai";
import { z } from "zod";
import type { ChatMessage } from "@/lib/types";
import {
    replaceTodos,
    updateTodos as applyTodoOperations,
} from "@/lib/actions/store-temp-plan";

export const todoItemSchema = z.object({
    id: z.string(),
    text: z.string().min(1),
    isDone: z.boolean(),
});

export function createTodosTool({
    chatId,
    dataStream,
}: {
    chatId: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
}) {
    return tool({
        description:
            "Create or replace a to-do plan for this chat. Use this for non-trivial tasks to outline actionable steps.",
        inputSchema: z.object({
            title: z.string(),
            items: z.array(z.union([z.string(), todoItemSchema])).min(1),
        }),
        execute: async ({ title, items }) => {
            // Normalize to objects
            const normalized = items.map((it: any) =>
                typeof it === "string" ? { text: it } : it
            );

            const plan = await replaceTodos(chatId, normalized, title);

            // Stream a full replace event for the UI
            try {
                dataStream.write({
                    type: "data-todoReplace",
                    data: {
                        chatId,
                        title: plan.title,
                        items: plan.items.map((item) => ({
                            id: item.id,
                            text: item.text,
                            isDone: item.isDone,
                        })),
                    },
                    transient: true,
                });
            } catch {}

            if (plan.items.length === 0) {
                try {
                    dataStream.write({
                        type: "data-todoClear",
                        data: { chatId },
                        transient: true,
                    });
                } catch {}
            }

            return {
                chatId,
                title: plan.title,
                items: plan.items,
            };
        },
    });
}

export const todoOperationSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("complete"), id: z.string() }),
    z.object({ type: z.literal("uncomplete"), id: z.string() }),
    z.object({
        type: z.literal("add"),
        text: z.string().min(1),
        afterId: z.string(),
    }),
    z.object({ type: z.literal("remove"), id: z.string() }),
    z.object({
        type: z.literal("rename"),
        id: z.string(),
        text: z.string().min(1),
    }),
    z.object({
        type: z.literal("reorder"),
        id: z.string(),
        afterId: z.string(),
    }),
    z.object({ type: z.literal("clear") }),
]);

export function updateTodosTool({
    chatId,
    dataStream,
}: {
    chatId: string;
    dataStream: UIMessageStreamWriter<ChatMessage>;
}) {
    return tool({
        description:
            "Update the current to-do plan (complete/uncomplete/add/remove/rename/reorder/clear). Use frequently as progress is made.",
        inputSchema: z.object({
            title: z.string(),
            operations: z.array(todoOperationSchema).min(1),
        }),
        execute: async ({ operations, title }) => {
            const plan = await applyTodoOperations(
                chatId,
                operations as any,
                title
            );

            // Stream minimal update + snapshot for robust UI updates
            try {
                dataStream.write({
                    type: "data-todoUpdate",
                    data: {
                        chatId,
                        title: plan.title,
                        operations,
                        items: plan.items.map((item) => ({
                            id: item.id,
                            text: item.text,
                            isDone: item.isDone,
                        })),
                    },
                    transient: true,
                });
            } catch {}

            if (plan.items.length === 0) {
                try {
                    dataStream.write({
                        type: "data-todoClear",
                        data: { chatId },
                        transient: true,
                    });
                } catch {}
            }

            return {
                chatId,
                title: plan.title,
                items: plan.items,
            };
        },
    });
}
