import { describe, it, expect, beforeEach } from 'vitest';
import { FilterConfigService } from './FilterConfigService';
import type { FilterConfigRepository } from './FilterConfigService';
import type { SavedFilter } from './filterConfig';
import { FilterType, DateField, DateRangePreset } from './types';
import { registerBuiltInFilters } from './registerFilters';

// Mock repository implementation for testing
class MockFilterConfigRepository implements FilterConfigRepository {
  private filters: Map<string, SavedFilter> = new Map();

  async save(filter: SavedFilter): Promise<void> {
    this.filters.set(filter.metadata.id, filter);
  }

  async getById(id: string): Promise<SavedFilter | null> {
    return this.filters.get(id) || null;
  }

  async getAll(): Promise<SavedFilter[]> {
    return Array.from(this.filters.values());
  }

  async delete(id: string): Promise<boolean> {
    return this.filters.delete(id);
  }

  async update(id: string, filter: SavedFilter): Promise<void> {
    this.filters.set(id, filter);
  }

  async search(query: string): Promise<SavedFilter[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.filters.values()).filter(f =>
      f.metadata.name.toLowerCase().includes(lowerQuery) ||
      f.metadata.description?.toLowerCase().includes(lowerQuery)
    );
  }

  // Test helper
  clear(): void {
    this.filters.clear();
  }
}

