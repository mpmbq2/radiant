import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import type { Tag } from '../types';

export class TagsRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get or create a tag by name
   */
  getOrCreateTag(tagName: string): Tag {
    const db = this.db;
    const normalized = tagName.toLowerCase().trim();

    // Try to get existing tag
    const existing = db
      .prepare('SELECT * FROM tags WHERE name = ?')
      .get(normalized) as Tag | undefined;

    if (existing) {
      return existing;
    }

    // Create new tag
    const now = Date.now();
    const result = db
      .prepare('INSERT INTO tags (name, created_at) VALUES (?, ?) RETURNING *')
      .get(normalized, now) as Tag;

    return result;
  }

  /**
   * Get all tags
   */
  getAllTags(): Tag[] {
    return this.db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  /**
   * Get tags for a specific note
   */
  getTagsForNote(noteId: string): string[] {
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
  }

  /**
   * Set tags for a note (replaces existing tags)
   */
  setTagsForNote(noteId: string, tagNames: string[]): void {
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
  }

  /**
   * Get notes with a specific tag
   */
  getNotesWithTag(tagName: string): string[] {
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
  }

  /**
   * Delete unused tags
   */
  deleteUnusedTags(): number {
    const result = this.db
      .prepare(
        `
      DELETE FROM tags
      WHERE id NOT IN (SELECT DISTINCT tag_id FROM note_tags)
    `
      )
      .run();

    return result.changes;
  }
}

// Lazy singleton instance (for backward compatibility)
let _tagsRepository: TagsRepository | null = null;
export const tagsRepository = new Proxy({} as TagsRepository, {
  get(target, prop) {
    if (!_tagsRepository) {
      _tagsRepository = new TagsRepository(getDatabase());
    }
    return (_tagsRepository as any)[prop];
  },
});
