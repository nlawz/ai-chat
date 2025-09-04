'use client';
import cx from 'classnames';
import { AnimatePresence, motion } from 'framer-motion';
import { memo, useState } from 'react';
import type { Vote } from '@/lib/db/schema';
import { DocumentToolResult } from './document';
import { PencilEditIcon, SparklesIcon, LoaderIcon, ExaIcon } from './icons';
import { Response } from './elements/response';
import { MessageContent } from './elements/message';
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from './elements/tool';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import equal from 'fast-deep-equal';
import { cn, sanitizeText } from '@/lib/utils';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { MessageEditor } from './message-editor';
import { DocumentPreview } from './document-preview';
import { MessageReasoning } from './message-reasoning';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatMessage } from '@/lib/types';
import { useDataStream } from './data-stream-provider';

// Type narrowing is handled by TypeScript's control flow analysis
// The AI SDK provides proper discriminated unions for tool calls

const PurePreviewMessage = ({
  chatId,
  message,
  vote,
  isLoading,
  setMessages,
  regenerate,
  isReadonly,
  requiresScrollPadding,
  isArtifactVisible,
}: {
  chatId: string;
  message: ChatMessage;
  vote: Vote | undefined;
  isLoading: boolean;
  setMessages: UseChatHelpers<ChatMessage>['setMessages'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  isReadonly: boolean;
  requiresScrollPadding: boolean;
  isArtifactVisible: boolean;
}) => {
  const [mode, setMode] = useState<'view' | 'edit'>('view');

  const attachmentsFromMessage = message.parts.filter(
    (part) => part.type === 'file',
  );

  useDataStream();

  return (
    <AnimatePresence>
      <motion.div
        data-testid={`message-${message.role}`}
        className="w-full group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role={message.role}
      >
        <div
          className={cn('flex items-start gap-3', {
            'w-full': mode === 'edit',
            'max-w-xl ml-auto justify-end mr-6':
              message.role === 'user' && mode !== 'edit',
            'justify-start -ml-3': message.role === 'assistant',
          })}
        >
          {message.role === 'assistant' && (
            <div className="flex justify-center items-center mt-1 rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
              <SparklesIcon size={14} />
            </div>
          )}

          <div
            className={cn('flex flex-col gap-4', {
              'min-h-96': message.role === 'assistant' && requiresScrollPadding,
              'w-full': message.role === 'assistant',
              'w-fit': message.role === 'user',
            })}
          >
            {attachmentsFromMessage.length > 0 && (
              <div
                data-testid={`message-attachments`}
                className="flex flex-row gap-2 justify-end"
              >
                {attachmentsFromMessage.map((attachment) => (
                  <PreviewAttachment
                    key={attachment.url}
                    attachment={{
                      name: attachment.filename ?? 'file',
                      contentType: attachment.mediaType,
                      url: attachment.url,
                    }}
                  />
                ))}
              </div>
            )}

            {message.parts?.map((part, index) => {
              const { type } = part;
              const key = `message-${message.id}-part-${index}`;

              if (type === 'reasoning' && part.text?.trim().length > 0) {
                return (
                  <MessageReasoning
                    key={key}
                    isLoading={isLoading}
                    reasoning={part.text}
                  />
                );
              }

              if (type === 'text') {
                if (mode === 'view') {
                  return (
                    <div key={key} className="flex flex-row gap-2 items-start">
                      {message.role === 'user' && !isReadonly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-testid="message-edit-button"
                              variant="ghost"
                              className="px-2 rounded-full opacity-0 h-fit text-muted-foreground group-hover/message:opacity-100"
                              onClick={() => {
                                setMode('edit');
                              }}
                            >
                              <PencilEditIcon />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit message</TooltipContent>
                        </Tooltip>
                      )}

                      <MessageContent
                        data-testid="message-content"
                        className={cn('justify-start items-start text-left', {
                          'bg-primary text-primary-foreground':
                            message.role === 'user',
                          'bg-transparent -ml-4': message.role === 'assistant',
                        })}
                      >
                        <Response>{sanitizeText(part.text)}</Response>
                      </MessageContent>
                    </div>
                  );
                }

                if (mode === 'edit') {
                  return (
                    <div
                      key={key}
                      className="flex flex-row gap-3 items-start w-full"
                    >
                      <div className="size-8" />
                      <div className="flex-1 min-w-0">
                        <MessageEditor
                          key={message.id}
                          message={message}
                          setMode={setMode}
                          setMessages={setMessages}
                          regenerate={regenerate}
                        />
                      </div>
                    </div>
                  );
                }
              }

              if (type === 'tool-getWeather') {
                const { toolCallId, state } = part;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader type="tool-getWeather" state={state} />
                    <ToolContent>
                      {(state === 'input-available' || state === 'output-available') && (
                        <div className="space-y-2 p-4">
                          <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Location
                          </h4>
                          <div className="bg-muted/50 rounded-md p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">Current location</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {state === 'output-available' && (
                        <ToolOutput
                          output={<Weather weatherAtLocation={part.output} />}
                          errorText={undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              if (type === 'tool-createDocument') {
                const { toolCallId } = part;

                if (part.output && 'error' in part.output) {
                  return (
                    <div
                      key={toolCallId}
                      className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/50"
                    >
                      Error creating document: {String(part.output.error)}
                    </div>
                  );
                }

                return (
                  <DocumentPreview
                    key={toolCallId}
                    isReadonly={isReadonly}
                    result={part.output}
                  />
                );
              }

              if (type === 'tool-updateDocument') {
                const { toolCallId } = part;

                if (part.output && 'error' in part.output) {
                  return (
                    <div
                      key={toolCallId}
                      className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/50"
                    >
                      Error updating document: {String(part.output.error)}
                    </div>
                  );
                }

                return (
                  <div key={toolCallId} className="relative">
                    <DocumentPreview
                      isReadonly={isReadonly}
                      result={part.output}
                      args={{ ...part.output, isUpdate: true }}
                    />
                  </div>
                );
              }

              if (type === 'tool-requestSuggestions') {
                const { toolCallId, state } = part;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader type="tool-requestSuggestions" state={state} />
                    <ToolContent>
                      {(state === 'input-available' || state === 'output-available') && (
                        <ToolInput input={part.input} />
                      )}
                      {state === 'output-available' && (
                        <ToolOutput
                          output={
                            'error' in part.output ? (
                              <div className="p-2 text-red-500 rounded border">
                                Error: {String(part.output.error)}
                              </div>
                            ) : (
                              <DocumentToolResult
                                type="request-suggestions"
                                result={part.output}
                                isReadonly={isReadonly}
                              />
                            )
                          }
                          errorText={undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              if (type?.startsWith('tool-exaSearch')) {
                const { toolCallId, state } = part as any;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader 
                      type="tool-exaSearch" 
                      state={state} 
                      displayName="Web Search with Exa"
                      icon={({ className }) => <ExaIcon size={16} />}
                    />
                    <ToolContent>
                      {(state === 'input-available' || state === 'output-available') && (
                        <div className="space-y-2 p-4">
                          <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Search Parameters
                          </h4>
                          <div className="bg-muted/50 rounded-md p-3 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Query:</span>
                              <span className="text-sm font-medium">&quot;{(part as any).input?.query}&quot;</span>
                            </div>
                            {(part as any).input?.category && (part as any).input.category !== 'any' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Category:</span>
                                <span className="text-sm capitalize bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                  {(part as any).input.category}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Results:</span>
                              <span className="text-sm">{(part as any).input?.numResults || 5}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      {state === 'output-available' && (
                        <ToolOutput
                          output={
                            'error' in (part as any).output ? (
                              <div className="p-2 text-red-500 rounded border">
                                Error: {String((part as any).output.error)}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {(part as any).output.results?.map((result: any, index: number) => (
                                  <div key={index} className="border rounded-lg p-4 bg-muted/20">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                      <h4 className="font-medium text-sm line-clamp-2">
                                        <a 
                                          href={result.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                        >
                                          {result.title}
                                        </a>
                                      </h4>
                                    </div>
                                    {result.summary && (
                                      <p className="text-sm text-muted-foreground mb-2">
                                        {result.summary}
                                      </p>
                                    )}
                                    {result.text && (
                                      <p className="text-xs text-muted-foreground line-clamp-3">
                                        {result.text}
                                      </p>
                                    )}
                                    {result.highlights && result.highlights.length > 0 && (
                                      <div className="mt-2">
                                        <span className="inline-block text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 px-2 py-1 rounded">
                                          &quot;{result.highlights[0]}&quot;
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          errorText={(part as any).state === 'output-error' ? (part as any).errorText : undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              if (type?.startsWith('tool-exaResearch')) {
                const { toolCallId, state } = part as any;

                return (
                  <Tool key={toolCallId} defaultOpen={true}>
                    <ToolHeader 
                      type="tool-exaResearch" 
                      state={state} 
                      displayName="Research with Exa AI"
                      icon={({ className }) => <ExaIcon size={16} />}
                    />
                    <ToolContent>
                      {(state === 'input-available' || state === 'output-available') && (
                        <div className="space-y-2 p-4">
                          <h4 className="font-medium text-muted-foreground text-xs uppercase tracking-wide">
                            Research Instructions
                          </h4>
                          <div className="bg-muted/50 rounded-md p-3">
                            <div className="text-sm">
                              {(part as any).input?.instructions}
                            </div>
                            {(part as any).input?.output_schema && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Structured output requested
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {state === 'output-available' && (
                        <ToolOutput
                          output={
                            'error' in (part as any).output ? (
                              <div className="p-2 text-red-500 rounded border">
                                Error: {String((part as any).output.error)}
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="bg-muted/20 rounded-lg p-4">
                                  <div className="flex items-center gap-2 mb-2">
                                    <ExaIcon size={16} />
                                    <span className="font-medium text-sm">Research Results</span>
                                  </div>
                                  
                                  {(part as any).output.summary && (
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {(part as any).output.summary}
                                    </p>
                                  )}
                                  
                                  {(part as any).output.data && (
                                    <div className="bg-background rounded p-3 border">
                                      <pre className="text-xs overflow-auto max-h-96">
                                        {typeof (part as any).output.data === 'string' 
                                          ? (part as any).output.data 
                                          : JSON.stringify((part as any).output.data, null, 2)
                                        }
                                      </pre>
                                    </div>
                                  )}
                                  
                                  {(part as any).output.citations && (part as any).output.citations.length > 0 && (
                                    <div className="mt-4">
                                      <h5 className="font-medium text-sm mb-2">Sources ({(part as any).output.citations.length})</h5>
                                      <div className="space-y-2">
                                        {(part as any).output.citations.map((citation: any, index: number) => (
                                          <div key={index} className="text-xs">
                                            <a 
                                              href={citation.url} 
                                              target="_blank" 
                                              rel="noopener noreferrer"
                                              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                            >
                                              {citation.title || citation.url}
                                            </a>
                                            {citation.snippet && (
                                              <p className="text-muted-foreground mt-1">
                                                {citation.snippet}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          }
                          errorText={(part as any).state === 'output-error' ? (part as any).errorText : undefined}
                        />
                      )}
                    </ToolContent>
                  </Tool>
                );
              }

              if (type?.startsWith('tool-exaWebsets')) {
                const { toolCallId } = part as any;

                if ((part as any).output && 'error' in (part as any).output) {
                  return (
                    <div
                      key={toolCallId}
                      className="p-4 text-red-500 bg-red-50 rounded-lg border border-red-200 dark:bg-red-950/50"
                    >
                      Error creating webset: {String((part as any).output.error)}
                    </div>
                  );
                }

                return (
                  <DocumentPreview
                    key={toolCallId}
                    isReadonly={isReadonly}
                    result={(part as any).output}
                  />
                );
              }
            })}

            {!isReadonly && (
              <MessageActions
                key={`action-${message.id}`}
                chatId={chatId}
                message={message}
                vote={vote}
                isLoading={isLoading}
              />
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) return false;
    if (prevProps.message.id !== nextProps.message.id) return false;
    if (prevProps.requiresScrollPadding !== nextProps.requiresScrollPadding)
      return false;
    if (!equal(prevProps.message.parts, nextProps.message.parts)) return false;
    if (!equal(prevProps.vote, nextProps.vote)) return false;

    return false;
  },
);

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      data-testid="message-assistant-loading"
      className="w-full group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div className="flex items-start gap-3 justify-start -ml-3">
        <div className="flex justify-center items-center mt-1 rounded-full ring-1 size-8 shrink-0 ring-border bg-background">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-4 w-full">
          <MessageContent className="bg-transparent -ml-4">
            <div className="text-muted-foreground">Hmm...</div>
          </MessageContent>
        </div>
      </div>
    </motion.div>
  );
};
