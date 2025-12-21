import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

let db: Database.Database | null = null;

export function initializeDatabase(): Database.Database {
  // Ensure user data directory exists
  if (!fs.existsSync(CONFIG.USER_DATA_DIR)) {
    fs.mkdirSync(CONFIG.USER_DATA_DIR, { recursive: true });
  }

  // Create database connection
  db = new Database(CONFIG.DATABASE_PATH, {
    verbose:
      process.env.NODE_ENV === 'development'
        ? (msg: string) => logger.debug(msg)
        : undefined,
  });

  // Enable WAL mode for better concurrency
  if (CONFIG.DATABASE_WAL_MODE) {
    db.pragma('journal_mode = WAL');
  }

  // Set timeout for busy database
  db.pragma(`busy_timeout = ${CONFIG.DATABASE_TIMEOUT}`);

  // Enable foreign keys
  db.pragma('foreign_keys = ON');

  // Optimize for performance
  db.pragma('synchronous = NORMAL');
  db.pragma('cache_size = 10000');
  db.pragma('temp_store = MEMORY');

  logger.info(`Database initialized at: ${CONFIG.DATABASE_PATH}`);
  logger.info(`WAL mode: ${db.pragma('journal_mode', { simple: true })}`);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    );
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}
