import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import type {
  Note,
  NoteWithContent,
  CreateNoteInput,
  UpdateNoteInput,
} from '../types';
import { createLogger } from '../utils/logger';
import {
  validateNoteId,
  validateNoteTitle,
  validatePositiveNumber,
  validateFilePath,
  ValidationError,
} from '../utils/validation';
import { CONFIG } from '../config';

const logger = createLogger('NotesRepository');

export class NotesRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Create a new note (database only, no file content)
   */
  createNote(noteId: string, title: string, filePath: string): Note {
    try {
      // Validate inputs
      validateNoteId(noteId);
      validateNoteTitle(title);
      validateFilePath(filePath, CONFIG.NOTES_DIR);

      // Check for duplicate ID
      const existing = this.getNoteById(noteId);
      if (existing) {
        throw new ValidationError(
          `Note with ID ${noteId} already exists. Cannot create duplicate note.`
        );
      }

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
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error creating note in database:', error);
      } else {
        logger.error(
          'Error creating note in database:',
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Get note by ID
   */
  getNoteById(noteId: string): Note | null {
    try {
      // Validate input
      validateNoteId(noteId);

      const stmt = this.db.prepare(
        'SELECT * FROM notes WHERE id = ? AND deleted_at IS NULL'
      );
      const result = stmt.get(noteId) as Note | undefined;
      return result || null;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting note ${noteId}:`, error);
      } else {
        logger.error(`Error getting note ${noteId}:`, new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get all notes (excluding deleted)
   */
  getAllNotes(): Note[] {
    try {
      const stmt = this.db.prepare(`
        SELECT * FROM notes
        WHERE deleted_at IS NULL
        ORDER BY modified_at DESC
      `);
      return stmt.all() as Note[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting all notes:', error);
      } else {
        logger.error('Error getting all notes:', new Error(String(error)));
      }
      throw error;
    }
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
    try {
      // Validate noteId
      validateNoteId(noteId);

      // Validate updates
      if (updates.title !== undefined) {
        validateNoteTitle(updates.title);
      }
      if (updates.word_count !== undefined) {
        validatePositiveNumber(updates.word_count, 'Word count');
      }
      if (updates.character_count !== undefined) {
        validatePositiveNumber(updates.character_count, 'Character count');
      }

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
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error updating note ${noteId}:`, error);
      } else {
        logger.error(
          `Error updating note ${noteId}:`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Soft delete a note
   */
  deleteNote(noteId: string): void {
    try {
      // Validate input
      validateNoteId(noteId);

      const now = Date.now();

      const stmt = this.db.prepare(
        'UPDATE notes SET deleted_at = ? WHERE id = ?'
      );
      stmt.run(now, noteId);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error deleting note ${noteId}:`, error);
      } else {
        logger.error(
          `Error deleting note ${noteId}:`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Permanently delete a note
   */
  permanentlyDeleteNote(noteId: string): void {
    try {
      // Validate input
      validateNoteId(noteId);

      const stmt = this.db.prepare('DELETE FROM notes WHERE id = ?');
      stmt.run(noteId);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error permanently deleting note ${noteId}:`, error);
      } else {
        logger.error(
          `Error permanently deleting note ${noteId}:`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Search notes by title
   */
  searchNotesByTitle(query: string): Note[] {
    try {
      // Validate input
      if (typeof query !== 'string') {
        throw new ValidationError(
          `Search query must be a string, received ${typeof query}`
        );
      }

      const stmt = this.db.prepare(`
        SELECT * FROM notes
        WHERE title LIKE ? AND deleted_at IS NULL
        ORDER BY modified_at DESC
      `);
      return stmt.all(`%${query}%`) as Note[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error searching notes by title:', error);
      } else {
        logger.error(
          'Error searching notes by title:',
          new Error(String(error))
        );
      }
      throw error;
    }
  }
}

// Lazy singleton instance
let _notesRepository: NotesRepository | null = null;

export function getNotesRepository(): NotesRepository {
  if (!_notesRepository) {
    _notesRepository = new NotesRepository(getDatabase());
  }
  return _notesRepository;
}
