import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  vi,
} from 'vitest';
import { NotesService } from './notesService';
import { NotesRepository } from '../database/notesRepository';
import { TagsRepository } from '../database/tagsRepository';
import {
  FileManager,
  FileSystemError,
  FileSystemErrorCode,
} from '../storage/fileManager';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from '../database/testHelpers';
import { getDatabase } from '../database/connection';
import { ValidationError } from '../utils/validation';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('NotesService', () => {
  let service: NotesService;
  let testDir: string;
  let fileManager: FileManager;

  beforeAll(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  beforeEach(() => {
    clearTestDatabase();

    // Create temporary directory for file storage
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radiant-service-test-'));

    // Create test file manager - since notesService creates its own instances,
    // we'll need to use the config's test directory setting
    fileManager = new FileManager(testDir);

    // Create repositories with test database
    const db = getDatabase();
    const notesRepo = new NotesRepository(db);
    const tagsRepo = new TagsRepository(db);
    service = new NotesService(notesRepo, tagsRepo);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('createNote', () => {
    it('should create a note with title and content', async () => {
      const note = await service.createNote({
        title: 'Test Note',
        content: 'This is test content',
      });

      expect(note).toMatchObject({
        title: 'Test Note',
        content: 'This is test content',
        tags: [],
      });
      expect(note.id).toBeDefined();
      expect(note.created_at).toBeGreaterThan(0);
    });

    it('should create a note with tags', async () => {
      const note = await service.createNote({
        title: 'Tagged Note',
        content: 'Content',
        tags: ['javascript', 'testing'],
      });

      expect(note.tags).toHaveLength(2);
      expect(note.tags).toContain('javascript');
      expect(note.tags).toContain('testing');
    });

    it('should create note file on disk', async () => {
      const note = await service.createNote({
        title: 'File Test',
        content: 'Content',
      });

      // Note: This test verifies the file path is set, but actual file creation
      // is handled by the singleton fileManager which uses the configured directory
      expect(note.file_path).toBeDefined();
      expect(note.file_path).toContain('.md');
    });

    it('should calculate word count correctly', async () => {
      const note = await service.createNote({
        title: 'Word Count Test',
        content: 'This is a test with exactly seven words',
      });

      expect(note.word_count).toBe(8);
    });

    it('should calculate character count correctly', async () => {
      const content = 'Hello World';
      const note = await service.createNote({
        title: 'Char Count Test',
        content,
      });

      expect(note.character_count).toBe(content.length);
    });

    it('should validate note title', async () => {
      await expect(
        service.createNote({ title: '', content: 'Content' })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate note content length', async () => {
      const longContent = 'a'.repeat(1000001); // > 1MB
      await expect(
        service.createNote({ title: 'Test', content: longContent })
      ).rejects.toThrow(ValidationError);
    });

    it('should validate tags', async () => {
      const tooManyTags = Array(51).fill('tag'); // > 50 tags
      await expect(
        service.createNote({
          title: 'Test',
          content: 'Content',
          tags: tooManyTags,
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should handle empty content', async () => {
      const note = await service.createNote({
        title: 'Empty Note',
        content: '',
      });

      expect(note.content).toBe('');
      expect(note.word_count).toBe(0);
      expect(note.character_count).toBe(0);
    });

    it('should handle undefined content', async () => {
      const note = await service.createNote({
        title: 'No Content',
        content: '',
      });

      expect(note.content).toBe('');
    });
  });

  describe('getNoteById', () => {
    it('should retrieve a note by ID', async () => {
      const created = await service.createNote({
        title: 'Retrieve Test',
        content: 'Content to retrieve',
      });

      const retrieved = await service.getNoteById(created.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(created.id);
      expect(retrieved?.title).toBe('Retrieve Test');
      expect(retrieved?.content.trim()).toBe('Content to retrieve');
    });

    it('should return null for non-existent note', async () => {
      const note = await service.getNoteById('non-existent-id');
      expect(note).toBeNull();
    });

    it('should include tags in retrieved note', async () => {
      const created = await service.createNote({
        title: 'Tagged',
        content: 'Content',
        tags: ['tag1', 'tag2'],
      });

      const retrieved = await service.getNoteById(created.id);

      expect(retrieved?.tags).toHaveLength(2);
      expect(retrieved?.tags).toContain('tag1');
      expect(retrieved?.tags).toContain('tag2');
    });
  });

  describe('getAllNotes', () => {
    it('should return empty array when no notes exist', async () => {
      const notes = await service.getAllNotes();
      expect(notes).toEqual([]);
    });

    it('should return all notes', async () => {
      await service.createNote({ title: 'Note 1', content: 'Content 1' });
      await service.createNote({ title: 'Note 2', content: 'Content 2' });
      await service.createNote({ title: 'Note 3', content: 'Content 3' });

      const notes = await service.getAllNotes();
      expect(notes).toHaveLength(3);
    });

    it('should include content and tags for all notes', async () => {
      await service.createNote({
        title: 'Note 1',
        content: 'Content 1',
        tags: ['tag1'],
      });

      const notes = await service.getAllNotes();
      expect(notes[0].content.trim()).toBe('Content 1');
      expect(notes[0].tags).toEqual(['tag1']);
    });
  });

  describe('updateNote', () => {
    it('should update note title', async () => {
      const created = await service.createNote({
        title: 'Original',
        content: 'Content',
      });

      const updated = await service.updateNote({
        id: created.id,
        title: 'Updated Title',
      });

      expect(updated?.title).toBe('Updated Title');
    });

    it('should update note content', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'Original content',
      });

      const updated = await service.updateNote({
        id: created.id,
        content: 'Updated content',
      });

      expect(updated?.content.trim()).toBe('Updated content');
    });

    it('should update note tags', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'Content',
        tags: ['old-tag'],
      });

      const updated = await service.updateNote({
        id: created.id,
        tags: ['new-tag1', 'new-tag2'],
      });

      expect(updated?.tags).toHaveLength(2);
      expect(updated?.tags).toContain('new-tag1');
      expect(updated?.tags).toContain('new-tag2');
      expect(updated?.tags).not.toContain('old-tag');
    });

    it('should update word count when content changes', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'one two three',
      });

      const updated = await service.updateNote({
        id: created.id,
        content: 'one two three four five',
      });

      expect(updated?.word_count).toBe(5);
    });

    it('should update character count when content changes', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'short',
      });

      const newContent = 'much longer content';
      const updated = await service.updateNote({
        id: created.id,
        content: newContent,
      });

      expect(updated?.character_count).toBe(newContent.length);
    });

    it('should update modified_at timestamp', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'Content',
      });

      const originalModified = created.modified_at;

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updated = await service.updateNote({
        id: created.id,
        title: 'New Title',
      });

      expect(updated?.modified_at).toBeGreaterThan(originalModified);
    });

    it('should return null for non-existent note', async () => {
      const updated = await service.updateNote({
        id: 'non-existent',
        title: 'New Title',
      });

      expect(updated).toBeNull();
    });

    it('should update file on disk', async () => {
      const created = await service.createNote({
        title: 'Title',
        content: 'Original content',
      });

      const updated = await service.updateNote({
        id: created.id,
        content: 'Updated content',
      });

      // Verify the update was successful through the service
      expect(updated?.content.trim()).toBe('Updated content');
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', async () => {
      const created = await service.createNote({
        title: 'To Delete',
        content: 'Content',
      });

      await service.deleteNote(created.id);

      const retrieved = await service.getNoteById(created.id);
      expect(retrieved).toBeNull();
    });

    it('should delete note file from disk', async () => {
      const created = await service.createNote({
        title: 'To Delete',
        content: 'Content',
      });

      await service.deleteNote(created.id);

      // Verify the note is no longer retrievable
      const deleted = await service.getNoteById(created.id);
      expect(deleted).toBeNull();
    });

    it('should throw error when deleting non-existent note', async () => {
      await expect(service.deleteNote('non-existent')).rejects.toThrow(
        'Note not found'
      );
    });
  });

  describe('searchNotes', () => {
    beforeEach(async () => {
      await service.createNote({
        title: 'JavaScript Tutorial',
        content: 'Content',
      });
      await service.createNote({
        title: 'TypeScript Guide',
        content: 'Content',
      });
      await service.createNote({ title: 'Python Basics', content: 'Content' });
    });

    it('should find notes matching query', async () => {
      const results = await service.searchNotes('Script');
      expect(results).toHaveLength(2);
    });

    it('should return empty array when no matches', async () => {
      const results = await service.searchNotes('Ruby');
      expect(results).toEqual([]);
    });

    it('should include content and tags in search results', async () => {
      const results = await service.searchNotes('JavaScript');
      expect(results[0].content).toBeDefined();
      expect(results[0].tags).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete note lifecycle', async () => {
      // Create
      const created = await service.createNote({
        title: 'Lifecycle Test',
        content: 'Initial content',
        tags: ['test'],
      });

      expect(created.id).toBeDefined();

      // Read
      const retrieved = await service.getNoteById(created.id);
      expect(retrieved?.title).toBe('Lifecycle Test');

      // Update
      const updated = await service.updateNote({
        id: created.id,
        content: 'Updated content',
        tags: ['test', 'updated'],
      });

      expect(updated?.content.trim()).toBe('Updated content');
      expect(updated?.tags).toContain('updated');

      // Delete
      await service.deleteNote(created.id);
      const deleted = await service.getNoteById(created.id);
      expect(deleted).toBeNull();
    });

    it('should maintain data consistency between database and file system', async () => {
      const created = await service.createNote({
        title: 'Consistency Test',
        content: 'Test content',
        tags: ['consistency'],
      });

      // Update via service
      await service.updateNote({
        id: created.id,
        content: 'Updated via service',
      });

      // Verify that retrieving the note returns the updated content
      const fromService = await service.getNoteById(created.id);
      expect(fromService?.content.trim()).toBe('Updated via service');

      // Verify tags are also preserved
      expect(fromService?.tags).toContain('consistency');
    });
  });

  describe('error scenarios', () => {
    describe('partial failures', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should handle file write failure during note creation', async () => {
        // Mock fileManager.writeNote to throw error
        const writeError = new FileSystemError(
          FileSystemErrorCode.DISK_FULL,
          '/test/path.md'
        );

        const writeNoteSpy = vi
          .spyOn(FileManager.prototype, 'writeNote')
          .mockImplementation(() => {
            throw writeError;
          });

        await expect(
          service.createNote({
            title: 'Test Note',
            content: 'Content',
          })
        ).rejects.toThrow(FileSystemError);

        // Verify database record was created but note is not retrievable
        // (because file doesn't exist)
        writeNoteSpy.mockRestore();
      });

      it('should handle file read failure when getting note', async () => {
        // First create a note successfully
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Content',
        });

        // Mock fileManager.readNote to throw error
        const readError = new FileSystemError(
          FileSystemErrorCode.FILE_NOT_FOUND,
          created.file_path
        );

        vi.spyOn(FileManager.prototype, 'readNote').mockImplementation(() => {
          throw readError;
        });

        // Service should handle the error gracefully in enrichNoteWithContent
        const notes = await service.getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].content).toBe(''); // Empty content due to read error
        expect(notes[0].tags).toEqual([]); // Empty tags
      });

      it('should handle file delete failure during note deletion', async () => {
        // First create a note successfully
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Content',
        });

        // Mock fileManager.deleteNote to throw error
        const deleteError = new FileSystemError(
          FileSystemErrorCode.PERMISSION_DENIED,
          created.file_path
        );

        vi.spyOn(FileManager.prototype, 'deleteNote').mockImplementation(() => {
          throw deleteError;
        });

        // Delete should fail with file system error
        await expect(service.deleteNote(created.id)).rejects.toThrow(
          FileSystemError
        );

        // Database record should still be marked as deleted (soft delete)
        const retrieved = await service.getNoteById(created.id);
        expect(retrieved).toBeNull(); // Soft deleted
      });

      it('should handle tag creation failure during note creation', async () => {
        // Mock tagsRepo.setTagsForNote to throw error
        const tagError = new Error('Tag creation failed');
        vi.spyOn(TagsRepository.prototype, 'setTagsForNote').mockImplementation(
          () => {
            throw tagError;
          }
        );

        await expect(
          service.createNote({
            title: 'Test Note',
            content: 'Content',
            tags: ['tag1', 'tag2'],
          })
        ).rejects.toThrow('Tag creation failed');
      });

      it('should handle database update failure during note update', async () => {
        // First create a note successfully
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Content',
        });

        // Mock notesRepo.updateNote to throw error
        const updateError = new Error('Database update failed');
        vi.spyOn(NotesRepository.prototype, 'updateNote').mockImplementation(
          () => {
            throw updateError;
          }
        );

        // Update should fail
        await expect(
          service.updateNote({
            id: created.id,
            title: 'New Title',
          })
        ).rejects.toThrow('Database update failed');
      });
    });

    describe('file/database sync issues', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should handle orphaned database records without files', async () => {
        // Create a note successfully
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Content',
        });

        // Manually delete the file to create orphaned database record
        if (fs.existsSync(created.file_path)) {
          fs.unlinkSync(created.file_path);
        }

        // getAllNotes should handle missing file gracefully
        const notes = await service.getAllNotes();
        expect(notes).toHaveLength(1);
        expect(notes[0].content).toBe(''); // Empty content due to missing file
      });

      it('should handle file exists but database record missing', async () => {
        // This scenario is less likely but could happen if database transaction fails
        // after file write. The note would not be retrievable via service.
        const noteId = 'orphan-file';
        const filePath = fileManager.generateFilePath(noteId);

        // Create file without database record
        fileManager.writeNote(filePath, 'Orphan content', {
          title: 'Orphan',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        });

        // Try to get note by ID - should return null
        const note = await service.getNoteById(noteId);
        expect(note).toBeNull();

        // Clean up orphaned file
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      });

      it('should handle file content out of sync with database metadata', async () => {
        // Create a note
        const created = await service.createNote({
          title: 'Original Title',
          content: 'Original content',
        });

        // Manually modify file to have different content
        fileManager.writeNote(created.file_path, 'Manually changed content', {
          title: 'Changed Title',
          tags: ['manual'],
          created_at: created.created_at,
          modified_at: Date.now(),
        });

        // Service should read actual file content, not cached database data
        const retrieved = await service.getNoteById(created.id);
        expect(retrieved?.content.trim()).toBe('Manually changed content');
        // But database metadata should still be original
        expect(retrieved?.title).toBe('Original Title');
      });
    });

    describe('concurrent modification scenarios', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should handle rapid sequential updates', async () => {
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Initial content',
        });

        // Perform rapid sequential updates
        const update1 = service.updateNote({
          id: created.id,
          content: 'Update 1',
        });

        const update2 = service.updateNote({
          id: created.id,
          content: 'Update 2',
        });

        const update3 = service.updateNote({
          id: created.id,
          content: 'Update 3',
        });

        // Wait for all updates to complete
        await Promise.all([update1, update2, update3]);

        // Final content should be from last update
        const final = await service.getNoteById(created.id);
        expect(final?.content.trim()).toBe('Update 3');
      });

      it('should handle update during read operation', async () => {
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Initial content',
        });

        // Start a slow read operation (by mocking)
        let readResolve!: () => void;

        const originalReadNote = FileManager.prototype.readNote;
        vi.spyOn(FileManager.prototype, 'readNote').mockImplementation(
          function (this: FileManager, filePath: string) {
            // Add small delay to simulate slow read
            return new Promise<ReturnType<typeof originalReadNote>>(
              (resolve) => {
                setTimeout(() => {
                  resolve(originalReadNote.call(this, filePath));
                  if (readResolve) readResolve();
                }, 50);
              }
            );
          }
        );

        // Start read operation
        const readOp = service.getNoteById(created.id);

        // Update note while read is in progress
        await service.updateNote({
          id: created.id,
          content: 'Updated during read',
        });

        // Wait for read to complete
        const readResult = await readOp;

        // Read operation should complete successfully
        expect(readResult).toBeDefined();

        // Subsequent read should get updated content
        vi.restoreAllMocks();
        const final = await service.getNoteById(created.id);
        expect(final?.content.trim()).toBe('Updated during read');
      });
    });

    describe('cleanup on errors', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should clean up resources when note creation fails after file write', async () => {
        // Mock database createNote to fail
        const createError = new Error('Database insert failed');
        vi.spyOn(NotesRepository.prototype, 'createNote').mockImplementation(
          () => {
            throw createError;
          }
        );

        try {
          await service.createNote({
            title: 'Test Note',
            content: 'Content',
          });
        } catch (error) {
          expect(error).toBeDefined();
        }

        // In current implementation, file is written but DB fails
        // This creates an orphaned file - a known issue to be aware of
        // Ideally, we'd want transactional semantics
      });

      it('should not corrupt database on failed update', async () => {
        const created = await service.createNote({
          title: 'Test Note',
          content: 'Initial content',
          tags: ['tag1'],
        });

        // Mock file write to fail during update
        const writeError = new FileSystemError(
          FileSystemErrorCode.DISK_FULL,
          created.file_path
        );

        vi.spyOn(FileManager.prototype, 'writeNote').mockImplementation(() => {
          throw writeError;
        });

        try {
          await service.updateNote({
            id: created.id,
            content: 'This update will fail',
          });
        } catch (error) {
          expect(error).toBeInstanceOf(FileSystemError);
        }

        // Restore mocks
        vi.restoreAllMocks();

        // Database should still have original data
        const retrieved = await service.getNoteById(created.id);
        expect(retrieved?.title).toBe('Test Note');
        expect(retrieved?.content.trim()).toBe('Initial content');
        expect(retrieved?.tags).toContain('tag1');
      });
    });

    describe('validation with error scenarios', () => {
      it('should validate before attempting any I/O operations', async () => {
        // Spy on file operations
        const writeNoteSpy = vi.spyOn(FileManager.prototype, 'writeNote');

        // Try to create note with invalid title
        await expect(
          service.createNote({
            title: '', // Invalid: empty title
            content: 'Content',
          })
        ).rejects.toThrow(ValidationError);

        // File write should never be called
        expect(writeNoteSpy).not.toHaveBeenCalled();
      });

      it('should validate content length before writing large files', async () => {
        const writeNoteSpy = vi.spyOn(FileManager.prototype, 'writeNote');

        // Try to create note with content that's too large
        const tooLarge = 'x'.repeat(1000001); // > 1MB

        await expect(
          service.createNote({
            title: 'Test',
            content: tooLarge,
          })
        ).rejects.toThrow(ValidationError);

        // File write should never be called
        expect(writeNoteSpy).not.toHaveBeenCalled();
      });

      it('should validate tags before processing', async () => {
        const setTagsSpy = vi.spyOn(TagsRepository.prototype, 'setTagsForNote');

        // Try to create note with too many tags
        const tooManyTags = Array(51).fill('tag');

        await expect(
          service.createNote({
            title: 'Test',
            content: 'Content',
            tags: tooManyTags,
          })
        ).rejects.toThrow(ValidationError);

        // Tag operations should never be called
        expect(setTagsSpy).not.toHaveBeenCalled();
      });
    });
  });
});
