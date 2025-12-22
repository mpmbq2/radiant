import { getDatabase } from './connection';
import { createLogger } from '../utils/logger';

const logger = createLogger('migrations');

const SCHEMA_SQL = `
-- Notes table: stores metadata about each note
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

-- Tags table: stores all unique tags
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL
);

-- Note-Tag junction table: many-to-many relationship
CREATE TABLE IF NOT EXISTS note_tags (
  note_id TEXT NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (note_id, tag_id),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Preferences table: stores user preferences as key-value pairs
CREATE TABLE IF NOT EXISTS preferences (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Saved Filters table: stores user-created filter configurations
CREATE TABLE IF NOT EXISTS saved_filters (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config TEXT NOT NULL,
  tags TEXT,
  created_at INTEGER NOT NULL,
  modified_at INTEGER NOT NULL,
  is_preset INTEGER DEFAULT 0,
  icon TEXT,
  color TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_modified_at ON notes(modified_at);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_deleted_at ON notes(deleted_at);
CREATE INDEX IF NOT EXISTS idx_note_tags_note_id ON note_tags(note_id);
CREATE INDEX IF NOT EXISTS idx_note_tags_tag_id ON note_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_saved_filters_created_at ON saved_filters(created_at);
CREATE INDEX IF NOT EXISTS idx_saved_filters_modified_at ON saved_filters(modified_at);
`;

export function runMigrations(): void {
  const db = getDatabase();

  // Execute schema (CREATE TABLE IF NOT EXISTS is idempotent)
  db.exec(SCHEMA_SQL);

  logger.info('Database migrations completed');

  // Verify tables exist
  const tables = db
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`)
    .all();

  logger.debug('Database tables:', tables);
}

export function resetDatabase(): void {
  const db = getDatabase();

  // Drop all tables (useful for development)
  db.exec(`
    DROP TABLE IF EXISTS note_tags;
    DROP TABLE IF EXISTS tags;
    DROP TABLE IF EXISTS notes;
    DROP TABLE IF EXISTS preferences;
    DROP TABLE IF EXISTS saved_filters;
  `);

  logger.info('Database reset complete');

  // Re-run migrations
  runMigrations();
}
