import { describe, it, expect } from 'vitest';
import { TagFilter } from './TagFilter';
import { LogicalOperator, FilterType } from './types';
import type { Note } from '../types';

describe('TagFilter', () => {
  const createNote = (id: string, tags: string[]): Note => ({
    id,
    title: `Note ${id}`,
    tags,
    created_at: Date.now() / 1000,
    modified_at: Date.now() / 1000,
  });

  describe('constructor and validation', () => {
    it('should create filter with single tag', () => {
      const filter = new TagFilter({ tags: ['work'] });
      expect(filter.isValid()).toBe(true);
    });

    it('should create filter with multiple tags', () => {
      const filter = new TagFilter({ tags: ['work', 'urgent'] });
      expect(filter.isValid()).toBe(true);
    });

    it('should fail validation without tags or excludeTags', () => {
      const filter = new TagFilter({ tags: [] });
      expect(filter.isValid()).toBe(false);
      expect(filter.getValidationErrors()).toContain(
        'At least one tag or excludeTag must be specified'
      );
    });

    it('should fail validation with empty string tags', () => {
      const filter = new TagFilter({ tags: ['', 'work'] });
      expect(filter.isValid()).toBe(false);
    });
  });

  describe('single tag filtering (OR logic)', () => {
    it('should match notes with the specified tag', () => {
      const filter = new TagFilter({ tags: ['work'] });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['personal']),
        createNote('3', ['work', 'urgent']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toEqual(['1', '3']);
    });

    it('should return empty array when no matches', () => {
      const filter = new TagFilter({ tags: ['nonexistent'] });
      const notes = [createNote('1', ['work']), createNote('2', ['personal'])];

      const result = filter.apply(notes);
      expect(result).toHaveLength(0);
    });
  });

  describe('multiple tags with OR logic', () => {
    it('should match notes with any of the tags', () => {
      const filter = new TagFilter({
        tags: ['work', 'personal'],
        operator: LogicalOperator.OR,
      });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['personal']),
        createNote('3', ['hobby']),
        createNote('4', ['work', 'personal']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(3);
      expect(result.map((n) => n.id)).toEqual(['1', '2', '4']);
    });
  });

  describe('multiple tags with AND logic', () => {
    it('should match notes with all of the tags', () => {
      const filter = new TagFilter({
        tags: ['work', 'urgent'],
        operator: LogicalOperator.AND,
      });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['urgent']),
        createNote('3', ['work', 'urgent']),
        createNote('4', ['work', 'urgent', 'priority']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toEqual(['3', '4']);
    });

    it('should not match notes with only some tags', () => {
      const filter = new TagFilter({
        tags: ['work', 'urgent', 'priority'],
        operator: LogicalOperator.AND,
      });
      const notes = [
        createNote('1', ['work', 'urgent']),
        createNote('2', ['work', 'urgent', 'priority']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('tag exclusion', () => {
    it('should exclude notes with specified tags', () => {
      const filter = new TagFilter({
        tags: ['work'],
        excludeTags: ['archived'],
      });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['work', 'archived']),
        createNote('3', ['personal']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('1');
    });

    it('should work with only excludeTags', () => {
      const filter = new TagFilter({
        tags: [],
        excludeTags: ['archived'],
      });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['archived']),
        createNote('3', ['personal']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toEqual(['1', '3']);
    });
  });

  describe('case sensitivity', () => {
    it('should be case-insensitive by default', () => {
      const filter = new TagFilter({ tags: ['Work'] });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['WORK']),
        createNote('3', ['WoRk']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(3);
    });

    it('should be case-sensitive when specified', () => {
      const filter = new TagFilter({
        tags: ['Work'],
        caseSensitive: true,
      });
      const notes = [
        createNote('1', ['work']),
        createNote('2', ['Work']),
        createNote('3', ['WORK']),
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });
  });

  describe('serialization', () => {
    it('should serialize to config', () => {
      const filter = new TagFilter({
        tags: ['work', 'urgent'],
        operator: LogicalOperator.AND,
      });
      const config = filter.serialize();

      expect(config).toEqual({
        type: FilterType.TAG,
        tags: ['work', 'urgent'],
        operator: LogicalOperator.AND,
        caseSensitive: false,
      });
    });

    it('should serialize with excludeTags', () => {
      const filter = new TagFilter({
        tags: ['work'],
        excludeTags: ['archived'],
      });
      const config = filter.serialize();

      expect(config.excludeTags).toEqual(['archived']);
    });
  });

  describe('getDescription', () => {
    it('should describe single tag filter', () => {
      const filter = new TagFilter({ tags: ['work'] });
      expect(filter.getDescription()).toBe("Notes tagged with any of: 'work'");
    });

    it('should describe AND filter', () => {
      const filter = new TagFilter({
        tags: ['work', 'urgent'],
        operator: LogicalOperator.AND,
      });
      expect(filter.getDescription()).toBe(
        "Notes tagged with all of: 'work', 'urgent'"
      );
    });

    it('should describe filter with exclusions', () => {
      const filter = new TagFilter({
        tags: ['work'],
        excludeTags: ['archived'],
      });
      expect(filter.getDescription()).toContain("tagged with any of: 'work'");
      expect(filter.getDescription()).toContain("excluding: 'archived'");
    });
  });

  describe('clone', () => {
    it('should create independent clone', () => {
      const original = new TagFilter({ tags: ['work'] });
      const cloned = original.clone();

      expect(cloned).not.toBe(original);
      expect(cloned.serialize()).toEqual(original.serialize());
    });
  });

  describe('edge cases', () => {
    it('should handle notes without tags', () => {
      const filter = new TagFilter({ tags: ['work'] });
      const notes = [
        createNote('1', []),
        { ...createNote('2', ['work']), tags: undefined } as any,
      ];

      const result = filter.apply(notes);
      expect(result).toHaveLength(0);
    });

    it('should handle empty notes array', () => {
      const filter = new TagFilter({ tags: ['work'] });
      const result = filter.apply([]);
      expect(result).toHaveLength(0);
    });
  });
});
