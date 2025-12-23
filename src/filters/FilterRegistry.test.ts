import { describe, it, expect, beforeEach } from 'vitest';
import { FilterRegistry } from './FilterRegistry';
import { TagFilter } from './TagFilter';
import { FilterType } from './types';
import type { FilterConfig, FilterInterface } from './FilterInterface';

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
      }).toThrow('Filter configuration "type" must be a string, received number');
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
      registry.register(FilterType.DATE_RANGE, (config) => new TagFilter(config)); // Mock

      const types = registry.getAvailableTypes();
      expect(types).toHaveLength(2);
      expect(types).toContain(FilterType.TAG);
      expect(types).toContain(FilterType.DATE_RANGE);
    });
  });

  describe('clear', () => {
    it('should clear all registered filters', () => {
      registry.register(FilterType.TAG, (config) => new TagFilter(config));
      registry.register(FilterType.DATE_RANGE, (config) => new TagFilter(config));

      registry.clear();

      expect(registry.size).toBe(0);
      expect(registry.getAvailableTypes()).toEqual([]);
    });
  });

  describe('getAllMetadata', () => {
    it('should return all metadata', () => {
      const metadata1 = { displayName: 'Tag', description: 'Tag filter' };
      const metadata2 = { displayName: 'Date', description: 'Date filter' };

      registry.register(FilterType.TAG, (config) => new TagFilter(config), metadata1);
      registry.register(FilterType.DATE_RANGE, (config) => new TagFilter(config), metadata2);

      const allMetadata = registry.getAllMetadata();

      expect(allMetadata.size).toBe(2);
      expect(allMetadata.get(FilterType.TAG)).toEqual(metadata1);
      expect(allMetadata.get(FilterType.DATE_RANGE)).toEqual(metadata2);
    });
  });
});
