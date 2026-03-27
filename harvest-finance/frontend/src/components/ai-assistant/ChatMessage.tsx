'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { cn } from '@/components/ui/types';
import type { ChatEntry } from '@/hooks/useAIAssistant';

interface ChatMessageProps {
  message: ChatEntry;
  onSuggestionClick?: (suggestion: string) => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function renderContent(content: string): React.ReactNode {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-1">
          {listItems.map((item, i) => (
            <li key={i} className="text-sm leading-relaxed">
              {item.replace(/^[-*]\s*/, '')}
            </li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      continue;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed);
    } else if (/^\d+\.\s/.test(trimmed)) {
      listItems.push(trimmed);
    } else {
      flushList();
      const formatted = trimmed
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>');
      elements.push(
        <p
          key={`p-${elements.length}`}
          className="text-sm leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: formatted }}
        />,
      );
    }
  }
  flushList();
  return elements;
}

export function ChatMessage({ message, onSuggestionClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
          isUser
            ? 'bg-harvest-green-600 text-white'
            : 'bg-harvest-green-50 text-harvest-green-700 border border-harvest-green-200',
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Message bubble */}
      <div className={cn('flex flex-col max-w-[80%]', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3',
            isUser
              ? 'bg-harvest-green-600 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm',
          )}
        >
          {isUser ? (
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div>{renderContent(message.content)}</div>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-[10px] text-gray-400 mt-1 px-1">
          {formatTime(message.timestamp)}
        </span>

        {/* Suggestions */}
        {!isUser && message.suggestions && message.suggestions.length > 0 && onSuggestionClick && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {message.suggestions.map((suggestion, i) => (
              <motion.button
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.2 }}
                onClick={() => onSuggestionClick(suggestion)}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full',
                  'bg-harvest-green-50 text-harvest-green-700 border border-harvest-green-200',
                  'hover:bg-harvest-green-100 hover:border-harvest-green-300',
                  'transition-colors duration-150',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500',
                )}
              >
                {suggestion}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
