import type { Note, NoteWithContent } from '../types';
import {
  FilterInterface,
  FilterConfig,
  FilterValidationResult,
  validationSuccess,
  validationFailure,
} from './FilterInterface';
import { FilterType, ComparisonOperator } from './types';

/**
 * Configuration for ContentFilter
 */
export interface ContentFilterConfig extends FilterConfig {
  type: typeof FilterType.CONTENT;

  /** Search query (text or regex pattern) */
  query?: string;

  /** Regex pattern (alternative to query) */
  pattern?: string;

  /** Comparison operator (default: CONTAINS) */
  operator?: ComparisonOperator;

  /** Case-sensitive search (default: false) */
  caseSensitive?: boolean;

  /** Search in title (default: true) */
  searchTitle?: boolean;

  /** Search in content (default: true) */
  searchContent?: boolean;
}

/**
 * Filter notes by content
 *
 * Supports:
 * - Text search in title and/or content
 * - Case-sensitive or case-insensitive matching
 * - Various comparison operators (contains, starts with, ends with, etc.)
 * - Regex pattern matching
 * - Field-specific search (title only, content only, or both)
 *
 * Examples:
 * ```typescript
 * // Simple text search
 * new ContentFilter({ query: 'important' })
 *
 * // Case-sensitive search
 * new ContentFilter({ query: 'API', caseSensitive: true })
 *
 * // Search only in titles
 * new ContentFilter({
 *   query: 'meeting',
 *   searchTitle: true,
 *   searchContent: false
 * })
 *
 * // Regex search
 * new ContentFilter({
 *   pattern: 'TODO: .*',
 *   operator: ComparisonOperator.MATCHES_REGEX
 * })
 * ```
 */
export class ContentFilter extends FilterInterface {
  readonly filterType = FilterType.CONTENT;
  private config: ContentFilterConfig;
  private regex?: RegExp;

  constructor(config: Omit<ContentFilterConfig, 'type'> | ContentFilterConfig) {
    super();
    this.config = {
      type: FilterType.CONTENT,
      operator: config.operator || ComparisonOperator.CONTAINS,
      caseSensitive:
        config.caseSensitive !== undefined ? config.caseSensitive : false,
      searchTitle: config.searchTitle !== undefined ? config.searchTitle : true,
      searchContent:
        config.searchContent !== undefined ? config.searchContent : true,
      ...config,
    };

    // Compile regex if using regex operator
    if (
      this.config.operator === ComparisonOperator.MATCHES_REGEX &&
      (this.config.pattern || this.config.query)
    ) {
      const pattern = this.config.pattern || this.config.query!;
      const flags = this.config.caseSensitive ? '' : 'i';
      try {
        this.regex = new RegExp(pattern, flags);
      } catch (error) {
        // Invalid regex - will fail validation
      }
    }
  }

  apply(notes: Note[]): Note[] {
    // ContentFilter needs content, so filter based only on title for Notes
    if (!this.config.searchTitle) {
      return []; // Can't filter without content
    }
    return notes.filter((note) => this.matchesTitle(note.title));
  }

  applyWithContent(notes: NoteWithContent[]): NoteWithContent[] {
    return notes.filter((note) => this.matchesWithContent(note));
  }

  serialize(): FilterConfig {
    return { ...this.config };
  }

  validate(): FilterValidationResult {
    const errors: string[] = [];

    // Must have query or pattern
    if (!this.config.query && !this.config.pattern) {
      errors.push('Either query or pattern must be specified');
    }

    // Query must be non-empty
    if (
      this.config.query !== undefined &&
      this.config.query.trim().length === 0
    ) {
      errors.push('Query must be a non-empty string');
    }

    // Pattern must be non-empty
    if (
      this.config.pattern !== undefined &&
      this.config.pattern.trim().length === 0
    ) {
      errors.push('Pattern must be a non-empty string');
    }

    // At least one search field must be enabled
    if (!this.config.searchTitle && !this.config.searchContent) {
      errors.push('At least one of searchTitle or searchContent must be true');
    }

    // Validate regex if using regex operator
    if (this.config.operator === ComparisonOperator.MATCHES_REGEX) {
      const pattern = this.config.pattern || this.config.query;
      if (pattern) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(
            `Invalid regex pattern: ${error instanceof Error ? error.message : 'unknown error'}`
          );
        }
      }
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  getDescription(): string {
    const query = this.config.query || this.config.pattern || '';
    const fields: string[] = [];

    if (this.config.searchTitle) fields.push('title');
    if (this.config.searchContent) fields.push('content');

    const fieldStr =
      fields.length === 2 ? 'title or content' : fields[0] || 'title';
    const operator = this.getOperatorDescription();

    return `Notes where ${fieldStr} ${operator} "${query}"`;
  }

  clone(): FilterInterface {
    return new ContentFilter({ ...this.config });
  }

  matches(note: Note): boolean {
    // For Note (without content), only check title
    if (!this.config.searchTitle) {
      return false;
    }
    return this.matchesTitle(note.title);
  }

  matchesWithContent(note: NoteWithContent): boolean {
    const title = note.title || '';
    const content = note.content || '';

    const titleMatches = this.config.searchTitle && this.matchesTitle(title);
    const contentMatches =
      this.config.searchContent && this.matchesText(content);

    // Return true if either field matches (OR logic)
    return titleMatches || contentMatches;
  }

  /**
   * Check if title matches the filter
   */
  private matchesTitle(title: string): boolean {
    return this.matchesText(title);
  }

  /**
   * Check if text matches the filter criteria
   */
  private matchesText(text: string): boolean {
    const query = this.config.query || this.config.pattern || '';

    // Normalize for case-insensitive comparison
    const normalizedText = this.config.caseSensitive
      ? text
      : text.toLowerCase();
    const normalizedQuery = this.config.caseSensitive
      ? query
      : query.toLowerCase();

    switch (this.config.operator) {
      case ComparisonOperator.EQUALS:
        return normalizedText === normalizedQuery;

      case ComparisonOperator.NOT_EQUALS:
        return normalizedText !== normalizedQuery;

      case ComparisonOperator.CONTAINS:
        return normalizedText.includes(normalizedQuery);

      case ComparisonOperator.NOT_CONTAINS:
        return !normalizedText.includes(normalizedQuery);

      case ComparisonOperator.STARTS_WITH:
        return normalizedText.startsWith(normalizedQuery);

      case ComparisonOperator.ENDS_WITH:
        return normalizedText.endsWith(normalizedQuery);

      case ComparisonOperator.MATCHES_REGEX:
        if (this.regex) {
          return this.regex.test(text);
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get human-readable description of the operator
   */
  private getOperatorDescription(): string {
    switch (this.config.operator) {
      case ComparisonOperator.EQUALS:
        return 'equals';
      case ComparisonOperator.NOT_EQUALS:
        return 'does not equal';
      case ComparisonOperator.CONTAINS:
        return 'contains';
      case ComparisonOperator.NOT_CONTAINS:
        return 'does not contain';
      case ComparisonOperator.STARTS_WITH:
        return 'starts with';
      case ComparisonOperator.ENDS_WITH:
        return 'ends with';
      case ComparisonOperator.MATCHES_REGEX:
        return 'matches pattern';
      default:
        return 'matches';
    }
  }
}
