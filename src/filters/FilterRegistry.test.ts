import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilterRegistry } from './FilterRegistry';
import { TagFilter } from './TagFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { ContentFilter } from './ContentFilter';
import { FilterType, DateField, ComparisonOperator } from './types';
import type { FilterConfig } from './FilterInterface';
import {
  validateTagFilterConfig,
  validateDateRangeFilterConfig,
  validateContentFilterConfig,
} from './configSchemas';

describe('FilterRegistry', () => {
  let registry: FilterRegistry;

  beforeEach(() => {
    registry = new FilterRegistry();
  });

  describe('register', () => {
    it('should register a filter factory', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);
      registry.register(FilterType.TAG, factory);

      expect(registry.isRegistered(FilterType.TAG)).toBe(true);
      expect(registry.size).toBe(1);
    });

    it('should register with metadata', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);
      const metadata = {
        displayName: 'Tag Filter',
        description: 'Filter by tags',
      };

      registry.register(FilterType.TAG, factory, metadata);

      const storedMetadata = registry.getMetadata(FilterType.TAG);
      expect(storedMetadata).toEqual(metadata);
    });

    it('should throw error when registering duplicate type', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);
      registry.register(FilterType.TAG, factory);

      expect(() => {
        registry.register(FilterType.TAG, factory);
      }).toThrow("Filter type 'TAG' is already registered");
    });

    describe('type parameter validation', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);

      it('should throw error for null type', () => {
        expect(() => {
          registry.register(null as any, factory);
        }).toThrow('Filter type cannot be null or undefined');
      });

      it('should throw error for undefined type', () => {
        expect(() => {
          registry.register(undefined as any, factory);
        }).toThrow('Filter type cannot be null or undefined');
      });

      it('should throw error for non-string type', () => {
        expect(() => {
          registry.register(123 as any, factory);
        }).toThrow('Filter type must be a string, received number');
      });

      it('should throw error for object type', () => {
        expect(() => {
          registry.register({ type: 'TAG' } as any, factory);
        }).toThrow('Filter type must be a string, received object');
      });

      it('should throw error for empty string type', () => {
        expect(() => {
          registry.register('', factory);
        }).toThrow('Filter type cannot be an empty string');
      });

      it('should throw error for whitespace-only type', () => {
        expect(() => {
          registry.register('   ', factory);
        }).toThrow('Filter type cannot be an empty string');
      });
    });

    describe('factory parameter validation', () => {
      it('should throw error for null factory', () => {
        expect(() => {
          registry.register(FilterType.TAG, null as any);
        }).toThrow('Filter factory cannot be null or undefined');
      });

      it('should throw error for undefined factory', () => {
        expect(() => {
          registry.register(FilterType.TAG, undefined as any);
        }).toThrow('Filter factory cannot be null or undefined');
      });

      it('should throw error for non-function factory', () => {
        expect(() => {
          registry.register(FilterType.TAG, 'not a function' as any);
        }).toThrow('Filter factory must be a function, received string');
      });

      it('should throw error for object factory', () => {
        expect(() => {
          registry.register(FilterType.TAG, {} as any);
        }).toThrow('Filter factory must be a function, received object');
      });

      it('should throw error for number factory', () => {
        expect(() => {
          registry.register(FilterType.TAG, 123 as any);
        }).toThrow('Filter factory must be a function, received number');
      });
    });

    describe('metadata parameter validation', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);

      it('should throw error for non-object metadata', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, 'invalid' as any);
        }).toThrow(
          'Filter metadata must be an object, not an array or primitive'
        );
      });

      it('should throw error for array metadata', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, [] as any);
        }).toThrow(
          'Filter metadata must be an object, not an array or primitive'
        );
      });

      it('should throw error for metadata missing displayName', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            description: 'Test',
          } as any);
        }).toThrow('Filter metadata must include a "displayName" property');
      });

      it('should throw error for metadata missing description', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
          } as any);
        }).toThrow('Filter metadata must include a "description" property');
      });

      it('should throw error for non-string displayName', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 123,
            description: 'Test',
          } as any);
        }).toThrow('Filter metadata "displayName" must be a string');
      });

      it('should throw error for non-string description', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: true,
          } as any);
        }).toThrow('Filter metadata "description" must be a string');
      });

      it('should throw error for empty displayName', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: '',
            description: 'Test',
          });
        }).toThrow('Filter metadata "displayName" cannot be empty');
      });

      it('should throw error for whitespace-only displayName', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: '   ',
            description: 'Test',
          });
        }).toThrow('Filter metadata "displayName" cannot be empty');
      });

      it('should throw error for empty description', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: '',
          });
        }).toThrow('Filter metadata "description" cannot be empty');
      });

      it('should throw error for whitespace-only description', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: '   ',
          });
        }).toThrow('Filter metadata "description" cannot be empty');
      });

      it('should throw error for non-string category', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            category: 123,
          } as any);
        }).toThrow('Filter metadata "category" must be a string');
      });

      it('should throw error for empty category', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            category: '',
          });
        }).toThrow('Filter metadata "category" cannot be empty');
      });

      it('should throw error for non-function configSchema', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            configSchema: 'not a function',
          } as any);
        }).toThrow('Filter metadata "configSchema" must be a function');
      });

      it('should throw error for non-object example', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            example: 'invalid',
          } as any);
        }).toThrow(
          'Filter metadata "example" must be a valid FilterConfig object'
        );
      });

      it('should throw error for null example', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            example: null,
          } as any);
        }).toThrow(
          'Filter metadata "example" must be a valid FilterConfig object'
        );
      });

      it('should throw error for array example', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            example: [],
          } as any);
        }).toThrow(
          'Filter metadata "example" must be a valid FilterConfig object'
        );
      });

      it('should throw error for example missing type field', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            example: { tags: ['work'] },
          } as any);
        }).toThrow('Filter metadata "example" must have a "type" field');
      });

      it('should throw error for example with non-string type', () => {
        expect(() => {
          registry.register(FilterType.TAG, factory, {
            displayName: 'Test',
            description: 'Test',
            example: { type: 123, tags: ['work'] },
          } as any);
        }).toThrow('Filter metadata "example.type" must be a string');
      });

      it('should accept valid metadata with all optional fields', () => {
        const validMetadata = {
          displayName: 'Tag Filter',
          description: 'Filter notes by tags',
          category: 'Content',
          configSchema: validateTagFilterConfig,
          example: {
            type: FilterType.TAG,
            tags: ['work'],
          },
        };

        expect(() => {
          registry.register(FilterType.TAG, factory, validMetadata);
        }).not.toThrow();

        expect(registry.getMetadata(FilterType.TAG)).toEqual(validMetadata);
      });
    });
  });

  describe('unregister', () => {
    it('should unregister a filter type', () => {
      const factory = (config: FilterConfig) => new TagFilter(config);
      registry.register(FilterType.TAG, factory);

      const removed = registry.unregister(FilterType.TAG);

      expect(removed).toBe(true);
      expect(registry.isRegistered(FilterType.TAG)).toBe(false);
    });

    it('should return false when unregistering non-existent type', () => {
      const removed = registry.unregister(FilterType.TAG);
      expect(removed).toBe(false);
    });
  });

  describe('createFromConfig', () => {
    beforeEach(() => {
      registry.register(FilterType.TAG, (config) => new TagFilter(config));
    });

    it('should create filter from valid config', () => {
      const config = {
        type: FilterType.TAG,
        tags: ['work'],
      };

      const filter = registry.createFromConfig(config);

      expect(filter).toBeInstanceOf(TagFilter);
      expect(filter.filterType).toBe(FilterType.TAG);
    });

    it('should throw error for null config', () => {
      expect(() => {
        registry.createFromConfig(null as any);
      }).toThrow('Filter configuration cannot be null or undefined');
    });

    it('should throw error for undefined config', () => {
      expect(() => {
        registry.createFromConfig(undefined as any);
      }).toThrow('Filter configuration cannot be null or undefined');
    });

    it('should throw error for non-object config', () => {
      expect(() => {
        registry.createFromConfig('invalid' as any);
      }).toThrow('Filter configuration must be an object, received string');
    });

    it('should throw error for number config', () => {
      expect(() => {
        registry.createFromConfig(123 as any);
      }).toThrow('Filter configuration must be an object, received number');
    });

    it('should throw error for array config', () => {
      expect(() => {
        registry.createFromConfig(['TAG', 'work'] as any);
      }).toThrow('Filter configuration cannot be an array');
    });

    it('should throw error for missing type field', () => {
      const config = {
        tags: ['work'],
      } as any;

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow('Filter configuration must have a "type" field');
    });

    it('should throw error for non-string type', () => {
      const config = {
        type: 123,
        tags: ['work'],
      } as any;

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow(
        'Filter configuration "type" must be a string, received number'
      );
    });

    it('should throw error for empty string type', () => {
      const config = {
        type: '',
        tags: ['work'],
      } as any;

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow('Filter configuration "type" cannot be an empty string');
    });

    it('should throw error for whitespace-only type', () => {
      const config = {
        type: '   ',
        tags: ['work'],
      } as any;

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow('Filter configuration "type" cannot be an empty string');
    });

    it('should throw error for unregistered type', () => {
      const config = {
        type: 'UNKNOWN_TYPE',
        tags: ['work'],
      };

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow("No factory registered for filter type 'UNKNOWN_TYPE'");
    });

    it('should throw error when created filter is invalid', () => {
      const config = {
        type: FilterType.TAG,
        tags: [], // Invalid - no tags
      };

      expect(() => {
        registry.createFromConfig(config);
      }).toThrow('Filter validation failed');
    });
  });

  describe('getAvailableTypes', () => {
    it('should return empty array when no filters registered', () => {
      expect(registry.getAvailableTypes()).toEqual([]);
    });

    it('should return all registered types', () => {
      registry.register(FilterType.TAG, (config) => new TagFilter(config));
      registry.register(
        FilterType.DATE_RANGE,
        (config) => new TagFilter(config)
      ); // Mock

      const types = registry.getAvailableTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain(FilterType.TAG);
      expect(types).toContain(FilterType.DATE_RANGE);
    });
  });

  describe('clear', () => {
    it('should clear all registered filters', () => {
      registry.register(FilterType.TAG, (config) => new TagFilter(config));
      registry.register(
        FilterType.DATE_RANGE,
        (config) => new TagFilter(config)
      );

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAvailableTypes()).toEqual([]);
    });
  });

  describe('getAllMetadata', () => {
    it('should return all metadata', () => {
      const metadata1 = { displayName: 'Tag', description: 'Tag filter' };
      const metadata2 = { displayName: 'Date', description: 'Date filter' };

      registry.register(
        FilterType.TAG,
        (config) => new TagFilter(config),
        metadata1
      );
      registry.register(
        FilterType.DATE_RANGE,
        (config) => new TagFilter(config),
        metadata2
      );

      const allMetadata = registry.getAllMetadata();

      expect(allMetadata.size).toBe(2);
      expect(allMetadata.get(FilterType.TAG)).toEqual(metadata1);
      expect(allMetadata.get(FilterType.DATE_RANGE)).toEqual(metadata2);
    });
  });

  describe('Config Schema Validation', () => {
    describe('validates configs BEFORE filter creation', () => {
      it('should reject invalid TagFilter config before constructor runs', () => {
        // Register with schema validator
        const factorySpy = vi.fn((config) => new TagFilter(config));
        registry.register(FilterType.TAG, factorySpy, {
          displayName: 'Tag Filter',
          description: 'Filter by tags',
          configSchema: validateTagFilterConfig,
        });

        const invalidConfig = {
          type: FilterType.TAG,
          tags: [], // Invalid - empty array
        };

        // Should throw before calling factory
        expect(() => {
          registry.createFromConfig(invalidConfig);
        }).toThrow('Invalid configuration for TAG filter');

        // Factory should NEVER be called for invalid configs
        expect(factorySpy).not.toHaveBeenCalled();
      });

      it('should reject invalid DateRangeFilter config before constructor runs', () => {
        const factorySpy = vi.fn((config) => new DateRangeFilter(config));
        registry.register(FilterType.DATE_RANGE, factorySpy, {
          displayName: 'Date Range Filter',
          description: 'Filter by date',
          configSchema: validateDateRangeFilterConfig,
        });

        const invalidConfig = {
          type: FilterType.DATE_RANGE,
          // Missing required 'field' property
        };

        expect(() => {
          registry.createFromConfig(invalidConfig);
        }).toThrow('Invalid configuration for DATE_RANGE filter');

        // Factory should NEVER be called for invalid configs
        expect(factorySpy).not.toHaveBeenCalled();
      });

      it('should reject invalid ContentFilter config before constructor runs', () => {
        const factorySpy = vi.fn((config) => new ContentFilter(config));
        registry.register(FilterType.CONTENT, factorySpy, {
          displayName: 'Content Filter',
          description: 'Filter by content',
          configSchema: validateContentFilterConfig,
        });

        const invalidConfig = {
          type: FilterType.CONTENT,
          // Missing required 'query' or 'pattern'
        };

        expect(() => {
          registry.createFromConfig(invalidConfig);
        }).toThrow('Invalid configuration for CONTENT filter');

        // Factory should NEVER be called for invalid configs
        expect(factorySpy).not.toHaveBeenCalled();
      });
    });

    describe('TagFilter schema validation', () => {
      beforeEach(() => {
        registry.register(FilterType.TAG, (config) => new TagFilter(config), {
          displayName: 'Tag Filter',
          description: 'Filter by tags',
          configSchema: validateTagFilterConfig,
        });
      });

      it('should reject config with empty tags array', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: [],
          });
        }).toThrow('At least one tag or excludeTag must be specified');
      });

      it('should reject config with non-array tags', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: 'work' as any,
          });
        }).toThrow('tags: Must be an array');
      });

      it('should reject config with empty string tags', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: ['work', ''],
          });
        }).toThrow('tags: All tags must be non-empty strings');
      });

      it('should reject config with non-string tags', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: ['work', 123 as any],
          });
        }).toThrow('tags: All tags must be non-empty strings');
      });

      it('should reject config with invalid operator', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: ['work'],
            operator: 'INVALID' as any,
          });
        }).toThrow('operator: Must be AND or OR for TagFilter');
      });

      it('should reject config with non-boolean caseSensitive', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: ['work'],
            caseSensitive: 'true' as any,
          });
        }).toThrow('caseSensitive: Must be a boolean');
      });

      it('should accept valid config with tags', () => {
        const filter = registry.createFromConfig({
          type: FilterType.TAG,
          tags: ['work', 'urgent'],
        });
        expect(filter).toBeInstanceOf(TagFilter);
      });

      it('should accept valid config with excludeTags only', () => {
        const filter = registry.createFromConfig({
          type: FilterType.TAG,
          excludeTags: ['archived'],
        });
        expect(filter).toBeInstanceOf(TagFilter);
      });
    });

    describe('DateRangeFilter schema validation', () => {
      beforeEach(() => {
        registry.register(
          FilterType.DATE_RANGE,
          (config) => new DateRangeFilter(config),
          {
            displayName: 'Date Range Filter',
            description: 'Filter by date',
            configSchema: validateDateRangeFilterConfig,
          }
        );
      });

      it('should reject config without field', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            preset: 'LAST_7_DAYS',
          } as any);
        }).toThrow('field: Date field must be specified');
      });

      it('should reject config with invalid field', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            field: 'invalid_field' as any,
            preset: 'LAST_7_DAYS',
          });
        }).toThrow('field: Must be either created_at or modified_at');
      });

      it('should reject config without preset or custom range', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
          });
        }).toThrow(
          'Either preset or custom range (start/end) must be specified'
        );
      });

      it('should reject config with non-finite start', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
            start: NaN,
          });
        }).toThrow('start: Must be a finite number');
      });

      it('should reject config with non-finite end', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
            end: Infinity,
          });
        }).toThrow('end: Must be a finite number');
      });

      it('should reject config where start is after end', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
            start: 1000,
            end: 500,
          });
        }).toThrow('start/end: Start date must be before or equal to end date');
      });

      it('should accept valid config with preset', () => {
        const filter = registry.createFromConfig({
          type: FilterType.DATE_RANGE,
          field: DateField.CREATED_AT,
          preset: 'LAST_7_DAYS',
        });
        expect(filter).toBeInstanceOf(DateRangeFilter);
      });

      it('should accept valid config with custom range', () => {
        const filter = registry.createFromConfig({
          type: FilterType.DATE_RANGE,
          field: DateField.MODIFIED_AT,
          start: 500,
          end: 1000,
        });
        expect(filter).toBeInstanceOf(DateRangeFilter);
      });
    });

    describe('ContentFilter schema validation', () => {
      beforeEach(() => {
        registry.register(
          FilterType.CONTENT,
          (config) => new ContentFilter(config),
          {
            displayName: 'Content Filter',
            description: 'Filter by content',
            configSchema: validateContentFilterConfig,
          }
        );
      });

      it('should reject config without query or pattern', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
          });
        }).toThrow('Either query or pattern must be specified');
      });

      it('should reject config with non-string query', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            query: 123 as any,
          });
        }).toThrow('query: Must be a string');
      });

      it('should reject config with empty query', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            query: '   ',
          });
        }).toThrow('query: Must be a non-empty string');
      });

      it('should reject config with non-string pattern', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            pattern: ['regex'] as any,
          });
        }).toThrow('pattern: Must be a string');
      });

      it('should reject config with both search fields disabled', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            query: 'test',
            searchTitle: false,
            searchContent: false,
          });
        }).toThrow('At least one of searchTitle or searchContent must be true');
      });

      it('should reject config with non-boolean searchTitle', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            query: 'test',
            searchTitle: 'true' as any,
          });
        }).toThrow('searchTitle: Must be a boolean');
      });

      it('should reject config with invalid regex pattern', () => {
        expect(() => {
          registry.createFromConfig({
            type: FilterType.CONTENT,
            pattern: '[invalid(',
            operator: ComparisonOperator.MATCHES_REGEX,
          });
        }).toThrow('Invalid regex pattern');
      });

      it('should accept valid config with query', () => {
        const filter = registry.createFromConfig({
          type: FilterType.CONTENT,
          query: 'important',
        });
        expect(filter).toBeInstanceOf(ContentFilter);
      });

      it('should accept valid config with pattern', () => {
        const filter = registry.createFromConfig({
          type: FilterType.CONTENT,
          pattern: 'TODO: .*',
          operator: ComparisonOperator.MATCHES_REGEX,
        });
        expect(filter).toBeInstanceOf(ContentFilter);
      });
    });

    describe('filters without schema', () => {
      it('should allow filter creation when no schema is registered', () => {
        // Register without schema
        registry.register(FilterType.TAG, (config) => new TagFilter(config), {
          displayName: 'Tag Filter',
          description: 'Filter by tags',
          // No configSchema
        });

        // Should still work (no schema validation, only basic + filter.validate())
        const filter = registry.createFromConfig({
          type: FilterType.TAG,
          tags: ['work'],
        });

        expect(filter).toBeInstanceOf(TagFilter);
      });

      it('should still reject if filter.validate() fails even without schema', () => {
        // Register without schema
        registry.register(FilterType.TAG, (config) => new TagFilter(config), {
          displayName: 'Tag Filter',
          description: 'Filter by tags',
          // No configSchema
        });

        // Should fail at filter.validate() stage
        expect(() => {
          registry.createFromConfig({
            type: FilterType.TAG,
            tags: [], // Invalid
          });
        }).toThrow('Filter validation failed');
      });
    });
  });
});
