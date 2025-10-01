"use client";

import { useAtom } from "jotai";
import { todoPlansAtom } from "@/lib/atoms/to-dos";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ListChecks, X } from "lucide-react";
import { getTodoPlan } from "@/lib/actions/store-temp-plan";

interface TodoBarProps {
    chatId?: string | null;
    isAgentActive?: boolean;
    onToggle?: (id: string, isDone: boolean) => Promise<void> | void;
    onClear?: () => Promise<void> | void;
}

export function TodoBar({
    chatId,
    isAgentActive,
    onToggle,
    onClear,
}: TodoBarProps) {
    const [plans, setPlans] = useAtom(todoPlansAtom);
    const [open, setOpen] = useState(true);

    const plan = useMemo(
        () => (chatId ? plans[chatId] : undefined),
        [plans, chatId]
    );
    const remaining = plan?.items.filter((i) => !i.isDone).length ?? 0;
    const hasTodos = (plan?.items?.length ?? 0) > 0;

    // Hydrate from Redis if we have a chatId but no local plan yet
    useEffect(() => {
        let mounted = true;
        async function hydrate() {
            if (!chatId) return;
            // Only fetch if we don't have a plan locally yet
            if (plan && Array.isArray(plan.items) && plan.items.length > 0)
                return;
            try {
                const serverPlan = await getTodoPlan(chatId);
                if (
                    mounted &&
                    serverPlan &&
                    Array.isArray(serverPlan.items) &&
                    serverPlan.items.length > 0
                ) {
                    setPlans((prev) => ({
                        ...prev,
                        [chatId]: {
                            title: serverPlan.title,
                            items: serverPlan.items,
                        },
                    }));
                }
            } catch {}
        }
        hydrate();
        return () => {
            mounted = false;
        };
    }, [chatId, plan, setPlans]);

    if (!chatId || !hasTodos) return null;

    return (
        <div className="w-full">
            <div className="w-full px-4">
                <Collapsible open={open} onOpenChange={setOpen}>
                    <div className="flex items-center justify-between glass:glass-surface metallic:metallic-surface backdrop-blur-sm rounded-t-md px-3 py-2">
                        <div className="flex items-center gap-2 text-sm">
                            <ListChecks className="h-4 w-4" />
                            <span className="font-medium">To-Dos</span>
                            {remaining > 0 && (
                                <span className="text-muted-foreground">
                                    • {remaining} remaining
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <CollapsibleTrigger asChild>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2">
                                    <ChevronDown
                                        className={`h-4 w-4 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
                                    />
                                </Button>
                            </CollapsibleTrigger>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                disabled={
                                    Boolean(isAgentActive) && remaining > 0
                                }
                                onClick={async () => {
                                    try {
                                        await onClear?.();
                                    } finally {
                                        setPlans((prev) => {
                                            const next = { ...prev };
                                            if (chatId) delete next[chatId];
                                            return next;
                                        });
                                    }
                                }}
                                title={
                                    Boolean(isAgentActive) && remaining > 0
                                        ? "Agent running — use Stop to interrupt"
                                        : "Clear all"
                                }>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <CollapsibleContent>
                        <div className="glass:glass-surface metallic:metallic-surface backdrop-blur-sm rounded-b-md px-3 py-3">
                            <ul className="space-y-2">
                                {plan?.items.map((item) => (
                                    <li
                                        key={item.id}
                                        className="flex items-center gap-3">
                                        <Checkbox
                                            checked={item.isDone}
                                            onCheckedChange={async (
                                                checked
                                            ) => {
                                                const isDone = Boolean(checked);
                                                // optimistic update
                                                setPlans((prev) => {
                                                    if (!chatId) return prev;
                                                    const current =
                                                        prev[chatId];
                                                    if (!current) return prev;
                                                    return {
                                                        ...prev,
                                                        [chatId]: {
                                                            ...current,
                                                            items: current.items.map(
                                                                (i) =>
                                                                    i.id ===
                                                                    item.id
                                                                        ? {
                                                                              ...i,
                                                                              isDone,
                                                                          }
                                                                        : i
                                                            ),
                                                        },
                                                    };
                                                });
                                                await onToggle?.(
                                                    item.id,
                                                    isDone
                                                );
                                            }}
                                        />
                                        <span
                                            className={`text-sm ${item.isDone ? "line-through text-muted-foreground" : ""}`}>
                                            {item.text}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </CollapsibleContent>
                </Collapsible>
            </div>
        </div>
    );
}
