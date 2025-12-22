import type { Note, NoteWithContent } from '../types';
import {
  FilterInterface,
  FilterConfig,
  FilterValidationResult,
  validationSuccess,
  validationFailure,
} from './FilterInterface';
import { FilterType, LogicalOperator } from './types';

/**
 * Configuration for TagFilter
 */
export interface TagFilterConfig extends FilterConfig {
  type: typeof FilterType.TAG;

  /** Tags to match (OR by default, AND if operator is set) */
  tags: string[];

  /** Tags to exclude (note cannot have any of these) */
  excludeTags?: string[];

  /** Logical operator for combining tags (default: OR) */
  operator?: LogicalOperator.AND | LogicalOperator.OR;

  /** Case-sensitive tag matching (default: false) */
  caseSensitive?: boolean;
}

/**
 * Filter notes by tags
 *
 * Supports:
 * - Single tag filtering
 * - Multiple tags with AND/OR logic
 * - Tag exclusion (blacklist)
 * - Case-sensitive or case-insensitive matching
 *
 * Examples:
 * ```typescript
 * // Notes with 'work' tag
 * new TagFilter({ tags: ['work'] })
 *
 * // Notes with both 'work' AND 'urgent'
 * new TagFilter({ tags: ['work', 'urgent'], operator: LogicalOperator.AND })
 *
 * // Notes with 'work' OR 'personal'
 * new TagFilter({ tags: ['work', 'personal'], operator: LogicalOperator.OR })
 *
 * // Notes with 'work' but not 'archived'
 * new TagFilter({ tags: ['work'], excludeTags: ['archived'] })
 * ```
 */
export class TagFilter extends FilterInterface {
  readonly filterType = FilterType.TAG;
  private config: TagFilterConfig;

  constructor(config: Omit<TagFilterConfig, 'type'> | TagFilterConfig) {
    super();
    this.config = {
      type: FilterType.TAG,
      ...config,
      operator: config.operator || LogicalOperator.OR,
      caseSensitive: config.caseSensitive !== undefined ? config.caseSensitive : false,
    };
  }

  apply(notes: Note[]): Note[] {
    return notes.filter(note => this.matches(note));
  }

  applyWithContent(notes: NoteWithContent[]): NoteWithContent[] {
    return notes.filter(note => this.matchesWithContent(note));
  }

  serialize(): FilterConfig {
    return { ...this.config };
  }

  validate(): FilterValidationResult {
    const errors: string[] = [];

    // Must have at least one tag or excludeTag
    if (
      (!this.config.tags || this.config.tags.length === 0) &&
      (!this.config.excludeTags || this.config.excludeTags.length === 0)
    ) {
      errors.push('At least one tag or excludeTag must be specified');
    }

    // Tags must be non-empty strings
    if (this.config.tags) {
      for (const tag of this.config.tags) {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push('Tags must be non-empty strings');
          break;
        }
      }
    }

    // Exclude tags must be non-empty strings
    if (this.config.excludeTags) {
      for (const tag of this.config.excludeTags) {
        if (!tag || typeof tag !== 'string' || tag.trim().length === 0) {
          errors.push('Exclude tags must be non-empty strings');
          break;
        }
      }
    }

    // Operator must be AND or OR
    if (
      this.config.operator &&
      this.config.operator !== LogicalOperator.AND &&
      this.config.operator !== LogicalOperator.OR
    ) {
      errors.push('Operator must be AND or OR for TagFilter');
    }

    return errors.length === 0 ? validationSuccess() : validationFailure(errors);
  }

  getDescription(): string {
    const parts: string[] = [];

    if (this.config.tags && this.config.tags.length > 0) {
      const tagList = this.config.tags.map(t => `'${t}'`).join(', ');
      const operator = this.config.operator === LogicalOperator.AND ? 'all of' : 'any of';
      parts.push(`tagged with ${operator}: ${tagList}`);
    }

    if (this.config.excludeTags && this.config.excludeTags.length > 0) {
      const excludeList = this.config.excludeTags.map(t => `'${t}'`).join(', ');
      parts.push(`excluding: ${excludeList}`);
    }

    return `Notes ${parts.join(' and ')}`;
  }

  clone(): FilterInterface {
    return new TagFilter({
      ...this.config,
      tags: [...this.config.tags],
      excludeTags: this.config.excludeTags ? [...this.config.excludeTags] : undefined,
    });
  }

  matches(note: Note): boolean {
    return this.matchTags(note.tags || []);
  }

  matchesWithContent(note: NoteWithContent): boolean {
    return this.matchTags(note.tags || []);
  }

  /**
   * Internal method to check if tags match the filter criteria
   */
  private matchTags(noteTags: string[]): boolean {
    // Normalize tags for comparison
    const normalizedNoteTags = this.config.caseSensitive
      ? noteTags
      : noteTags.map(t => t.toLowerCase());

    // Check exclude tags first (short-circuit if any match)
    if (this.config.excludeTags && this.config.excludeTags.length > 0) {
      const normalizedExcludeTags = this.config.caseSensitive
        ? this.config.excludeTags
        : this.config.excludeTags.map(t => t.toLowerCase());

      for (const excludeTag of normalizedExcludeTags) {
        if (normalizedNoteTags.includes(excludeTag)) {
          return false; // Note has an excluded tag
        }
      }
    }

    // If no include tags specified, just check exclusions (already passed)
    if (!this.config.tags || this.config.tags.length === 0) {
      return true;
    }

    // Normalize filter tags
    const normalizedFilterTags = this.config.caseSensitive
      ? this.config.tags
      : this.config.tags.map(t => t.toLowerCase());

    // Apply operator logic
    if (this.config.operator === LogicalOperator.AND) {
      // ALL filter tags must be present in note tags
      return normalizedFilterTags.every(filterTag =>
        normalizedNoteTags.includes(filterTag)
      );
    } else {
      // OR logic (default): ANY filter tag must be present
      return normalizedFilterTags.some(filterTag =>
        normalizedNoteTags.includes(filterTag)
      );
    }
  }
}
