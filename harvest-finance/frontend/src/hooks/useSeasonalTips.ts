'use client';

import { create } from 'zustand';
import type {
  SeasonalTip,
  TipsQueryParams,
  TipsMeta,
  Season,
  CropType,
  VaultProgress,
} from '@/lib/api/seasonal-tips';
import { getCurrentSeason } from '@/lib/api/seasonal-tips';
import {
  fetchSeasonalTips,
  fetchTipsByMilestone,
} from '@/lib/api/seasonal-tips-client';
import {
  saveSeasonalTipsCache,
  loadSeasonalTipsCache,
} from '@/lib/offline/db';

interface SeasonalTipsState {
  tips: SeasonalTip[];
  milestoneTips: SeasonalTip[];
  meta: TipsMeta | null;
  isLoading: boolean;
  error: string | null;

  selectedCrop: CropType;
  selectedSeason: Season;
  vaultProgress: VaultProgress;

  setSelectedCrop: (crop: CropType) => void;
  setSelectedSeason: (season: Season) => void;
  setVaultProgress: (progress: Partial<VaultProgress>) => void;
  fetchTips: (params?: TipsQueryParams) => Promise<void>;
  fetchMilestoneTips: (milestone: string) => Promise<void>;
  refreshTips: () => Promise<void>;
  clearError: () => void;
}

const defaultVaultProgress: VaultProgress = {
  currentSeason: getCurrentSeason(),
  selectedCrop: 'GENERAL',
  vaultBalance: 0,
  vaultTarget: 10000,
  progressPercent: 0,
  milestoneReached: null,
};

export const useSeasonalTipsStore = create<SeasonalTipsState>((set, get) => ({
  tips: [],
  milestoneTips: [],
  meta: null,
  isLoading: false,
  error: null,

  selectedCrop: 'GENERAL',
  selectedSeason: getCurrentSeason(),
  vaultProgress: defaultVaultProgress,

  setSelectedCrop: (crop) => {
    set({ selectedCrop: crop });
    get().refreshTips();
  },

  setSelectedSeason: (season) => {
    set({ selectedSeason: season });
    get().refreshTips();
  },

  setVaultProgress: (progress) => {
    set((state) => ({
      vaultProgress: { ...state.vaultProgress, ...progress },
    }));
  },

  fetchTips: async (params) => {
    set({ isLoading: true, error: null });
    const cached = await loadSeasonalTipsCache();
    if (cached?.data?.length) {
      set({ tips: cached.data, meta: cached.meta });
    }
    try {
      const { selectedCrop, selectedSeason } = get();
      const query: TipsQueryParams = {
        cropType: params?.cropType ?? selectedCrop,
        season: params?.season ?? selectedSeason,
        limit: params?.limit ?? 20,
        page: params?.page ?? 1,
        ...params,
      };
      const response = await fetchSeasonalTips(query);
      set({ tips: response.data, meta: response.meta, isLoading: false, error: null });
      await saveSeasonalTipsCache(response);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to fetch seasonal tips';
      if (cached?.data?.length) {
        set({ error: null, isLoading: false });
      } else {
        set({ error: message, isLoading: false });
      }
    }
  },

  fetchMilestoneTips: async (milestone) => {
    try {
      const { selectedCrop, selectedSeason } = get();
      const data = await fetchTipsByMilestone(
        milestone,
        selectedCrop,
        selectedSeason,
      );
      set({ milestoneTips: data });
    } catch {
      set({ milestoneTips: [] });
    }
  },

  refreshTips: async () => {
    const { selectedCrop, selectedSeason } = get();
    await get().fetchTips({ cropType: selectedCrop, season: selectedSeason });
  },

  clearError: () => set({ error: null }),
}));
