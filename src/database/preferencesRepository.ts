import { getDatabase } from './connection';

export class PreferencesRepository {
  /**
   * Get a preference value by key
   */
  getPreference(key: string): string | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT value FROM preferences WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result ? result.value : null;
  }

  /**
   * Set a preference value
   */
  setPreference(key: string, value: string): void {
    const db = getDatabase();
    const stmt = db.prepare(`
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
    const db = getDatabase();
    const stmt = db.prepare('SELECT key, value FROM preferences');
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
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM preferences WHERE key = ?');
    stmt.run(key);
  }
}

// Singleton instance
export const preferencesRepository = new PreferencesRepository();
