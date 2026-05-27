'use client';

import React, { useState } from 'react';
import { Send, Tag, X } from 'lucide-react';
import { Card, CardBody, Button } from '@/components/ui';

interface CreatePostFormProps {
  onSubmit: (data: { title: string; content: string; type: string; tags: string[] }) => Promise<void>;
}

const POST_TYPES = [
  { value: 'GENERAL', label: 'General' },
  { value: 'QUESTION', label: 'Question' },
  { value: 'TIP', label: 'Tip' },
  { value: 'TRADE', label: 'Trade' },
];

export const CreatePostForm: React.FC<CreatePostFormProps> = ({ onSubmit }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addTag = () => {
    const clean = tagInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (clean && !tags.includes(clean) && tags.length < 5) {
      setTags([...tags, clean]);
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit({ title, content, type, tags });
      setTitle('');
      setContent('');
      setTags([]);
      setType('GENERAL');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border border-gray-100 dark:border-[rgba(141,187,85,0.15)]">
      <CardBody className="p-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Post title (optional)"
            maxLength={200}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
          />

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share your experience, ask a question, or offer a tip..."
            rows={4}
            maxLength={5000}
            required
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-harvest-green-500 resize-none"
          />

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-harvest-green-500"
            >
              {POST_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 flex-1 min-w-0">
              <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag + Enter"
                className="flex-1 min-w-0 px-2 py-1 text-sm border-0 bg-transparent text-gray-900 dark:text-zinc-100 placeholder-gray-400 focus:outline-none"
              />
            </div>

            <Button type="submit" variant="primary" size="sm" disabled={submitting || !content.trim()}>
              <Send className="w-4 h-4 mr-1" />
              Post
            </Button>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-harvest-green-50 dark:bg-harvest-green-900/30 text-harvest-green-700 dark:text-harvest-green-300">
                  #{tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </form>
      </CardBody>
    </Card>
  );
};
