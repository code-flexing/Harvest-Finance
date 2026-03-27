export const MILESTONES = [0.25, 0.5, 0.75, 1.0] as const;

export type Milestone = (typeof MILESTONES)[number];

export interface MilestoneEvent {
  milestone: Milestone;
  percentage: number;
  label: string;
  nextTarget: string | null;
  tip: string;
}

const MILESTONE_TIPS: Record<number, string> = {
  0.25: 'Great start! Consistency is key to maximizing your yield.',
  0.5: 'Halfway there! Keep depositing regularly to maximize yield.',
  0.75: "Almost there! You're on track for a strong harvest season.",
  1.0: 'Season goal achieved! Your farm vault is fully funded.',
};

const MILESTONE_LABELS: Record<number, string> = {
  0.25: '25%',
  0.5: '50%',
  0.75: '75%',
  1.0: '100%',
};

export function calculateProgress(totalDeposited: number, seasonalTarget: number): number {
  if (seasonalTarget <= 0) return 0;
  return Math.min(totalDeposited / seasonalTarget, 1.5);
}

export function getNextMilestone(progress: number): Milestone | null {
  for (const m of MILESTONES) {
    if (progress < m) return m;
  }
  return null;
}

export function detectNewMilestones(
  previousProgress: number,
  currentProgress: number
): MilestoneEvent[] {
  const triggered: MilestoneEvent[] = [];

  for (let i = 0; i < MILESTONES.length; i++) {
    const milestone = MILESTONES[i];
    if (previousProgress < milestone && currentProgress >= milestone) {
      const nextMilestone = MILESTONES[i + 1] ?? null;
      triggered.push({
        milestone,
        percentage: milestone * 100,
        label: MILESTONE_LABELS[milestone],
        nextTarget: nextMilestone ? MILESTONE_LABELS[nextMilestone] : null,
        tip: MILESTONE_TIPS[milestone],
      });
    }
  }

  return triggered;
}

export function getAchievedMilestones(progress: number): Milestone[] {
  return MILESTONES.filter((m) => progress >= m) as Milestone[];
}

export function getMilestoneNotificationPayload(event: MilestoneEvent) {
  return {
    type: 'vault_milestone' as const,
    title: event.milestone === 1.0 ? 'Season Goal Complete!' : 'Milestone Reached!',
    message: `You've reached ${event.label} of your seasonal goal!`,
    nextTarget: event.nextTarget,
    tip: event.tip,
  };
}
