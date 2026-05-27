'use client';

import React, { useState } from 'react';
import { Heart, MessageSquare, Share2, MoreHorizontal, ThumbsUp, Lightbulb } from 'lucide-react';
import { Card, CardBody, Badge, Button } from '@/components/ui';
import { cn } from '@/components/ui';

export interface Post {
  id: string;
  title: string;
  content: string;
  type: 'GENERAL' | 'QUESTION' | 'TIP' | 'TRADE';
  likeCount: number;
  commentCount: number;
  liked: boolean;
  tags: string[];
  createdAt: string;
  author: {
    id: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface PostCardProps {
  post: Post;
  onLike: (id: string) => void;
  onCommentClick: (id: string) => void;
}

const TYPE_CONFIG = {
  GENERAL: { label: 'General', color: 'default' as const },
  QUESTION: { label: 'Question', color: 'warning' as const },
  TIP: { label: 'Tip', color: 'success' as const },
  TRADE: { label: 'Trade', color: 'info' as const },
};

export const PostCard: React.FC<PostCardProps> = ({ post, onLike, onCommentClick }) => {
  const [expanded, setExpanded] = useState(false);
  const typeConfig = TYPE_CONFIG[post.type] ?? TYPE_CONFIG.GENERAL;
  const isLong = post.content.length > 300;

  return (
    <Card className="border border-gray-100 dark:border-[rgba(141,187,85,0.12)] transition-shadow hover:shadow-md">
      <CardBody className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-harvest-green-100 dark:bg-harvest-green-900/40 flex items-center justify-center text-harvest-green-700 dark:text-harvest-green-300 font-semibold text-sm uppercase">
              {post.author.firstName?.[0]}{post.author.lastName?.[0]}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {post.author.firstName} {post.author.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {new Date(post.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={typeConfig.color} isPill className="text-xs">
              {typeConfig.label}
            </Badge>
            <button className="text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        {post.title && (
          <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50 mb-1">{post.title}</h3>
        )}
        <p className={cn(
          'text-sm text-gray-700 dark:text-zinc-300 leading-relaxed',
          !expanded && isLong && 'line-clamp-3',
        )}>
          {post.content}
        </p>
        {isLong && (
          <button
            onClick={() => setExpanded((e) => !e)}
            className="text-xs text-harvest-green-600 dark:text-harvest-green-400 mt-1 hover:underline"
          >
            {expanded ? 'Show less' : 'Read more'}
          </button>
        )}

        {/* Tags */}
        {post.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {post.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
          <button
            onClick={() => onLike(post.id)}
            className={cn(
              'flex items-center gap-1.5 text-sm transition-colors',
              post.liked
                ? 'text-harvest-green-600 dark:text-harvest-green-400'
                : 'text-gray-500 dark:text-zinc-400 hover:text-harvest-green-600',
            )}
          >
            <Heart className={cn('w-4 h-4', post.liked && 'fill-current')} />
            <span>{post.likeCount}</span>
          </button>

          <button
            onClick={() => onCommentClick(post.id)}
            className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-harvest-green-600 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.commentCount}</span>
          </button>

          <button className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-zinc-400 hover:text-harvest-green-600 transition-colors ml-auto">
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>
      </CardBody>
    </Card>
  );
};
