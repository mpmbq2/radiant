import Database from 'better-sqlite3';
import fs from 'fs';
import { CONFIG } from '../config';
import { createLogger } from '../utils/logger';

const logger = createLogger('Database');

let db: Database.Database | null = null;

/**
 * Database connection error codes
 */
export enum DatabaseErrorCode {
  DIRECTORY_CREATION_FAILED = 'DIRECTORY_CREATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  INSUFFICIENT_SPACE = 'INSUFFICIENT_SPACE',
  DATABASE_OPEN_FAILED = 'DATABASE_OPEN_FAILED',
  DATABASE_CORRUPTED = 'DATABASE_CORRUPTED',
  PRAGMA_FAILED = 'PRAGMA_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for database connection failures
 */
export class DatabaseConnectionError extends Error {
  constructor(
    message: string,
    public code: DatabaseErrorCode,
    public path?: string,
    public cause?: Error
  ) {
    super(message);
    this.name = 'DatabaseConnectionError';
    Error.captureStackTrace(this, DatabaseConnectionError);
  }
}

export function initializeDatabase(): Database.Database {
  // Ensure user data directory exists
  if (!fs.existsSync(CONFIG.USER_DATA_DIR)) {
    try {
      fs.mkdirSync(CONFIG.USER_DATA_DIR, { recursive: true });
      logger.info(`Created user data directory: ${CONFIG.USER_DATA_DIR}`);
    } catch (error) {
      const err = error as NodeJS.ErrnoException;

      // Handle permission denied
      if (err.code === 'EACCES') {
        throw new DatabaseConnectionError(
          `Permission denied when creating directory: ${CONFIG.USER_DATA_DIR}. Please check file system permissions.`,
          DatabaseErrorCode.PERMISSION_DENIED,
          CONFIG.USER_DATA_DIR,
          err
        );
      }

      // Handle insufficient disk space
      if (err.code === 'ENOSPC') {
        throw new DatabaseConnectionError(
          `Insufficient disk space to create directory: ${CONFIG.USER_DATA_DIR}. Please free up disk space.`,
          DatabaseErrorCode.INSUFFICIENT_SPACE,
          CONFIG.USER_DATA_DIR,
          err
        );
      }

      // Handle other directory creation errors
      throw new DatabaseConnectionError(
        `Failed to create user data directory at ${CONFIG.USER_DATA_DIR}: ${err.message}`,
        DatabaseErrorCode.DIRECTORY_CREATION_FAILED,
        CONFIG.USER_DATA_DIR,
        err
      );
    }
  }

  // Create database connection
  try {
    db = new Database(CONFIG.DATABASE_PATH, {
      verbose:
        process.env.NODE_ENV === 'development'
          ? (msg: string) => logger.debug(msg)
          : undefined,
    });
    logger.info(`Database opened at: ${CONFIG.DATABASE_PATH}`);
  } catch (error) {
    const err = error as Error;

    // Check for database corruption
    if (err.message.includes('corrupt') || err.message.includes('malformed')) {
      throw new DatabaseConnectionError(
        `Database file is corrupted at ${CONFIG.DATABASE_PATH}. Consider backing up and deleting the file to recreate it.`,
        DatabaseErrorCode.DATABASE_CORRUPTED,
        CONFIG.DATABASE_PATH,
        err
      );
    }

    // Check for permission errors
    if (err.message.includes('EACCES') || err.message.includes('permission')) {
      throw new DatabaseConnectionError(
        `Permission denied when opening database at ${CONFIG.DATABASE_PATH}. Please check file permissions.`,
        DatabaseErrorCode.PERMISSION_DENIED,
        CONFIG.DATABASE_PATH,
        err
      );
    }

    // Handle other database opening errors
    throw new DatabaseConnectionError(
      `Failed to open database at ${CONFIG.DATABASE_PATH}: ${err.message}`,
      DatabaseErrorCode.DATABASE_OPEN_FAILED,
      CONFIG.DATABASE_PATH,
      err
    );
  }

  // Enable WAL mode for better concurrency (non-fatal if fails)
  if (CONFIG.DATABASE_WAL_MODE) {
    try {
      db.pragma('journal_mode = WAL');
      logger.info('WAL mode enabled');
    } catch (error) {
      const err = error as Error;
      logger.warn(
        `Failed to enable WAL mode, continuing with default journal mode: ${err.message}`
      );
    }
  }

  // Set timeout for busy database
  try {
    db.pragma(`busy_timeout = ${CONFIG.DATABASE_TIMEOUT}`);
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to set busy_timeout pragma: ${err.message}`);
  }

  // Enable foreign keys
  try {
    db.pragma('foreign_keys = ON');
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to enable foreign keys: ${err.message}`);
  }

  // Optimize for performance
  try {
    db.pragma('synchronous = NORMAL');
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to set synchronous pragma: ${err.message}`);
  }

  try {
    db.pragma('cache_size = 10000');
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to set cache_size pragma: ${err.message}`);
  }

  try {
    db.pragma('temp_store = MEMORY');
  } catch (error) {
    const err = error as Error;
    logger.warn(`Failed to set temp_store pragma: ${err.message}`);
  }

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
