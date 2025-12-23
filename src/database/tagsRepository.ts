import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import type { Tag } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('TagsRepository');

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
      const normalized = tagName.toLowerCase().trim();
      const now = Date.now();

      // Wrap in transaction to prevent race conditions
      const getOrCreateTransaction = this.db.transaction((name: string, timestamp: number) => {
        // Try to get existing tag
        const existing = this.db
          .prepare('SELECT * FROM tags WHERE name = ?')
          .get(name) as Tag | undefined;

        if (existing) {
          return existing;
        }

        // Create new tag
        const result = this.db
          .prepare('INSERT INTO tags (name, created_at) VALUES (?, ?) RETURNING *')
          .get(name, timestamp) as Tag;

        return result;
      });

      return getOrCreateTransaction(normalized, now);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting or creating tag "${tagName}":`, error);
      } else {
        logger.error(`Error getting or creating tag "${tagName}":`, new Error(String(error)));
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
        logger.error(`Error getting tags for note ${noteId}:`, new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Set tags for a note (replaces existing tags)
   */
  setTagsForNote(noteId: string, tagNames: string[]): void {
    try {
      // Start transaction
      const transaction = this.db.transaction(() => {
        // Remove existing tags
        this.db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);

        // Add new tags
        for (const tagName of tagNames) {
          const tag = this.getOrCreateTag(tagName);
          this.db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(
            noteId,
            tag.id
          );
        }
      });

      transaction();
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error setting tags for note ${noteId}:`, error);
      } else {
        logger.error(`Error setting tags for note ${noteId}:`, new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get notes with a specific tag
   */
  getNotesWithTag(tagName: string): string[] {
    try {
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
        logger.error(`Error getting notes with tag "${tagName}":`, new Error(String(error)));
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
