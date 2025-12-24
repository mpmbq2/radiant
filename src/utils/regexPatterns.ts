/**
 * Shared regex patterns used across the application
 *
 * This file centralizes all regex patterns to:
 * - Avoid duplicate regex compilations
 * - Ensure consistency across the codebase
 * - Make patterns easier to maintain and test
 */

/**
 * UUID v4 format validation pattern
 * Format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * where x is any hex digit and y is one of [89ab]
 */
export const UUID_V4_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Invalid characters for tag names
 * Includes: < > : " / \ | ? * and control characters (0x00-0x1f)
 * These characters are problematic for:
 * - File systems (both Unix and Windows)
 * - URLs and web contexts
 * - Database queries
 */
// eslint-disable-next-line no-control-regex
export const INVALID_TAG_NAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/;

/**
 * Invalid characters for file paths
 * Includes: < > : " | ? * and control characters (0x00-0x1f)
 * Note: Forward slash (/) and backslash (\) are excluded as they're path separators
 * This is used for validating the filename portion of a path
 */
// eslint-disable-next-line no-control-regex
export const INVALID_FILENAME_CHARS = /[<>:"|?*\x00-\x1f]/;

/**
 * HTML tag pattern for stripping HTML from text
 * Matches any HTML tag including self-closing tags
 * Flags: g (global), m (multiline)
 */
export const HTML_TAG_PATTERN = /<[^>]*>?/gm;

/**
 * Whitespace normalization pattern
 * Matches one or more whitespace characters (spaces, tabs, newlines, etc.)
 * Useful for collapsing multiple spaces into one
 */
export const WHITESPACE_PATTERN = /\s+/g;

/**
 * Underscore pattern for replacement operations
 * Commonly used to convert snake_case to spaces for display
 * Flags: g (global)
 */
export const UNDERSCORE_PATTERN = /_/g;
