'use client';

import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Trash2, MessageCircle } from 'lucide-react';
import { cn } from '@/components/ui/types';
import { useAIAssistantStore } from '@/hooks/useAIAssistant';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import type { FarmContext } from '@/lib/api/ai-assistant-client';

interface AIAssistantChatProps {
  context?: FarmContext;
}

export function AIAssistantChat({ context }: AIAssistantChatProps) {
  const {
    messages,
    isLoading,
    error,
    isOpen,
    suggestions,
    sendMessage,
    useSuggestion,
    toggleOpen,
    closeChat,
    clearChat,
    clearError,
  } = useAIAssistantStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = (message: string) => {
    sendMessage(message, context);
  };

  const handleSuggestionClick = (suggestion: string) => {
    useSuggestion(suggestion, context);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={toggleOpen}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'w-14 h-14 rounded-full',
              'bg-harvest-green-600 text-white',
              'shadow-lg hover:shadow-xl',
              'flex items-center justify-center',
              'transition-colors duration-200',
              'hover:bg-harvest-green-700',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500 focus-visible:ring-offset-2',
            )}
            aria-label="Open AI Assistant"
          >
            <Sparkles className="w-6 h-6" />
            {/* Pulse indicator */}
            <span className="absolute top-0 right-0 w-3.5 h-3.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-harvest-green-300 opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-harvest-green-400 border-2 border-white" />
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'w-[calc(100vw-3rem)] sm:w-[420px]',
              'h-[calc(100vh-6rem)] sm:h-[600px] sm:max-h-[calc(100vh-6rem)]',
              'bg-white rounded-2xl shadow-2xl',
              'border border-gray-200',
              'flex flex-col overflow-hidden',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-harvest-green-600 text-white rounded-t-2xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-sm">Farm AI Assistant</h2>
                  <p className="text-harvest-green-100 text-xs">
                    Crop advice & vault strategies
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                    aria-label="Clear chat"
                    title="Clear chat"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={closeChat}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Close chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-harvest-green-50 flex items-center justify-center mb-4">
                    <MessageCircle className="w-8 h-8 text-harvest-green-500" />
                  </div>
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Welcome to Farm AI Assistant
                  </h3>
                  <p className="text-sm text-gray-500 mb-6 max-w-xs">
                    Get personalized advice on crop management, seasonal tips, vault strategies,
                    and milestone tracking.
                  </p>
                  <div className="space-y-2 w-full max-w-xs">
                    {suggestions.map((suggestion, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i, duration: 0.3 }}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={cn(
                          'w-full text-left text-sm px-4 py-3 rounded-xl',
                          'bg-white border border-gray-200 text-gray-700',
                          'hover:border-harvest-green-300 hover:bg-harvest-green-50',
                          'transition-all duration-150',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500',
                        )}
                      >
                        <span className="text-harvest-green-600 mr-2">→</span>
                        {suggestion}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onSuggestionClick={handleSuggestionClick}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-harvest-green-50 border border-harvest-green-200 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-harvest-green-600 animate-pulse" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                    <div className="flex gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-auto max-w-xs"
                >
                  <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-center">
                    <p className="text-sm text-red-700">{error}</p>
                    <button
                      onClick={clearError}
                      className="mt-1 text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <ChatInput onSend={handleSend} isDisabled={isLoading} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
