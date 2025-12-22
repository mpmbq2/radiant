/**
 * Filter System Module
 *
 * This module provides a configuration-driven filter architecture for notes.
 * Filters can be applied to collections of notes to narrow down results based
 * on various criteria such as tags, dates, content, and more.
 *
 * Core components:
 * - FilterInterface: Abstract base class for all filters
 * - FilterConfig: Serializable configuration format
 * - FilterFactory: Function type for creating filters from config
 * - Concrete filter implementations: TagFilter, DateRangeFilter, ContentFilter, CompositeFilter
 * - FilterRegistry: Registry for creating filters from configuration
 *
 * Usage example:
 * ```typescript
 * import { TagFilter, filterRegistry, registerBuiltInFilters } from './filters';
 *
 * // Register built-in filters
 * registerBuiltInFilters();
 *
 * // Apply filter directly
 * const filter = new TagFilter({ tags: ['work'] });
 * const filtered = filter.apply(allNotes);
 *
 * // Or create from configuration
 * const config = { type: 'TAG', tags: ['work'] };
 * const filter = filterRegistry.createFromConfig(config);
 * const filtered = filter.apply(allNotes);
 * ```
 */

// Base interfaces and types
export {
  FilterInterface,
  FilterConfig,
  FilterValidationResult,
  FilterFactory,
  validationSuccess,
  validationFailure,
} from './FilterInterface';

export {
  LogicalOperator,
  ComparisonOperator,
  DateRangePreset,
  DateField,
  SortDirection,
  SortField,
  FilterType,
} from './types';

// Concrete filter implementations
export { TagFilter, TagFilterConfig } from './TagFilter';
export { DateRangeFilter, DateRangeFilterConfig } from './DateRangeFilter';
export { ContentFilter, ContentFilterConfig } from './ContentFilter';
export { CompositeFilter, CompositeFilterConfig } from './CompositeFilter';

// Registry
export {
  FilterRegistry,
  FilterMetadata,
  filterRegistry,
} from './FilterRegistry';

// Filter registration
export { registerBuiltInFilters } from './registerFilters';
