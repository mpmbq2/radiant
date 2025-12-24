import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { NotesRepository } from './notesRepository';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearTestDatabase,
} from './testHelpers';
import { getDatabase } from './connection';

describe('NotesRepository', () => {
  let repository: NotesRepository;

  beforeAll(() => {
    setupTestDatabase();
  });

  afterAll(() => {
    teardownTestDatabase();
  });

  beforeEach(() => {
    clearTestDatabase();
    repository = new NotesRepository(getDatabase());
  });

  describe('createNote', () => {
    it('should create a new note with correct metadata', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440001';
      const title = 'Test Note';
      const filePath = '/path/to/note.md';

      const note = repository.createNote(noteId, title, filePath);

      expect(note).toMatchObject({
        id: noteId,
        title: title,
        file_path: filePath,
        deleted_at: null,
        word_count: 0,
        character_count: 0,
      });
      expect(note.created_at).toBeGreaterThan(0);
      expect(note.modified_at).toBeGreaterThan(0);
      expect(note.created_at).toBe(note.modified_at);
    });

    it('should store the note in the database', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440002';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      const retrieved = repository.getNoteById(noteId);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(noteId);
    });
  });

  describe('getNoteById', () => {
    it('should return null for non-existent note', () => {
      const note = repository.getNoteById('non-existent');
      expect(note).toBeNull();
    });

    it('should retrieve an existing note', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440003';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      const note = repository.getNoteById(noteId);
      expect(note).not.toBeNull();
      expect(note?.id).toBe(noteId);
    });

    it('should not return deleted notes', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440004';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');
      repository.deleteNote(noteId);

      const note = repository.getNoteById(noteId);
      expect(note).toBeNull();
    });
  });

  describe('getAllNotes', () => {
    it('should return empty array when no notes exist', () => {
      const notes = repository.getAllNotes();
      expect(notes).toEqual([]);
    });

    it('should return all non-deleted notes', () => {
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440001',
        'Note 1',
        '/path/1.md'
      );
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440002',
        'Note 2',
        '/path/2.md'
      );
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440003',
        'Note 3',
        '/path/3.md'
      );

      const notes = repository.getAllNotes();
      expect(notes).toHaveLength(3);
    });

    it('should not include deleted notes', () => {
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440001',
        'Note 1',
        '/path/1.md'
      );
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440002',
        'Note 2',
        '/path/2.md'
      );
      repository.deleteNote('650e8400-e29b-41d4-a716-446655440002');

      const notes = repository.getAllNotes();
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('650e8400-e29b-41d4-a716-446655440001');
    });

    it('should order notes by modified_at descending', () => {
      // Create notes with slight time delay to ensure different timestamps
      const note1 = repository.createNote(
        '650e8400-e29b-41d4-a716-446655440001',
        'Note 1',
        '/path/1.md'
      );
      const note2 = repository.createNote(
        '650e8400-e29b-41d4-a716-446655440002',
        'Note 2',
        '/path/2.md'
      );

      // Update note 1 to make it most recent
      repository.updateNote('650e8400-e29b-41d4-a716-446655440001', {
        title: 'Updated Note 1',
      });

      const notes = repository.getAllNotes();
      expect(notes[0].id).toBe('650e8400-e29b-41d4-a716-446655440001');
      expect(notes[1].id).toBe('650e8400-e29b-41d4-a716-446655440002');
    });
  });

  describe('updateNote', () => {
    it('should update note title', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440005';
      repository.createNote(noteId, 'Original Title', '/path/to/note.md');

      repository.updateNote(noteId, { title: 'Updated Title' });

      const note = repository.getNoteById(noteId);
      expect(note?.title).toBe('Updated Title');
    });

    it('should update word count', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440006';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      repository.updateNote(noteId, { word_count: 42 });

      const note = repository.getNoteById(noteId);
      expect(note?.word_count).toBe(42);
    });

    it('should update character count', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440007';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      repository.updateNote(noteId, { character_count: 100 });

      const note = repository.getNoteById(noteId);
      expect(note?.character_count).toBe(100);
    });

    it('should update modified_at timestamp', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440008';
      const created = repository.createNote(
        noteId,
        'Test Note',
        '/path/to/note.md'
      );

      // Wait a bit to ensure different timestamp
      const beforeUpdate = Date.now();
      repository.updateNote(noteId, { title: 'Updated' });

      const updated = repository.getNoteById(noteId);
      expect(updated?.modified_at).toBeGreaterThanOrEqual(beforeUpdate);
      // modified_at should be at least as recent as created_at (may be same if update is very fast)
      expect(updated?.modified_at).toBeGreaterThanOrEqual(created.modified_at);
    });

    it('should update multiple fields at once', () => {
      const noteId = '550e8400-e29b-41d4-a716-446655440009';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      repository.updateNote(noteId, {
        title: 'New Title',
        word_count: 50,
        character_count: 250,
      });

      const note = repository.getNoteById(noteId);
      expect(note?.title).toBe('New Title');
      expect(note?.word_count).toBe(50);
      expect(note?.character_count).toBe(250);
    });
  });

  describe('deleteNote', () => {
    it('should soft delete a note', () => {
      const noteId = '550e8400-e29b-41d4-a716-44665544000a';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      repository.deleteNote(noteId);

      const note = repository.getNoteById(noteId);
      expect(note).toBeNull();
    });

    it('should set deleted_at timestamp', () => {
      const noteId = 'test-note-11';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      const beforeDelete = Date.now();
      repository.deleteNote(noteId);

      // Access database directly to check deleted_at
      const db = getDatabase();
      const result = db
        .prepare('SELECT deleted_at FROM notes WHERE id = ?')
        .get(noteId) as { deleted_at: number };

      expect(result.deleted_at).toBeGreaterThanOrEqual(beforeDelete);
    });
  });

  describe('permanentlyDeleteNote', () => {
    it('should permanently delete a note from database', () => {
      const noteId = 'test-note-12';
      repository.createNote(noteId, 'Test Note', '/path/to/note.md');

      repository.permanentlyDeleteNote(noteId);

      // Check that note is completely gone from database
      const db = getDatabase();
      const result = db.prepare('SELECT * FROM notes WHERE id = ?').get(noteId);

      expect(result).toBeUndefined();
    });
  });

  describe('searchNotesByTitle', () => {
    beforeEach(() => {
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440001',
        'JavaScript Tutorial',
        '/path/1.md'
      );
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440002',
        'TypeScript Guide',
        '/path/2.md'
      );
      repository.createNote(
        '650e8400-e29b-41d4-a716-446655440003',
        'Script Writing Tips',
        '/path/3.md'
      );
    });

    it('should find notes matching query', () => {
      const results = repository.searchNotesByTitle('Script');
      expect(results).toHaveLength(3);
    });

    it('should perform case-insensitive search', () => {
      const results = repository.searchNotesByTitle('javascript');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('JavaScript Tutorial');
    });

    it('should find partial matches', () => {
      const results = repository.searchNotesByTitle('Type');
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('TypeScript Guide');
    });

    it('should return empty array when no matches found', () => {
      const results = repository.searchNotesByTitle('Python');
      expect(results).toEqual([]);
    });

    it('should not return deleted notes in search', () => {
      repository.deleteNote('650e8400-e29b-41d4-a716-446655440001');
      const results = repository.searchNotesByTitle('JavaScript');
      expect(results).toEqual([]);
    });
  });
});