describe('FilterConfigService', () => {
  let service: FilterConfigService;
  let repository: MockFilterConfigRepository;

  beforeEach(() => {
    // Register built-in filters for validation
    registerBuiltInFilters();

    service = new FilterConfigService();
    repository = new MockFilterConfigRepository();
    service.setRepository(repository);
  });

  describe('saveFilter', () => {
    it('should save a valid filter', async () => {
      const config = {
        type: FilterType.TAG,
        tags: ['work'],
      };

      const saved = await service.saveFilter('Work Notes', 'All work-related notes', config);

      expect(saved.metadata.name).toBe('Work Notes');
      expect(saved.metadata.description).toBe('All work-related notes');
      expect(saved.metadata.isPreset).toBe(false);
      expect(saved.config).toEqual(config);
    });

    it('should save filter with optional metadata', async () => {
      const config = {
        type: FilterType.TAG,
        tags: ['urgent'],
      };

      const saved = await service.saveFilter('Urgent', 'Urgent items', config, {
        tags: ['important', 'priority'],
        icon: 'alert',
        color: '#ff0000',
      });

      expect(saved.metadata.tags).toEqual(['important', 'priority']);
      expect(saved.metadata.icon).toBe('alert');
      expect(saved.metadata.color).toBe('#ff0000');
    });

    it('should reject invalid filter configuration', async () => {
      const invalidConfig = {
        type: FilterType.TAG,
        tags: [], // Invalid - empty tags
      };

      await expect(
        service.saveFilter('Invalid', 'Invalid filter', invalidConfig)
      ).rejects.toThrow('Invalid filter configuration');
    });
  });

  describe('getFilterById', () => {
    it('should retrieve saved filter by ID', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      const saved = await service.saveFilter('Test', 'Test filter', config);

      const retrieved = await service.getFilterById(saved.metadata.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.metadata.name).toBe('Test');
    });

    it('should retrieve preset filter by ID', async () => {
      const preset = await service.getFilterById('preset:today');

      expect(preset).not.toBeNull();
      expect(preset?.metadata.isPreset).toBe(true);
    });

    it('should return null for non-existent ID', async () => {
      const result = await service.getFilterById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('updateFilter', () => {
    it('should update filter metadata', async () => {
      const config = { type: FilterType.TAG, tags: ['work'] };
      const saved = await service.saveFilter('Work', 'Work notes', config);

      const updated = await service.updateFilter(saved.metadata.id, {
        name: 'Work Items',
        description: 'All work items',
      });

      expect(updated.metadata.name).toBe('Work Items');
      expect(updated.metadata.description).toBe('All work items');
      expect(updated.metadata.modifiedAt).toBeGreaterThan(saved.metadata.modifiedAt);
    });

    it('should update filter configuration', async () => {
      const config = { type: FilterType.TAG, tags: ['work'] };
      const saved = await service.saveFilter('Work', 'Work notes', config);

      const newConfig = { type: FilterType.TAG, tags: ['work', 'urgent'] };
      const updated = await service.updateFilter(saved.metadata.id, {
        config: newConfig,
      });

      expect(updated.config).toEqual(newConfig);
    });

    it('should reject updating presets', async () => {
      await expect(
        service.updateFilter('preset:today', { name: 'Modified' })
      ).rejects.toThrow('Cannot update built-in preset filters');
    });

    it('should reject invalid updated configuration', async () => {
      const config = { type: FilterType.TAG, tags: ['work'] };
      const saved = await service.saveFilter('Work', 'Work notes', config);

      const invalidConfig = { type: FilterType.TAG, tags: [] };

      await expect(
        service.updateFilter(saved.metadata.id, { config: invalidConfig })
      ).rejects.toThrow('Invalid filter configuration');
    });
  });

  describe('deleteFilter', () => {
    it('should delete a saved filter', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      const saved = await service.saveFilter('Test', 'Test filter', config);

      const deleted = await service.deleteFilter(saved.metadata.id);

      expect(deleted).toBe(true);

      const retrieved = await service.getFilterById(saved.metadata.id);
      expect(retrieved).toBeNull();
    });

    it('should reject deleting presets', async () => {
      await expect(
        service.deleteFilter('preset:today')
      ).rejects.toThrow('Cannot delete built-in preset filters');
    });

    it('should return false for non-existent filter', async () => {
      const deleted = await service.deleteFilter('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('getAllFilters', () => {
    it('should return both presets and saved filters', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      await service.saveFilter('Test 1', 'Test filter 1', config);
      await service.saveFilter('Test 2', 'Test filter 2', config);

      const all = await service.getAllFilters();

      const presets = all.filter(f => f.metadata.isPreset);
      const saved = all.filter(f => !f.metadata.isPreset);

      expect(presets.length).toBeGreaterThan(0); // Has built-in presets
      expect(saved.length).toBe(2);
    });
  });

  describe('searchFilters', () => {
    it('should search in both presets and saved filters', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      await service.saveFilter('Work Notes', 'All work items', config);

      const results = await service.searchFilters('work');

      expect(results.length).toBeGreaterThan(0);
      const hasWorkNote = results.some(f => f.metadata.name === 'Work Notes');
      expect(hasWorkNote).toBe(true);
    });
  });

  describe('validateFilterConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        type: FilterType.DATE_RANGE,
        field: DateField.CREATED_AT,
        preset: DateRangePreset.TODAY,
      };

      const result = service.validateFilterConfig(config);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject unknown filter type', () => {
      const config = {
        type: 'UNKNOWN_TYPE',
        someField: 'value',
      };

      const result = service.validateFilterConfig(config);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should warn about deep nesting', () => {
      // Create deeply nested composite filter
      const config = {
        type: FilterType.COMPOSITE,
        operator: 'AND',
        filters: [
          {
            type: FilterType.COMPOSITE,
            operator: 'AND',
            filters: [
              {
                type: FilterType.COMPOSITE,
                operator: 'AND',
                filters: [
                  {
                    type: FilterType.COMPOSITE,
                    operator: 'AND',
                    filters: [
                      { type: FilterType.TAG, tags: ['test'] },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      };

      const result = service.validateFilterConfig(config);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    });
  });

  describe('exportFilters', () => {
    it('should export all filters by default', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      await service.saveFilter('Test 1', 'Test filter', config);

      const result = await service.exportFilters();

      expect(result.success).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    it('should export only user filters when specified', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      await service.saveFilter('Test 1', 'Test filter', config);

      const result = await service.exportFilters({
        includePresets: false,
        includeUserFilters: true,
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
    });

    it('should export specific filters by ID', async () => {
      const config = { type: FilterType.TAG, tags: ['test'] };
      const saved = await service.saveFilter('Test', 'Test filter', config);

      const result = await service.exportFilters({
        filterIds: [saved.metadata.id],
      });

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);
      expect(result.filterIds).toContain(saved.metadata.id);
    });
  });

  describe('importFilters', () => {
    it('should import valid filters', async () => {
      const filters: SavedFilter[] = [
        {
          metadata: {
            id: 'import-test-1',
            name: 'Imported Filter',
            description: 'Test import',
            tags: [],
            createdAt: Date.now() / 1000,
            modifiedAt: Date.now() / 1000,
            isPreset: false,
          },
          config: { type: FilterType.TAG, tags: ['imported'] },
        },
      ];

      const result = await service.importFilters(filters);

      expect(result.success).toBe(true);
      expect(result.count).toBe(1);

      const imported = await service.getFilterById('import-test-1');
      expect(imported).not.toBeNull();
    });

    it('should reject invalid filters when validation enabled', async () => {
      const filters: SavedFilter[] = [
        {
          metadata: {
            id: 'invalid-1',
            name: 'Invalid',
            tags: [],
            createdAt: Date.now() / 1000,
            modifiedAt: Date.now() / 1000,
            isPreset: false,
          },
          config: { type: FilterType.TAG, tags: [] }, // Invalid
        },
      ];

      const result = await service.importFilters(filters, { validate: true });

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });
});
