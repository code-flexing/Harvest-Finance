'use client';

import React from 'react';
import { Users, Lock, ArrowRight } from 'lucide-react';
import { Card, CardBody, Badge, Button } from '@/components/ui';

export interface Group {
  id: string;
  name: string;
  description?: string;
  category: 'CROP_TYPE' | 'REGION' | 'INTEREST' | 'GENERAL';
  memberCount: number;
  isPrivate: boolean;
  tags: string[];
  isMember?: boolean;
}

interface GroupCardProps {
  group: Group;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  onClick: (id: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  CROP_TYPE: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  REGION: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  INTEREST: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  GENERAL: 'bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300',
};

export const GroupCard: React.FC<GroupCardProps> = ({ group, onJoin, onLeave, onClick }) => (
  <Card className="border border-gray-100 dark:border-[rgba(141,187,85,0.12)] hover:shadow-md transition-shadow cursor-pointer" onClick={() => onClick(group.id)}>
    <CardBody className="p-4">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-50 truncate">{group.name}</h3>
            {group.isPrivate && <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />}
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[group.category] ?? CATEGORY_COLORS.GENERAL}`}>
            {group.category.replace('_', ' ')}
          </span>
        </div>
      </div>

      {group.description && (
        <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2 mb-3">{group.description}</p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-zinc-400">
          <Users className="w-3.5 h-3.5" />
          <span>{group.memberCount.toLocaleString()} members</span>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); group.isMember ? onLeave(group.id) : onJoin(group.id); }}
          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
            group.isMember
              ? 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-red-50 hover:text-red-600'
              : 'bg-harvest-green-600 text-white hover:bg-harvest-green-700'
          }`}
        >
          {group.isMember ? 'Leave' : 'Join'}
        </button>
      </div>
    </CardBody>
  </Card>
);
