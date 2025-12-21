import Database from 'better-sqlite3';
import { runMigrations } from './migrations';

// Test database instance
let testDb: Database.Database | null = null;

// Store original getDatabase function
let originalGetDatabase: (() => Database.Database) | null = null;

/**
 * Setup an in-memory database for testing
 */
export function setupTestDatabase(): Database.Database {
  // Create in-memory database
  testDb = new Database(':memory:');

  // Enable foreign keys
  testDb.pragma('foreign_keys = ON');

  // Mock the getDatabase function to return our test database
  const connectionModule = require('./connection');
  if (!originalGetDatabase) {
    originalGetDatabase = connectionModule.getDatabase;
  }
  connectionModule.getDatabase = () => {
    if (!testDb) {
      throw new Error('Test database not initialized');
    }
    return testDb;
  };

  // Run migrations to create tables
  runMigrations();

  return testDb;
}

/**
 * Teardown test database and restore original getDatabase
 */
export function teardownTestDatabase(): void {
  if (testDb) {
    testDb.close();
    testDb = null;
  }

  // Restore original getDatabase function
  if (originalGetDatabase) {
    const connectionModule = require('./connection');
    connectionModule.getDatabase = originalGetDatabase;
  }
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
