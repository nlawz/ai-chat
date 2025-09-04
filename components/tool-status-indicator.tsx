'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { 
  LoaderIcon, 
  SearchIcon, 
  WrenchIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import { ExaIcon } from './icons';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/types';

interface ToolStatusIndicatorProps {
  messages: ChatMessage[];
  className?: string;
}

interface ActiveTool {
  type: string;
  state: 'input-streaming' | 'input-available' | 'output-available' | 'output-error';
  input?: any;
}

function getToolIcon(toolType: string) {
  const icons = {
    'tool-exaSearch': ExaIcon,
    'tool-exaResearch': ExaIcon,
    'tool-exaWebsets': ExaIcon,
    'tool-getWeather': WrenchIcon,
    'tool-createDocument': WrenchIcon,
    'tool-updateDocument': WrenchIcon,
    'tool-requestSuggestions': WrenchIcon,
  } as const;
  
  return icons[toolType as keyof typeof icons] || WrenchIcon;
}

function getToolDisplayName(toolType: string) {
  const names = {
    'tool-exaSearch': 'Web Search with Exa',
    'tool-exaResearch': 'Research with Exa AI',
    'tool-exaWebsets': 'Websets with Exa',
    'tool-getWeather': 'Weather Lookup',
    'tool-createDocument': 'Creating Document',
    'tool-updateDocument': 'Updating Document',
    'tool-requestSuggestions': 'Generating Suggestions',
  } as const;
  
  return names[toolType as keyof typeof names] || toolType.replace('tool-', '');
}

function getStatusInfo(state: ActiveTool['state']) {
  switch (state) {
    case 'input-streaming':
      return {
        label: 'Starting...',
        icon: ClockIcon,
        className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
        animate: true,
      };
    case 'input-available':
      return {
        label: 'Running...',
        icon: LoaderIcon,
        className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
        animate: true,
      };
    case 'output-available':
      return {
        label: 'Complete',
        icon: CheckCircleIcon,
        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
        animate: false,
      };
    case 'output-error':
      return {
        label: 'Error',
        icon: XCircleIcon,
        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
        animate: false,
      };
    default:
      return {
        label: 'Unknown',
        icon: ClockIcon,
        className: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
        animate: false,
      };
  }
}

function PureToolStatusIndicator({ messages, className }: ToolStatusIndicatorProps) {
  // Find active tools from the latest assistant message
  const activeTools: ActiveTool[] = [];
  
  // Look at the most recent assistant message that might have tool calls
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message.role === 'assistant') {
      for (const part of message.parts) {
        if (part.type?.startsWith('tool-') && 
            'state' in part && 
            (part.state === 'input-streaming' || part.state === 'input-available')) {
          activeTools.push({
            type: part.type,
            state: part.state,
            input: 'input' in part ? part.input : undefined,
          });
        }
      }
      break; // Only check the most recent assistant message
    }
  }

  if (activeTools.length === 0) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        className={cn(
          'fixed bottom-20 right-4 z-50 space-y-2 max-w-sm',
          className
        )}
      >
        {activeTools.map((tool, index) => {
          const ToolIcon = getToolIcon(tool.type);
          const displayName = getToolDisplayName(tool.type);
          const statusInfo = getStatusInfo(tool.state);
          const StatusIcon = statusInfo.icon;

          return (
            <motion.div
              key={`${tool.type}-${index}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className="bg-background/95 backdrop-blur-sm border border-border rounded-lg shadow-lg p-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ToolIcon className="size-4 text-muted-foreground shrink-0" />
                  <span className="font-medium text-sm truncate">
                    {displayName}
                  </span>
                </div>
                
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'text-xs flex items-center gap-1.5 shrink-0',
                    statusInfo.className
                  )}
                >
                  <StatusIcon 
                    className={cn(
                      'size-3',
                      statusInfo.animate && 'animate-spin'
                    )} 
                  />
                  <span>{statusInfo.label}</span>
                </Badge>
              </div>
              
              {/* Show query or input for search tools */}
              {tool.type === 'tool-exaSearch' && tool.input?.query && (
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  Searching: &quot;{(tool as any).input?.query}&quot;
                </div>
              )}
              
              {/* Show instructions for research tools */}
              {tool.type === 'tool-exaResearch' && tool.input?.instructions && (
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  Researching: &quot;{tool.input.instructions.substring(0, 80)}...&quot;
                </div>
              )}
              
              {/* Show input for websets tools */}
              {tool.type === 'tool-exaWebsets' && tool.input && (
                <div className="mt-2 text-xs text-muted-foreground truncate">
                  Creating webset...
                </div>
              )}
            </motion.div>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}

export const ToolStatusIndicator = memo(PureToolStatusIndicator);
