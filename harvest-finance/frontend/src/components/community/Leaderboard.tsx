'use client';

import React from 'react';
import { Trophy, Medal } from 'lucide-react';
import { Card, CardBody } from '@/components/ui';

interface LeaderboardEntry {
  userId: string;
  postCount: number;
  commentCount: number;
  score: number;
}

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

const RANK_STYLES = [
  'text-yellow-500',
  'text-gray-400',
  'text-amber-600',
];

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => (
  <Card className="border border-gray-100 dark:border-[rgba(141,187,85,0.12)]">
    <CardBody className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="text-base font-bold text-gray-900 dark:text-zinc-50">Top Contributors</h3>
      </div>

      <div className="space-y-2">
        {entries.slice(0, 10).map((entry, i) => (
          <div key={entry.userId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
            <span className={`w-6 text-center text-sm font-bold ${RANK_STYLES[i] ?? 'text-gray-500 dark:text-zinc-400'}`}>
              {i < 3 ? <Medal className="w-4 h-4 inline" /> : `#${i + 1}`}
            </span>
            <div className="w-8 h-8 rounded-full bg-harvest-green-100 dark:bg-harvest-green-900/40 flex items-center justify-center text-xs font-semibold text-harvest-green-700 dark:text-harvest-green-300">
              {entry.userId.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-zinc-100 truncate">{entry.userId.slice(0, 8)}…</p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">{entry.postCount}p · {entry.commentCount}c</p>
            </div>
            <span className="text-sm font-bold text-harvest-green-600 dark:text-harvest-green-400">{entry.score}</span>
          </div>
        ))}

        {entries.length === 0 && (
          <p className="text-sm text-center text-gray-400 dark:text-zinc-500 py-4">No activity yet — be the first!</p>
        )}
      </div>
    </CardBody>
  </Card>
);
