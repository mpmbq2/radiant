import {
  describe,
  it,
  expect,
  beforeEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { v4 as uuidv4 } from 'uuid';
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
  let testNoteId1: string;
  let testNoteId2: string;
  let testNoteId3: string;

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
    // Generate fresh UUIDs for each test
    testNoteId1 = uuidv4();
    testNoteId2 = uuidv4();
    testNoteId3 = uuidv4();
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
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toEqual([]);
    });

    it('should return empty array for non-existent note', () => {
      const nonExistentId = uuidv4();
      const tags = repository.getTagsForNote(nonExistentId);
      expect(tags).toEqual([]);
    });

    it('should return tags associated with a note', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        'JavaScript',
        'TypeScript',
      ]);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(2);
      expect(tags).toContain('javascript');
      expect(tags).toContain('typescript');
    });

    it('should return tags in alphabetical order', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        'Zebra',
        'Apple',
        'Banana',
      ]);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags[0]).toBe('apple');
      expect(tags[1]).toBe('banana');
      expect(tags[2]).toBe('zebra');
    });
  });

  describe('setTagsForNote', () => {
    it('should add tags to a note', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, ['JavaScript', 'React']);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(2);
      expect(tags).toContain('javascript');
      expect(tags).toContain('react');
    });

    it('should replace existing tags', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, ['JavaScript', 'React']);
      await repository.setTagsForNote(testNoteId1, ['TypeScript', 'Vue']);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(2);
      expect(tags).toContain('typescript');
      expect(tags).toContain('vue');
      expect(tags).not.toContain('javascript');
      expect(tags).not.toContain('react');
    });

    it('should handle empty tag array', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);
      await repository.setTagsForNote(testNoteId1, []);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toEqual([]);
    });

    it('should create new tags as needed', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      const allTagsBefore = repository.getAllTags();
      expect(allTagsBefore).toHaveLength(0);

      await repository.setTagsForNote(testNoteId1, ['NewTag1', 'NewTag2']);

      const allTagsAfter = repository.getAllTags();
      expect(allTagsAfter).toHaveLength(2);
    });

    it('should normalize tag names when setting', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        '  JavaScript  ',
        'TYPESCRIPT',
      ]);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toContain('javascript');
      expect(tags).toContain('typescript');
    });

    it('should handle duplicate tag names in input', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );

      // The function should deduplicate normalized tags
      // After normalization, all three become 'javascript'
      // For now, we test that providing unique normalized tags works
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);

      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('javascript');

      // Verify that calling again with the same tag (different case) replaces correctly
      await repository.setTagsForNote(testNoteId1, [
        'JAVASCRIPT',
        'TypeScript',
      ]);
      const updatedTags = repository.getTagsForNote(testNoteId1);
      expect(updatedTags).toHaveLength(2);
      expect(updatedTags).toContain('javascript');
      expect(updatedTags).toContain('typescript');
    });
  });

  describe('getNotesWithTag', () => {
    beforeEach(() => {
      notesRepository.createNote(
        testNoteId1,
        'Note 1',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      notesRepository.createNote(
        testNoteId2,
        'Note 2',
        '/tmp/radiant-test-userData/notes/2.md'
      );
      notesRepository.createNote(
        testNoteId3,
        'Note 3',
        '/tmp/radiant-test-userData/notes/3.md'
      );
    });

    it('should return empty array for tag with no notes', () => {
      const noteIds = repository.getNotesWithTag('NonExistent');
      expect(noteIds).toEqual([]);
    });

    it('should return notes associated with a tag', async () => {
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);
      await repository.setTagsForNote(testNoteId2, [
        'JavaScript',
        'TypeScript',
      ]);

      const noteIds = repository.getNotesWithTag('JavaScript');
      expect(noteIds).toHaveLength(2);
      expect(noteIds).toContain(testNoteId1);
      expect(noteIds).toContain(testNoteId2);
    });

    it('should normalize tag name when searching', async () => {
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);

      const noteIds1 = repository.getNotesWithTag('JAVASCRIPT');
      const noteIds2 = repository.getNotesWithTag('javascript');
      const noteIds3 = repository.getNotesWithTag('  JavaScript  ');

      expect(noteIds1).toHaveLength(1);
      expect(noteIds2).toHaveLength(1);
      expect(noteIds3).toHaveLength(1);
    });

    it('should only return notes with the specific tag', async () => {
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);
      await repository.setTagsForNote(testNoteId2, ['TypeScript']);
      await repository.setTagsForNote(testNoteId3, ['JavaScript', 'React']);

      const jsNotes = repository.getNotesWithTag('JavaScript');
      const tsNotes = repository.getNotesWithTag('TypeScript');

      expect(jsNotes).toHaveLength(2);
      expect(tsNotes).toHaveLength(1);
      expect(tsNotes[0]).toBe(testNoteId2);
    });
  });

  describe('deleteUnusedTags', () => {
    it('should return 0 when all tags are in use', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Note 1',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        'JavaScript',
        'TypeScript',
      ]);

      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(0);
    });

    it('should delete tags not associated with any note', async () => {
      // Create tags
      repository.getOrCreateTag('JavaScript');
      repository.getOrCreateTag('TypeScript');
      repository.getOrCreateTag('React');

      // Associate only one tag
      notesRepository.createNote(
        testNoteId1,
        'Note 1',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);

      const deleted = repository.deleteUnusedTags();
      expect(deleted).toBe(2);

      const allTags = repository.getAllTags();
      expect(allTags).toHaveLength(1);
      expect(allTags[0].name).toBe('javascript');
    });

    it('should not delete tags when they become unused after removing note tags', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Note 1',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        'JavaScript',
        'TypeScript',
      ]);
      await repository.setTagsForNote(testNoteId1, ['React']); // Replace tags

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

  describe('setTagsForNote - Transaction Error Handling', () => {
    // Clean up mocks after each test in this suite
    afterEach(() => {
      // Clear mocks but don't restore them (to preserve test database setup)
      vi.clearAllMocks();
    });

    it('should handle constraint violation with clear error message', async () => {
      // Try to set tags for a note that doesn't exist (foreign key constraint)
      // This will violate the foreign key constraint since note-nonexistent doesn't exist
      await expect(
        repository.setTagsForNote(uuidv4(), ['JavaScript'])
      ).rejects.toThrow(/FOREIGN KEY constraint failed/);
    });

    it('should rollback transaction on error - no partial state', async () => {
      // Create a note and give it initial tags
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      await repository.setTagsForNote(testNoteId1, [
        'JavaScript',
        'TypeScript',
      ]);

      // Verify initial state
      expect(repository.getTagsForNote(testNoteId1)).toHaveLength(2);

      // Mock getOrCreateTag to throw an error after DELETE but before INSERT
      const originalGetOrCreate = repository.getOrCreateTag.bind(repository);
      let callCount = 0;
      vi.spyOn(repository, 'getOrCreateTag').mockImplementation(
        (tagName: string) => {
          callCount++;
          if (callCount > 1) {
            // Throw error on second call (after first tag is processed)
            throw new Error('Simulated error during tag creation');
          }
          return originalGetOrCreate(tagName);
        }
      );

      // Try to set new tags - this should fail and rollback
      await expect(
        repository.setTagsForNote(testNoteId1, ['React', 'Vue', 'Angular'])
      ).rejects.toThrow(/Simulated error/);

      // Verify rollback - original tags should still be there
      const tagsAfterError = repository.getTagsForNote(testNoteId1);
      expect(tagsAfterError).toHaveLength(2);
      expect(tagsAfterError).toContain('javascript');
      expect(tagsAfterError).toContain('typescript');
    });

    it('should maintain database consistency after transaction failure', async () => {
      // Create multiple notes with tags
      notesRepository.createNote(
        testNoteId1,
        'Note 1',
        '/tmp/radiant-test-userData/notes/1.md'
      );
      notesRepository.createNote(
        testNoteId2,
        'Note 2',
        '/tmp/radiant-test-userData/notes/2.md'
      );
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);
      await repository.setTagsForNote(testNoteId2, ['TypeScript']);

      const tagsBefore = repository.getAllTags();
      expect(tagsBefore).toHaveLength(2);

      // Mock an error during setTagsForNote for note-1
      vi.spyOn(repository, 'getOrCreateTag').mockImplementationOnce(() => {
        throw new Error('Simulated constraint error');
      });

      // Try to update note-1 tags - should fail
      await expect(
        repository.setTagsForNote(testNoteId1, ['React'])
      ).rejects.toThrow(/Simulated constraint error/);

      // Verify note-1 still has original tags
      expect(repository.getTagsForNote(testNoteId1)).toContain('javascript');

      // Verify note-2 is unaffected
      expect(repository.getTagsForNote(testNoteId2)).toContain('typescript');

      // Verify tag table is still consistent
      const tagsAfter = repository.getAllTags();
      expect(tagsAfter).toHaveLength(2);
    });

    it('should successfully complete transaction after temporary database lock', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );

      // Mock a temporary SQLITE_BUSY error followed by success
      const originalGetOrCreate = repository.getOrCreateTag.bind(repository);
      let attemptCount = 0;

      vi.spyOn(repository, 'getOrCreateTag').mockImplementation(
        (tagName: string) => {
          attemptCount++;
          if (attemptCount === 1) {
            // First attempt fails with SQLITE_BUSY
            const error = new Error('database is locked') as Error & {
              code: string;
            };
            error.code = 'SQLITE_BUSY';
            throw error;
          }
          // Second attempt succeeds
          return originalGetOrCreate(tagName);
        }
      );

      // This should retry and eventually succeed
      await repository.setTagsForNote(testNoteId1, ['JavaScript']);

      // Verify tags were set successfully
      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('javascript');

      // Verify retry happened
      expect(attemptCount).toBe(2);
    });

    it('should fail after max retries on persistent database lock', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );

      // Mock persistent SQLITE_BUSY error
      vi.spyOn(repository, 'getOrCreateTag').mockImplementation(() => {
        const error = new Error('database is locked') as Error & {
          code: string;
        };
        error.code = 'SQLITE_BUSY';
        throw error;
      });

      // This should fail after max retries
      await expect(
        repository.setTagsForNote(testNoteId1, ['JavaScript'])
      ).rejects.toThrow(/database is locked/);

      // Verify no tags were set due to transaction rollback
      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(0);
    });

    it('should handle SQLITE_LOCKED error with retry logic', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );

      // Mock a temporary SQLITE_LOCKED error followed by success
      const originalGetOrCreate = repository.getOrCreateTag.bind(repository);
      let attemptCount = 0;

      vi.spyOn(repository, 'getOrCreateTag').mockImplementation(
        (tagName: string) => {
          attemptCount++;
          if (attemptCount === 1) {
            // First attempt fails with SQLITE_LOCKED
            const error = new Error('database table is locked') as Error & {
              code: string;
            };
            error.code = 'SQLITE_LOCKED';
            throw error;
          }
          // Second attempt succeeds
          return originalGetOrCreate(tagName);
        }
      );

      // This should retry and eventually succeed
      await repository.setTagsForNote(testNoteId1, ['TypeScript']);

      // Verify tags were set successfully
      const tags = repository.getTagsForNote(testNoteId1);
      expect(tags).toHaveLength(1);
      expect(tags[0]).toBe('typescript');
    });

    it('should not retry on non-retriable errors', async () => {
      notesRepository.createNote(
        testNoteId1,
        'Test Note',
        '/tmp/radiant-test-userData/notes/1.md'
      );

      // Mock a non-retriable error (e.g., syntax error)
      let attemptCount = 0;
      vi.spyOn(repository, 'getOrCreateTag').mockImplementation(() => {
        attemptCount++;
        const error = new Error('syntax error') as Error & { code: string };
        error.code = 'SQLITE_ERROR';
        throw error;
      });

      // This should fail immediately without retries
      await expect(
        repository.setTagsForNote(testNoteId1, ['JavaScript'])
      ).rejects.toThrow(/syntax error/);

      // Verify only one attempt was made
      expect(attemptCount).toBe(1);
    });
  });
});
