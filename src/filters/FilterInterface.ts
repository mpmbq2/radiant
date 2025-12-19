import { Note, NoteWithContent } from '../database/schema';

/**
 * Serializable filter configuration
 * Each concrete filter defines its own config structure
 */
export interface FilterConfig {
  type: string;
  [key: string]: any;
}

/**
 * Result of filter validation
 */
export interface FilterValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Base interface for all note filters
 *
 * Filters are configuration-driven components that can be applied to collections
 * of notes to narrow down results based on various criteria (tags, dates, content, etc.)
 *
 * Key principles:
 * - Filters are immutable - applying a filter returns a new filtered array
 * - Filters are serializable - can be saved/loaded from configuration
 * - Filters are composable - multiple filters can be combined
 * - Filters are type-safe - TypeScript ensures correct usage
 */
export abstract class FilterInterface {
  /**
   * Unique type identifier for this filter class
   * Used during serialization/deserialization
   */
  abstract readonly filterType: string;

  /**
   * Apply this filter to a collection of notes
   *
   * @param notes - Array of notes to filter
   * @returns Filtered array of notes (does not mutate input)
   */
  abstract apply(notes: Note[]): Note[];

  /**
   * Apply this filter to a collection of notes with content
   *
   * @param notes - Array of notes with content to filter
   * @returns Filtered array of notes with content (does not mutate input)
   */
  abstract applyWithContent(notes: NoteWithContent[]): NoteWithContent[];

  /**
   * Serialize this filter's configuration to a portable format
   *
   * @returns FilterConfig object that can be JSON-stringified
   */
  abstract serialize(): FilterConfig;

  /**
   * Validate that the filter configuration is valid
   *
   * @returns Validation result with any errors
   */
  abstract validate(): FilterValidationResult;

  /**
   * Get a human-readable description of this filter
   * Useful for UI display and debugging
   *
   * @returns Description string (e.g., "Notes tagged with 'work'")
   */
  abstract getDescription(): string;

  /**
   * Clone this filter instance
   *
   * @returns A new instance with the same configuration
   */
  abstract clone(): FilterInterface;

  /**
   * Check if this filter would match a single note
   * Useful for testing and optimization
   *
   * @param note - Note to test
   * @returns True if the note passes this filter
   */
  abstract matches(note: Note): boolean;

  /**
   * Check if this filter would match a single note with content
   *
   * @param note - Note with content to test
   * @returns True if the note passes this filter
   */
  abstract matchesWithContent(note: NoteWithContent): boolean;

  /**
   * Serialize filter to JSON string
   * Convenience method wrapping serialize()
   *
   * @returns JSON string representation
   */
  toJSON(): string {
    return JSON.stringify(this.serialize());
  }

  /**
   * Check if filter is valid
   * Convenience method wrapping validate()
   *
   * @returns True if filter configuration is valid
   */
  isValid(): boolean {
    return this.validate().isValid;
  }

  /**
   * Get validation errors if any
   * Convenience method wrapping validate()
   *
   * @returns Array of error messages, empty if valid
   */
  getValidationErrors(): string[] {
    return this.validate().errors;
  }
}

/**
 * Factory function type for creating filters from configuration
 */
export type FilterFactory = (config: FilterConfig) => FilterInterface;

/**
 * Helper function to create a successful validation result
 */
export function validationSuccess(): FilterValidationResult {
  return { isValid: true, errors: [] };
}

/**
 * Helper function to create a failed validation result
 */
export function validationFailure(errors: string[]): FilterValidationResult {
  return { isValid: false, errors };
}
