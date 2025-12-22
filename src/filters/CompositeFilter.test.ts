import { describe, it, expect } from 'vitest';
import { CompositeFilter } from './CompositeFilter';
import { TagFilter } from './TagFilter';
import { DateRangeFilter } from './DateRangeFilter';
import { LogicalOperator, FilterType, DateField, DateRangePreset } from './types';
import type { Note } from '../types';

describe('CompositeFilter', () => {
  const createNote = (id: string, tags: string[], createdAt: number): Note => ({
    id,
    title: `Note ${id}`,
    tags,
    created_at: createdAt,
    modified_at: createdAt,
  });

  describe('validation', () => {
    it('should validate with valid config', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          { type: FilterType.TAG, tags: ['urgent'] },
        ],
      });

      const tagFilter1 = new TagFilter({ tags: ['work'] });
      const tagFilter2 = new TagFilter({ tags: ['urgent'] });
      composite.setChildFilters([tagFilter1, tagFilter2]);

      expect(composite.isValid()).toBe(true);
    });

    it('should fail validation without operator', () => {
      const composite = new CompositeFilter({
        operator: undefined as any,
        filters: [{ type: FilterType.TAG, tags: ['work'] }],
      });
      composite.setChildFilters([new TagFilter({ tags: ['work'] })]);

      expect(composite.isValid()).toBe(false);
    });

    it('should fail validation without filters', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [],
      });
      composite.setChildFilters([]);

      expect(composite.isValid()).toBe(false);
    });

    it('should fail validation for NOT with multiple filters', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.NOT,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          { type: FilterType.TAG, tags: ['urgent'] },
        ],
      });
      composite.setChildFilters([
        new TagFilter({ tags: ['work'] }),
        new TagFilter({ tags: ['urgent'] }),
      ]);

      expect(composite.isValid()).toBe(false);
      expect(composite.getValidationErrors()).toContain(
        'NOT operator must have exactly one filter'
      );
    });
  });

  describe('AND operator', () => {
    it('should match notes that pass all filters', () => {
      const now = Math.floor(Date.now() / 1000);
      const notes = [
        createNote('1', ['work'], now - 86400), // 1 day ago
        createNote('2', ['work', 'urgent'], now - 86400),
        createNote('3', ['urgent'], now - 86400),
        createNote('4', ['work'], now - 864000), // 10 days ago
      ];

      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          {
            type: FilterType.DATE_RANGE,
            field: DateField.CREATED_AT,
            preset: DateRangePreset.LAST_7_DAYS,
          },
        ],
      });

      const tagFilter = new TagFilter({ tags: ['work'] });
      const dateFilter = new DateRangeFilter({
        field: DateField.CREATED_AT,
        preset: DateRangePreset.LAST_7_DAYS,
      });
      composite.setChildFilters([tagFilter, dateFilter]);

      const result = composite.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id)).toEqual(['1', '2']);
    });
  });

  describe('OR operator', () => {
    it('should match notes that pass any filter', () => {
      const notes = [
        createNote('1', ['work'], Date.now() / 1000),
        createNote('2', ['personal'], Date.now() / 1000),
        createNote('3', ['hobby'], Date.now() / 1000),
      ];

      const composite = new CompositeFilter({
        operator: LogicalOperator.OR,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          { type: FilterType.TAG, tags: ['personal'] },
        ],
      });

      const filter1 = new TagFilter({ tags: ['work'] });
      const filter2 = new TagFilter({ tags: ['personal'] });
      composite.setChildFilters([filter1, filter2]);

      const result = composite.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id)).toEqual(['1', '2']);
    });
  });

  describe('NOT operator', () => {
    it('should match notes that do not pass the filter', () => {
      const notes = [
        createNote('1', ['work'], Date.now() / 1000),
        createNote('2', ['personal'], Date.now() / 1000),
        createNote('3', ['hobby'], Date.now() / 1000),
      ];

      const composite = new CompositeFilter({
        operator: LogicalOperator.NOT,
        filters: [{ type: FilterType.TAG, tags: ['work'] }],
      });

      const tagFilter = new TagFilter({ tags: ['work'] });
      composite.setChildFilters([tagFilter]);

      const result = composite.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map(n => n.id)).toEqual(['2', '3']);
    });
  });

  describe('getDescription', () => {
    it('should describe AND composite', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          { type: FilterType.TAG, tags: ['urgent'] },
        ],
      });

      const filter1 = new TagFilter({ tags: ['work'] });
      const filter2 = new TagFilter({ tags: ['urgent'] });
      composite.setChildFilters([filter1, filter2]);

      const description = composite.getDescription();
      expect(description).toContain('AND');
    });

    it('should describe NOT composite', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.NOT,
        filters: [{ type: FilterType.TAG, tags: ['archived'] }],
      });

      const filter = new TagFilter({ tags: ['archived'] });
      composite.setChildFilters([filter]);

      const description = composite.getDescription();
      expect(description).toMatch(/^NOT \(/);
    });
  });

  describe('serialization', () => {
    it('should serialize to config', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [
          { type: FilterType.TAG, tags: ['work'] },
          { type: FilterType.TAG, tags: ['urgent'] },
        ],
      });

      const config = composite.serialize();

      expect(config.type).toBe(FilterType.COMPOSITE);
      expect(config.operator).toBe(LogicalOperator.AND);
      expect(config.filters).toHaveLength(2);
    });
  });

  describe('clone', () => {
    it('should create independent clone', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [{ type: FilterType.TAG, tags: ['work'] }],
      });

      const filter = new TagFilter({ tags: ['work'] });
      composite.setChildFilters([filter]);

      const cloned = composite.clone();

      expect(cloned).not.toBe(composite);
      expect(cloned.serialize()).toEqual(composite.serialize());
    });
  });

  describe('edge cases', () => {
    it('should handle empty notes array', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [{ type: FilterType.TAG, tags: ['work'] }],
      });

      const filter = new TagFilter({ tags: ['work'] });
      composite.setChildFilters([filter]);

      const result = composite.apply([]);
      expect(result).toHaveLength(0);
    });

    it('should return all notes when no child filters set', () => {
      const composite = new CompositeFilter({
        operator: LogicalOperator.AND,
        filters: [],
      });
      composite.setChildFilters([]);

      const notes = [
        createNote('1', ['work'], Date.now() / 1000),
        createNote('2', ['personal'], Date.now() / 1000),
      ];

      const result = composite.apply(notes);
      expect(result).toHaveLength(2);
    });
  });
});
