import { app } from 'electron';
import path from 'path';

export const CONFIG = {
  // User data directory (platform-specific)
  USER_DATA_DIR: app.getPath('userData'),

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
