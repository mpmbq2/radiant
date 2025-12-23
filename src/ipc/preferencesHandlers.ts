import { getPreferencesService } from '../services/preferencesService';
import { createLogger } from '../utils/logger';
import { createHandler } from './utils/createIpcHandler';

const logger = createLogger('PreferencesHandlers');

export function registerPreferencesHandlers(): void {
  const preferencesService = getPreferencesService();

  // Get theme
  createHandler(
    'preferences:getTheme',
    'getting theme',
    () => preferencesService.getTheme(),
    logger
  );

  // Set theme
  createHandler(
    'preferences:setTheme',
    'setting theme',
    (theme: string) => preferencesService.setTheme(theme),
    logger
  );

  logger.info('Preferences IPC handlers registered');
}
