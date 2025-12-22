/**
 * Centralized theme configuration
 *
 * This file serves as the single source of truth for all theme-related constants
 * and types used across the application. It ensures consistency between
 * the preferences service and the renderer theme store.
 */

/**
 * Valid Catppuccin theme flavors
 * These are the only theme names accepted by the application
 */
export const VALID_THEMES = ['latte', 'frappe', 'macchiato', 'mocha'] as const;

/**
 * Type representing a valid theme name
 * Derived from the VALID_THEMES constant for type safety
 */
export type Theme = (typeof VALID_THEMES)[number];

/**
 * Default theme used when no theme is set or an invalid theme is stored
 */
export const DEFAULT_THEME: Theme = 'mocha';
