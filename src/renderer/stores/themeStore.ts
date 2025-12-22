import { createStore } from 'zustand/vanilla';
import { withLoading } from '../utils/withLoading';
import type { CatppuccinFlavor } from '../themes/catppuccin';
import { VALID_THEMES } from '../../config/themes';
import { createLogger } from '../../utils/logger';

const logger = createLogger('themeStore');

interface ThemeState {
  // State
  currentTheme: CatppuccinFlavor;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTheme: () => Promise<void>;
  setTheme: (theme: CatppuccinFlavor) => Promise<void>;
}

export const themeStore = createStore<ThemeState>((set, get) => ({
  // Initial state
  currentTheme: 'mocha',
  isLoading: false,
  error: null,

  // Load theme from backend
  loadTheme: async () => {
    await withLoading(
      set,
      async () => {
        const theme = await window.electronAPI.getTheme();

        // Validate theme is a valid Catppuccin flavor
        if (VALID_THEMES.includes(theme as (typeof VALID_THEMES)[number])) {
          set({ currentTheme: theme as CatppuccinFlavor });
        } else {
          // Fallback to mocha if invalid theme
          logger.warn(
            `Invalid theme received: ${theme}, falling back to mocha`
          );
          set({ currentTheme: 'mocha' });
        }
      },
      'Load theme'
    );
  },

  // Set theme and persist to backend
  setTheme: async (theme: CatppuccinFlavor) => {
    await withLoading(
      set,
      async () => {
        await window.electronAPI.setTheme(theme);
        set({ currentTheme: theme });
      },
      'Set theme',
      { rethrow: true }
    );
  },
}));
