import type Database from 'better-sqlite3';
import { getDatabase } from './connection';

export class PreferencesRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get a preference value by key
   */
  getPreference(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM preferences WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result ? result.value : null;
  }

  /**
   * Set a preference value
   */
  setPreference(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT INTO preferences (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }

  /**
   * Get all preferences as a record
   */
  getAllPreferences(): Record<string, string> {
    const stmt = this.db.prepare('SELECT key, value FROM preferences');
    const rows = stmt.all() as Array<{ key: string; value: string }>;

    const preferences: Record<string, string> = {};
    for (const row of rows) {
      preferences[row.key] = row.value;
    }

    return preferences;
  }

  /**
   * Delete a preference by key
   */
  deletePreference(key: string): void {
    const stmt = this.db.prepare('DELETE FROM preferences WHERE key = ?');
    stmt.run(key);
  }
}

// Lazy singleton instance (for backward compatibility)
let _preferencesRepository: PreferencesRepository | null = null;
export const preferencesRepository = new Proxy({} as PreferencesRepository, {
  get(target, prop) {
    if (!_preferencesRepository) {
      _preferencesRepository = new PreferencesRepository(getDatabase());
    }
    return (_preferencesRepository as any)[prop];
  },
});
