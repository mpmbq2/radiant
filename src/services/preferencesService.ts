import { preferencesRepository } from '../database/preferencesRepository';
import { createLogger } from '../utils/logger';

const logger = createLogger('PreferencesService');

// Valid Catppuccin theme flavors
const VALID_THEMES = ['latte', 'frappe', 'macchiato', 'mocha'] as const;
type Theme = (typeof VALID_THEMES)[number];

const DEFAULT_THEME: Theme = 'mocha';
const THEME_KEY = 'theme';

export class PreferencesService {
  /**
   * Get the current theme
   * Returns "mocha" as default if no theme is set
   */
  getTheme(): string {
    try {
      const theme = preferencesRepository.getPreference(THEME_KEY);
      if (!theme) {
        logger.info('No theme set, using default:', DEFAULT_THEME);
        return DEFAULT_THEME;
      }

      // Validate that the stored theme is valid
      if (!this.isValidTheme(theme)) {
        logger.warn(
          `Invalid theme stored: ${theme}, using default:`,
          DEFAULT_THEME
        );
        return DEFAULT_THEME;
      }

      return theme;
    } catch (error) {
      logger.error('Error getting theme:', error as Error);
      return DEFAULT_THEME;
    }
  }

  /**
   * Set the theme
   * Validates the theme before saving
   */
  setTheme(theme: string): void {
    if (!this.isValidTheme(theme)) {
      const error = new Error(
        `Invalid theme: ${theme}. Valid themes are: ${VALID_THEMES.join(', ')}`
      );
      logger.error('Error setting theme:', error);
      throw error;
    }

    try {
      preferencesRepository.setPreference(THEME_KEY, theme);
      logger.info('Theme set successfully:', theme);
    } catch (error) {
      logger.error('Error saving theme:', error as Error);
      throw error;
    }
  }

  /**
   * Check if a theme name is valid
   */
  private isValidTheme(theme: string): theme is Theme {
    return VALID_THEMES.includes(theme as Theme);
  }
}

// Singleton instance
export const preferencesService = new PreferencesService();
