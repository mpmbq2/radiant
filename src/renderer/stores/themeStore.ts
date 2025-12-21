import { createStore } from 'zustand/vanilla';
import type { CatppuccinFlavor } from '../themes/catppuccin';
import type {} from '../../types';

interface ThemeState {
  // State
  currentTheme: CatppuccinFlavor;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadTheme: () => Promise<void>;
  setTheme: (theme: CatppuccinFlavor) => Promise<void>;
}

/**
 * Helper function to wrap async operations with consistent loading state management
 * Ensures isLoading is always reset even when errors occur
 */
const withLoading = async <T>(
  set: (
    state: Partial<ThemeState> | ((state: ThemeState) => Partial<ThemeState>)
  ) => void,
  operation: () => Promise<T>,
  options: { rethrow?: boolean } = {}
): Promise<T | void> => {
  set({ isLoading: true, error: null });
  try {
    return await operation();
  } catch (error) {
    console.error('Theme operation failed:', error);
    set({ error: (error as Error).message });
    if (options.rethrow) {
      throw error;
    }
  } finally {
    set({ isLoading: false });
  }
};

export const themeStore = createStore<ThemeState>((set, get) => ({
  // Initial state
  currentTheme: 'mocha',
  isLoading: false,
  error: null,

  // Load theme from backend
  loadTheme: async () => {
    await withLoading(set, async () => {
      const theme = await window.electronAPI.getTheme();

      // Validate theme is a valid Catppuccin flavor
      if (['latte', 'frappe', 'macchiato', 'mocha'].includes(theme)) {
        set({ currentTheme: theme as CatppuccinFlavor });
      } else {
        // Fallback to mocha if invalid theme
        console.warn(`Invalid theme received: ${theme}, falling back to mocha`);
        set({ currentTheme: 'mocha' });
      }
    });
  },

  // Set theme and persist to backend
  setTheme: async (theme: CatppuccinFlavor) => {
    await withLoading(
      set,
      async () => {
        await window.electronAPI.setTheme(theme);
        set({ currentTheme: theme });
      },
      { rethrow: true }
    );
  },
}));
