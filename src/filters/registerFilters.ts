/**
 * Register all built-in filters with the filter registry
 *
 * This file is separate from FilterRegistry.ts to avoid circular dependencies
 * since filter implementations import from FilterInterface, which is re-exported
 * through the registry module.
 */

import { filterRegistry } from './FilterRegistry';
import { TagFilter } from './TagFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { ContentFilter } from './ContentFilter';
import { CompositeFilter } from './CompositeFilter';
import {
  FilterType,
  DateRangePreset,
  DateField,
  ComparisonOperator,
} from './types';
import {
  validateTagFilterConfig,
  validateDateRangeFilterConfig,
  validateContentFilterConfig,
  validateCompositeFilterConfig,
} from './configSchemas';

/**
 * Register all built-in filter types with the global filter registry
 * Call this during app initialization in the main process
 */
export function registerBuiltInFilters(): void {
  // Register TagFilter
  filterRegistry.register(FilterType.TAG, (config) => new TagFilter(config), {
    displayName: 'Tag Filter',
    description: 'Filter notes by tags with AND/OR logic and exclusions',
    category: 'Basic',
    example: { type: FilterType.TAG, tags: ['work'] },
    configSchema: validateTagFilterConfig,
  });

  // Register DateRangeFilter
  filterRegistry.register(
    FilterType.DATE_RANGE,
    (config) => new DateRangeFilter(config),
    {
      displayName: 'Date Range Filter',
      description: 'Filter notes by creation or modification date',
      category: 'Basic',
      example: {
        type: FilterType.DATE_RANGE,
        field: DateField.CREATED_AT,
        preset: DateRangePreset.LAST_7_DAYS,
      },
      configSchema: validateDateRangeFilterConfig,
    }
  );

  // Register ContentFilter
  filterRegistry.register(
    FilterType.CONTENT,
    (config) => new ContentFilter(config),
    {
      displayName: 'Content Filter',
      description: 'Filter notes by text content or regex patterns',
      category: 'Basic',
      example: {
        type: FilterType.CONTENT,
        query: 'important',
        operator: ComparisonOperator.CONTAINS,
      },
      configSchema: validateContentFilterConfig,
    }
  );

  // Register CompositeFilter
  filterRegistry.register(
    FilterType.COMPOSITE,
    (config) => {
      const composite = new CompositeFilter(config, (childConfig) =>
        filterRegistry.createFromConfig(childConfig)
      );
      return composite;
    },
    {
      displayName: 'Composite Filter',
      description: 'Combine multiple filters with AND/OR/NOT logic',
      category: 'Advanced',
      example: {
        type: FilterType.COMPOSITE,
        operator: 'AND',
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          {
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
            preset: DateRangePreset.THIS_WEEK,
          },
        ],
      },
      configSchema: validateCompositeFilterConfig,
    }
  );
}
