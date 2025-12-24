import { ipcMain, IpcMainInvokeEvent } from 'electron';
import type { createLogger } from '../../utils/logger';
import type { IPCResponse } from '../../types';
import { FileSystemError } from '../../storage/fileManager';

/**
 * Generic wrapper for IPC handlers that provides consistent error handling.
 * Catches errors from service/repository layers and returns serializable error objects.
 * This ensures errors can be properly transmitted across the IPC boundary.
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
    ): Promise<IPCResponse<TResult>> => {
      try {
        const data = await handler(...(args as TArgs));
        return { success: true, data };
      } catch (error) {
        // Log the error for debugging
        if (error instanceof Error) {
          loggerInstance.error(`Error ${errorContext}:`, error);
        } else {
          loggerInstance.error(
            `Error ${errorContext}:`,
            new Error(String(error))
          );
        }

        // Return serializable error object (not throw)
        return {
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error),
            code: error instanceof FileSystemError ? error.code : undefined,
            stack:
              error instanceof Error && process.env.NODE_ENV !== 'production'
                ? error.stack
                : undefined,
          },
        };
      }
    }
  );
}
