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
 * Configuration for CompositeFilter
 */
export interface CompositeFilterConfig extends FilterConfig {
  type: typeof FilterType.COMPOSITE;

  /** Logical operator for combining filters */
  operator: LogicalOperator;

  /** Filters to combine */
  filters: FilterConfig[];
}

/**
 * Combine multiple filters with logical operators
 *
 * Supports:
 * - AND: All filters must match
 * - OR: At least one filter must match
 * - NOT: Negates a single filter
 * - Nested composition (composite filters within composite filters)
 *
 * Examples:
 * ```typescript
 * // Work notes created this week
 * new CompositeFilter({
 *   operator: LogicalOperator.AND,
 *   filters: [
 *     { type: FilterType.TAG, tags: ['work'] },
 *     { type: FilterType.DATE_RANGE, preset: DateRangePreset.THIS_WEEK, field: 'created_at' }
 *   ]
 * })
 *
 * // Notes with 'work' OR 'personal' tags
 * new CompositeFilter({
 *   operator: LogicalOperator.OR,
 *   filters: [
 *     { type: FilterType.TAG, tags: ['work'] },
 *     { type: FilterType.TAG, tags: ['personal'] }
 *   ]
 * })
 *
 * // Notes NOT tagged 'archived'
 * new CompositeFilter({
 *   operator: LogicalOperator.NOT,
 *   filters: [{ type: FilterType.TAG, tags: ['archived'] }]
 * })
 * ```
 */
export class CompositeFilter extends FilterInterface {
  readonly filterType = FilterType.COMPOSITE;
  private config: CompositeFilterConfig;
  private childFilters: FilterInterface[];

  constructor(
    config: Omit<CompositeFilterConfig, 'type'> | CompositeFilterConfig,
    filterFactory?: (config: FilterConfig) => FilterInterface
  ) {
    super();
    this.config = {
      type: FilterType.COMPOSITE,
      ...config,
    };

    // Create child filter instances
    this.childFilters = [];
    if (filterFactory) {
      for (const filterConfig of this.config.filters) {
        this.childFilters.push(filterFactory(filterConfig));
      }
    }
  }

  /**
   * Set the child filter instances (used when filters are created externally)
   */
  setChildFilters(filters: FilterInterface[]): void {
    this.childFilters = filters;
  }

  apply(notes: Note[]): Note[] {
    if (this.childFilters.length === 0) {
      return notes;
    }

    return notes.filter((note) => this.matches(note));
  }

  applyWithContent(notes: NoteWithContent[]): NoteWithContent[] {
    if (this.childFilters.length === 0) {
      return notes;
    }

    return notes.filter((note) => this.matchesWithContent(note));
  }

  serialize(): FilterConfig {
    return {
      type: this.config.type,
      operator: this.config.operator,
      filters: this.config.filters.map((f) => ({ ...f })),
    };
  }

  validate(): FilterValidationResult {
    const errors: string[] = [];

    // Operator must be specified
    if (!this.config.operator) {
      errors.push('Operator must be specified');
    }

    // Validate operator value
    if (
      this.config.operator !== LogicalOperator.AND &&
      this.config.operator !== LogicalOperator.OR &&
      this.config.operator !== LogicalOperator.NOT
    ) {
      errors.push('Operator must be AND, OR, or NOT');
    }

    // Must have at least one filter
    if (!this.config.filters || this.config.filters.length === 0) {
      errors.push('At least one filter must be specified');
    }

    // NOT operator must have exactly one filter
    if (
      this.config.operator === LogicalOperator.NOT &&
      this.config.filters.length !== 1
    ) {
      errors.push('NOT operator must have exactly one filter');
    }

    // AND/OR operators should have at least one filter (ideally 2+)
    if (
      (this.config.operator === LogicalOperator.AND ||
        this.config.operator === LogicalOperator.OR) &&
      this.config.filters.length < 1
    ) {
      errors.push(
        `${this.config.operator} operator must have at least one filter`
      );
    }

    // Validate each child filter
    for (let i = 0; i < this.childFilters.length; i++) {
      const childValidation = this.childFilters[i].validate();
      if (!childValidation.isValid) {
        errors.push(
          `Filter ${i + 1} validation failed: ${childValidation.errors.join(', ')}`
        );
      }
    }

    return errors.length === 0
      ? validationSuccess()
      : validationFailure(errors);
  }

  getDescription(): string {
    if (this.childFilters.length === 0) {
      return 'Composite filter (no filters)';
    }

    const descriptions = this.childFilters.map((f) => f.getDescription());

    switch (this.config.operator) {
      case LogicalOperator.AND:
        return `(${descriptions.join(' AND ')})`;

      case LogicalOperator.OR:
        return `(${descriptions.join(' OR ')})`;

      case LogicalOperator.NOT:
        return `NOT (${descriptions[0]})`;

      default:
        return `Composite filter with ${this.childFilters.length} filters`;
    }
  }

  clone(): FilterInterface {
    const clonedConfig: CompositeFilterConfig = {
      type: FilterType.COMPOSITE,
      operator: this.config.operator,
      filters: this.config.filters.map((f) => ({ ...f })),
    };

    const cloned = new CompositeFilter(clonedConfig);
    cloned.setChildFilters(this.childFilters.map((f) => f.clone()));
    return cloned;
  }

  matches(note: Note): boolean {
    if (this.childFilters.length === 0) {
      return true;
    }

    switch (this.config.operator) {
      case LogicalOperator.AND:
        return this.childFilters.every((filter) => filter.matches(note));

      case LogicalOperator.OR:
        return this.childFilters.some((filter) => filter.matches(note));

      case LogicalOperator.NOT:
        return !this.childFilters[0].matches(note);

      default:
        return false;
    }
  }

  matchesWithContent(note: NoteWithContent): boolean {
    if (this.childFilters.length === 0) {
      return true;
    }

    switch (this.config.operator) {
      case LogicalOperator.AND:
        return this.childFilters.every((filter) =>
          filter.matchesWithContent(note)
        );

      case LogicalOperator.OR:
        return this.childFilters.some((filter) =>
          filter.matchesWithContent(note)
        );

      case LogicalOperator.NOT:
        return !this.childFilters[0].matchesWithContent(note);

      default:
        return false;
    }
  }

  /**
   * Get the child filters for inspection/manipulation
   */
  getChildFilters(): FilterInterface[] {
    return [...this.childFilters];
  }

  /**
   * Get the operator used to combine filters
   */
  getOperator(): LogicalOperator {
    return this.config.operator;
  }
}
