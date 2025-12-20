import { app } from 'electron';
import path from 'path';

// Cached user data directory (initialized on first access)
let cachedUserDataDir: string | null = null;

/**
 * Get the user data directory with lazy initialization.
 * This ensures app.getPath() is only called after Electron is ready.
 */
function getUserDataDir(): string {
  if (!cachedUserDataDir) {
    cachedUserDataDir = app.getPath('userData');
  }
  return cachedUserDataDir;
}

/**
 * Override user data directory for testing purposes.
 * @internal
 */
export function setUserDataDirForTesting(dir: string): void {
  cachedUserDataDir = dir;
}

/**
 * Reset cached user data directory (primarily for testing).
 * @internal
 */
export function resetUserDataDir(): void {
  cachedUserDataDir = null;
}

export const CONFIG = {
  // User data directory (platform-specific, lazily initialized)
  get USER_DATA_DIR() {
    return getUserDataDir();
  },

  // Database file location
  get DATABASE_PATH() {
    return path.join(this.USER_DATA_DIR, 'radiant.db');
  },

  // Notes directory location
  get NOTES_DIR() {
    return path.join(this.USER_DATA_DIR, 'notes');
  },

  // Application settings
  DATABASE_WAL_MODE: true,
  DATABASE_TIMEOUT: 5000,
  AUTO_SAVE_INTERVAL: 30000, // 30 seconds
};
