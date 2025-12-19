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
 * - Types and enums for common filter operations
 *
 * Usage example:
 * ```typescript
 * import { FilterInterface, FilterConfig } from './filters';
 *
 * // Concrete filter implementation (to be created)
 * class TagFilter extends FilterInterface {
 *   // ... implementation
 * }
 *
 * // Apply filter to notes
 * const filter = new TagFilter({ tags: ['work'] });
 * const filtered = filter.apply(allNotes);
 *
 * // Serialize for storage
 * const config = filter.serialize();
 * const json = JSON.stringify(config);
 *
 * // Deserialize and recreate
 * const restoredFilter = createFilterFromConfig(JSON.parse(json));
 * ```
 */

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
