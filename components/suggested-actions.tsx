'use client';

import { motion } from 'framer-motion';
import { memo } from 'react';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { VisibilityType } from './visibility-selector';
import type { ChatMessage } from '@/lib/types';
import { Suggestion } from './elements/suggestion';

interface SuggestedActionsProps {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedVisibilityType: VisibilityType;
}

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedVisibilityType,
}: SuggestedActionsProps) {
  const suggestedActions = [
    'Find me 25 software engineer candidates in San Francisco that have at least 3 years of experience',
    'Find me the largest real estate holders in the Southern Los Angeles area',
    'Conduct research on Berkshire Hathaway and compile a comprehensive report',
    'Find me a quick update on the funding status of Anthropic',
  ];

  return (
    <div 
      data-testid="suggested-actions" 
      className="flex gap-3 w-full overflow-x-auto pb-2 scrollbar-hide"
    >
        {suggestedActions.map((suggestedAction, index) => (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ delay: 0.05 * index }}
            key={suggestedAction}
            className="flex-shrink-0"
          >
            <Suggestion
              suggestion={suggestedAction}
              onClick={(suggestion) => {
                window.history.replaceState({}, '', `/chat/${chatId}`);
                sendMessage({
                  role: 'user',
                  parts: [{ type: 'text', text: suggestion }],
                });
              }}
              className="text-left w-72 h-20 whitespace-normal p-3 flex items-center rounded-md"
            >
              {suggestedAction}
            </Suggestion>
          </motion.div>
        ))}
    </div>
  );
}

export const SuggestedActions = memo(
  PureSuggestedActions,
  (prevProps, nextProps) => {
    if (prevProps.chatId !== nextProps.chatId) return false;
    if (prevProps.selectedVisibilityType !== nextProps.selectedVisibilityType)
      return false;

    return true;
  },
);
