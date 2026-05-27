'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { cn } from '@/components/ui/types';

interface ChatInputProps {
  onSend: (message: string) => void;
  isDisabled?: boolean;
  placeholder?: string;
}

export function ChatInput({
  onSend,
  isDisabled = false,
  placeholder = 'Ask about crops, vaults, or seasonal advice...',
}: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [value]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isDisabled) return;
    onSend(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 border-t border-gray-200 dark:border-[rgba(141,187,85,0.12)] bg-white dark:bg-[#162a1a]">
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={isDisabled}
          rows={1}
          className={cn(
            'w-full resize-none rounded-xl border bg-gray-50 dark:bg-[#1a3020]',
            'px-4 py-2.5 pr-12 text-sm text-gray-900 dark:text-gray-100',
            'placeholder:text-gray-400 dark:placeholder:text-gray-500',
            'border-gray-200 dark:border-[rgba(141,187,85,0.2)]',
            'transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-harvest-green-200 dark:focus:ring-[rgba(74,222,128,0.2)] focus:border-harvest-green-500 dark:focus:border-[rgba(74,222,128,0.5)] focus:bg-white dark:focus:bg-[#1f3826]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
          style={{ maxHeight: '120px' }}
          aria-label="Chat message input"
        />
      </div>
      <button
        onClick={handleSubmit}
        disabled={isDisabled || !value.trim()}
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
          'transition-all duration-200',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-harvest-green-500 focus-visible:ring-offset-2',
          isDisabled || !value.trim()
            ? 'bg-gray-100 dark:bg-[#1a3020] text-gray-400 dark:text-gray-600 cursor-not-allowed'
            : 'bg-harvest-green-600 text-white hover:bg-harvest-green-700 active:bg-harvest-green-800 shadow-sm hover:shadow-md',
        )}
        aria-label="Send message"
      >
        <Send className="w-4 h-4" />
      </button>
    </div>
  );
}
