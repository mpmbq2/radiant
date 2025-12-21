import { ipcMain, IpcMainInvokeEvent } from 'electron';
import { preferencesService } from '../services/preferencesService';
import { createLogger } from '../utils/logger';

const logger = createLogger('PreferencesHandlers');

/**
 * Generic wrapper for IPC handlers that provides consistent error handling.
 * Eliminates the need for repetitive try-catch-console.error-throw patterns.
 *
 * @param channel - The IPC channel name
 * @param errorContext - Descriptive context for error logging (e.g., "getting theme")
 * @param handler - The actual handler function that processes the request
 */
function createHandler<TArgs extends any[], TResult>(
  channel: string,
  errorContext: string,
  handler: (...args: TArgs) => Promise<TResult> | TResult
): void {
  ipcMain.handle(
    channel,
    async (_event: IpcMainInvokeEvent, ...args: any[]): Promise<TResult> => {
      try {
        return await handler(...(args as TArgs));
      } catch (error) {
        logger.error(`Error ${errorContext}:`, error as Error);
        throw error;
      }
    }
  );
}

export function registerPreferencesHandlers(): void {
  // Get theme
  createHandler('preferences:getTheme', 'getting theme', () =>
    preferencesService.getTheme()
  );

  // Set theme
  createHandler('preferences:setTheme', 'setting theme', (theme: string) =>
    preferencesService.setTheme(theme)
  );

  logger.info('Preferences IPC handlers registered');
}
