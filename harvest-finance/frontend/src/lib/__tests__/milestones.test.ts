import { describe, it, expect } from 'vitest';
import {
  calculateProgress,
  detectNewMilestones,
  getAchievedMilestones,
  getNextMilestone,
  getMilestoneNotificationPayload,
  MILESTONES,
} from '../milestones';

describe('calculateProgress', () => {
  it('returns 0 for zero target', () => {
    expect(calculateProgress(100, 0)).toBe(0);
  });

  it('returns 0 for negative target', () => {
    expect(calculateProgress(100, -50)).toBe(0);
  });

  it('calculates correct progress', () => {
    expect(calculateProgress(250, 1000)).toBe(0.25);
    expect(calculateProgress(500, 1000)).toBe(0.5);
    expect(calculateProgress(1000, 1000)).toBe(1.0);
  });

  it('caps at 1.5 for over-deposits', () => {
    expect(calculateProgress(2000, 1000)).toBe(1.5);
  });

  it('handles decimal values', () => {
    expect(calculateProgress(33.33, 100)).toBeCloseTo(0.3333);
  });
});

describe('detectNewMilestones', () => {
  it('detects single milestone crossing', () => {
    const events = detectNewMilestones(0.2, 0.3);
    expect(events).toHaveLength(1);
    expect(events[0].milestone).toBe(0.25);
  });

  it('detects multiple milestones in one deposit', () => {
    const events = detectNewMilestones(0.1, 0.8);
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.milestone)).toEqual([0.25, 0.5, 0.75]);
  });

  it('detects all milestones from 0 to 100%', () => {
    const events = detectNewMilestones(0, 1.0);
    expect(events).toHaveLength(4);
    expect(events.map((e) => e.milestone)).toEqual([0.25, 0.5, 0.75, 1.0]);
  });

  it('returns empty when no milestone is crossed', () => {
    const events = detectNewMilestones(0.3, 0.4);
    expect(events).toHaveLength(0);
  });

  it('returns empty when progress decreases', () => {
    const events = detectNewMilestones(0.8, 0.6);
    expect(events).toHaveLength(0);
  });

  it('handles exact milestone boundary', () => {
    const events = detectNewMilestones(0.24999, 0.25);
    expect(events).toHaveLength(1);
    expect(events[0].milestone).toBe(0.25);
  });

  it('does not re-trigger already crossed milestones', () => {
    const events = detectNewMilestones(0.5, 0.6);
    expect(events).toHaveLength(0);
  });

  it('includes nextTarget for non-final milestones', () => {
    const events = detectNewMilestones(0.2, 0.3);
    expect(events[0].nextTarget).toBe('50%');
  });

  it('has null nextTarget for 100% milestone', () => {
    const events = detectNewMilestones(0.9, 1.0);
    expect(events[0].nextTarget).toBeNull();
  });

  it('handles rapid deposits crossing 100%', () => {
    const events = detectNewMilestones(0.7, 1.2);
    expect(events).toHaveLength(2);
    expect(events.map((e) => e.milestone)).toEqual([0.75, 1.0]);
  });
});

describe('getAchievedMilestones', () => {
  it('returns empty for zero progress', () => {
    expect(getAchievedMilestones(0)).toEqual([]);
  });

  it('returns milestones up to current progress', () => {
    expect(getAchievedMilestones(0.6)).toEqual([0.25, 0.5]);
  });

  it('returns all milestones at 100%', () => {
    expect(getAchievedMilestones(1.0)).toEqual([0.25, 0.5, 0.75, 1.0]);
  });

  it('returns all milestones for over-deposit', () => {
    expect(getAchievedMilestones(1.3)).toEqual([0.25, 0.5, 0.75, 1.0]);
  });
});

describe('getNextMilestone', () => {
  it('returns 0.25 for zero progress', () => {
    expect(getNextMilestone(0)).toBe(0.25);
  });

  it('returns next unachieved milestone', () => {
    expect(getNextMilestone(0.3)).toBe(0.5);
    expect(getNextMilestone(0.5)).toBe(0.75);
    expect(getNextMilestone(0.8)).toBe(1.0);
  });

  it('returns null when all milestones achieved', () => {
    expect(getNextMilestone(1.0)).toBeNull();
    expect(getNextMilestone(1.5)).toBeNull();
  });
});

describe('getMilestoneNotificationPayload', () => {
  it('generates correct payload for partial milestone', () => {
    const events = detectNewMilestones(0.2, 0.3);
    const payload = getMilestoneNotificationPayload(events[0]);

    expect(payload.type).toBe('vault_milestone');
    expect(payload.title).toBe('Milestone Reached!');
    expect(payload.message).toContain('25%');
    expect(payload.nextTarget).toBe('50%');
    expect(payload.tip).toBeTruthy();
  });

  it('generates correct payload for 100% milestone', () => {
    const events = detectNewMilestones(0.9, 1.0);
    const payload = getMilestoneNotificationPayload(events[0]);

    expect(payload.title).toBe('Season Goal Complete!');
    expect(payload.message).toContain('100%');
    expect(payload.nextTarget).toBeNull();
  });
});
