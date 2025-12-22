/**
 * Repository for saved filter configurations
 */

import { getDatabase } from './connection';
import type { SavedFilter, SavedFilterMetadata } from '../filters/filterConfig';
import type { FilterConfig } from '../filters/FilterInterface';
import type { FilterConfigRepository } from '../filters/FilterConfigService';

/**
 * Database row structure for saved filters
 */
interface SavedFilterRow {
  id: string;
  name: string;
  description: string | null;
  config: string; // JSON string
  tags: string | null; // JSON string array
  created_at: number;
  modified_at: number;
  is_preset: number; // SQLite boolean (0 or 1)
  icon: string | null;
  color: string | null;
}

/**
 * Convert database row to SavedFilter
 */
function rowToSavedFilter(row: SavedFilterRow): SavedFilter {
  return {
    metadata: {
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      tags: row.tags ? JSON.parse(row.tags) : [],
      createdAt: row.created_at,
      modifiedAt: row.modified_at,
      isPreset: row.is_preset === 1,
      icon: row.icon || undefined,
      color: row.color || undefined,
    },
    config: JSON.parse(row.config) as FilterConfig,
  };
}

/**
 * Convert SavedFilter to database row
 */
function savedFilterToRow(filter: SavedFilter): Omit<SavedFilterRow, 'id'> & { id?: string } {
  return {
    id: filter.metadata.id,
    name: filter.metadata.name,
    description: filter.metadata.description || null,
    config: JSON.stringify(filter.config),
    tags: filter.metadata.tags ? JSON.stringify(filter.metadata.tags) : null,
    created_at: filter.metadata.createdAt,
    modified_at: filter.metadata.modifiedAt,
    is_preset: filter.metadata.isPreset ? 1 : 0,
    icon: filter.metadata.icon || null,
    color: filter.metadata.color || null,
  };
}

/**
 * Repository implementation for saved filters using SQLite
 */
export class SavedFiltersRepository implements FilterConfigRepository {
  /**
   * Save a new filter
   */
  async save(filter: SavedFilter): Promise<void> {
    const db = getDatabase();
    const row = savedFilterToRow(filter);

    const stmt = db.prepare(`
      INSERT INTO saved_filters (
        id, name, description, config, tags,
        created_at, modified_at, is_preset, icon, color
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      row.id,
      row.name,
      row.description,
      row.config,
      row.tags,
      row.created_at,
      row.modified_at,
      row.is_preset,
      row.icon,
      row.color
    );
  }

  /**
   * Get a filter by ID
   */
  async getById(id: string): Promise<SavedFilter | null> {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM saved_filters WHERE id = ?
    `);

    const row = stmt.get(id) as SavedFilterRow | undefined;

    return row ? rowToSavedFilter(row) : null;
  }

  /**
   * Get all saved filters
   */
  async getAll(): Promise<SavedFilter[]> {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM saved_filters
      ORDER BY modified_at DESC
    `);

    const rows = stmt.all() as SavedFilterRow[];

    return rows.map(rowToSavedFilter);
  }

  /**
   * Delete a filter by ID
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();

    const stmt = db.prepare(`
      DELETE FROM saved_filters WHERE id = ?
    `);

    const result = stmt.run(id);

    return result.changes > 0;
  }

  /**
   * Update a filter
   */
  async update(id: string, filter: SavedFilter): Promise<void> {
    const db = getDatabase();
    const row = savedFilterToRow(filter);

    const stmt = db.prepare(`
      UPDATE saved_filters
      SET name = ?,
          description = ?,
          config = ?,
          tags = ?,
          modified_at = ?,
          icon = ?,
          color = ?
      WHERE id = ?
    `);

    stmt.run(
      row.name,
      row.description,
      row.config,
      row.tags,
      row.modified_at,
      row.icon,
      row.color,
      id
    );
  }

  /**
   * Search filters by name or description
   */
  async search(query: string): Promise<SavedFilter[]> {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM saved_filters
      WHERE name LIKE ? OR description LIKE ?
      ORDER BY modified_at DESC
    `);

    const searchPattern = `%${query}%`;
    const rows = stmt.all(searchPattern, searchPattern) as SavedFilterRow[];

    return rows.map(rowToSavedFilter);
  }

  /**
   * Get filters by tag
   */
  async getByTag(tag: string): Promise<SavedFilter[]> {
    const db = getDatabase();

    // Note: SQLite doesn't have native JSON array searching,
    // so we use LIKE pattern matching
    const stmt = db.prepare(`
      SELECT * FROM saved_filters
      WHERE tags LIKE ?
      ORDER BY modified_at DESC
    `);

    const searchPattern = `%"${tag}"%`;
    const rows = stmt.all(searchPattern) as SavedFilterRow[];

    return rows.map(rowToSavedFilter);
  }

  /**
   * Get recently modified filters
   */
  async getRecent(limit: number = 10): Promise<SavedFilter[]> {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT * FROM saved_filters
      ORDER BY modified_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as SavedFilterRow[];

    return rows.map(rowToSavedFilter);
  }

  /**
   * Count total saved filters
   */
  async count(): Promise<number> {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT COUNT(*) as count FROM saved_filters
    `);

    const result = stmt.get() as { count: number };

    return result.count;
  }
}

/**
 * Singleton instance
 */
export const savedFiltersRepository = new SavedFiltersRepository();
