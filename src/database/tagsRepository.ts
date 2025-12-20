import { getDatabase } from './connection';
import type { Tag } from '../types';

export class TagsRepository {
  /**
   * Get or create a tag by name
   */
  getOrCreateTag(tagName: string): Tag {
    const db = getDatabase();
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
    const db = getDatabase();
    return db.prepare('SELECT * FROM tags ORDER BY name').all() as Tag[];
  }

  /**
   * Get tags for a specific note
   */
  getTagsForNote(noteId: string): string[] {
    const db = getDatabase();
    const result = db
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
    const db = getDatabase();

    // Start transaction
    const transaction = db.transaction(() => {
      // Remove existing tags
      db.prepare('DELETE FROM note_tags WHERE note_id = ?').run(noteId);

      // Add new tags
      for (const tagName of tagNames) {
        const tag = this.getOrCreateTag(tagName);
        db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)').run(
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
    const db = getDatabase();
    const normalized = tagName.toLowerCase().trim();

    const result = db
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
    const db = getDatabase();
    const result = db
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

// Singleton instance
export const tagsRepository = new TagsRepository();
