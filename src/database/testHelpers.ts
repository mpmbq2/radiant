import Database from 'better-sqlite3';
import * as connectionModule from './connection';
import { vi } from 'vitest';

// Test database instance
let testDb: Database.Database | null = null;

/**
 * Setup an in-memory database for testing
 */
export function setupTestDatabase(): Database.Database {
  // Create in-memory database
  testDb = new Database(':memory:');

  // Enable foreign keys
  testDb.pragma('foreign_keys = ON');

  // Mock the getDatabase function to return our test database
  vi.spyOn(connectionModule, 'getDatabase').mockImplementation(() => {
    if (!testDb) {
      throw new Error('Test database not initialized');
    }
    return testDb;
  });

  // Run migrations to create tables (manually since we're mocking)
  const SCHEMA_SQL = `
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      modified_at INTEGER NOT NULL,
      deleted_at INTEGER DEFAULT NULL,
      word_count INTEGER DEFAULT 0,
      character_count INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS note_tags (
      note_id TEXT NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_notes_modified_at ON notes(modified_at);
    CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
    CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
    CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
  `;

  testDb.exec(SCHEMA_SQL);

  return testDb;
}

/**
 * Teardown test database and restore mocks
 */
export function teardownTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }

  vi.restoreAllMocks();
}

/**
 * Clear all data from test database tables
 */
export function clearTestDatabase(): void {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }

  testDb.exec(`
    DELETE FROM note_tags;
    DELETE FROM tags;
    DELETE FROM notes;
  `);
}
