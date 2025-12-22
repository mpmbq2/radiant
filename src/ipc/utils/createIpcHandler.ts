import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { createLogger } from '../../utils/logger';

/**
 * Generic wrapper for IPC handlers that provides consistent error handling.
 * Eliminates the need for repetitive try-catch-console.error-throw patterns.
 *
 * @param channel - The IPC channel name
 * @param errorContext - Descriptive context for error logging (e.g., "creating note")
 * @param handler - The actual handler function that processes the request
 * @param loggerInstance - Logger instance for error logging
 */
export function createHandler<TArgs extends readonly unknown[], TResult>(
  channel: string,
  errorContext: string,
  handler: (...args: TArgs) => Promise<TResult>,
  loggerInstance: ReturnType<typeof createLogger>
): void {
  ipcMain.handle(
    channel,
    async (
      _event: IpcMainInvokeEvent,
      ...args: readonly unknown[]
    ): Promise<TResult> => {
      try {
        return await handler(...(args as TArgs));
      } catch (error) {
        if (error instanceof Error) {
          loggerInstance.error(`Error ${errorContext}:`, error);
        } else {
          loggerInstance.error(
            `Error ${errorContext}:`,
            new Error(String(error))
          );
        }
        throw error;
      }
    }
  );
}
