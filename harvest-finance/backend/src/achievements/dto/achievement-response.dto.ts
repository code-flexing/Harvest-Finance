import { AchievementType } from '../../database/entities/achievement.entity';

export const ACHIEVEMENT_META: Record<
  AchievementType,
  { label: string; description: string; icon: string }
> = {
  [AchievementType.FIRST_DEPOSIT]: {
    label: 'First Deposit',
    description: 'Made your first deposit into a vault.',
    icon: 'seedling',
  },
  [AchievementType.CONSISTENT_SAVER]: {
    label: 'Consistent Saver',
    description: 'Made deposits in 3 consecutive months.',
    icon: 'calendar-check',
  },
  [AchievementType.MILESTONE_MASTER]: {
    label: 'Milestone Master',
    description: 'Reached $1,000 in total savings.',
    icon: 'trophy',
  },
  [AchievementType.LONG_TERM_PLANNER]: {
    label: 'Long-Term Planner',
    description: 'Maintained a vault for 6+ months.',
    icon: 'calendar-long',
  },
};

export class AchievementResponseDto {
  id: string;
  type: AchievementType;
  label: string;
  description: string;
  icon: string;
  unlockedAt: Date;
}
