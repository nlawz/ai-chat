"use client";

import { atom } from "jotai";

export interface UITodoItem {
    id: string;
    text: string;
    isDone: boolean;
}

export interface UITodoPlan {
    title?: string;
    items: UITodoItem[];
}

// chatId -> plan
export const todoPlansAtom = atom<Record<string, UITodoPlan>>({});
