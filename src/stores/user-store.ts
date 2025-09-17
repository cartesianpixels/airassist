import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  defaultModel: string;
  maxTokens: number;
  streamingResponse: boolean;
  autoSave: boolean;
}

export interface UserNotifications {
  email: boolean;
  browser: boolean;
  sessions: boolean;
}

export interface UserAnalytics {
  totalSessions: number;
  totalMessages: number;
  totalTokensUsed: number;
  totalCost: number;
  lastActive: string | null;
  joinedAt: string | null;
}

interface UserState {
  // User preferences
  preferences: UserPreferences;
  notifications: UserNotifications;
  analytics: UserAnalytics;
  
  // Settings state
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsError: string | null;
  
  // Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  updateNotifications: (notifications: Partial<UserNotifications>) => void;
  updateAnalytics: (analytics: Partial<UserAnalytics>) => void;
  
  // Settings actions
  setSettingsLoading: (loading: boolean) => void;
  setSettingsSaving: (saving: boolean) => void;
  setSettingsError: (error: string | null) => void;
  
  // Utility actions
  resetUserData: () => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'auto',
  language: 'en',
  defaultModel: 'gpt-4o-mini',
  maxTokens: 1500,
  streamingResponse: true,
  autoSave: true,
};

const defaultNotifications: UserNotifications = {
  email: true,
  browser: true,
  sessions: false,
};

const defaultAnalytics: UserAnalytics = {
  totalSessions: 0,
  totalMessages: 0,
  totalTokensUsed: 0,
  totalCost: 0,
  lastActive: null,
  joinedAt: null,
};

const initialState = {
  preferences: defaultPreferences,
  notifications: defaultNotifications,
  analytics: defaultAnalytics,
  settingsLoading: false,
  settingsSaving: false,
  settingsError: null,
};

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Preference actions
        updatePreferences: (newPreferences) => set((state) => ({
          preferences: { ...state.preferences, ...newPreferences }
        })),
        
        updateNotifications: (newNotifications) => set((state) => ({
          notifications: { ...state.notifications, ...newNotifications }
        })),
        
        updateAnalytics: (newAnalytics) => set((state) => ({
          analytics: { ...state.analytics, ...newAnalytics }
        })),
        
        // Settings actions
        setSettingsLoading: (loading) => set({ settingsLoading: loading }),
        
        setSettingsSaving: (saving) => set({ settingsSaving: saving }),
        
        setSettingsError: (error) => set({ settingsError: error }),
        
        // Utility actions
        resetUserData: () => set(initialState),
      }),
      {
        name: 'user-store',
        // Only persist preferences and notifications, not analytics
        partialize: (state) => ({
          preferences: state.preferences,
          notifications: state.notifications,
        }),
      }
    ),
    {
      name: 'user-store',
    }
  )
);