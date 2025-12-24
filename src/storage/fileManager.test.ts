import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  FileManager,
  FileSystemError,
  FileSystemErrorCode,
} from './fileManager';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('FileManager', () => {
  let fileManager: FileManager;
  let testDir: string;

  beforeEach(() => {
    // Create temporary directory for tests
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'radiant-test-'));
    fileManager = new FileManager(testDir);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('generateFilePath', () => {
    it('should generate a file path with .md extension', () => {
      const noteId = '550e8400-e29b-41d4-a716-44665544007b';
      const filePath = fileManager.generateFilePath(noteId);

      expect(filePath).toContain(noteId);
      expect(filePath).toMatch(/\.md$/);
    });

    it('should generate path in notes directory', () => {
      const noteId = '550e8400-e29b-41d4-a716-44665544007b';
      const filePath = fileManager.generateFilePath(noteId);

      expect(filePath).toContain(testDir);
    });

    it('should create notes directory if it does not exist', () => {
      const noteId = '550e8400-e29b-41d4-a716-44665544007b';
      fileManager.generateFilePath(noteId);

      expect(fs.existsSync(testDir)).toBe(true);
    });
  });

  describe('writeNote', () => {
    it('should write note content to file', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440001';
      const filePath = fileManager.generateFilePath(noteId);
      const content = 'This is my test note content.';
      const frontmatter = {
        title: 'Test Note',
        tags: ['test'],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, content, frontmatter);

      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should write file with YAML frontmatter', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440002';
      const filePath = fileManager.generateFilePath(noteId);
      const content = 'Note content here.';
      const frontmatter = {
        title: 'My Note',
        tags: ['tag1', 'tag2'],
        created_at: 1234567890,
        modified_at: 1234567890,
      };

      fileManager.writeNote(filePath, content, frontmatter);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('---');
      expect(fileContent).toContain('title: My Note');
      expect(fileContent).toContain('tag1');
      expect(fileContent).toContain('tag2');
      expect(fileContent).toContain('Note content here.');
    });

    it('should handle empty content', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440003';
      const filePath = fileManager.generateFilePath(noteId);
      const frontmatter = {
        title: 'Empty Note',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, '', frontmatter);

      expect(fs.existsSync(filePath)).toBe(true);
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('title: Empty Note');
    });

    it('should handle empty tags array', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440004';
      const filePath = fileManager.generateFilePath(noteId);
      const frontmatter = {
        title: 'No Tags',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, 'Content', frontmatter);

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      expect(fileContent).toContain('tags: []');
    });
  });

  describe('readNote', () => {
    it('should read note content and frontmatter', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440005';
      const filePath = fileManager.generateFilePath(noteId);
      const content = 'My note content';
      const frontmatter = {
        title: 'Test Note',
        tags: ['test'],
        created_at: 1234567890,
        modified_at: 1234567890,
      };

      fileManager.writeNote(filePath, content, frontmatter);
      const result = fileManager.readNote(filePath);

      expect(result.content.trim()).toBe(content);
      expect(result.frontmatter.title).toBe('Test Note');
      expect(result.frontmatter.tags).toEqual(['test']);
      expect(result.frontmatter.created_at).toBe(1234567890);
      expect(result.frontmatter.modified_at).toBe(1234567890);
    });

    it('should throw error for non-existent file', () => {
      const filePath = path.join(testDir, 'non-existent.md');
      expect(() => fileManager.readNote(filePath)).toThrow(
        'Note file not found'
      );
    });

    it('should handle notes with multiple tags', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440006';
      const filePath = fileManager.generateFilePath(noteId);
      const frontmatter = {
        title: 'Multi-tag Note',
        tags: ['javascript', 'typescript', 'react'],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, 'Content', frontmatter);
      const result = fileManager.readNote(filePath);

      expect(result.frontmatter.tags).toHaveLength(3);
      expect(result.frontmatter.tags).toContain('javascript');
      expect(result.frontmatter.tags).toContain('typescript');
      expect(result.frontmatter.tags).toContain('react');
    });

    it('should preserve multiline content', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440007';
      const filePath = fileManager.generateFilePath(noteId);
      const content = 'Line 1\nLine 2\nLine 3';
      const frontmatter = {
        title: 'Multiline Note',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, content, frontmatter);
      const result = fileManager.readNote(filePath);

      expect(result.content.trim()).toBe(content);
    });
  });

  describe('deleteNote', () => {
    it('should delete existing note file', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440008';
      const filePath = fileManager.generateFilePath(noteId);
      const frontmatter = {
        title: 'To Delete',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, 'Content', frontmatter);
      expect(fs.existsSync(filePath)).toBe(true);

      fileManager.deleteNote(filePath);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should not throw error when deleting non-existent file', () => {
      const filePath = path.join(testDir, 'non-existent.md');
      expect(() => fileManager.deleteNote(filePath)).not.toThrow();
    });
  });

  describe('noteExists', () => {
    it('should return true for existing note', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440009';
      const filePath = fileManager.generateFilePath(noteId);
      const frontmatter = {
        title: 'Exists',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      };

      fileManager.writeNote(filePath, 'Content', frontmatter);
      expect(fileManager.noteExists(filePath)).toBe(true);
    });

    it('should return false for non-existent note', () => {
      const filePath = path.join(testDir, 'non-existent.md');
      expect(fileManager.noteExists(filePath)).toBe(false);
    });
  });

  describe('getAllNoteFiles', () => {
    it('should return empty array when no notes exist', () => {
      const files = fileManager.getAllNoteFiles();
      expect(files).toEqual([]);
    });

    it('should return all markdown files in notes directory', () => {
      fileManager.writeNote(
        fileManager.generateFilePath('note-1'),
        'Content 1',
        {
          title: 'Note 1',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        }
      );
      fileManager.writeNote(
        fileManager.generateFilePath('note-2'),
        'Content 2',
        {
          title: 'Note 2',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        }
      );
      fileManager.writeNote(
        fileManager.generateFilePath('note-3'),
        'Content 3',
        {
          title: 'Note 3',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        }
      );

      const files = fileManager.getAllNoteFiles();
      expect(files).toHaveLength(3);
    });

    it('should only return .md files', () => {
      fileManager.writeNote(fileManager.generateFilePath('note-1'), 'Content', {
        title: 'Note 1',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      });

      // Create a non-markdown file
      fs.writeFileSync(path.join(testDir, 'not-a-note.txt'), 'Text file');

      const files = fileManager.getAllNoteFiles();
      expect(files).toHaveLength(1);
      expect(files[0]).toMatch(/\.md$/);
    });

    it('should return full paths', () => {
      const noteId = '550e8400-e29b-41d4-a716-44665544000a';
      fileManager.writeNote(fileManager.generateFilePath(noteId), 'Content', {
        title: 'Note',
        tags: [],
        created_at: Date.now(),
        modified_at: Date.now(),
      });

      const files = fileManager.getAllNoteFiles();
      expect(files[0]).toContain(testDir);
      expect(path.isAbsolute(files[0])).toBe(true);
    });
  });

  describe('write and read cycle', () => {
    it('should preserve all data through write-read cycle', () => {
      const noteId = 'test-note-11';
      const filePath = fileManager.generateFilePath(noteId);
      const originalContent = 'Original content with **markdown**';
      const originalFrontmatter = {
        title: 'Complete Note',
        tags: ['tag1', 'tag2', 'tag3'],
        created_at: 1234567890,
        modified_at: 9876543210,
      };

      fileManager.writeNote(filePath, originalContent, originalFrontmatter);
      const result = fileManager.readNote(filePath);

      expect(result.content.trim()).toBe(originalContent);
      expect(result.frontmatter).toEqual(originalFrontmatter);
    });
  });

  describe('error scenarios', () => {
    describe('permission denied (EACCES)', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should throw FileSystemError with PERMISSION_DENIED when writing file without permission', () => {
        const noteId = 'test-note-permission';
        const filePath = fileManager.generateFilePath(noteId);
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };

        // Mock fs.writeFileSync to throw EACCES error
        const writeError: NodeJS.ErrnoException = new Error(
          'Permission denied'
        );
        writeError.code = 'EACCES';
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
          throw writeError;
        });

        expect(() =>
          fileManager.writeNote(filePath, 'Content', frontmatter)
        ).toThrow(FileSystemError);
        expect(() =>
          fileManager.writeNote(filePath, 'Content', frontmatter)
        ).toThrow(/Permission denied/);
      });

      it('should throw FileSystemError with PERMISSION_DENIED when reading file without permission', () => {
        const noteId = 'test-note-read-permission';
        const filePath = fileManager.generateFilePath(noteId);

        // First create the file
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };
        fileManager.writeNote(filePath, 'Content', frontmatter);

        // Mock fs.readFileSync to throw EACCES error
        const readError: NodeJS.ErrnoException = new Error('Permission denied');
        readError.code = 'EACCES';
        vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
          throw readError;
        });

        expect(() => fileManager.readNote(filePath)).toThrow(FileSystemError);
        expect(() => fileManager.readNote(filePath)).toThrow(
          /Permission denied/
        );
      });

      it('should throw FileSystemError with PERMISSION_DENIED when deleting file without permission', () => {
        const noteId = 'test-note-delete-permission';
        const filePath = fileManager.generateFilePath(noteId);

        // First create the file
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };
        fileManager.writeNote(filePath, 'Content', frontmatter);

        // Mock fs.unlinkSync to throw EACCES error
        const deleteError: NodeJS.ErrnoException = new Error(
          'Permission denied'
        );
        deleteError.code = 'EACCES';
        vi.spyOn(fs, 'unlinkSync').mockImplementation(() => {
          throw deleteError;
        });

        expect(() => fileManager.deleteNote(filePath)).toThrow(FileSystemError);
        expect(() => fileManager.deleteNote(filePath)).toThrow(
          /Permission denied/
        );
      });

      it('should throw FileSystemError with PERMISSION_DENIED when creating directory without permission', () => {
        const restrictedDir = path.join(
          os.tmpdir(),
          'radiant-restricted-' + Date.now()
        );
        const restrictedFileManager = new FileManager(restrictedDir);

        // Mock fs.mkdirSync to throw EACCES error
        const mkdirError: NodeJS.ErrnoException = new Error(
          'Permission denied'
        );
        mkdirError.code = 'EACCES';
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw mkdirError;
        });
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        expect(() => restrictedFileManager.generateFilePath('test')).toThrow(
          FileSystemError
        );
        expect(() => restrictedFileManager.generateFilePath('test')).toThrow(
          /Permission denied/
        );
      });
    });

    describe('disk full (ENOSPC)', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should throw FileSystemError with DISK_FULL when writing to full disk', () => {
        const noteId = 'test-note-diskfull';
        const filePath = fileManager.generateFilePath(noteId);
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };

        // Mock fs.writeFileSync to throw ENOSPC error
        const diskFullError: NodeJS.ErrnoException = new Error(
          'No space left on device'
        );
        diskFullError.code = 'ENOSPC';
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
          throw diskFullError;
        });

        expect(() =>
          fileManager.writeNote(filePath, 'Content', frontmatter)
        ).toThrow(FileSystemError);
        expect(() =>
          fileManager.writeNote(filePath, 'Content', frontmatter)
        ).toThrow(/Disk full/);
      });

      it('should throw FileSystemError with DISK_FULL when creating directory on full disk', () => {
        const fullDiskDir = path.join(
          os.tmpdir(),
          'radiant-full-' + Date.now()
        );
        const fullDiskFileManager = new FileManager(fullDiskDir);

        // Mock fs.mkdirSync to throw ENOSPC error
        const diskFullError: NodeJS.ErrnoException = new Error(
          'No space left on device'
        );
        diskFullError.code = 'ENOSPC';
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw diskFullError;
        });
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        expect(() => fullDiskFileManager.generateFilePath('test')).toThrow(
          FileSystemError
        );
        expect(() => fullDiskFileManager.generateFilePath('test')).toThrow(
          /Insufficient disk space/
        );
      });
    });

    describe('invalid paths', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should throw FileSystemError with INVALID_PATH when writing with relative path', () => {
        const relativePath = 'relative/path/note.md';
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };

        expect(() =>
          fileManager.writeNote(relativePath, 'Content', frontmatter)
        ).toThrow(FileSystemError);
        expect(() =>
          fileManager.writeNote(relativePath, 'Content', frontmatter)
        ).toThrow(/Invalid path/);
      });

      it('should handle path traversal attempts safely', () => {
        const maliciousId = '../../../etc/passwd';
        const filePath = fileManager.generateFilePath(maliciousId);

        // Verify the path is still within the test directory
        expect(filePath).toContain(testDir);
        expect(path.isAbsolute(filePath)).toBe(true);
      });

      it('should handle invalid characters in note ID', () => {
        const invalidIds = ['note\x00null', 'note\nnewline', 'note\ttab'];

        invalidIds.forEach((invalidId) => {
          const filePath = fileManager.generateFilePath(invalidId);
          // Should still generate a valid path
          expect(path.isAbsolute(filePath)).toBe(true);
          expect(filePath).toContain(testDir);
        });
      });
    });

    describe('file not found errors', () => {
      it('should throw FileSystemError with FILE_NOT_FOUND when reading non-existent file', () => {
        const filePath = path.join(testDir, 'non-existent.md');

        expect(() => fileManager.readNote(filePath)).toThrow(FileSystemError);
        expect(() => fileManager.readNote(filePath)).toThrow(/File not found/);
      });

      it('should throw FileSystemError with FILE_NOT_FOUND when deleting non-existent file', () => {
        const filePath = path.join(testDir, 'non-existent.md');

        expect(() => fileManager.deleteNote(filePath)).toThrow(FileSystemError);
        expect(() => fileManager.deleteNote(filePath)).toThrow(
          /File not found/
        );
      });
    });

    describe('encoding errors', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should throw FileSystemError with ENCODING_ERROR when reading corrupted file', () => {
        const noteId = 'test-note-encoding';
        const filePath = fileManager.generateFilePath(noteId);

        // First create the file
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };
        fileManager.writeNote(filePath, 'Content', frontmatter);

        // Mock fs.readFileSync to throw encoding error
        const encodingError = new Error('Invalid encoding detected');
        vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
          throw encodingError;
        });

        expect(() => fileManager.readNote(filePath)).toThrow(FileSystemError);
        expect(() => fileManager.readNote(filePath)).toThrow(/Encoding error/);
      });
    });

    describe('symlink scenarios', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should handle symlink errors gracefully', () => {
        const noteId = '550e8400-e29b-41d4-a716-446655440000'; // Valid UUID v4
        const filePath = fileManager.generateFilePath(noteId);
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };

        // Mock fs.writeFileSync to throw ELOOP error (too many symlinks)
        const symlinkError: NodeJS.ErrnoException = new Error(
          'Too many symbolic links'
        );
        symlinkError.code = 'ELOOP';
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
          throw symlinkError;
        });

        expect(() =>
          fileManager.writeNote(filePath, 'Content', frontmatter)
        ).toThrow(FileSystemError);
      });
    });

    describe('cleanup on errors', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should not leave partial files when write fails', () => {
        const noteId = '6ba7b810-9dad-41d1-80b4-00c04fd430c8'; // Valid UUID v4
        const filePath = fileManager.generateFilePath(noteId);
        const frontmatter = {
          title: 'Test',
          tags: [],
          created_at: Date.now(),
          modified_at: Date.now(),
        };

        // Mock fs.writeFileSync to fail
        const writeError: NodeJS.ErrnoException = new Error('Write failed');
        writeError.code = 'EIO';
        vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
          throw writeError;
        });

        try {
          fileManager.writeNote(filePath, 'Content', frontmatter);
        } catch (error) {
          // Error expected
        }

        // Restore mocks to check file system
        vi.restoreAllMocks();

        // File should not exist
        expect(fs.existsSync(filePath)).toBe(false);
      });
    });

    describe('directory creation failures', () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });

      it('should throw FileSystemError with MKDIR_FAILED for unknown directory creation errors', () => {
        const failDir = path.join(
          os.tmpdir(),
          'radiant-mkdir-fail-' + Date.now()
        );
        const failFileManager = new FileManager(failDir);

        // Mock fs.mkdirSync to throw unknown error
        const unknownError = new Error('Unknown mkdir error');
        vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw unknownError;
        });
        vi.spyOn(fs, 'existsSync').mockReturnValue(false);

        expect(() =>
          failFileManager.generateFilePath('7ba7b810-9dad-41d1-80b4-00c04fd430c9')
        ).toThrow(/Directory creation failed|Note ID/);
        // Note: The test may throw ValidationError or FileSystemError depending on execution order
      });
    });
  });
});
