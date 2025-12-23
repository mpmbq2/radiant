import type Database from 'better-sqlite3';
import { getDatabase } from './connection';
import { createLogger } from '../utils/logger';

const logger = createLogger('PreferencesRepository');

export class PreferencesRepository {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Get a preference value by key
   */
  getPreference(key: string): string | null {
    try {
      const stmt = this.db.prepare('SELECT value FROM preferences WHERE key = ?');
      const result = stmt.get(key) as { value: string } | undefined;
      return result ? result.value : null;
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error getting preference "${key}":`, error);
      } else {
        logger.error(`Error getting preference "${key}":`, new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Set a preference value
   */
  setPreference(key: string, value: string): void {
    try {
      const stmt = this.db.prepare(`
        INSERT INTO preferences (key, value)
        VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      stmt.run(key, value);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error setting preference "${key}":`, error);
      } else {
        logger.error(`Error setting preference "${key}":`, new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Get all preferences as a record
   */
  getAllPreferences(): Record<string, string> {
    try {
      const stmt = this.db.prepare('SELECT key, value FROM preferences');
      const rows = stmt.all() as Array<{ key: string; value: string }>;

      const preferences: Record<string, string> = {};
      for (const row of rows) {
        preferences[row.key] = row.value;
      }

      return preferences;
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Error getting all preferences:', error);
      } else {
        logger.error('Error getting all preferences:', new Error(String(error)));
      }
      throw error;
    }
  }

  /**
   * Delete a preference by key
   */
  deletePreference(key: string): void {
    try {
      const stmt = this.db.prepare('DELETE FROM preferences WHERE key = ?');
      stmt.run(key);
    } catch (error) {
      if (error instanceof Error) {
        logger.error(`Error deleting preference "${key}":`, error);
      } else {
        logger.error(`Error deleting preference "${key}":`, new Error(String(error)));
      }
      throw error;
    }
  }
}

// Lazy singleton instance
let _instance: PreferencesRepository | null = null;

export function getPreferencesRepository(): PreferencesRepository {
  if (!_instance) {
    _instance = new PreferencesRepository(getDatabase());
  }
  return _instance;
}
