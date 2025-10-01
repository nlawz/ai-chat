import { z } from 'zod';
import type { getWeather } from './ai/tools/get-weather';
import type { createDocument } from './ai/tools/create-document';
import type { updateDocument } from './ai/tools/update-document';
import type { requestSuggestions } from './ai/tools/request-suggestions';
import type { exaResearch } from './ai/tools/exa-research';
import type { exaWebsets } from './ai/tools/exa-websets';
import type { createTodosTool, updateTodosTool } from './ai/tools/todo-planner';
import type { InferUITool, UIMessage } from 'ai';

import type { ArtifactKind } from '@/components/artifact';
import type { Suggestion } from './db/schema';

export type DataPart = { type: 'append-message'; message: string };

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

type exaResearchTool = InferUITool<
  ReturnType<typeof exaResearch>
>;

type exaWebsetsTool = InferUITool<
  ReturnType<typeof exaWebsets>
>;

type createTodosTool = InferUITool<ReturnType<typeof createTodosTool>>;
type updateTodosTool = InferUITool<ReturnType<typeof updateTodosTool>>;

export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  exaResearch: exaResearchTool;
  exaWebsets: exaWebsetsTool;
  createTodos: createTodosTool;
  updateTodos: updateTodosTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  websetMetadata: {
    websetId: string | null;
    query: string;
    mode: 'company' | 'person';
    criteria: string[];
  };
  todoReplace: {
    chatId: string;
    title?: string;
    items: Array<{ id: string; text: string; isDone: boolean }>;
  };
  todoUpdate: {
    chatId: string;
    title?: string;
    operations: Array<any>;
    items: Array<{ id: string; text: string; isDone: boolean }>;
  };
  todoClear: {
    chatId: string;
  };
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
