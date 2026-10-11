import { create } from 'zustand';
import { UserProfile } from '@/types';
import { initialUserProfile } from './mockData';

interface SettingsState {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  profile: initialUserProfile,
  updateProfile: (updates) =>
    set((state) => ({ profile: { ...state.profile, ...updates } })),
  resetProfile: () => set({ profile: initialUserProfile }),
}));
