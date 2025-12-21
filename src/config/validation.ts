/**
 * Centralized validation constants
 *
 * This file serves as the single source of truth for all validation limits
 * used across the application. These constants ensure consistency between
 * database schema, validation rules, and UI constraints.
 */

export const VALIDATION_LIMITS = {
  /**
   * Maximum length for note titles
   * Aligned with database design for title field
   */
  NOTE_TITLE_MAX_LENGTH: 255,

  /**
   * Maximum length for note content (in bytes)
   * 1MB limit ensures reasonable file sizes and performance
   */
  NOTE_CONTENT_MAX_LENGTH: 1000000, // 1MB in bytes

  /**
   * Maximum number of tags that can be associated with a single note
   * Prevents tag bloat and maintains good query performance
   */
  MAX_TAGS_PER_NOTE: 50,

  /**
   * Maximum length for individual tag names
   * Consistent with tag naming conventions and database design
   */
  TAG_NAME_MAX_LENGTH: 50,
} as const;
