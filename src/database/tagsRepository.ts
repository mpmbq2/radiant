import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import type { Tag } from '../types';
import { createLogger } from '../utils/logger';
import {
  validateTagName,
  validateNoteId,
  validateTags,
} from '../utils/validation';

const logger = createLogger('TagsRepository');

/**
 * SQLite error codes
 */
const SQLITE_ERROR_CODES = {
  BUSY: 'SQLITE_BUSY',
  CONSTRAINT: 'SQLITE_CONSTRAINT',
  LOCKED: 'SQLITE_LOCKED',
} as const;

/**
 * Configuration for retry logic
 */
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BASE_DELAY_MS: 100,
  MAX_DELAY_MS: 1000,
} as const;

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.BASE_DELAY_MS * Math.pow(2, attempt);
  return Math.min(delay, RETRY_CONFIG.MAX_DELAY_MS);
}

/**
 * Check if an error is a SQLite error with a specific code
 */
function isSQLiteError(error: unknown, code: string): boolean {
  return error instanceof Error && 'code' in error && error.code === code;
}

/**
 * Execute a database operation with retry logic for SQLITE_BUSY errors
 */
async function executeWithRetry<T>(
  operation: () => T,
  operationName: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= RETRY_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return operation();
    } catch (error) {
      // Check if this is a SQLITE_BUSY or SQLITE_LOCKED error
      if (
        isSQLiteError(error, SQLITE_ERROR_CODES.BUSY) ||
        isSQLiteError(error, SQLITE_ERROR_CODES.LOCKED)
      ) {
        lastError = error as Error;

        if (attempt < RETRY_CONFIG.MAX_RETRIES) {
          const delay = getRetryDelay(attempt);
          logger.warn(
            `${operationName}: Database locked (attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES}), retrying in ${delay}ms...`
          );
          await sleep(delay);
          continue;
        } else {
          logger.error(
            `${operationName}: Database still locked after ${RETRY_CONFIG.MAX_RETRIES} retries`
          );
        }
      }

      // For non-BUSY/LOCKED errors or final attempt, throw immediately
      throw error;
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Operation failed');
}

export class TagsRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get or create a tag by name
   */
  getOrCreateTag(tagName: string): Tag {
    try {
      // Validate input
      validateTagName(tagName);

      const normalized = tagName.toLowerCase().trim();
      const now = Date.now();

      // Wrap in transaction to prevent race conditions
      const getOrCreateTransaction = this.db.transaction(
        (name: string, timestamp: number) => {
          // Try to get existing tag
          const existing = this.db
            .prepare('SELECT * FROM tags WHERE name = ?')
            .get(name) as Tag | undefined;

          if (existing) {
            return existing;
          }

          // Create new tag
          const result = this.db
            .prepare(
              'INSERT INTO tags (name, created_at) VALUES (?, ?) RETURNING *'
            )
            .get(name, timestamp) as Tag;

          return result;
        }
      );

      return getOrCreateTransaction(normalized, now);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting or creating tag "${tagName}":`, error);
      } else {
        logger.error(
          `Error getting or creating tag "${tagName}":`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Get all tags
   */
  getAllTags(): Tag[] {
    try {
      return this.db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting all tags:', error);
      } else {
        logger.error('Error getting all tags:', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get tags for a specific note
   */
  getTagsForNote(noteId: string): string[] {
    try {
      // Validate input
      validateNoteId(noteId);

      const result = this.db
        .prepare(
          `
        SELECT t.name
        FROM tags t
        INNER JOIN note_tags nt ON t.id = nt.tag_id
        WHERE nt.note_id = ?
        ORDER BY t.name
      `
        )
        .all(noteId) as { name: string }[];

      return result.map((r) => r.name);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting tags for note ${noteId}:`, error);
      } else {
        logger.error(
          `Error getting tags for note ${noteId}:`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Set tags for a note (replaces existing tags)
   *
   * This method uses a transaction to ensure atomicity. If any error occurs,
   * the transaction is automatically rolled back by better-sqlite3.
   *
   * The method includes retry logic for SQLITE_BUSY/SQLITE_LOCKED errors
   * and provides clear error messages for constraint violations.
   */
  async setTagsForNote(noteId: string, tagNames: string[]): Promise<void> {
    // Validate inputs before attempting database operations
    validateNoteId(noteId);
    validateTags(tagNames);

    return executeWithRetry(() => {
      try {
        // Create transaction
        const transaction = this.db.transaction(() => {
          // Remove existing tags
          this.db
            .prepare('DELETE FROM note_tags WHERE note_id = ?')
            .run(noteId);

          // Add new tags
          for (const tagName of tagNames) {
            const tag = this.getOrCreateTag(tagName);
            this.db
              .prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)')
              .run(noteId, tag.id);
          }
        });

        // Execute transaction
        // Better-sqlite3 automatically rolls back on any error
        transaction();
      } catch (error) {
        // Handle constraint violations with clear error messages
        if (isSQLiteError(error, SQLITE_ERROR_CODES.CONSTRAINT)) {
          const message =
            `Constraint violation while setting tags for note ${noteId}. ` +
            `This may indicate an invalid note_id or duplicate tag assignment.`;
          logger.error(message, error);
          throw new Error(message);
        }

        // Log and re-throw other errors
        if (error instanceof Error) {
          logger.error(`Error setting tags for note ${noteId}:`, error);
        } else {
          logger.error(
            `Error setting tags for note ${noteId}:`,
            new Error(String(error))
          );
        }
        throw error;
      }
    }, `setTagsForNote(${noteId})`);
  }

  /**
   * Get notes with a specific tag
   */
  getNotesWithTag(tagName: string): string[] {
    try {
      // Validate input
      validateTagName(tagName);

      const normalized = tagName.toLowerCase().trim();

      const result = this.db
        .prepare(
          `
        SELECT nt.note_id
        FROM note_tags nt
        INNER JOIN tags t ON nt.tag_id = t.id
        WHERE t.name = ?
      `
        )
        .all(normalized) as { note_id: string }[];

      return result.map((r) => r.note_id);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting notes with tag "${tagName}":`, error);
      } else {
        logger.error(
          `Error getting notes with tag "${tagName}":`,
          new Error(String(error))
        );
      }
      throw error;
    }
  }

  /**
   * Delete unused tags
   */
  deleteUnusedTags(): number {
    try {
      const result = this.db
        .prepare(
          `
        DELETE FROM tags
        WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)
      `
        )
        .run();

      return result.changes;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error deleting unused tags:', error);
      } else {
        logger.error('Error deleting unused tags:', new Error(String(error)));
      }
      throw error;
    }
  }
}

// Lazy singleton instance
let _tagsRepository: TagsRepository | null = null;

export function getTagsRepository(): TagsRepository {
  if (!_tagsRepository) {
    _tagsRepository = new TagsRepository(getDatabase());
  }
  return _tagsRepository;
}
