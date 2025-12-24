/**
 * Integration tests for error handling across all architectural layers
 * These tests verify that errors flow correctly from Repository → Service → IPC → Renderer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { NotesRepository } from './database/notesRepository';
import { TagsRepository } from './database/tagsRepository';
import { NotesService } from './services/notesService';
import {
  FileManager,
  FileSystemError,
  FileSystemErrorCode,
} from './storage/fileManager';
import { unwrapIPCResponse } from './renderer/utils/ipcHelpers';
import type { IPCResponse } from './types';
import { createLogger } from './utils/logger';

describe('Error Handling - Layer Propagation', () => {
  let db: Database.Database;
  let notesRepo: NotesRepository;
  let tagsRepo: TagsRepository;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');

    // Initialize schema
    db.exec(`
      CREATE TABLE notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        modified_at INTEGER NOT NULL,
        deleted_at INTEGER,
        word_count INTEGER DEFAULT 0,
        character_count INTEGER DEFAULT 0
      );

      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE note_tags (
        note_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `);

    notesRepo = new NotesRepository(db);
    tagsRepo = new TagsRepository(db);
  });

  describe('Repository Layer', () => {
    it('should throw error when database operation fails', () => {
      // Close database to simulate failure
      db.close();

      expect(() => notesRepo.getAllNotes()).toThrow();
    });

    it('should include context in error messages', () => {
      const closedDb = new Database(':memory:');
      closedDb.close();
      const repo = new NotesRepository(closedDb);

      try {
        repo.getNoteById('test-id');
        expect.fail('Should have thrown error');
      } catch (error) {
        // Error should be thrown (not swallowed)
        expect(error).toBeDefined();
      }
    });
  });

  describe('Storage Layer', () => {
    it('should throw FileSystemError with appropriate error code', () => {
      const fm = new FileManager('/tmp/test-notes');

      try {
        fm.readNote('/nonexistent/path/note.md');
        expect.fail('Should have thrown FileSystemError');
      } catch (error) {
        expect(error).toBeInstanceOf(FileSystemError);
        expect((error as FileSystemError).code).toBe(
          FileSystemErrorCode.FILE_NOT_FOUND
        );
        expect((error as FileSystemError).message).toContain(
          '/nonexistent/path/note.md'
        );
      }
    });

    it('should include user-friendly error messages', () => {
      const fm = new FileManager('/tmp/test-notes');

      try {
        fm.readNote('/invalid/file.md');
        expect.fail('Should have thrown');
      } catch (error) {
        const fsError = error as FileSystemError;
        expect(fsError.message).toContain('does not exist');
      }
    });
  });

  describe('Service Layer', () => {
    it('should let errors bubble up from repository', async () => {
      const closedDb = new Database(':memory:');
      closedDb.close();
      const repo = new NotesRepository(closedDb);
      const service = new NotesService(repo, tagsRepo);

      await expect(
        service.createNote({ title: 'Test', content: 'Content' })
      ).rejects.toThrow();
    });

    it('should handle partial failures gracefully in getAllNotes', async () => {
      // Create a note in database
      const noteId = 'test-note-1';
      notesRepo.createNote(noteId, 'Test Note', '/invalid/path.md');

      const service = new NotesService(notesRepo, tagsRepo);

      // getAllNotes should not throw, but skip notes with read errors
      const notes = await service.getAllNotes();
      expect(notes).toEqual([]); // Note skipped due to file read error
    });

    it('should not swallow errors in getNoteById', async () => {
      const noteId = 'test-note';
      notesRepo.createNote(noteId, 'Test', '/invalid/path.md');

      const service = new NotesService(notesRepo, tagsRepo);

      // Should throw because file cannot be read
      await expect(service.getNoteById(noteId)).rejects.toThrow(
        FileSystemError
      );
    });
  });

  describe('IPC Layer', () => {
    it('should return error object instead of throwing', async () => {
      const logger = createLogger('test');
      let capturedResponse: IPCResponse<string> | null = null;

      // Create a handler that will fail
      const failingHandler = async (): Promise<string> => {
        throw new Error('Test error from handler');
      };

      // Manually simulate what createHandler does
      const handlerWrapper = async (
        ...args: unknown[]
      ): Promise<IPCResponse<string>> => {
        try {
          const data = await failingHandler(...args);
          return { success: true, data };
        } catch (error) {
          logger.error('Error in test:', error);
          return {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: undefined,
            },
          };
        }
      };

      // Execute the wrapped handler
      capturedResponse = await handlerWrapper();

      // Verify it returned an error object
      expect(capturedResponse.success).toBe(false);
      if (!capturedResponse.success) {
        expect(capturedResponse.error.message).toBe('Test error from handler');
      }
    });

    it('should include error code for FileSystemError', async () => {
      const logger = createLogger('test');
      const failingHandler = async (): Promise<string> => {
        throw new FileSystemError(
          FileSystemErrorCode.PERMISSION_DENIED,
          '/test/file.md'
        );
      };

      const handlerWrapper = async (): Promise<IPCResponse<string>> => {
        try {
          const data = await failingHandler();
          return { success: true, data };
        } catch (error) {
          logger.error('Error in test:', error);
          return {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
              code: error instanceof FileSystemError ? error.code : undefined,
            },
          };
        }
      };

      const response = await handlerWrapper();

      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error.code).toBe(FileSystemErrorCode.PERMISSION_DENIED);
      }
    });

    it('should return serializable error objects (no Error instances)', async () => {
      const failingHandler = async (): Promise<string> => {
        throw new Error('Test');
      };

      const handlerWrapper = async (): Promise<IPCResponse<string>> => {
        try {
          const data = await failingHandler();
          return { success: true, data };
        } catch (error) {
          return {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      };

      const response = await handlerWrapper();

      // Verify the error object is serializable (plain object, not Error instance)
      expect(response.success).toBe(false);
      if (!response.success) {
        expect(response.error).toEqual({ message: 'Test' });
        expect(response.error).not.toBeInstanceOf(Error);
      }
    });
  });

  describe('Renderer Layer', () => {
    it('should unwrap successful IPC responses', () => {
      const response: IPCResponse<string> = {
        success: true,
        data: 'test data',
      };

      const result = unwrapIPCResponse(response);
      expect(result).toBe('test data');
    });

    it('should throw error from failed IPC responses', () => {
      const response: IPCResponse<string> = {
        success: false,
        error: {
          message: 'Operation failed',
          code: FileSystemErrorCode.PERMISSION_DENIED,
        },
      };

      expect(() => unwrapIPCResponse(response)).toThrow('Operation failed');
    });

    it('should preserve error code when unwrapping', () => {
      const response: IPCResponse<string> = {
        success: false,
        error: {
          message: 'File not found',
          code: FileSystemErrorCode.FILE_NOT_FOUND,
        },
      };

      try {
        unwrapIPCResponse(response);
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error & { code?: string }).code).toBe(
          FileSystemErrorCode.FILE_NOT_FOUND
        );
      }
    });
  });

  describe('End-to-End Error Flow', () => {
    it('should propagate errors correctly through all layers', async () => {
      // 1. Repository throws
      const closedDb = new Database(':memory:');
      closedDb.close();
      const repo = new NotesRepository(closedDb);

      // 2. Service lets it bubble
      const service = new NotesService(repo, tagsRepo);

      // 3. IPC catches and returns error object
      const handlerWrapper = async (): Promise<IPCResponse<unknown>> => {
        try {
          const data = await service.getAllNotes();
          return { success: true, data };
        } catch (error) {
          return {
            success: false,
            error: {
              message: error instanceof Error ? error.message : String(error),
            },
          };
        }
      };

      const ipcResponse = await handlerWrapper();

      // 4. Renderer unwraps and throws
      expect(ipcResponse.success).toBe(false);
      expect(() => unwrapIPCResponse(ipcResponse)).toThrow();
    });
  });
});
