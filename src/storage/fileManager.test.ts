import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileManager } from './fileManager';
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
      const noteId = 'test-note-123';
      const filePath = fileManager.generateFilePath(noteId);

      expect(filePath).toContain(noteId);
      expect(filePath).toMatch(/\.md$/);
    });

    it('should generate path in notes directory', () => {
      const noteId = 'test-note-123';
      const filePath = fileManager.generateFilePath(noteId);

      expect(filePath).toContain(testDir);
    });

    it('should create notes directory if it does not exist', () => {
      const noteId = 'test-note-123';
      fileManager.generateFilePath(noteId);

      expect(fs.existsSync(testDir)).toBe(true);
    });
  });

  describe('writeNote', () => {
    it('should write note content to file', () => {
      const noteId = 'test-note-1';
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
      const noteId = 'test-note-2';
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
      const noteId = 'test-note-3';
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
      const noteId = 'test-note-4';
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
      const noteId = 'test-note-5';
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

      expect(result.content).toBe(content);
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
      const noteId = 'test-note-6';
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
      const noteId = 'test-note-7';
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

      expect(result.content).toBe(content);
    });
  });

  describe('deleteNote', () => {
    it('should delete existing note file', () => {
      const noteId = 'test-note-8';
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
      const noteId = 'test-note-9';
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
      const noteId = 'test-note-10';
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

      expect(result.content).toBe(originalContent);
      expect(result.frontmatter).toEqual(originalFrontmatter);
    });
  });
});
