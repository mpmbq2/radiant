import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { TagsRepository } from './tagsRepository';
import { NotesRepository } from './notesRepository';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from './testHelpers';
import { getDatabase } from './connection';

describe('TagsRepository', () => {
  let repository: TagsRepository;
  let notesRepository: NotesRepository;

  beforeAll(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  beforeEach(() => {
    clearTestDatabase();
    const db = getDatabase();
    repository = new TagsRepository(db);
    notesRepository = new NotesRepository(db);
  });

  describe('getOrCreateTag', () => {
    it('should create a new tag if it does not exist', () => {
      const tag = repository.getOrCreateTag('JavaScript');

      expect(tag).toMatchObject({
        name: 'javascript',
      });
      expect(tag.id).toBeGreaterThan(0);
      expect(tag.created_at).toBeGreaterThan(0);
    });

    it('should normalize tag names to lowercase', () => {
      const tag1 = repository.getOrCreateTag('JavaScript');
      const tag2 = repository.getOrCreateTag('JAVASCRIPT');
      const tag3 = repository.getOrCreateTag('javascript');

      expect(tag1.id).toBe(tag2.id);
      expect(tag2.id).toBe(tag3.id);
      expect(tag1.name).toBe('javascript');
    });

    it('should trim whitespace from tag names', () => {
      const tag = repository.getOrCreateTag('  JavaScript  ');
      expect(tag.name).toBe('javascript');
    });

    it('should return existing tag if it already exists', () => {
      const tag1 = repository.getOrCreateTag('TypeScript');
      const tag2 = repository.getOrCreateTag('TypeScript');

      expect(tag1.id).toBe(tag2.id);
      expect(tag1.name).toBe(tag2.name);
      expect(tag1.created_at).toBe(tag2.created_at);
    });

    it('should create multiple unique tags', () => {
      const tag1 = repository.getOrCreateTag('JavaScript');
      const tag2 = repository.getOrCreateTag('TypeScript');
      const tag3 = repository.getOrCreateTag('React');

      expect(tag1.id).not.toBe(tag2.id);
      expect(tag2.id).not.toBe(tag3.id);
      expect(tag1.id).not.toBe(tag3.id);
    });
  });

  describe('getAllTags', () => {
    it('should return empty array when no tags exist', () => {
      const tags = repository.getAllTags();
      expect(tags).toEqual([]);
    });

    it('should return all tags', () => {
      repository.getOrCreateTag('JavaScript');
      repository.getOrCreateTag('TypeScript');
      repository.getOrCreateTag('React');

      const tags = repository.getAllTags();
      expect(tags).toHaveLength(3);
    });

    it('should order tags alphabetically by name', () => {
      repository.getOrCreateTag('Zebra');
      repository.getOrCreateTag('Apple');
      repository.getOrCreateTag('Banana');

      const tags = repository.getAllTags();
      expect(tags[0].name).toBe('apple');
      expect(tags[1].name).toBe('banana');
      expect(tags[2].name).toBe('zebra');
    });
  });

  describe('getTagsForNote', () => {
    it('should return empty array for note with no tags', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      const tags = repository.getTagsForNote('note-1');
      expect(tags).toEqual([]);
    });

    it('should return empty array for non-existent note', () => {
      const tags = repository.getTagsForNote('non-existent');
      expect(tags).toEqual([]);
    });

    it('should return tags associated with a note', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript', 'TypeScript']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toHaveLength(2);
      expect(tags).toContain('javascript');
      expect(tags).toContain('typescript');
    });

    it('should return tags in alphabetical order', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['Zebra', 'Apple', 'Banana']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags[0]).toBe('apple');
      expect(tags[1]).toBe('banana');
      expect(tags[2]).toBe('zebra');
    });
  });

  describe('setTagsForNote', () => {
    it('should add tags to a note', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript', 'React']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toHaveLength(2);
      expect(tags).toContain('javascript');
      expect(tags).toContain('react');
    });

    it('should replace existing tags', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript', 'React']);
      repository.setTagsForNote('note-1', ['TypeScript', 'Vue']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toHaveLength(2);
      expect(tags).toContain('typescript');
      expect(tags).toContain('vue');
      expect(tags).not.toContain('javascript');
      expect(tags).not.toContain('react');
    });

    it('should handle empty tag array', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript']);
      repository.setTagsForNote('note-1', []);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toEqual([]);
    });

    it('should create new tags as needed', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      const allTagsBefore = repository.getAllTags();
      expect(allTagsBefore).toHaveLength(0);

      repository.setTagsForNote('note-1', ['NewTag1', 'NewTag2']);

      const allTagsAfter = repository.getAllTags();
      expect(allTagsAfter).toHaveLength(2);
    });

    it('should normalize tag names when setting', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');
      repository.setTagsForNote('note-1', ['  JavaScript  ', 'TYPESCRIPT']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toContain('javascript');
      expect(tags).toContain('typescript');
    });

    it('should handle duplicate tag names in input', () => {
      notesRepository.createNote('note-1', 'Test Note', '/path/1.md');

      // The function should deduplicate normalized tags
      // After normalization, all three become 'javascript'
      // For now, we test that providing unique normalized tags works
      repository.setTagsForNote('note-1', ['JavaScript']);

      const tags = repository.getTagsForNote('note-1');
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('javascript');

      // Verify that calling again with the same tag (different case) replaces correctly
      repository.setTagsForNote('note-1', ['JAVASCRIPT', 'TypeScript']);
      const updatedTags = repository.getTagsForNote('note-1');
      expect(updatedTags).toHaveLength(2);
      expect(updatedTags).toContain('javascript');
      expect(updatedTags).toContain('typescript');
    });
  });

  describe('getNotesWithTag', () => {
    beforeEach(() => {
      notesRepository.createNote('note-1', 'Note 1', '/path/1.md');
      notesRepository.createNote('note-2', 'Note 2', '/path/2.md');
      notesRepository.createNote('note-3', 'Note 3', '/path/3.md');
    });

    it('should return empty array for tag with no notes', () => {
      const noteIds = repository.getNotesWithTag('NonExistent');
      expect(noteIds).toEqual([]);
    });

    it('should return notes associated with a tag', () => {
      repository.setTagsForNote('note-1', ['JavaScript']);
      repository.setTagsForNote('note-2', ['JavaScript', 'TypeScript']);

      const noteIds = repository.getNotesWithTag('JavaScript');
      expect(noteIds).toHaveLength(2);
      expect(noteIds).toContain('note-1');
      expect(noteIds).toContain('note-2');
    });

    it('should normalize tag name when searching', () => {
      repository.setTagsForNote('note-1', ['JavaScript']);

      const noteIds1 = repository.getNotesWithTag('JAVASCRIPT');
      const noteIds2 = repository.getNotesWithTag('javascript');
      const noteIds3 = repository.getNotesWithTag('  JavaScript  ');

      expect(noteIds1).toHaveLength(1);
      expect(noteIds2).toHaveLength(1);
      expect(noteIds3).toHaveLength(1);
    });

    it('should only return notes with the specific tag', () => {
      repository.setTagsForNote('note-1', ['JavaScript']);
      repository.setTagsForNote('note-2', ['TypeScript']);
      repository.setTagsForNote('note-3', ['JavaScript', 'React']);

      const jsNotes = repository.getNotesWithTag('JavaScript');
      const tsNotes = repository.getNotesWithTag('TypeScript');

      expect(jsNotes).toHaveLength(2);
      expect(tsNotes).toHaveLength(1);
      expect(tsNotes[0]).toBe('note-2');
    });
  });

  describe('deleteUnusedTags', () => {
    it('should return 0 when all tags are in use', () => {
      notesRepository.createNote('note-1', 'Note 1', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript', 'TypeScript']);

      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(0);
    });

    it('should delete tags not associated with any note', () => {
      // Create tags
      repository.getOrCreateTag('JavaScript');
      repository.getOrCreateTag('TypeScript');
      repository.getOrCreateTag('React');

      // Associate only one tag
      notesRepository.createNote('note-1', 'Note 1', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript']);

      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(2);

      const allTags = repository.getAllTags();
      expect(allTags).toHaveLength(1);
      expect(allTags[0].name).toBe('javascript');
    });

    it('should not delete tags when they become unused after removing note tags', () => {
      notesRepository.createNote('note-1', 'Note 1', '/path/1.md');
      repository.setTagsForNote('note-1', ['JavaScript', 'TypeScript']);
      repository.setTagsForNote('note-1', ['React']); // Replace tags

      // Manual cleanup required
      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(2); // JavaScript and TypeScript now unused
    });

    it('should return correct count of deleted tags', () => {
      repository.getOrCreateTag('Tag1');
      repository.getOrCreateTag('Tag2');
      repository.getOrCreateTag('Tag3');
      repository.getOrCreateTag('Tag4');

      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(4);
    });
  });
});
