'use client';

import { useCallback, useRef } from 'react';
import {
  calculateProgress,
  detectNewMilestones,
  getAchievedMilestones,
  getNextMilestone,
  getMilestoneNotificationPayload,
  MILESTONES,
  type Milestone,
} from '@/lib/milestones';
import { useToastStore } from '@/lib/stores/notification-store';

interface UseMilestonesOptions {
  vaultId: string;
  seasonalTarget: number;
}

export function useMilestones({ vaultId, seasonalTarget }: UseMilestonesOptions) {
  const firedRef = useRef<Set<string>>(new Set());
  const push = useToastStore((s) => s.push);

  const processDeposit = useCallback(
    (previousTotal: number, newTotal: number) => {
      const prevProgress = calculateProgress(previousTotal, seasonalTarget);
      const currProgress = calculateProgress(newTotal, seasonalTarget);

      const events = detectNewMilestones(prevProgress, currProgress);

      for (const event of events) {
        const key = `${vaultId}-${event.milestone}`;
        if (firedRef.current.has(key)) continue;

        firedRef.current.add(key);
        const payload = getMilestoneNotificationPayload(event);
        push({
          type: 'vault_milestone',
          title: payload.title,
          message: payload.message,
          nextTarget: payload.nextTarget,
          tip: payload.tip,
          duration: 6000,
        });
      }

      return {
        progress: currProgress,
        newMilestones: events,
        achievedMilestones: getAchievedMilestones(currProgress),
        nextMilestone: getNextMilestone(currProgress),
      };
    },
    [vaultId, seasonalTarget, push]
  );

  const getProgressInfo = useCallback(
    (totalDeposited: number) => {
      const progress = calculateProgress(totalDeposited, seasonalTarget);
      return {
        progress,
        percentage: Math.min(progress * 100, 100),
        achievedMilestones: getAchievedMilestones(progress),
        nextMilestone: getNextMilestone(progress),
        milestones: MILESTONES,
      };
    },
    [seasonalTarget]
  );

  const resetFired = useCallback(() => {
    firedRef.current.clear();
  }, []);

  return { processDeposit, getProgressInfo, resetFired };
}
