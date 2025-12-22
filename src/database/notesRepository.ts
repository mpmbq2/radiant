import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import type {
  Note,
  NoteWithContent,
  CreateNoteInput,
  UpdateNoteInput,
} from '../types';

export class NotesRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new note (database only, no file content)
   */
  createNote(noteId: string, title: string, filePath: string): Note {
    const db = this.db;
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO notes (id, title, file_path, created_at, modified_at, word_count, character_count)
      VALUES (?, ?, ?, ?, ?, 0, 0)
    `);

    stmt.run(noteId, title, filePath, now, now);

    return {
      id: noteId,
      title,
      file_path: filePath,
      created_at: now,
      modified_at: now,
      deleted_at: null,
      word_count: 0,
      character_count: 0,
    };
  }

  /**
   * Get note by ID
   */
  getNoteById(noteId: string): Note | null {
    const stmt = this.db.prepare(
      'SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL'
    );
    const result = stmt.get(noteId) as Note | undefined;
    return result || null;
  }

  /**
   * Get all notes (excluding deleted)
   */
  getAllNotes(): Note[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notes
      WHERE deleted_at IS NULL
      ORDER BY modified_at DESC
    `);
    return stmt.all() as Note[];
  }

  /**
   * Update note metadata
   */
  updateNote(
    noteId: string,
    updates: {
      title?: string;
      word_count?: number;
      character_count?: number;
    }
  ): void {
    const now = Date.now();

    const fields: string[] = ['modified_at = ?'];
    const values: Array<number | string> = [now];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.word_count !== undefined) {
      fields.push('word_count = ?');
      values.push(updates.word_count);
    }
    if (updates.character_count !== undefined) {
      fields.push('character_count = ?');
      values.push(updates.character_count);
    }

    values.push(noteId);

    const stmt = this.db.prepare(`
      UPDATE notes
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
  }

  /**
   * Soft delete a note
   */
  deleteNote(noteId: string): void {
    const now = Date.now();

    const stmt = this.db.prepare('UPDATE notes SET deleted_at = ? WHERE id = ?');
    stmt.run(now, noteId);
  }

  /**
   * Permanently delete a note
   */
  permanentlyDeleteNote(noteId: string): void {
    const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
    stmt.run(noteId);
  }

  /**
   * Search notes by title
   */
  searchNotesByTitle(query: string): Note[] {
    const stmt = this.db.prepare(`
      SELECT * FROM notes
      WHERE title LIKE ? AND deleted_at IS NULL
      ORDER BY modified_at DESC
    `);
    return stmt.all(`%${query}%`) as Note[];
  }
}

// Lazy singleton instance (for backward compatibility)
let _notesRepository: NotesRepository | null = null;
export const notesRepository = new Proxy({} as NotesRepository, {
  get(target, prop) {
    if (!_notesRepository) {
      _notesRepository = new NotesRepository(getDatabase());
    }
    return (_notesRepository as any)[prop];
  },
});
